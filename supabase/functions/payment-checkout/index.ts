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
  type ContractError,
  type Gateway,
  type PaymentMethod,
  parseCheckoutPayload,
} from "../_shared/payment-contract.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function errorResponse(req: Request, error: ContractError, correlationId?: string) {
  return jsonResponse(req, buildPaymentErrorEnvelope(error, correlationId), error.status);
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

async function getUserFromBearer(req: Request, supabaseUrl: string, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

type CheckoutBooking = {
  id: string;
  user_id: string;
  property_id: string;
  unit_id: string | null;
  guest_name: string;
  guest_email: string;
  total_amount: number;
  check_in: string;
  check_out: string;
};

type CheckoutTenant = {
  id: string;
  tenant_user_id: string | null;
  name: string | null;
  email: string | null;
};

async function ensureBookingInvoice(supabase: ReturnType<typeof createClient>, booking: CheckoutBooking) {
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id, amount, paid_amount, status, invoice_number, due_date")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (existingInvoice) return existingInvoice;

  const dueDate = booking.check_in || new Date().toISOString().slice(0, 10);
  const { data: createdInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      user_id: booking.user_id,
      tenant_id: null,
      booking_id: booking.id,
      property_id: booking.property_id,
      unit_id: booking.unit_id,
      invoice_number: `SL-${Date.now()}`,
      amount: booking.total_amount,
      paid_amount: 0,
      due_date: dueDate,
      status: "pending",
      description: `Shortlet booking for ${booking.guest_name} (${booking.check_in} to ${booking.check_out})`,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      source: "shortlet_booking",
    })
    .select("id, amount, paid_amount, status, invoice_number, due_date")
    .single();

  if (invoiceError) throw new Error(invoiceError.message || "Failed to create booking invoice");
  return createdInvoice;
}

