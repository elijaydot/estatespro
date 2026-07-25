import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
  validateRequestSignature,
} from "../_shared/security.ts";
import {
  createCorrelationId,
  emitAuditEvent,
  withTimedAudit,
} from "../_shared/observability.ts";

type Gateway = "paystack" | "flutterwave";
type PaymentMethod = "card" | "bank_transfer" | "mtn_momo" | "link";

type CheckoutPayload = {
  companyId: string;
  productCode: string;
  planCode: string;
  currency?: "USD" | "NGN" | "GBP";
  gateway?: Gateway;
  paymentMethod?: PaymentMethod;
  callbackUrl?: string;
  correlationId?: string;
};

type PreparePlanChangeResult = {
  requires_payment: boolean;
  changed?: boolean;
  reason?: string;
  estimated_charge_minor?: number;
  estimated_credit_minor?: number;
  currency_code?: "USD" | "NGN" | "GBP";
  invoice_id?: string;
  attempt_id?: string;
  gateway_reference?: string;
  gateway?: Gateway;
  payment_method?: PaymentMethod;
};

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function paymentError(req: Request, message: string, status = 400, correlationId?: string) {
  return jsonResponse(req, { success: false, error: message, correlationId }, status);
}

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
    throw new Error(data?.message || "Unable to initialize Paystack checkout");
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
        title: "EstatesPro SaaS Billing",
        description: "Subscription plan upgrade charge",
      },
      meta: opts.metadata,
    }),
  });

  const data = await response.json();
  if (!response.ok || data?.status !== "success" || !data?.data?.link) {
    throw new Error(data?.message || "Unable to initialize Flutterwave checkout");
  }

  return data.data.link as string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);
  if (req.method !== "POST") return paymentError(req, "Method not allowed", 405);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "saas-subscription-checkout",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return paymentError(req, "Rate limit exceeded", 429);
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return paymentError(req, "Missing server configuration", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rawBody = await req.text();

    let body: CheckoutPayload;
    try {
      body = (rawBody ? JSON.parse(rawBody) : {}) as CheckoutPayload;
    } catch {
      return paymentError(req, "Request body must be valid JSON", 400);
    }

    const correlationId = body.correlationId || createCorrelationId();

    const signatureRequired = Deno.env.get("REQUIRE_SAAS_CHECKOUT_SIGNATURE") === "true";
    const validSignature = await validateRequestSignature(req, rawBody, {
      required: signatureRequired,
      secretEnv: "EDGE_REQUEST_SIGNING_SECRET",
    });

    if (!validSignature) {
      return paymentError(req, "Invalid request signature", 401, correlationId);
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

    if (!body.companyId || !body.productCode || !body.planCode) {
      return paymentError(req, "companyId, productCode and planCode are required", 400, correlationId);
    }

    const currency = body.currency || "USD";
    const gateway = body.gateway || "paystack";
    const paymentMethod = body.paymentMethod || "link";

    const result = await withTimedAudit<PreparePlanChangeResult>({
      eventBase: "saas.checkout.prepare",
      source: "saas-subscription-checkout",
      actorUserId: authData.user.id,
      entityType: "company",
      entityId: body.companyId,
      correlationId,
      details: {
        product_code: body.productCode,
        plan_code: body.planCode,
        currency,
        gateway,
        payment_method: paymentMethod,
      },
    }, async () => {
      const { data, error } = await supabase.rpc("saas_prepare_plan_change_charge", {
        p_company_id: body.companyId,
        p_product_code: body.productCode,
        p_new_plan_code: body.planCode,
        p_currency_code: currency,
        p_gateway: gateway,
        p_payment_method: paymentMethod,
        p_correlation_id: correlationId,
        p_metadata: {
          source: "edge.saas-subscription-checkout",
          request_ms: Date.now() - startedAt,
        },
      });

      if (error) throw new Error(error.message || "Failed to prepare plan change payment");
      return (data || {}) as PreparePlanChangeResult;
    });

    if (result.requires_payment !== true) {
      if (result.changed === false) {
        return jsonResponse(req, {
          success: true,
          requiresPayment: false,
          changed: false,
          reason: result.reason || "same_plan",
          correlationId,
        });
      }

      const { data: immediateChange, error: immediateError } = await supabase.rpc("saas_change_subscription_plan", {
        p_company_id: body.companyId,
        p_product_code: body.productCode,
        p_new_plan_code: body.planCode,
        p_currency_code: currency,
        p_effective_now: true,
        p_reason: "self_service_no_charge_plan_change",
        p_correlation_id: correlationId,
        p_metadata: {
          source: "edge.saas-subscription-checkout",
          no_charge: true,
        },
      });

      if (immediateError) {
        return paymentError(req, immediateError.message || "Unable to apply no-charge plan change", 400, correlationId);
      }

      return jsonResponse(req, {
        success: true,
        requiresPayment: false,
        changed: true,
        result: immediateChange,
        correlationId,
      });
    }

    const amountMinor = result.estimated_charge_minor || 0;
    const reference = result.gateway_reference;
    if (!result.attempt_id || !result.invoice_id || !reference || amountMinor <= 0) {
      return paymentError(req, "Payment preparation did not return a valid attempt or amount", 500, correlationId);
    }

    const callbackUrl = body.callbackUrl || `${req.headers.get("origin") || "https://app.estatespro.com"}/settings?tab=billing`;
    const secretKey = getGatewaySecret(gateway);

    if (!secretKey) {
      return paymentError(req, `Missing ${gateway} secret key`, 500, correlationId);
    }

    const checkoutUrl = gateway === "paystack"
      ? await createPaystackCheckout({
          secretKey,
          email: authData.user.email || "billing@estatespro.local",
          amountMinor,
          callbackUrl,
          reference,
          channels: mapPaymentChannels(gateway, paymentMethod) as string[],
          metadata: {
            company_id: body.companyId,
            product_code: body.productCode,
            plan_code: body.planCode,
            attempt_id: result.attempt_id,
            invoice_id: result.invoice_id,
            correlation_id: correlationId,
          },
        })
      : await createFlutterwaveCheckout({
          secretKey,
          email: authData.user.email || "billing@estatespro.local",
          amountMinor,
          callbackUrl,
          reference,
          paymentOptions: mapPaymentChannels(gateway, paymentMethod) as string,
          currency,
          metadata: {
            company_id: body.companyId,
            product_code: body.productCode,
            plan_code: body.planCode,
            attempt_id: result.attempt_id,
            invoice_id: result.invoice_id,
            correlation_id: correlationId,
          },
        });

    await emitAuditEvent({
      source: "saas-subscription-checkout",
      event_type: "saas.billing.checkout_initialized",
      severity: "info",
      actor_user_id: authData.user.id,
      entity_type: "saas_subscription_payment_attempt",
      entity_id: result.attempt_id,
      correlation_id: correlationId,
      details: {
        invoice_id: result.invoice_id,
        amount_minor: amountMinor,
        currency,
        gateway,
      },
    });

    return jsonResponse(req, {
      success: true,
      requiresPayment: true,
      checkoutUrl,
      attemptId: result.attempt_id,
      invoiceId: result.invoice_id,
      reference,
      amountMinor,
      currency,
      correlationId,
    });
  } catch (error) {
    console.error("saas-subscription-checkout error", error);
    return paymentError(req, error instanceof Error ? error.message : "Unexpected checkout error", 500);
  }
});
