import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
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
import {
  buildPaymentErrorEnvelope,
  type PaymentErrorCode,
} from "../_shared/payment-contract.ts";

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
  if (gateway === "paystack") {
    return (
      Deno.env.get("PAYSTACK_SECRET_KEY") ||
      Deno.env.get("PAYSTACK_TEST_SECRET_KEY") ||
      Deno.env.get("PAYSTACK_LIVE_SECRET_KEY") ||
      ""
    );
  }
  const baseName = "FLUTTERWAVE_SECRET_KEY";
  return Deno.env.get(baseName) || "";
}

const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  RWF: 1380.0,
  NGN: 1550.0,
  GBP: 0.78,
  EUR: 0.92,
  KES: 130.0,
  GHS: 15.5,
  ZAR: 18.2,
  CAD: 1.36,
  AUD: 1.52,
};

async function getLiveExchangeRate(targetCurrency: string): Promise<number> {
  const curr = targetCurrency.toUpperCase();
  if (curr === "USD") return 1.0;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.[curr]) {
        return Number(data.rates[curr]);
      }
    }
  } catch {
    // ignore
  }
  return FALLBACK_EXCHANGE_RATES[curr] || 1.0;
}

async function createPaystackCheckout(opts: {
  secretKey: string;
  email: string;
  amountMinor: number;
  currency?: string;
  callbackUrl: string;
  reference: string;
  channels?: string[];
  metadata: Record<string, unknown>;
}) {
  const email = (opts.email && opts.email.includes("@") && !opts.email.endsWith(".local"))
    ? opts.email
    : "billing@estatespro.com";

  // Build payload
  const buildPayload = (cur?: string, amt?: number, ref?: string) => {
    const payload: Record<string, unknown> = {
      email,
      amount: amt !== undefined ? amt : opts.amountMinor,
      callback_url: opts.callbackUrl,
      reference: ref || opts.reference,
      metadata: opts.metadata,
    };
    if (cur) {
      payload.currency = cur.toUpperCase();
    }
    return payload;
  };

  const executeInit = async (payload: Record<string, unknown>) => {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return { ok: response.ok && data?.status && data?.data?.authorization_url, data };
  };

  // Attempt 1: Try with explicitly requested currency if one of supported Paystack currencies
  const reqCurr = opts.currency?.toUpperCase();
  const attempt1 = await executeInit(
    buildPayload(
      reqCurr && ["NGN", "USD", "GHS", "ZAR", "KES"].includes(reqCurr) ? reqCurr : undefined,
      opts.amountMinor
    )
  );

  if (attempt1.ok) {
    return attempt1.data.data.authorization_url as string;
  }

  console.warn("Paystack attempt 1 failed:", attempt1.data?.message, "Attempting converted NGN/merchant fallback...");

  // Attempt 2: If currency wasn't supported by merchant (e.g. test Nigerian account receiving USD),
  // convert base USD to NGN kobo and initialize
  const baseUsd = Number(opts.metadata?.base_usd || 29);
  const fxRate = await getLiveExchangeRate("NGN");
  const ngnAmountMinor = Math.round(baseUsd * fxRate * 100);
  const fallbackRef = `${opts.reference.slice(0, 24)}_${Date.now()}`;

  const attempt2 = await executeInit(
    buildPayload("NGN", ngnAmountMinor, fallbackRef)
  );

  if (attempt2.ok) {
    return attempt2.data.data.authorization_url as string;
  }

  // Attempt 3: Merchant default without currency header
  const attempt3 = await executeInit(
    buildPayload(undefined, ngnAmountMinor, `${fallbackRef}_d`)
  );

  if (attempt3.ok) {
    return attempt3.data.data.authorization_url as string;
  }

  throw new Error(
    attempt1.data?.message || attempt2.data?.message || attempt3.data?.message || "Unable to initialize Paystack checkout"
  );
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

    let result: PreparePlanChangeResult | null = null;
    try {
      const { data, error } = await supabase.rpc("saas_prepare_plan_change_charge", {
        p_company_id: body.companyId,
        p_product_code: body.productCode || "pm_core",
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

      if (!error && data) {
        result = data as PreparePlanChangeResult;
      }
    } catch (rpcErr) {
      console.warn("saas_prepare_plan_change_charge RPC fallback:", rpcErr);
    }

    if (result && result.requires_payment !== true) {
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
        p_product_code: body.productCode || "pm_core",
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

    const UNIFIED_USD_PRICES: Record<string, number> = {
      fishgate_starter: 9,
      fishgate_growth: 29,
      fishgate_professional: 69,
      fishgate_enterprise: 149,
    };

    const basePlanPriceUsd = UNIFIED_USD_PRICES[body.planCode] || 29;
    const isAnnual = body.isAnnual === true;
    const baseUsd = isAnnual ? basePlanPriceUsd * 0.80 : basePlanPriceUsd;

    const reqCurrency = (body.currency || "USD").toUpperCase();
    let paystackCurrency = reqCurrency;
    let finalAmountMinor: number;

    if (result?.estimated_charge_minor && result.estimated_charge_minor > 0) {
      finalAmountMinor = result.estimated_charge_minor;
    } else {
      const fxRate = await getLiveExchangeRate(reqCurrency);
      const convertedAmount = baseUsd * fxRate;
      finalAmountMinor = Math.round(convertedAmount * 100);
    }

    const reference = result?.gateway_reference || `fg_sub_${body.companyId.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;
    const attemptId = result?.attempt_id || crypto.randomUUID();
    const invoiceId = result?.invoice_id || crypto.randomUUID();

    const callbackUrl = body.callbackUrl || `${req.headers.get("origin") || "https://app.estatespro.com"}/settings?tab=billing`;
    const secretKey = getGatewaySecret(gateway);

    if (!secretKey) {
      return paymentError(
        req,
        `Missing ${gateway} Secret Key. Please configure PAYSTACK_SECRET_KEY in Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets.`,
        500,
        correlationId
      );
    }

    const checkoutUrl = gateway === "paystack"
      ? await createPaystackCheckout({
          secretKey,
          email: authData.user.email || "billing@estatespro.local",
          amountMinor: finalAmountMinor,
          currency: paystackCurrency,
          callbackUrl,
          reference,
          channels: mapPaymentChannels(gateway, paymentMethod) as string[],
          metadata: {
            company_id: body.companyId,
            product_code: body.productCode || "pm_core",
            plan_code: body.planCode,
            attempt_id: attemptId,
            invoice_id: invoiceId,
            correlation_id: correlationId,
            currency: reqCurrency,
            base_usd: baseUsd,
          },
        })
      : await createFlutterwaveCheckout({
          secretKey,
          email: authData.user.email || "billing@estatespro.local",
          amountMinor: finalAmountMinor,
          callbackUrl,
          reference,
          paymentOptions: mapPaymentChannels(gateway, paymentMethod) as string,
          currency: reqCurrency,
          metadata: {
            company_id: body.companyId,
            product_code: body.productCode || "pm_core",
            plan_code: body.planCode,
            attempt_id: attemptId,
            invoice_id: invoiceId,
            correlation_id: correlationId,
            currency: reqCurrency,
            base_usd: baseUsd,
          },
        });

    await emitAuditEvent({
      source: "saas-subscription-checkout",
      event_type: "saas.billing.checkout_initialized",
      severity: "info",
      actor_user_id: authData.user.id,
      entity_type: "saas_subscription_payment_attempt",
      entity_id: attemptId,
      correlation_id: correlationId,
      details: {
        invoice_id: invoiceId,
        amount_minor: finalAmountMinor,
        currency,
        gateway,
      },
    });

    return jsonResponse(req, {
      success: true,
      requiresPayment: true,
      checkoutUrl,
      attemptId,
      invoiceId,
      reference,
      amountMinor: finalAmountMinor,
      currency,
      correlationId,
    });
  } catch (error) {
    console.error("saas-subscription-checkout error", error);
    return paymentError(req, error instanceof Error ? error.message : "Unexpected checkout error", 500);
  }
});
