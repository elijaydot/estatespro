import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Gateway = "paystack" | "flutterwave";
type Source = "tenant_invoice" | "landlord_invoice" | "guest_booking";
type PaymentMethod = "card" | "bank_transfer" | "mtn_momo" | "link";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getGatewayFromInput(input?: string | null): Gateway | null {
  if (input === "paystack" || input === "flutterwave") return input;
  return null;
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

async function ensureBookingInvoice(supabase: any, booking: any) {
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

function getGatewaySecret(gateway: Gateway, ownerUserId?: string) {
  const baseName = gateway === "paystack" ? "PAYSTACK_SECRET_KEY" : "FLUTTERWAVE_SECRET_KEY";
  const normalizedOwner = ownerUserId?.replace(/-/g, "_").toUpperCase();

  if (normalizedOwner) {
    const ownerScoped = Deno.env.get(`${baseName}_${normalizedOwner}`);
    if (ownerScoped) return ownerScoped;
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
        title: "EstatesPro Payment",
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing server configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const source = body?.source as Source | undefined;
    const paymentMethod = (body?.paymentMethod || "link") as PaymentMethod;
    const amountInput = Number(body?.amount || 0);
    const currency = (body?.currency || "NGN") as string;
    const explicitGateway = getGatewayFromInput(body?.gateway);
    const callbackUrl = body?.callbackUrl as string | undefined;

    if (!source) return jsonResponse({ error: "source is required" }, 400);

    if (source === "guest_booking") {
      const bookingToken = (body?.bookingToken as string | undefined)?.trim();
      if (!bookingToken) return jsonResponse({ error: "bookingToken is required" }, 400);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out, status, payment_status")
        .eq("guest_action_token", bookingToken)
        .single();

      if (bookingError || !booking) return jsonResponse({ error: "Invalid booking token" }, 404);
      if (booking.status === "cancelled") return jsonResponse({ error: "Booking is cancelled" }, 400);

      const invoice = await ensureBookingInvoice(supabase, booking);
      const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
      if (remaining <= 0) return jsonResponse({ error: "Booking is already fully paid" }, 400);

      const amount = amountInput > 0 ? amountInput : remaining;
      if (amount <= 0 || amount > remaining + 0.0001) {
        return jsonResponse({ error: "Invalid payment amount" }, 400);
      }

      const paymentSettings = await resolvePaymentSettings(supabase, booking.property_id, booking.user_id);
      if (!paymentSettings) {
        return jsonResponse({ error: "No payment gateway configured for this property" }, 400);
      }

      const gateway = explicitGateway || (paymentSettings.preferred_method === "flutterwave" ? "flutterwave" : "paystack");

      const reference = `BOOK-${booking.id.slice(0, 8)}-${Date.now()}`;
      const finalCallbackUrl =
        callbackUrl ||
        `${body?.origin || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173"}/bookings/guest-action?token=${encodeURIComponent(bookingToken)}&payment_return=1&gateway=${gateway}`;

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
          return jsonResponse({ error: "Paystack is not enabled for this property" }, 400);
        }

        checkoutUrl = await createPaystackCheckout({
          secretKey,
          email: booking.guest_email,
          amount,
          callbackUrl: finalCallbackUrl,
          reference,
          channels: mapPaymentChannels("paystack", paymentMethod) as string[],
          metadata,
        });
      } else {
        const secretKey = getGatewaySecret("flutterwave", paymentSettings.user_id || booking.user_id);
        if (!paymentSettings.flutterwave_enabled || !secretKey) {
          return jsonResponse({ error: "Flutterwave is not enabled for this property" }, 400);
        }

        checkoutUrl = await createFlutterwaveCheckout({
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
      }

      return jsonResponse({
        success: true,
        source,
        gateway,
        reference,
        amount,
        invoiceId: invoice.id,
        checkoutUrl,
      });
    }

    // Auth required for tenant/landlord invoice checkout
    const user = await getUserFromBearer(req, supabaseUrl, serviceRoleKey);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const invoiceId = (body?.invoiceId as string | undefined)?.trim();
    if (!invoiceId) return jsonResponse({ error: "invoiceId is required" }, 400);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id, tenant_id, property_id, amount, paid_amount, status, invoice_number, description")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) return jsonResponse({ error: "Invoice not found" }, 404);

    const { data: tenant } = invoice.tenant_id
      ? await supabase
          .from("tenants")
          .select("id, tenant_user_id, name, email")
          .eq("id", invoice.tenant_id)
          .maybeSingle()
      : { data: null as any };

    const isOwner = invoice.user_id === user.id;
    const isTenant = !!tenant?.tenant_user_id && tenant.tenant_user_id === user.id;

    if (!isOwner && !isTenant) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (!invoice.tenant_id || !tenant) {
      return jsonResponse({ error: "This invoice is not linked to a tenant" }, 400);
    }

    const remaining = Math.max(0, Number(invoice.amount) - Number(invoice.paid_amount));
    if (remaining <= 0) return jsonResponse({ error: "Invoice is already fully paid" }, 400);

    const amount = amountInput > 0 ? amountInput : remaining;
    if (amount <= 0 || amount > remaining + 0.0001) {
      return jsonResponse({ error: "Invalid payment amount" }, 400);
    }

    const paymentSettings = await resolvePaymentSettings(supabase, invoice.property_id, invoice.user_id);
    if (!paymentSettings) {
      return jsonResponse({ error: "No payment gateway configured for this property" }, 400);
    }

    const gateway = explicitGateway || (paymentSettings.preferred_method === "flutterwave" ? "flutterwave" : "paystack");
    const reference = `INV-${invoice.id.slice(0, 8)}-${Date.now()}`;

    const finalCallbackUrl =
      callbackUrl ||
      `${body?.origin || Deno.env.get("PUBLIC_APP_URL") || "http://localhost:5173"}/tenant/payments?payment_return=1&invoice_id=${encodeURIComponent(invoice.id)}&gateway=${gateway}`;

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
        return jsonResponse({ error: "Paystack is not enabled for this property" }, 400);
      }

      checkoutUrl = await createPaystackCheckout({
        secretKey,
        email: payerEmail,
        amount,
        callbackUrl: finalCallbackUrl,
        reference,
        channels: mapPaymentChannels("paystack", paymentMethod) as string[],
        metadata,
      });
    } else {
      const secretKey = getGatewaySecret("flutterwave", paymentSettings.user_id || invoice.user_id);
      if (!paymentSettings.flutterwave_enabled || !secretKey) {
        return jsonResponse({ error: "Flutterwave is not enabled for this property" }, 400);
      }

      checkoutUrl = await createFlutterwaveCheckout({
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
    }

    return jsonResponse({
      success: true,
      source,
      gateway,
      reference,
      amount,
      invoiceId: invoice.id,
      checkoutUrl,
    });
  } catch (error: any) {
    console.error("payment-checkout error:", error);
    return jsonResponse({ error: error?.message || "Internal server error" }, 500);
  }
});
