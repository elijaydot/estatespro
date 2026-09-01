import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  handleCorsPreflight,
  validatePaystackWebhookSignature,
} from "../_shared/security.ts";
import {
  createCorrelationId,
  emitAuditEvent,
} from "../_shared/observability.ts";

type AdminClient = ReturnType<typeof createClient>;

function getAdminClient(): AdminClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req, "POST, OPTIONS");
  }

  const correlationId = req.headers.get("x-correlation-id") || createCorrelationId();
  const corsHeaders = buildCorsHeaders(req, "POST, OPTIONS");

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST for Paystack webhooks." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawBody = await req.text();
    
    // 1. Cryptographic HMAC-SHA512 Signature Verification
    const sigCheck = await validatePaystackWebhookSignature(req, rawBody);
    if (!sigCheck.valid) {
      console.error(`[Paystack Webhook] Signature verification failed: ${sigCheck.reason}`);
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid Paystack signature",
          reason: sigCheck.reason,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload?.event || "unknown";
    const eventData = payload?.data || {};
    const reference: string = eventData?.reference || eventData?.trxref || "";
    const metadata = eventData?.metadata || {};
    const channel: string = eventData?.channel || "card";
    const amountMinor: number = Number(eventData?.amount || 0);
    const currency: string = (eventData?.currency || "RWF").toUpperCase();

    const admin = getAdminClient();

    console.info(`[Paystack Webhook] Received event=${eventType} ref=${reference} mode=${sigCheck.secretMatched || 'live'} amount=${amountMinor} ${currency}`);

    // Log incoming webhook event for audit & replay tracking
    await emitAuditEvent(admin, {
      action: "paystack.webhook.received",
      actor_id: "paystack-webhook-gateway",
      correlation_id: correlationId,
      entity_type: "webhook_event",
      entity_id: reference || correlationId,
      metadata: {
        event_type: eventType,
        reference,
        amount_minor: amountMinor,
        currency,
        channel,
        mode: sigCheck.secretMatched,
      },
    });

    let reconciliationResult: Record<string, unknown> = { processed: false };

    // 2. Handle Successful Charges
    if (eventType === "charge.success") {
      const paymentKind = metadata.kind || metadata.payment_kind || metadata.type || "";
      const paymentAttemptId = metadata.payment_attempt_id || metadata.attempt_id;
      const ownerGroupAttemptId = metadata.owner_group_payment_attempt_id;
      const invoiceId = metadata.invoice_id;
      const bookingId = metadata.booking_id;

      // Scenario A: SaaS Subscription Plan Payment
      if (paymentKind === "saas_subscription" || paymentAttemptId) {
        if (paymentAttemptId) {
          const { data: finalizeData, error: finalizeError } = await admin.rpc(
            "saas_finalize_subscription_payment_attempt",
            {
              p_payment_attempt_id: paymentAttemptId,
              p_external_reference: reference,
              p_provider_event: eventData,
            }
          );
          if (finalizeError) {
            console.error(`[Paystack Webhook] saas_finalize_subscription_payment_attempt failed:`, finalizeError);
          } else {
            reconciliationResult = { kind: "saas_subscription", attemptId: paymentAttemptId, details: finalizeData };
          }
        }
      }
      // Scenario B: Owner Billing Group Subscription Payment
      else if (paymentKind === "saas_owner_group" || ownerGroupAttemptId) {
        if (ownerGroupAttemptId) {
          const { data: finalizeData, error: finalizeError } = await admin.rpc(
            "saas_finalize_owner_group_payment_attempt",
            {
              p_payment_attempt_id: ownerGroupAttemptId,
              p_external_reference: reference,
              p_provider_event: eventData,
            }
          );
          if (finalizeError) {
            console.error(`[Paystack Webhook] saas_finalize_owner_group_payment_attempt failed:`, finalizeError);
          } else {
            reconciliationResult = { kind: "saas_owner_group", attemptId: ownerGroupAttemptId, details: finalizeData };
          }
        }
      }
      // Scenario C: Tenant Rent Invoice Payment
      else if (invoiceId) {
        const { data: invoice, error: invoiceErr } = await admin
          .from("invoices")
          .select("id, amount, paid_amount, status, company_id, tenant_id, property_id")
          .eq("id", invoiceId)
          .maybeSingle();

        if (!invoiceErr && invoice) {
          const amountMajor = amountMinor / 100;
          const newPaidAmount = Number(invoice.paid_amount || 0) + amountMajor;
          const newStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partially_paid";

          await admin
            .from("invoices")
            .update({
              paid_amount: newPaidAmount,
              status: newStatus,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);

          // Record payment transaction
          await admin.from("payments").insert({
            invoice_id: invoiceId,
            amount: amountMajor,
            payment_method: channel === "mobile_money" ? "mobile_money" : "card",
            payment_date: new Date().toISOString().split("T")[0],
            reference_number: reference,
            notes: `Paystack webhook verified (${channel}) - ref: ${reference}`,
            status: "completed",
            company_id: invoice.company_id,
          });

          reconciliationResult = { kind: "tenant_invoice", invoiceId, newStatus, newPaidAmount };
        }
      }
      // Scenario D: Guest Short-let Booking
      else if (bookingId) {
        const { data: booking, error: bookingErr } = await admin
          .from("guest_bookings")
          .select("id, total_amount, status")
          .eq("id", bookingId)
          .maybeSingle();

        if (!bookingErr && booking) {
          await admin
            .from("guest_bookings")
            .update({
              status: "confirmed",
              payment_status: "paid",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          reconciliationResult = { kind: "guest_booking", bookingId, status: "confirmed" };
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Paystack webhook verified and processed successfully",
        event: eventType,
        reference,
        reconciliation: reconciliationResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Paystack Webhook] Exception occurred: ${errorMsg}`);
    return new Response(
      JSON.stringify({ error: "Internal server error processing webhook", details: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
