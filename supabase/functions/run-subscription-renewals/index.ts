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
} from "../_shared/observability.ts";

type Gateway = "paystack" | "flutterwave";
type PaymentMethod = "card" | "bank_transfer" | "mtn_momo" | "link";
type BillingScope = "company" | "owner_group";

type RenewalAttemptRow = {
  attempt_id: string;
  invoice_id: string;
  company_id?: string;
  group_id?: string;
  subscription_id: string;
  amount_minor: number;
  currency_code: "USD" | "NGN" | "GBP";
  gateway: Gateway;
  payment_method: PaymentMethod;
  gateway_reference: string;
  billing_scope: BillingScope;
};

function mapPaymentChannels(gateway: Gateway, method: PaymentMethod) {
  if (gateway === "paystack") {
    if (method === "card") return ["card"];
    if (method === "bank_transfer") return ["bank_transfer", "bank"];
    if (method === "mtn_momo") return ["mobile_money"];
    return ["card", "bank_transfer", "bank", "mobile_money"];
  }

  if (method === "card") return "card";
  if (method === "bank_transfer") return "banktransfer";
  if (method === "mtn_momo") return "mobilemoneyghana,mobilemoneyrwanda,mobilemoneyuganda,mobilemoneytanzania";
  return "card,banktransfer,mobilemoneyghana,mobilemoneyrwanda,mobilemoneyuganda,mobilemoneytanzania";
}

function getGatewaySecret(gateway: Gateway) {
  const baseName = gateway === "paystack" ? "PAYSTACK_SECRET_KEY" : "FLUTTERWAVE_SECRET_KEY";
  return Deno.env.get(baseName) || "";
}

async function createPaystackCheckout(opts: {
  secretKey: string;
  email: string;
  amountMinor: number;
  callbackUrl: string;
  reference: string;
  channels: string[];
  metadata: Record<string, unknown>;
}) {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountMinor,
      callback_url: opts.callbackUrl,
      reference: opts.reference,
      channels: opts.channels,
      metadata: opts.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.status || !data?.data?.authorization_url) {
    throw new Error(data?.message || "Unable to initialize Paystack renewal checkout");
  }

  return data.data.authorization_url as string;
}

