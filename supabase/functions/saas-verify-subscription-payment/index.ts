import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import {
  createCorrelationId,
  emitAuditEvent,
  withTimedAudit,
} from "../_shared/observability.ts";
import {
  buildPaymentErrorEnvelope,
  type PaymentErrorCode,
} from "../_shared/payment-contract.ts";

type Gateway = "paystack" | "flutterwave";

type VerifyPayload = {
  attemptId: string;
  gateway: Gateway;
  reference: string;
  test_mode?: boolean;
  correlationId?: string;
};

type GatewayVerificationResult = {
  amountMinor: number;
  method: string;
  providerTransactionId: string;
  pending: boolean;
  providerStatus?: string;
};

const PENDING_VERIFICATION_ALERT_THRESHOLD = 5;

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function paymentErrorCodeFromStatus(status: number): PaymentErrorCode {
  if (status === 400) return "validation_failed";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "internal_error";
  return "bad_request";
}

function paymentError(req: Request, message: string, status = 400, correlationId?: string) {
  return jsonResponse(
    req,
    buildPaymentErrorEnvelope(
      {
        code: paymentErrorCodeFromStatus(status),
        message,
        status,
      },
      correlationId,
    ),
    status,
  );
}

function normalizeMethod(method?: string | null) {
  const value = (method || "").toLowerCase();
  if (value.includes("mobile") || value.includes("momo")) return "mtn_momo";
  if (value.includes("bank")) return "bank_transfer";
  if (value.includes("card")) return "card";
  return "other";
}

function getGatewaySecret(gateway: Gateway) {
  const baseName = gateway === "paystack" ? "PAYSTACK_SECRET_KEY" : "FLUTTERWAVE_SECRET_KEY";
  return Deno.env.get(baseName) || "";
}

async function verifyPaystack(secretKey: string, reference: string): Promise<GatewayVerificationResult> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  const providerStatus = String(data?.data?.status || "").toLowerCase();

  if (!response.ok || !data?.status) {
    throw new Error(data?.message || "Paystack verification failed");
  }

  if (["pending", "processing", "queued"].includes(providerStatus)) {
    return {
      amountMinor: Number(data?.data?.amount || 0),
      method: normalizeMethod(data?.data?.channel),
      providerTransactionId: String(data?.data?.id || ""),
      pending: true,
      providerStatus,
    };
  }

  if (providerStatus !== "success") {
    throw new Error(data?.message || `Paystack verification status=${providerStatus || "unknown"}`);
  }

  return {
    amountMinor: Number(data.data.amount || 0),
    method: normalizeMethod(data.data.channel),
    providerTransactionId: String(data.data.id || ""),
    pending: false,
    providerStatus,
  };
}

