import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Gateway = "paystack" | "flutterwave";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

async function resolvePaymentSettings(supabase: any, propertyId: string, ownerUserId?: string) {
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

async function ensureBookingInvoice(supabase: any, booking: any) {
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id, amount, paid_amount, status")
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
    .select("id, amount, paid_amount, status")
    .single();

  if (invoiceError) throw new Error(invoiceError.message || "Failed to create booking invoice");
  return createdInvoice;
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

async function saveTenantInvoicePayment(supabase: any, invoice: any, amount: number, method: string, reference: string) {
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

async function saveGuestBookingPayment(supabase: any, booking: any, invoice: any, amount: number, method: string, reference: string) {
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing server configuration" }, 500);
    }

    const body = await req.json();

    const caller = await getUserFromBearer(req, supabaseUrl, serviceRoleKey);
    if (!caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Used by Settings -> Payment Settings screen to test credentials before save.
    if (body?.test_mode) {
      const gateway = body?.gateway as Gateway | undefined;
      const secretKey = (body?.secret_key as string | undefined)?.trim();

      if (!gateway || !secretKey) {
        return jsonResponse({ error: "gateway and secret_key are required in test_mode" }, 400);
      }

      if (gateway === "paystack") {
        const response = await fetch("https://api.paystack.co/bank", {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return jsonResponse({ success: false, error: errorData?.message || "Paystack verification failed" }, 400);
        }
      } else {
        const response = await fetch("https://api.flutterwave.com/v3/banks/NG", {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return jsonResponse({ success: false, error: errorData?.message || "Flutterwave verification failed" }, 400);
        }
      }

      return jsonResponse({ success: true, message: `${gateway} credentials verified` });
    }

    const gateway = body?.gateway as Gateway | undefined;
    const reference = (body?.reference || body?.tx_ref) as string | undefined;
    const bookingToken = body?.bookingToken as string | undefined;
    const invoiceId = body?.invoiceId as string | undefined;

    if (!gateway || !reference) {
      return jsonResponse({ error: "gateway and reference are required" }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (bookingToken) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out")
        .eq("guest_action_token", bookingToken)
        .single();

      if (bookingError || !booking) return jsonResponse({ error: "Invalid booking token" }, 404);

      const settings = await resolvePaymentSettings(supabase, booking.property_id, booking.user_id);
      if (!settings) return jsonResponse({ error: "Payment settings not configured" }, 400);

      const verification = gateway === "paystack"
        ? await verifyPaystack(settings.paystack_secret_key, reference)
        : await verifyFlutterwave(settings.flutterwave_secret_key, reference);

      const invoice = await ensureBookingInvoice(supabase, booking);
      const result = await saveGuestBookingPayment(supabase, booking, invoice, verification.amount, verification.method, verification.reference);

      return jsonResponse({
        success: true,
        verified: true,
        source: "guest_booking",
        paymentId: result.paymentId,
        alreadyProcessed: result.alreadyProcessed,
        amount: verification.amount,
      });
    }

    const user = await getUserFromBearer(req, supabaseUrl, serviceRoleKey);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (!invoiceId) return jsonResponse({ error: "invoiceId is required" }, 400);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id, tenant_id, property_id, amount, paid_amount, status")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) return jsonResponse({ error: "Invoice not found" }, 404);

    const { data: tenant } = invoice.tenant_id
      ? await supabase
          .from("tenants")
          .select("id, tenant_user_id")
          .eq("id", invoice.tenant_id)
          .maybeSingle()
      : { data: null as any };

    const isOwner = invoice.user_id === user.id;
    const isTenant = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;

    if (!isOwner && !isTenant) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const settings = await resolvePaymentSettings(supabase, invoice.property_id, invoice.user_id);
    if (!settings) return jsonResponse({ error: "Payment settings not configured" }, 400);

    const verification = gateway === "paystack"
      ? await verifyPaystack(settings.paystack_secret_key, reference)
      : await verifyFlutterwave(settings.flutterwave_secret_key, reference);

    const result = await saveTenantInvoicePayment(supabase, invoice, verification.amount, verification.method, verification.reference);

    return jsonResponse({
      success: true,
      verified: true,
      source: "tenant_invoice",
      paymentId: result.paymentId,
      alreadyProcessed: result.alreadyProcessed,
      amount: verification.amount,
    });
  } catch (error: any) {
    console.error("verify-payment error:", error);
    return jsonResponse({ error: error?.message || "Internal server error" }, 500);
  }
});