async function createFlutterwaveCheckout(opts: {
  secretKey: string;
  email: string;
  amountMinor: number;
  callbackUrl: string;
  reference: string;
  paymentOptions: string;
  currency: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: opts.reference,
      amount: Number((opts.amountMinor / 100).toFixed(2)),
      currency: opts.currency,
      redirect_url: opts.callbackUrl,
      payment_options: opts.paymentOptions,
      customer: {
        email: opts.email,
      },
      customizations: {
        title: "EstatesPro SaaS Renewal",
        description: "Subscription renewal charge",
      },
      meta: opts.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || data?.status !== "success" || !data?.data?.link) {
    throw new Error(data?.message || "Unable to initialize Flutterwave renewal checkout");
  }

  return data.data.link as string;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "run-subscription-renewals",
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(req, { error: "Missing server configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Authorization header required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const payload = (await req.json().catch(() => ({}))) as { limit?: number; correlationId?: string };
    const limit = Math.max(1, Math.min(500, Number(payload.limit || 100)));
    const correlationId = payload.correlationId || createCorrelationId();

    const gateway = ((payload as { gateway?: string }).gateway || "paystack") as Gateway;
    const paymentMethod = ((payload as { paymentMethod?: string }).paymentMethod || "link") as PaymentMethod;
    const callbackUrl = ((payload as { callbackUrl?: string }).callbackUrl || `${req.headers.get("origin") || "https://app.estatespro.com"}/settings?tab=billing`) as string;

    const { error: queueError } = await supabase.rpc("saas_queue_subscription_renewal_invoices", {
      p_limit: limit,
      p_correlation_id: correlationId,
    });

    if (queueError) {
      return jsonResponse(req, { error: queueError.message || "Failed to queue renewal invoices", correlationId }, 500);
    }

    const { error: groupQueueError } = await supabase.rpc("saas_queue_owner_group_renewal_invoices", {
      p_limit: limit,
      p_correlation_id: correlationId,
    });

    if (groupQueueError) {
      return jsonResponse(req, { error: groupQueueError.message || "Failed to queue owner billing group renewal invoices", correlationId }, 500);
    }

    const { data: preparedAttempts, error: prepareError } = await supabase.rpc("saas_prepare_renewal_payment_attempts", {
      p_limit: limit,
      p_gateway: gateway,
      p_payment_method: paymentMethod,
      p_correlation_id: correlationId,
    });

    if (prepareError) {
      return jsonResponse(req, { error: prepareError.message || "Failed to prepare renewal payment attempts", correlationId }, 500);
    }

    const { data: preparedGroupAttempts, error: prepareGroupError } = await supabase.rpc(
      "saas_prepare_owner_group_renewal_payment_attempts",
      {
        p_limit: limit,
        p_gateway: gateway,
        p_payment_method: paymentMethod,
        p_correlation_id: correlationId,
      },
    );

    if (prepareGroupError) {
      return jsonResponse(req, {
        error: prepareGroupError.message || "Failed to prepare owner billing group renewal payment attempts",
        correlationId,
      }, 500);
    }

    const renewalAttempts: RenewalAttemptRow[] = [
      ...((preparedAttempts || []) as Omit<RenewalAttemptRow, "billing_scope">[]).map((row) => ({
        ...row,
        billing_scope: "company" as const,
      })),
      ...((preparedGroupAttempts || []) as Omit<RenewalAttemptRow, "billing_scope">[]).map((row) => ({
        ...row,
        billing_scope: "owner_group" as const,
      })),
    ];

    const secretKey = getGatewaySecret(gateway);
    const initialized: Array<{ attemptId: string; invoiceId: string; checkoutUrl: string; reference: string; billingScope: BillingScope }> = [];
    const failedInitialization: Array<{ attemptId: string; invoiceId: string; message: string; billingScope: BillingScope }> = [];

    for (const row of renewalAttempts) {
      try {
        if (!secretKey) {
          throw new Error(`Missing ${gateway} secret key`);
        }

        const ownerLookupTable = row.billing_scope === "owner_group" ? "owner_billing_groups" : "companies";
        const ownerLookupId = row.billing_scope === "owner_group" ? row.group_id : row.company_id;
        const { data: ownerRow } = await supabase
          .from(ownerLookupTable)
          .select("owner_id")
          .eq("id", ownerLookupId)
          .maybeSingle();

        const ownerId = (ownerRow as { owner_id?: string | null } | null)?.owner_id || null;
        const { data: ownerAuth } = ownerId
          ? await supabase.auth.admin.getUserById(ownerId)
          : { data: { user: null } };
        const ownerEmail = ownerAuth.user?.email || authData.user.email || "billing@estatespro.local";
        const paymentMetadata = {
          invoice_id: row.invoice_id,
          subscription_id: row.subscription_id,
          attempt_id: row.attempt_id,
          company_id: row.company_id || null,
          owner_billing_group_id: row.group_id || null,
          billing_scope: row.billing_scope,
          correlation_id: correlationId,
        };

        const checkoutUrl = gateway === "paystack"
          ? await createPaystackCheckout({
              secretKey,
              email: ownerEmail,
              amountMinor: Number(row.amount_minor || 0),
              callbackUrl,
              reference: row.gateway_reference,
              channels: mapPaymentChannels(gateway, paymentMethod) as string[],
              metadata: paymentMetadata,
            })
          : await createFlutterwaveCheckout({
              secretKey,
              email: ownerEmail,
              amountMinor: Number(row.amount_minor || 0),
              callbackUrl,
              reference: row.gateway_reference,
              paymentOptions: mapPaymentChannels(gateway, paymentMethod) as string,
              currency: row.currency_code,
              metadata: paymentMetadata,
            });

        const attemptTable = row.billing_scope === "owner_group"
          ? "saas_owner_group_subscription_payment_attempts"
          : "saas_subscription_payment_attempts";
        await supabase
          .from(attemptTable)
          .update({
            metadata: {
              source: "renewal_collection_orchestration",
              billing_scope: row.billing_scope,
              renewal_checkout_url: checkoutUrl,
              renewal_checkout_initialized_at: new Date().toISOString(),
              gateway_reference: row.gateway_reference,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.attempt_id);

        if (ownerId) {
          await supabase
            .from("notifications")
            .insert({
              user_id: ownerId,
              title: row.billing_scope === "owner_group"
                ? "Billing group renewal payment required"
                : "Subscription renewal payment required",
              message: row.billing_scope === "owner_group"
                ? `Your shared subscription renewal is due. Complete payment using reference ${row.gateway_reference}.`
                : `Your subscription renewal invoice is due. Complete payment using reference ${row.gateway_reference}.`,
              type: "warning",
              link: row.billing_scope === "owner_group" ? "/account/billing" : "/settings?tab=billing",
              metadata: {
                invoice_id: row.invoice_id,
                attempt_id: row.attempt_id,
                billing_scope: row.billing_scope,
                owner_billing_group_id: row.group_id || null,
                checkout_url: checkoutUrl,
                correlation_id: correlationId,
              },
            });
        }

        await emitAuditEvent({
          source: "run-subscription-renewals",
          event_type: "saas.renewals.checkout_initialized",
          severity: "info",
          actor_user_id: authData.user.id,
          entity_type: row.billing_scope === "owner_group"
            ? "saas_owner_group_subscription_payment_attempt"
            : "saas_subscription_payment_attempt",
          entity_id: row.attempt_id,
          correlation_id: correlationId,
          details: {
            invoice_id: row.invoice_id,
            company_id: row.company_id,
            owner_billing_group_id: row.group_id,
            billing_scope: row.billing_scope,
            gateway,
            payment_method: paymentMethod,
            reference: row.gateway_reference,
          },
        });

        initialized.push({
          attemptId: row.attempt_id,
          invoiceId: row.invoice_id,
          checkoutUrl,
          reference: row.gateway_reference,
          billingScope: row.billing_scope,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Renewal checkout initialization failed";

        failedInitialization.push({
          attemptId: row.attempt_id,
          invoiceId: row.invoice_id,
          message,
          billingScope: row.billing_scope,
        });

        await emitAuditEvent({
          source: "run-subscription-renewals",
          event_type: "saas.renewals.checkout_initialization_failed",
          severity: "warning",
          actor_user_id: authData.user.id,
          entity_type: row.billing_scope === "owner_group"
            ? "saas_owner_group_subscription_payment_attempt"
            : "saas_subscription_payment_attempt",
          entity_id: row.attempt_id,
          correlation_id: correlationId,
          details: {
            invoice_id: row.invoice_id,
            company_id: row.company_id,
            owner_billing_group_id: row.group_id,
            billing_scope: row.billing_scope,
            gateway,
            payment_method: paymentMethod,
            message,
          },
        });
      }
    }

    const { data, error } = await supabase.rpc("saas_process_subscription_renewals", {
      p_limit: limit,
      p_correlation_id: correlationId,
    });

    if (error) {
      await emitAuditEvent({
        source: "run-subscription-renewals",
        event_type: "saas.renewals.run.failed",
        severity: "error",
        actor_user_id: authData.user.id,
        correlation_id: correlationId,
        details: { limit, message: error.message },
      });

      return jsonResponse(req, { error: error.message || "Renewal processing failed", correlationId }, 500);
    }

    const { data: groupResult, error: groupProcessError } = await supabase.rpc("saas_process_owner_group_renewals", {
      p_limit: limit,
      p_correlation_id: correlationId,
    });

    if (groupProcessError) {
      await emitAuditEvent({
        source: "run-subscription-renewals",
        event_type: "saas.owner_group_renewals.run.failed",
        severity: "error",
        actor_user_id: authData.user.id,
        correlation_id: correlationId,
        details: { limit, message: groupProcessError.message },
      });

      return jsonResponse(req, {
        error: groupProcessError.message || "Owner billing group renewal processing failed",
        correlationId,
      }, 500);
    }

    await emitAuditEvent({
      source: "run-subscription-renewals",
      event_type: "saas.renewals.run.completed",
      severity: "info",
      actor_user_id: authData.user.id,
      correlation_id: correlationId,
      details: { limit, company_result: data, owner_group_result: groupResult },
    });

    return jsonResponse(req, {
      success: true,
      result: data,
      ownerGroupResult: groupResult,
      renewalAttemptsPrepared: renewalAttempts.length,
      companyRenewalAttemptsPrepared: (preparedAttempts || []).length,
      ownerGroupRenewalAttemptsPrepared: (preparedGroupAttempts || []).length,
      renewalCheckoutsInitialized: initialized.length,
      renewalCheckoutInitFailures: failedInitialization.length,
      initialized,
      failedInitialization,
      correlationId,
    });
  } catch (error) {
    console.error("run-subscription-renewals error", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
