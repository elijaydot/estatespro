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

type RenewalAttemptRow = {
  attempt_id: string;
  invoice_id: string;
  company_id: string;
  subscription_id: string;
  amount_minor: number;
  currency_code: "USD" | "NGN" | "GBP";
  gateway: Gateway;
  payment_method: PaymentMethod;
  gateway_reference: string;
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

    const { data: preparedAttempts, error: prepareError } = await supabase.rpc("saas_prepare_renewal_payment_attempts", {
      p_limit: limit,
      p_gateway: gateway,
      p_payment_method: paymentMethod,
      p_correlation_id: correlationId,
    });

    if (prepareError) {
      return jsonResponse(req, { error: prepareError.message || "Failed to prepare renewal payment attempts", correlationId }, 500);
    }

    const secretKey = getGatewaySecret(gateway);
    const initialized: Array<{ attemptId: string; invoiceId: string; checkoutUrl: string; reference: string }> = [];
    const failedInitialization: Array<{ attemptId: string; invoiceId: string; message: string }> = [];

    for (const row of (preparedAttempts || []) as RenewalAttemptRow[]) {
      try {
        if (!secretKey) {
          throw new Error(`Missing ${gateway} secret key`);
        }

        const { data: companyRow } = await supabase
          .from("companies")
          .select("owner_id")
          .eq("id", row.company_id)
          .maybeSingle();

        const ownerId = (companyRow as { owner_id?: string | null } | null)?.owner_id || null;
        const ownerEmail = authData.user.email || "billing@estatespro.local";

        const checkoutUrl = gateway === "paystack"
          ? await createPaystackCheckout({
              secretKey,
              email: ownerEmail,
              amountMinor: Number(row.amount_minor || 0),
              callbackUrl,
              reference: row.gateway_reference,
              channels: mapPaymentChannels(gateway, paymentMethod) as string[],
              metadata: {
                invoice_id: row.invoice_id,
                subscription_id: row.subscription_id,
                attempt_id: row.attempt_id,
                company_id: row.company_id,
                correlation_id: correlationId,
              },
            })
          : await createFlutterwaveCheckout({
              secretKey,
              email: ownerEmail,
              amountMinor: Number(row.amount_minor || 0),
              callbackUrl,
              reference: row.gateway_reference,
              paymentOptions: mapPaymentChannels(gateway, paymentMethod) as string,
              currency: row.currency_code,
              metadata: {
                invoice_id: row.invoice_id,
                subscription_id: row.subscription_id,
                attempt_id: row.attempt_id,
                company_id: row.company_id,
                correlation_id: correlationId,
              },
            });

        await supabase
          .from("saas_subscription_payment_attempts")
          .update({
            metadata: {
              source: "renewal_collection_orchestration",
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
              title: "Subscription renewal payment required",
              message: `Your subscription renewal invoice is due. Complete payment using reference ${row.gateway_reference}.`,
              type: "warning",
              link: "/settings?tab=billing",
              metadata: {
                invoice_id: row.invoice_id,
                attempt_id: row.attempt_id,
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
          entity_type: "saas_subscription_payment_attempt",
          entity_id: row.attempt_id,
          correlation_id: correlationId,
          details: {
            invoice_id: row.invoice_id,
            company_id: row.company_id,
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
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Renewal checkout initialization failed";

        failedInitialization.push({
          attemptId: row.attempt_id,
          invoiceId: row.invoice_id,
          message,
        });

        await emitAuditEvent({
          source: "run-subscription-renewals",
          event_type: "saas.renewals.checkout_initialization_failed",
          severity: "warning",
          actor_user_id: authData.user.id,
          entity_type: "saas_subscription_payment_attempt",
          entity_id: row.attempt_id,
          correlation_id: correlationId,
          details: {
            invoice_id: row.invoice_id,
            company_id: row.company_id,
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

    await emitAuditEvent({
      source: "run-subscription-renewals",
      event_type: "saas.renewals.run.completed",
      severity: "info",
      actor_user_id: authData.user.id,
      correlation_id: correlationId,
      details: { limit, result: data },
    });

    return jsonResponse(req, {
      success: true,
      result: data,
      renewalAttemptsPrepared: (preparedAttempts || []).length,
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
