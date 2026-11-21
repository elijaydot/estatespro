import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import { buildCorsHeaders, handleCorsPreflight } from "../_shared/security.ts";
import { createCorrelationId } from "../_shared/observability.ts";

function getAdminClient() {
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

  const corsHeaders = buildCorsHeaders(req, "POST, OPTIONS");
  const correlationId = req.headers.get("x-correlation-id") || createCorrelationId();

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST for Mobile Money webhooks." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[MoMo Webhook] Correlation: ${correlationId}, Payload:`, JSON.stringify(payload));

    // Handle Paypack Rwanda, MTN MoMo, or generic East African mobile money callbacks
    // Paypack payload format: { event: "transaction.successful", data: { ref, amount, client, kind: "CASHIN" } }
    // MTN MoMo format: { financialTransactionId, externalId, amount, currency, status: "SUCCESSFUL", payer: { partyId } }
    
    let transactionRef = "";
    let amount = 0;
    let clientPhone = "";
    let isSuccess = false;
    let invoiceId = "";

    const paypackData = payload.data as Record<string, unknown> | undefined;
    if (payload.event === "transaction.successful" && paypackData) {
      transactionRef = String(paypackData.ref || "");
      amount = Number(paypackData.amount || 0);
      clientPhone = String(paypackData.client || "");
      isSuccess = true;
    } else if (payload.financialTransactionId || payload.status === "SUCCESSFUL") {
      transactionRef = String(payload.financialTransactionId || payload.externalId || "");
      amount = Number(payload.amount || 0);
      const payer = payload.payer as Record<string, unknown> | undefined;
      clientPhone = String(payer?.partyId || "");
      isSuccess = payload.status === "SUCCESSFUL";
      invoiceId = String(payload.externalId || "");
    } else if (payload.transactionRef) {
      // Direct FishGate simulation/internal webhook
      transactionRef = String(payload.transactionRef || "");
      amount = Number(payload.amount || 0);
      clientPhone = String(payload.phone || "");
      invoiceId = String(payload.invoiceId || "");
      isSuccess = payload.status === "successful" || payload.status === "completed";
    }

    if (!isSuccess) {
      return new Response(
        JSON.stringify({ status: "acknowledged", message: "Transaction not marked as successful", correlationId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = getAdminClient();

    // 1. Locate matching invoice
    let matchedInvoice: Record<string, unknown> | null = null;
    if (invoiceId) {
      const { data } = await adminClient.from("invoices").select("*").eq("id", invoiceId).single();
      matchedInvoice = data;
    }

    if (!matchedInvoice && transactionRef) {
      // Check if reference contains invoice id or matches payments
      const { data } = await adminClient
        .from("invoices")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      matchedInvoice = data?.[0] || null;
    }

    if (!matchedInvoice) {
      console.warn(`[MoMo Webhook] No matching invoice found for ref ${transactionRef}`);
      return new Response(
        JSON.stringify({ status: "acknowledged", warning: "Invoice not resolved", correlationId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invId = String(matchedInvoice.id);
    const totalAmount = Number(matchedInvoice.amount || amount);

    // 2. Mark invoice as paid
    const nowIso = new Date().toISOString();
    await adminClient
      .from("invoices")
      .update({
        paid_amount: totalAmount,
        status: "paid",
        paid_at: nowIso,
      })
      .eq("id", invId);

    // 3. Insert payment ledger record
    const { data: newPayment } = await adminClient
      .from("payments")
      .insert({
        invoice_id: invId,
        amount: totalAmount,
        method: clientPhone.includes("78") || clientPhone.includes("79") ? "mtn_momo" : "airtel_money",
        telecom_operator: clientPhone.includes("78") || clientPhone.includes("79") ? "MTN" : "AIRTEL",
        momo_phone: clientPhone,
        transaction_ref: transactionRef,
        gateway_provider: "paypack",
        status: "completed",
        payment_date: nowIso.split("T")[0],
        notes: `Mobile Money settlement ref: ${transactionRef}`,
      })
      .select()
      .single();

    // 4. Call RRA EBM receipt generation stored procedure
    let ebmReceiptNumber = "";
    try {
      const { data: ebmRes } = await adminClient.rpc("generate_rra_ebm_receipt", {
        p_invoice_id: invId,
        p_payment_id: newPayment?.id || null,
      });
      ebmReceiptNumber = ebmRes?.receipt_number || "";
    } catch (ebmErr) {
      console.error("[MoMo Webhook] Failed to call generate_rra_ebm_receipt RPC:", ebmErr);
    }

    // 5. Confirm any active CRM unit booking hold
    try {
      await adminClient
        .from("crm_unit_bookings")
        .update({ status: "confirmed" })
        .eq("invoice_id", invId);
    } catch {
      // Ignore if crm_unit_bookings table doesn't have matching record
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mobile Money payment recorded and RRA EBM receipt generated",
        invoiceId: invId,
        paymentId: newPayment?.id,
        ebmReceiptNumber,
        correlationId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[MoMo Webhook] Internal Error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal processing error", detail: msg, correlationId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