async function resolvePaymentSettings(supabase: ReturnType<typeof createClient>, propertyId: string, ownerUserId?: string) {
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, user_id, company_id")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    throw new Error("Property not found for payment settings");
  }

  const ownerId = ownerUserId || property.user_id;

  const { data: propertySettings } = await supabase
    .from("landlord_payment_settings")
    .select("*")
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (propertySettings) return propertySettings;

  if (property.company_id) {
    const { data: companySettings } = await supabase
      .from("landlord_payment_settings")
      .select("*")
      .eq("company_id", property.company_id)
      .is("property_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (companySettings) return companySettings;
  }

  const { data: globalSettings } = await supabase
    .from("landlord_payment_settings")
    .select("*")
    .eq("user_id", ownerId)
    .is("company_id", null)
    .is("property_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return globalSettings;
}

function getGatewaySecret(gateway: Gateway, ownerUserId?: string) {
  const baseName = gateway === "paystack" ? "PAYSTACK_SECRET_KEY" : "FLUTTERWAVE_SECRET_KEY";
  const normalizedOwner = ownerUserId?.replace(/-/g, "_").toUpperCase();

  if (normalizedOwner) {
    const ownerScoped = Deno.env.get(`${baseName}_${normalizedOwner}`);
    if (ownerScoped) return ownerScoped;
  }

  if (gateway === "paystack") {
    return (
      Deno.env.get("PAYSTACK_SECRET_KEY") ||
      Deno.env.get("PAYSTACK_TEST_SECRET_KEY") ||
      Deno.env.get("PAYSTACK_LIVE_SECRET_KEY") ||
      ""
    );
  }

  return Deno.env.get(baseName) || "";
}

async function createPaystackCheckout(opts: {
  secretKey: string;
  email: string;
  amount: number;
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
      amount: Math.round(opts.amount * 100),
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
  name: string;
  amount: number;
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
      amount: Number(opts.amount.toFixed(2)),
      currency: opts.currency,
      redirect_url: opts.callbackUrl,
      payment_options: opts.paymentOptions,
      customer: {
        email: opts.email,
        name: opts.name,
      },
      customizations: {
        title: "FishGate Payment",
        description: "Invoice payment",
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
  if (req.method !== "POST") {
    return errorResponse(req, {
      code: "bad_request",
      message: "Method not allowed",
      status: 405,
    });
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "payment-checkout",
    limit: 80,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    await emitAuditEvent({
      event_type: "payment.checkout.rate_limited",
      source: "payment-checkout",
      severity: "warning",
      details: { method: req.method },
    });
    return errorResponse(req, {
      code: "rate_limited",
      message: "Rate limit exceeded",
      status: 429,
    });
  }

  const requestStartedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(req, {
        code: "internal_error",
        message: "Missing server configuration",
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rawBody = await req.text();
    let body: unknown = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return errorResponse(req, {
        code: "bad_request",
        message: "Request body must be valid JSON",
        status: 400,
      });
    }

    const parsed = parseCheckoutPayload(body);
    const correlationId = parsed.ok ? (parsed.value.correlationId || createCorrelationId()) : createCorrelationId();

    if (!parsed.ok) {
      return errorResponse(req, parsed.error, correlationId);
    }

    const payload = parsed.value;
    const source = payload.source;
    const paymentMethod = payload.paymentMethod;
    const amountInput = payload.amount;
    const currency = payload.currency;
    const explicitGateway = payload.gateway;
    const callbackUrl = payload.callbackUrl;
    const bookingToken = payload.bookingToken;
    const invoiceId = payload.invoiceId;
    const origin = payload.origin;

    await emitAuditEvent({
      event_type: "payment.checkout.initiated",
      source: "payment-checkout",
      severity: "info",
      correlation_id: correlationId,
      details: {
        source,
        paymentMethod,
        explicitGateway,
      },
    });

    if (source === "guest_booking") {
      const mustSignGuestRequests = Deno.env.get("REQUIRE_GUEST_SIGNED_REQUESTS") === "true";
      const validSignature = await validateRequestSignature(req, rawBody, {
        required: mustSignGuestRequests,
      });

      if (!validSignature) {
        await emitAuditEvent({
          event_type: "payment.checkout.invalid_signature",
          source: "payment-checkout",
          severity: "warning",
          correlation_id: correlationId,
          details: { source: "guest_booking" },
        });
        return errorResponse(req, {
          code: "unauthorized",
          message: "Invalid request signature",
          status: 401,
        }, correlationId);
      }

      if (!bookingToken) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "bookingToken is required",
          status: 400,
        }, correlationId);
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out, status, payment_status")
        .eq("guest_action_token", bookingToken)
        .single();

      if (bookingError || !booking) {
        return errorResponse(req, {
          code: "not_found",
          message: "Invalid booking token",
          status: 404,
        }, correlationId);
      }
      if (booking.status === "cancelled") {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Booking is cancelled",
          status: 400,
        }, correlationId);
      }

      const invoice = await ensureBookingInvoice(supabase, booking);
      const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
      if (remaining <= 0) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Booking is already fully paid",
          status: 400,
        }, correlationId);
      }

      const amount = amountInput > 0 ? amountInput : remaining;
      if (amount <= 0 || amount > remaining + 0.0001) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Invalid payment amount",
          status: 400,
        }, correlationId);
      }

      const paymentSettings = await resolvePaymentSettings(supabase, booking.property_id, booking.user_id);
      if (!paymentSettings) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "No payment gateway configured for this property",
          status: 400,
        }, correlationId);
      }

      const gateway = explicitGateway || (paymentSettings.preferred_method === "flutterwave" ? "flutterwave" : "paystack");

      const reference = `BOOK-${booking.id.slice(0, 8)}-${Date.now()}`;
      const finalCallbackUrl =
        callbackUrl ||
        `${origin || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173"}/bookings/guest-action?token=${encodeURIComponent(bookingToken)}&payment_return=1&gateway=${gateway}`;

      const metadata = {
        source,
        bookingId: booking.id,
        invoiceId: invoice.id,
        bookingToken,
      };

      let checkoutUrl = "";
      if (gateway === "paystack") {
        const secretKey = getGatewaySecret("paystack", paymentSettings.user_id || booking.user_id);
        if (!paymentSettings.paystack_enabled || !secretKey) {
          return errorResponse(req, {
            code: "validation_failed",
            message: "Paystack is not enabled for this property",
            status: 400,
          }, correlationId);
        }

        checkoutUrl = await withTimedAudit({
          eventBase: "payment.checkout.gateway",
          source: "payment-checkout",
          correlationId,
          details: {
            source,
            gateway,
            invoiceId: invoice.id,
          },
        }, async () => {
          return await createPaystackCheckout({
            secretKey,
            email: booking.guest_email,
            amount,
            callbackUrl: finalCallbackUrl,
            reference,
            channels: mapPaymentChannels("paystack", paymentMethod) as string[],
            metadata,
          });
        });
      } else {
        const secretKey = getGatewaySecret("flutterwave", paymentSettings.user_id || booking.user_id);
        if (!paymentSettings.flutterwave_enabled || !secretKey) {
          return errorResponse(req, {
            code: "validation_failed",
            message: "Flutterwave is not enabled for this property",
            status: 400,
          }, correlationId);
        }

        checkoutUrl = await withTimedAudit({
          eventBase: "payment.checkout.gateway",
          source: "payment-checkout",
          correlationId,
          details: {
            source,
            gateway,
            invoiceId: invoice.id,
          },
        }, async () => {
          return await createFlutterwaveCheckout({
            secretKey,
            email: booking.guest_email,
            name: booking.guest_name,
            amount,
            callbackUrl: finalCallbackUrl,
            reference,
            paymentOptions: mapPaymentChannels("flutterwave", paymentMethod) as string,
            currency,
            metadata,
          });
        });
      }

      await emitAuditEvent({
        event_type: "payment.checkout.completed",
        source: "payment-checkout",
        severity: "info",
        correlation_id: correlationId,
        entity_type: "invoice",
        entity_id: invoice.id,
        details: {
          source,
          gateway,
          duration_ms: Date.now() - requestStartedAt,
        },
      });

      return jsonResponse(req, {
        success: true,
        source,
        gateway,
        reference,
        amount,
        invoiceId: invoice.id,
        checkoutUrl,
        correlationId,
      });
    }

    // Auth required for tenant/landlord invoice checkout
    const user = await getUserFromBearer(req, supabaseUrl, serviceRoleKey);
    if (!user) {
      return errorResponse(req, {
        code: "unauthorized",
        message: "Unauthorized",
        status: 401,
      }, correlationId);
    }

    if (!invoiceId) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "invoiceId is required",
        status: 400,
      }, correlationId);
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id, tenant_id, property_id, amount, paid_amount, status, invoice_number, description")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return errorResponse(req, {
        code: "not_found",
        message: "Invoice not found",
        status: 404,
      }, correlationId);
    }

    const { data: tenant } = invoice.tenant_id
      ? await supabase
          .from("tenants")
          .select("id, tenant_user_id, name, email")
          .eq("id", invoice.tenant_id)
          .maybeSingle()
      : { data: null as CheckoutTenant | null };

    const isOwner = invoice.user_id === user.id;
    const isTenant = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;

    if (!isOwner && !isTenant) {
      return errorResponse(req, {
        code: "forbidden",
        message: "Forbidden",
        status: 403,
      }, correlationId);
    }

    if (!invoice.tenant_id || !tenant) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "This invoice is not linked to a tenant",
        status: 400,
      }, correlationId);
    }

    const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
    if (remaining <= 0) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "Invoice is already fully paid",
        status: 400,
      }, correlationId);
    }

    const amount = amountInput > 0 ? amountInput : remaining;
    if (amount <= 0 || amount > remaining + 0.0001) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "Invalid payment amount",
        status: 400,
      }, correlationId);
    }

    const paymentSettings = await resolvePaymentSettings(supabase, invoice.property_id, invoice.user_id);
    if (!paymentSettings) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "No payment gateway configured for this property",
        status: 400,
      }, correlationId);
    }

    const gateway = explicitGateway || (paymentSettings.preferred_method === "flutterwave" ? "flutterwave" : "paystack");
    const reference = `INV-${invoice.id.slice(0, 8)}-${Date.now()}`;

    const finalCallbackUrl =
      callbackUrl ||
      `${origin || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173"}/tenant/payments?payment_return=1&invoice_id=${encodeURIComponent(invoice.id)}&gateway=${gateway}`;

    const metadata = {
      source,
      invoiceId: invoice.id,
      tenantId: tenant.id,
      tenantUserId: tenant.tenant_user_id,
    };

    const payerEmail = tenant.email || `${tenant.id}@tenant.local`;
    const payerName = tenant.name || "Tenant";

    let checkoutUrl = "";
    if (gateway === "paystack") {
      const secretKey = getGatewaySecret("paystack", paymentSettings.user_id || invoice.user_id);
      if (!paymentSettings.paystack_enabled || !secretKey) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Paystack is not enabled for this property",
          status: 400,
        }, correlationId);
      }

      checkoutUrl = await withTimedAudit({
        eventBase: "payment.checkout.gateway",
        source: "payment-checkout",
        actorUserId: user.id,
        correlationId,
        details: {
          source,
          gateway,
          invoiceId: invoice.id,
        },
      }, async () => {
        return await createPaystackCheckout({
          secretKey,
          email: payerEmail,
          amount,
          callbackUrl: finalCallbackUrl,
          reference,
          channels: mapPaymentChannels("paystack", paymentMethod) as string[],
          metadata,
        });
      });
    } else {
      const secretKey = getGatewaySecret("flutterwave", paymentSettings.user_id || invoice.user_id);
      if (!paymentSettings.flutterwave_enabled || !secretKey) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Flutterwave is not enabled for this property",
          status: 400,
        }, correlationId);
      }

      checkoutUrl = await withTimedAudit({
        eventBase: "payment.checkout.gateway",
        source: "payment-checkout",
        actorUserId: user.id,
        correlationId,
        details: {
          source,
          gateway,
          invoiceId: invoice.id,
        },
      }, async () => {
        return await createFlutterwaveCheckout({
          secretKey,
          email: payerEmail,
          name: payerName,
          amount,
          callbackUrl: finalCallbackUrl,
          reference,
          paymentOptions: mapPaymentChannels("flutterwave", paymentMethod) as string,
          currency,
          metadata,
        });
      });
    }

    await emitAuditEvent({
      event_type: "payment.checkout.completed",
      source: "payment-checkout",
      actor_user_id: user.id,
      severity: "info",
      correlation_id: correlationId,
      entity_type: "invoice",
      entity_id: invoice.id,
      details: {
        source,
        gateway,
        duration_ms: Date.now() - requestStartedAt,
      },
    });

    return jsonResponse(req, {
      success: true,
      source,
      gateway,
      reference,
      amount,
      invoiceId: invoice.id,
      checkoutUrl,
      correlationId,
    });
  } catch (error: unknown) {
    console.error("payment-checkout error:", error);
    await emitAuditEvent({
      event_type: "payment.checkout.failed",
      source: "payment-checkout",
      severity: "error",
      details: {
        message: error instanceof Error ? error.message : "Internal server error",
        duration_ms: Date.now() - requestStartedAt,
      },
    });
    return errorResponse(req, {
      code: "internal_error",
      message: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
});