async function verifyFlutterwave(secretKey: string, reference: string): Promise<GatewayVerificationResult> {
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  const providerStatus = String(data?.data?.status || "").toLowerCase();

  if (!response.ok || data?.status !== "success") {
    throw new Error(data?.message || "Flutterwave verification failed");
  }

  if (["pending", "processing", "queued"].includes(providerStatus)) {
    return {
      amountMinor: Math.round(Number(data?.data?.amount || 0) * 100),
      method: normalizeMethod(data?.data?.payment_type),
      providerTransactionId: String(data?.data?.id || ""),
      pending: true,
      providerStatus,
    };
  }

  if (providerStatus !== "successful") {
    throw new Error(data?.message || `Flutterwave verification status=${providerStatus || "unknown"}`);
  }

  return {
    amountMinor: Math.round(Number(data.data.amount || 0) * 100),
    method: normalizeMethod(data.data.payment_type),
    providerTransactionId: String(data.data.id || ""),
    pending: false,
    providerStatus,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);
  if (req.method !== "POST") return paymentError(req, "Method not allowed", 405);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "saas-verify-subscription-payment",
    limit: 60,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return paymentError(req, "Rate limit exceeded", 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return paymentError(req, "Missing server configuration", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let payload: VerifyPayload;
    try {
      payload = (await req.json()) as VerifyPayload;
    } catch {
      return paymentError(req, "Request body must be valid JSON", 400);
    }

    const correlationId = payload.correlationId || createCorrelationId();

    if (!payload.attemptId || !payload.reference || !payload.gateway) {
      return paymentError(req, "attemptId, gateway and reference are required", 400, correlationId);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return paymentError(req, "Authorization header required", 401, correlationId);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return paymentError(req, "Unauthorized", 401, correlationId);
    }

    const { data: attemptRow, error: attemptError } = await supabase
      .from("saas_subscription_payment_attempts")
      .select("id, company_id, payment_status, amount_minor, currency_code, gateway_reference, metadata")
      .eq("id", payload.attemptId)
      .single();

    if (attemptError || !attemptRow) {
      return paymentError(req, "Payment attempt not found", 404, correlationId);
    }

    if (attemptRow.gateway_reference !== payload.reference) {
      return paymentError(req, "Payment reference mismatch for this attempt", 400, correlationId);
    }

    if (attemptRow.payment_status === "succeeded") {
      return jsonResponse(req, {
        success: true,
        alreadyProcessed: true,
        attemptId: attemptRow.id,
        correlationId,
      });
    }

    let providerTransactionId = "test-transaction";
    let verifiedAmountMinor = Number(attemptRow.amount_minor || 0);
    let paymentMethod = "card";
    let providerStatus = "successful";
    let pendingVerification = false;

    if (!payload.test_mode) {
      const secretKey = getGatewaySecret(payload.gateway);
      if (!secretKey) {
        return paymentError(req, `Missing ${payload.gateway} secret key`, 500, correlationId);
      }

      const verification = payload.gateway === "paystack"
        ? await verifyPaystack(secretKey, payload.reference)
        : await verifyFlutterwave(secretKey, payload.reference);

      verifiedAmountMinor = verification.amountMinor;
      providerTransactionId = verification.providerTransactionId;
      paymentMethod = verification.method;
      providerStatus = verification.providerStatus || providerStatus;
      pendingVerification = verification.pending;
    }

    if (pendingVerification) {
      const metadata = (attemptRow.metadata && typeof attemptRow.metadata === "object")
        ? (attemptRow.metadata as Record<string, unknown>)
        : {};

      const currentPendingCount = Number(metadata.pending_verification_count || 0);
      const nextPendingCount = Number.isFinite(currentPendingCount) ? currentPendingCount + 1 : 1;
      const retryAfterMs = Math.min(15_000, 2_000 * (2 ** Math.max(0, nextPendingCount - 1)));
      const currentAlertLevel = Number(metadata.pending_alert_level || 0);
      const shouldEmitThresholdAlert = nextPendingCount >= PENDING_VERIFICATION_ALERT_THRESHOLD
        && (!Number.isFinite(currentAlertLevel) || currentAlertLevel < PENDING_VERIFICATION_ALERT_THRESHOLD);

      let thresholdAlertId: string | null = null;
      if (shouldEmitThresholdAlert) {
        const { data: alertId, error: alertError } = await supabase.rpc("platform_create_governance_alert", {
          p_severity: "critical",
          p_alert_type: "billing_pending_verification_retry_depth",
          p_title: "Pending billing verification retry threshold exceeded",
          p_description: `Payment attempt ${payload.attemptId} reached ${nextPendingCount} pending verification retries.`,
          p_company_id: attemptRow.company_id,
          p_event_id: null,
          p_correlation_id: correlationId,
          p_metadata: {
            attempt_id: payload.attemptId,
            company_id: attemptRow.company_id,
            gateway: payload.gateway,
            provider_status: providerStatus,
            pending_verification_count: nextPendingCount,
            threshold: PENDING_VERIFICATION_ALERT_THRESHOLD,
            reference: payload.reference,
            source: "edge.saas-verify-subscription-payment",
          },
        });

        if (alertError) {
          console.warn("pending verification threshold alert creation failed", {
            attemptId: payload.attemptId,
            message: alertError.message,
          });
        } else if (typeof alertId === "string" && alertId.length > 0) {
          thresholdAlertId = alertId;
        }
      }

      const nextMetadata: Record<string, unknown> = {
        ...metadata,
        pending_verification_count: nextPendingCount,
        last_pending_verification_at: new Date().toISOString(),
        last_pending_provider_status: providerStatus,
        last_pending_reference: payload.reference,
      };

      if (shouldEmitThresholdAlert) {
        nextMetadata.pending_alert_level = PENDING_VERIFICATION_ALERT_THRESHOLD;
        if (thresholdAlertId) {
          nextMetadata.pending_alert_id = thresholdAlertId;
          nextMetadata.pending_alerted_at = new Date().toISOString();
        }
      }

      await supabase
        .from("saas_subscription_payment_attempts")
        .update({
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.attemptId);

      await emitAuditEvent({
        source: "saas-verify-subscription-payment",
        event_type: "saas.billing.payment_verification_pending",
        severity: "warning",
        actor_user_id: authData.user.id,
        entity_type: "saas_subscription_payment_attempt",
        entity_id: payload.attemptId,
        correlation_id: correlationId,
        details: {
          gateway: payload.gateway,
          provider_status: providerStatus,
          reference: payload.reference,
          pending_verification_count: nextPendingCount,
          threshold_alert_emitted: shouldEmitThresholdAlert,
          threshold_alert_id: thresholdAlertId,
        },
      });

      if (shouldEmitThresholdAlert) {
        await emitAuditEvent({
          source: "saas-verify-subscription-payment",
          event_type: "saas.billing.payment_verification_pending_threshold_exceeded",
          severity: "critical",
          actor_user_id: authData.user.id,
          entity_type: "saas_subscription_payment_attempt",
          entity_id: payload.attemptId,
          correlation_id: correlationId,
          details: {
            gateway: payload.gateway,
            provider_status: providerStatus,
            pending_verification_count: nextPendingCount,
            threshold: PENDING_VERIFICATION_ALERT_THRESHOLD,
            reference: payload.reference,
            governance_alert_id: thresholdAlertId,
          },
        });
      }

      return jsonResponse(req, {
        success: true,
        pending: true,
        verificationStatus: "pending",
        providerStatus,
        retryAfterMs,
        pendingCount: nextPendingCount,
        attemptId: payload.attemptId,
        correlationId,
      }, 202);
    }

    if (verifiedAmountMinor < Number(attemptRow.amount_minor || 0)) {
      await supabase.rpc("saas_mark_plan_change_payment_failed", {
        p_attempt_id: payload.attemptId,
        p_failure_reason: `verified_amount_too_low:${verifiedAmountMinor}`,
        p_correlation_id: correlationId,
      });

      return paymentError(req, "Verified amount is less than required subscription charge", 402, correlationId);
    }

    const finalizeResult = await withTimedAudit({
      eventBase: "saas.checkout.verify",
      source: "saas-verify-subscription-payment",
      actorUserId: authData.user.id,
      entityType: "saas_subscription_payment_attempt",
      entityId: payload.attemptId,
      correlationId,
      details: {
        gateway: payload.gateway,
        test_mode: Boolean(payload.test_mode),
        reference: payload.reference,
        provider_status: providerStatus,
      },
    }, async () => {
      const { data, error } = await supabase.rpc("saas_finalize_plan_change_after_payment", {
        p_attempt_id: payload.attemptId,
        p_gateway_transaction_id: providerTransactionId,
        p_gateway_reference: payload.reference,
        p_correlation_id: correlationId,
        p_metadata: {
          verified_amount_minor: verifiedAmountMinor,
          payment_method: paymentMethod,
          source: "edge.saas-verify-subscription-payment",
          test_mode: Boolean(payload.test_mode),
        },
      });

      if (error) throw new Error(error.message || "Failed to finalize subscription payment");
      return data;
    });

    const existingMetadata = (attemptRow.metadata && typeof attemptRow.metadata === "object")
      ? (attemptRow.metadata as Record<string, unknown>)
      : {};

    const alertIdsToResolve = new Set<string>();
    const metadataAlertId = existingMetadata.pending_alert_id;
    if (typeof metadataAlertId === "string" && metadataAlertId.trim().length > 0) {
      alertIdsToResolve.add(metadataAlertId.trim());
    }

    const { data: matchingAlerts, error: matchingAlertsError } = await supabase
      .from("governance_alerts")
      .select("id")
      .eq("alert_type", "billing_pending_verification_retry_depth")
      .contains("metadata", { attempt_id: payload.attemptId })
      .in("status", ["open", "acknowledged"]);

    if (matchingAlertsError) {
      console.warn("pending verification alert lookup failed", {
        attemptId: payload.attemptId,
        message: matchingAlertsError.message,
      });
    } else {
      (matchingAlerts || []).forEach((alertRow: { id?: string }) => {
        if (typeof alertRow.id === "string" && alertRow.id.length > 0) {
          alertIdsToResolve.add(alertRow.id);
        }
      });
    }

    if (alertIdsToResolve.size > 0) {
      const resolvedAt = new Date().toISOString();
      const { error: resolveAlertsError } = await supabase
        .from("governance_alerts")
        .update({
          status: "resolved",
          resolved_at: resolvedAt,
          updated_at: resolvedAt,
        })
        .in("id", Array.from(alertIdsToResolve))
        .neq("status", "resolved");

      if (resolveAlertsError) {
        console.warn("pending verification alert auto-resolve failed", {
          attemptId: payload.attemptId,
          message: resolveAlertsError.message,
        });
      } else {
        await emitAuditEvent({
          source: "saas-verify-subscription-payment",
          event_type: "saas.billing.pending_verification_alerts_auto_resolved",
          severity: "info",
          actor_user_id: authData.user.id,
          entity_type: "saas_subscription_payment_attempt",
          entity_id: payload.attemptId,
          correlation_id: correlationId,
          details: {
            resolved_alert_ids: Array.from(alertIdsToResolve),
            resolved_alert_count: alertIdsToResolve.size,
          },
        });
      }
    }

    await supabase
      .from("saas_subscription_payment_attempts")
      .update({
        metadata: {
          ...existingMetadata,
          pending_verification_count: 0,
          last_pending_verification_at: null,
          last_pending_provider_status: null,
          last_pending_reference: null,
          pending_alert_level: null,
          pending_alert_id: null,
          pending_alerted_at: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.attemptId);

    await emitAuditEvent({
      source: "saas-verify-subscription-payment",
      event_type: "saas.billing.payment_verified",
      severity: "info",
      actor_user_id: authData.user.id,
      entity_type: "saas_subscription_payment_attempt",
      entity_id: payload.attemptId,
      correlation_id: correlationId,
      details: {
        gateway: payload.gateway,
        verified_amount_minor: verifiedAmountMinor,
        currency_code: attemptRow.currency_code,
        finalize_result: finalizeResult,
      },
    });

    return jsonResponse(req, {
      success: true,
      pending: false,
      verificationStatus: "confirmed",
      alreadyProcessed: false,
      attemptId: payload.attemptId,
      finalizeResult,
      correlationId,
    });
  } catch (error) {
    console.error("saas-verify-subscription-payment error", error);
    return paymentError(req, error instanceof Error ? error.message : "Unexpected verification error", 500);
  }
});
