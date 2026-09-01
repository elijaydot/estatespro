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
import {
  buildPaymentErrorEnvelope,
  type ContractError,
  type Gateway,
  parseVerifyPayload,
} from "../_shared/payment-contract.ts";
import { buildWebhookSignature, computeWebhookBackoffMs, shouldRetryWebhookDelivery } from "../_shared/webhook-delivery.ts";
import { buildWebhookEventEnvelope } from "../_shared/webhook-events.ts";

type AdminClient = ReturnType<typeof createClient>;

type PaymentSettings = {
  user_id: string | null;
  company_id: string | null;
  property_id: string | null;
};

type BookingRecord = {
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

type InvoiceRecord = {
  id: string;
  user_id: string;
  tenant_id: string | null;
  property_id: string;
  amount: number;
  paid_amount: number;
  status: string;
};

type TenantRecord = {
  id: string;
  tenant_user_id: string | null;
};

type PaymentResult = {
  paymentId: string | null;
  alreadyProcessed: boolean;
};

type WebhookEndpoint = {
  id: string;
  target_url: string;
  secret_ref: string;
  max_attempts: number;
  timeout_ms: number;
};

function getErrorMessage(error: unknown, fallback = "Internal server error") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function errorResponse(req: Request, error: ContractError, correlationId?: string) {
  return jsonResponse(req, buildPaymentErrorEnvelope(error, correlationId), error.status);
}

function normalizeMethod(method?: string | null) {
  const value = (method || "").toLowerCase();
  if (value.includes("mobile") || value.includes("momo")) return "mtn_momo";
  if (value.includes("bank")) return "bank_transfer";
  if (value.includes("card")) return "card";
  return "other";
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

async function resolvePaymentSettings(supabase: AdminClient, propertyId: string, ownerUserId?: string) {
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

  if (propertySettings) return propertySettings as PaymentSettings;

  if (property.company_id) {
    const { data: companySettings } = await supabase
      .from("landlord_payment_settings")
      .select("*")
      .eq("company_id", property.company_id)
      .is("property_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (companySettings) return companySettings as PaymentSettings;
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

  return (globalSettings as PaymentSettings | null) || null;
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

async function ensureBookingInvoice(supabase: AdminClient, booking: BookingRecord) {
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id, amount, paid_amount, status")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (existingInvoice) return existingInvoice as Pick<InvoiceRecord, "id" | "amount" | "paid_amount" | "status">;

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
    .select("id, amount, paid_amount, status")
    .single();

  if (invoiceError) throw new Error(invoiceError.message || "Failed to create booking invoice");
  return createdInvoice as Pick<InvoiceRecord, "id" | "amount" | "paid_amount" | "status">;
}

async function verifyPaystack(secretKey: string, reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok || !data?.status || data?.data?.status !== "success") {
    throw new Error(data?.message || "Paystack verification failed");
  }

  return {
    amount: Number(data.data.amount || 0) / 100,
    method: normalizeMethod(data.data.channel),
    reference,
    providerTransactionId: String(data.data.id || ""),
  };
}

async function verifyFlutterwave(secretKey: string, reference: string) {
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok || data?.status !== "success" || data?.data?.status !== "successful") {
    throw new Error(data?.message || "Flutterwave verification failed");
  }

  return {
    amount: Number(data.data.amount || 0),
    method: normalizeMethod(data.data.payment_type),
    reference,
    providerTransactionId: String(data.data.id || ""),
  };
}

async function saveTenantInvoicePayment(supabase: AdminClient, invoice: InvoiceRecord, amount: number, method: string, reference: string): Promise<PaymentResult> {
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("reference", reference)
    .maybeSingle();

  if (existing?.id) {
    return { paymentId: existing.id, alreadyProcessed: true };
  }

  const tenantId = invoice.tenant_id;
  if (!tenantId) throw new Error("Invoice is not linked to a tenant");

  const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
  if (remaining <= 0) return { paymentId: null, alreadyProcessed: true };

  const amountToRecord = Math.min(amount, remaining);

  const { data: paymentId, error } = await supabase.rpc("process_payment", {
    p_invoice_id: invoice.id,
    p_tenant_id: tenantId,
    p_amount: amountToRecord,
    p_method: method,
    p_reference: reference,
    p_notes: "Provider-backed checkout payment",
  });

  if (error) throw new Error(error.message || "Failed to record payment");

  return { paymentId, alreadyProcessed: false };
}

async function saveGuestBookingPayment(
  supabase: AdminClient,
  booking: BookingRecord,
  invoice: Pick<InvoiceRecord, "id" | "amount" | "paid_amount" | "status">,
  amount: number,
  method: string,
  reference: string,
): Promise<PaymentResult> {
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("reference", reference)
    .maybeSingle();

  if (existing?.id) {
    return { paymentId: existing.id, alreadyProcessed: true };
  }

  const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
  if (remaining <= 0) return { paymentId: null, alreadyProcessed: true };

  const amountToRecord = Math.min(amount, remaining);

  const { data: inserted, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: booking.user_id,
      invoice_id: invoice.id,
      tenant_id: null,
      booking_id: booking.id,
      amount: amountToRecord,
      method,
      reference,
      status: "completed",
      payer_name: booking.guest_name,
      payer_email: booking.guest_email,
      source: "shortlet_booking",
      notes: "Provider-backed checkout payment",
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message || "Failed to record booking payment");

  const newPaid = Number(invoice.paid_amount || 0) + amountToRecord;
  const invoiceStatus = newPaid >= Number(invoice.amount) ? "paid" : "partial";

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      paid_amount: newPaid,
      status: invoiceStatus,
      paid_at: invoiceStatus === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  if (invoiceUpdateError) throw new Error(invoiceUpdateError.message || "Failed to update invoice");

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      payment_status: invoiceStatus,
      guest_response_status: "accepted",
      guest_responded_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (bookingUpdateError) throw new Error(bookingUpdateError.message || "Failed to update booking");

  return { paymentId: inserted.id, alreadyProcessed: false };
}

async function persistWebhookAttempt(
  supabase: AdminClient,
  payload: {
    endpointId: string;
    eventType: string;
    eventId: string;
    correlationId?: string;
    envelope: Record<string, unknown>;
    signature?: string;
    attempt: number;
    statusCode: number | null;
    success: boolean;
    errorMessage?: string;
    durationMs: number;
    nextRetryAt?: string;
  },
) {
  await supabase.from("webhook_delivery_attempts").insert({
    endpoint_id: payload.endpointId,
    event_type: payload.eventType,
    event_id: payload.eventId,
    correlation_id: payload.correlationId || null,
    payload: payload.envelope,
    signature: payload.signature || null,
    attempt: payload.attempt,
    status_code: payload.statusCode,
    success: payload.success,
    error_message: payload.errorMessage || null,
    duration_ms: payload.durationMs,
    next_retry_at: payload.nextRetryAt || null,
    delivered_at: payload.success ? new Date().toISOString() : null,
  });
}

async function persistWebhookDeadLetter(
  supabase: AdminClient,
  payload: {
    endpointId: string;
    eventType: string;
    eventId: string;
    correlationId?: string;
    envelope: Record<string, unknown>;
    finalStatusCode: number | null;
    failureReason: string;
    totalAttempts: number;
  },
) {
  await supabase.from("webhook_dead_letters").upsert({
    endpoint_id: payload.endpointId,
    event_type: payload.eventType,
    event_id: payload.eventId,
    correlation_id: payload.correlationId || null,
    payload: payload.envelope,
    final_status_code: payload.finalStatusCode,
    failure_reason: payload.failureReason,
    total_attempts: payload.totalAttempts,
  }, { onConflict: "endpoint_id,event_id" });
}

async function dispatchPaymentVerifiedWebhooks(
  supabase: AdminClient,
  payload: {
    source: "guest_booking" | "tenant_invoice";
    invoiceId: string;
    paymentId: string | null;
    reference: string;
    amount: number;
    correlationId: string;
    actorUserId?: string;
  },
) {
  const eventType = "payment.verified";
  const envelope = buildWebhookEventEnvelope({
    eventType,
    correlationId: payload.correlationId,
    actorUserId: payload.actorUserId,
    payload: {
      source: payload.source,
      invoiceId: payload.invoiceId,
      paymentId: payload.paymentId,
      reference: payload.reference,
      amount: payload.amount,
    },
  });

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, target_url, secret_ref, max_attempts, timeout_ms")
    .eq("is_active", true)
    .eq("event_type", eventType);

  const endpointList = (endpoints as WebhookEndpoint[] | null) || [];
  if (endpointList.length === 0) return;

  const body = JSON.stringify(envelope);

  for (const endpoint of endpointList) {
    const secret = Deno.env.get(endpoint.secret_ref) || "";
    if (!secret) {
      await persistWebhookDeadLetter(supabase, {
        endpointId: endpoint.id,
        eventType,
        eventId: envelope.event_id,
        correlationId: payload.correlationId,
        envelope: envelope as Record<string, unknown>,
        finalStatusCode: null,
        failureReason: "Missing webhook secret",
        totalAttempts: 0,
      });
      continue;
    }

    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = await buildWebhookSignature({
      secret,
      payload: body,
      timestamp,
    });

    const startedAt = Date.now();
    let statusCode: number | null = null;
    let success = false;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(endpoint.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-signature": signature,
          "x-webhook-timestamp": timestamp,
          "x-webhook-event": eventType,
          "x-webhook-version": envelope.version,
        },
        body,
      });

      statusCode = response.status;
      success = response.ok;
      if (!success) {
        const responseText = await response.text().catch(() => "");
        errorMessage = responseText || `HTTP ${response.status}`;
      }
    } catch (error) {
      success = false;
      errorMessage = getErrorMessage(error);
    }

    const shouldRetry = shouldRetryWebhookDelivery(statusCode, 1, endpoint.max_attempts);
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + computeWebhookBackoffMs(1)).toISOString()
      : undefined;

    await persistWebhookAttempt(supabase, {
      endpointId: endpoint.id,
      eventType,
      eventId: envelope.event_id,
      correlationId: payload.correlationId,
      envelope: envelope as Record<string, unknown>,
      signature,
      attempt: 1,
      statusCode,
      success,
      errorMessage,
      durationMs: Date.now() - startedAt,
      nextRetryAt,
    });

    if (!success && !shouldRetry) {
      await persistWebhookDeadLetter(supabase, {
        endpointId: endpoint.id,
        eventType,
        eventId: envelope.event_id,
        correlationId: payload.correlationId,
        envelope: envelope as Record<string, unknown>,
        finalStatusCode: statusCode,
        failureReason: errorMessage || "Webhook delivery failed",
        totalAttempts: 1,
      });
    }
  }
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
    keyPrefix: "verify-payment",
    limit: 120,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    await emitAuditEvent({
      event_type: "payment.verify.rate_limited",
      source: "verify-payment",
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

    const parsed = parseVerifyPayload(body);
    const correlationId = parsed.ok ? (parsed.value.correlationId || createCorrelationId()) : createCorrelationId();

    if (!parsed.ok) {
      return errorResponse(req, parsed.error, correlationId);
    }

    const payload = parsed.value;

    const caller = await getUserFromBearer(req, supabaseUrl, serviceRoleKey);
    if (!caller) {
      return errorResponse(req, {
        code: "unauthorized",
        message: "Unauthorized",
        status: 401,
      }, correlationId);
    }

    await emitAuditEvent({
      event_type: "payment.verify.initiated",
      source: "verify-payment",
      actor_user_id: caller.id,
      severity: "info",
      correlation_id: correlationId,
      details: {
        gateway: payload.gateway,
        hasBookingToken: Boolean(payload.bookingToken),
        invoiceId: payload.invoiceId || null,
      },
    });

    // Used by Settings -> Payment Settings screen to test credentials before save.
    if (payload.test_mode) {
      const secretKey = getGatewaySecret(payload.gateway);

      if (!secretKey) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Gateway secret is not configured on the server",
          status: 400,
        }, correlationId);
      }

      if (payload.gateway === "paystack") {
        const response = await fetch("https://api.paystack.co/bank", {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return errorResponse(req, {
            code: "gateway_error",
            message: errorData?.message || "Paystack verification failed",
            status: 400,
          }, correlationId);
        }
      } else {
        const response = await fetch("https://api.flutterwave.com/v3/banks/NG", {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return errorResponse(req, {
            code: "gateway_error",
            message: errorData?.message || "Flutterwave verification failed",
            status: 400,
          }, correlationId);
        }
      }

      await emitAuditEvent({
        event_type: "payment.verify.completed",
        source: "verify-payment",
        actor_user_id: caller.id,
        severity: "info",
        correlation_id: correlationId,
        details: {
          source: "settings_test",
          gateway: payload.gateway,
          duration_ms: Date.now() - requestStartedAt,
        },
      });

      return jsonResponse(req, {
        success: true,
        message: `${payload.gateway} credentials verified`,
        correlationId,
      });
    }

    const gateway = payload.gateway;
    const reference = payload.reference;
    const bookingToken = payload.bookingToken;
    const invoiceId = payload.invoiceId;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (bookingToken) {
      const mustSignGuestVerification = Deno.env.get("REQUIRE_GUEST_SIGNED_REQUESTS") === "true";
      const validSignature = await validateRequestSignature(req, rawBody, {
        required: mustSignGuestVerification,
      });

      if (!validSignature) {
        await emitAuditEvent({
          event_type: "payment.verify.invalid_signature",
          source: "verify-payment",
          actor_user_id: caller.id,
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

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out")
        .eq("guest_action_token", bookingToken)
        .single();

      if (bookingError || !booking) {
        return errorResponse(req, {
          code: "not_found",
          message: "Invalid booking token",
          status: 404,
        }, correlationId);
      }

      const bookingRecord = booking as BookingRecord;

      const settings = await resolvePaymentSettings(supabase, bookingRecord.property_id, bookingRecord.user_id);
      if (!settings) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Payment settings not configured",
          status: 400,
        }, correlationId);
      }

      const secretKey = getGatewaySecret(gateway, settings.user_id || bookingRecord.user_id);
      if (!secretKey) {
        return errorResponse(req, {
          code: "validation_failed",
          message: "Gateway secret is not configured on the server",
          status: 400,
        }, correlationId);
      }

      const invoice = await ensureBookingInvoice(supabase, bookingRecord);

      const verification = await withTimedAudit({
        eventBase: "payment.verify.gateway",
        source: "verify-payment",
        actorUserId: caller.id,
        correlationId,
        details: {
          gateway,
          source: "guest_booking",
          invoiceId: invoice.id,
        },
      }, async () => {
        return gateway === "paystack"
          ? await verifyPaystack(secretKey, reference)
          : await verifyFlutterwave(secretKey, reference);
      });
      const result = await saveGuestBookingPayment(supabase, bookingRecord, invoice, verification.amount, verification.method, verification.reference);

      if (result.alreadyProcessed) {
        await emitAuditEvent({
          event_type: "payment.verify.idempotent_duplicate",
          source: "verify-payment",
          actor_user_id: caller.id,
          severity: "info",
          correlation_id: correlationId,
          entity_type: "invoice",
          entity_id: invoice.id,
          details: { reference: verification.reference, source: "guest_booking" },
        });
      }

      await emitAuditEvent({
        event_type: "payment.verify.completed",
        source: "verify-payment",
        actor_user_id: caller.id,
        severity: "info",
        correlation_id: correlationId,
        entity_type: "invoice",
        entity_id: invoice.id,
        details: {
          source: "guest_booking",
          alreadyProcessed: result.alreadyProcessed,
          duration_ms: Date.now() - requestStartedAt,
        },
      });

      return jsonResponse(req, {
        success: true,
        verified: true,
        source: "guest_booking",
        paymentId: result.paymentId,
        alreadyProcessed: result.alreadyProcessed,
        amount: verification.amount,
        correlationId,
      });
    }

    const user = caller;

    if (!invoiceId) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "invoiceId is required",
        status: 400,
      }, correlationId);
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id, tenant_id, property_id, amount, paid_amount, status")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return errorResponse(req, {
        code: "not_found",
        message: "Invoice not found",
        status: 404,
      }, correlationId);
    }

    const invoiceRecord = invoice as InvoiceRecord;

    let tenant: TenantRecord | null = null;
    if (invoiceRecord.tenant_id) {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, tenant_user_id")
        .eq("id", invoiceRecord.tenant_id)
        .maybeSingle();
      tenant = (tenantData as TenantRecord | null) || null;
    }

    const isOwner = invoiceRecord.user_id === user.id;
    const isTenant = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;

    if (!isOwner && !isTenant) {
      return errorResponse(req, {
        code: "forbidden",
        message: "Forbidden",
        status: 403,
      }, correlationId);
    }

    const settings = await resolvePaymentSettings(supabase, invoiceRecord.property_id, invoiceRecord.user_id);
    if (!settings) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "Payment settings not configured",
        status: 400,
      }, correlationId);
    }

    const secretKey = getGatewaySecret(gateway, settings.user_id || invoiceRecord.user_id);
    if (!secretKey) {
      return errorResponse(req, {
        code: "validation_failed",
        message: "Gateway secret is not configured on the server",
        status: 400,
      }, correlationId);
    }

    const verification = await withTimedAudit({
      eventBase: "payment.verify.gateway",
      source: "verify-payment",
      actorUserId: caller.id,
      correlationId,
      details: {
        gateway,
        source: "tenant_invoice",
        invoiceId: invoiceRecord.id,
      },
    }, async () => {
      return gateway === "paystack"
        ? await verifyPaystack(secretKey, reference)
        : await verifyFlutterwave(secretKey, reference);
    });

    const result = await saveTenantInvoicePayment(supabase, invoiceRecord, verification.amount, verification.method, verification.reference);

    if (result.alreadyProcessed) {
      await emitAuditEvent({
        event_type: "payment.verify.idempotent_duplicate",
        source: "verify-payment",
        actor_user_id: caller.id,
        severity: "info",
        correlation_id: correlationId,
        entity_type: "invoice",
        entity_id: invoiceRecord.id,
        details: { reference: verification.reference, source: "tenant_invoice" },
      });
    }

    await emitAuditEvent({
      event_type: "payment.verify.completed",
      source: "verify-payment",
      actor_user_id: caller.id,
      severity: "info",
      correlation_id: correlationId,
      entity_type: "invoice",
      entity_id: invoiceRecord.id,
      details: {
        source: "tenant_invoice",
        alreadyProcessed: result.alreadyProcessed,
        duration_ms: Date.now() - requestStartedAt,
      },
    });

    try {
      await dispatchPaymentVerifiedWebhooks(supabase, {
        source: "tenant_invoice",
        invoiceId: invoiceRecord.id,
        paymentId: result.paymentId,
        reference: verification.reference,
        amount: verification.amount,
        correlationId,
        actorUserId: caller.id,
      });
    } catch (webhookError: unknown) {
      await emitAuditEvent({
        event_type: "payment.verify.webhook_dispatch_failed",
        source: "verify-payment",
        actor_user_id: caller.id,
        severity: "warning",
        correlation_id: correlationId,
        entity_type: "invoice",
        entity_id: invoiceRecord.id,
        details: {
          source: "tenant_invoice",
          message: getErrorMessage(webhookError),
        },
      });
    }

    return jsonResponse(req, {
      success: true,
      verified: true,
      source: "tenant_invoice",
      paymentId: result.paymentId,
      alreadyProcessed: result.alreadyProcessed,
      amount: verification.amount,
      correlationId,
    });
  } catch (error: unknown) {
    console.error("verify-payment error:", error);
    await emitAuditEvent({
      event_type: "payment.verify.failed",
      source: "verify-payment",
      severity: "error",
      details: {
        message: getErrorMessage(error),
        duration_ms: Date.now() - requestStartedAt,
      },
    });
    return errorResponse(req, {
      code: "internal_error",
      message: getErrorMessage(error),
      status: 500,
    });
  }
});
