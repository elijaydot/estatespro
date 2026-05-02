import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailType =
  | "status_update"
  | "payment_request"
  | "reminder"
  | "check_in_details"
  | "cancellation_notice";

const ALLOWED_PAYMENT_METHODS = ["cash", "bank_transfer", "mtn_momo", "card", "other"] as const;

type PaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAppUrl(origin?: string | null) {
  if (origin && origin.startsWith("http")) return origin;
  const configured = Deno.env.get("PUBLIC_APP_URL");
  if (configured && configured.startsWith("http")) return configured;
  return "http://localhost:5173";
}

async function requireOwnerUser(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Unauthorized");
  }

  return userData.user;
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

  if (invoiceError) {
    throw new Error(invoiceError.message || "Failed to create booking invoice");
  }

  return createdInvoice;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Server is missing required Supabase env vars" }, 500);
    }

    const body = await req.json();
    const operation = body?.operation as "send_email" | "get_action_context" | "submit_action";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (operation === "send_email") {
      const user = await requireOwnerUser(req, supabaseUrl, supabaseAnonKey);
      const bookingId = body?.bookingId as string | undefined;
      const emailType = body?.emailType as EmailType | undefined;
      const customMessage = body?.customMessage as string | undefined;
      const appUrl = getAppUrl(body?.origin);

      if (!bookingId || !emailType) {
        return jsonResponse({ error: "bookingId and emailType are required" }, 400);
      }

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return jsonResponse({ error: "Email service not configured (RESEND_API_KEY missing)" }, 500);
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, check_in, check_out, total_amount, status, payment_status, guest_action_token, properties:property_id(name), units:unit_id(unit_number)")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return jsonResponse({ error: "Booking not found" }, 404);
      }

      if (booking.user_id !== user.id) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const token = booking.guest_action_token || crypto.randomUUID();
      if (!booking.guest_action_token) {
        await supabase.from("bookings").update({ guest_action_token: token }).eq("id", booking.id);
      }

      let invoice = null;
      if (emailType === "payment_request" || booking.status === "confirmed") {
        invoice = await ensureBookingInvoice(supabase, booking);
      }

      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("user_id", booking.user_id)
        .maybeSingle();

      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("company_name, company_email")
        .eq("user_id", booking.user_id)
        .maybeSingle();

      const companyName = companySettings?.company_name || "EstatesPro";
      const fromEmail = companySettings?.company_email
        ? `${companyName} <${companySettings.company_email}>`
        : `${companyName} <noreply@resend.dev>`;

      const actionBase = `${appUrl}/bookings/guest-action?token=${encodeURIComponent(token)}`;
      const acceptUrl = `${actionBase}&action=accept`;
      const cancelUrl = `${actionBase}&action=cancel`;
      const payUrl = `${actionBase}&action=pay`;

      const statusMap: Record<EmailType, string> = {
        status_update: "Booking Status Update",
        payment_request: "Payment Request",
        reminder: "Booking Reminder",
        check_in_details: "Check-in Details",
        cancellation_notice: "Booking Cancellation Notice",
      };

      const readableStatus = booking.status.replace("_", " ");
      const readablePaymentStatus = booking.payment_status.replace("_", " ");
      const amountHtml = `<p><strong>Total:</strong> ${Number(booking.total_amount).toLocaleString()}</p>`;

      const defaultMessage =
        emailType === "payment_request"
          ? "Your booking is confirmed. Please complete your payment to secure your reservation."
          : emailType === "reminder"
            ? "This is a quick reminder about your upcoming shortlet stay."
            : emailType === "check_in_details"
              ? "Here are your booking details and next steps for check-in."
              : emailType === "cancellation_notice"
                ? "Your booking has been cancelled."
                : "Your booking status has been updated.";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
          <h2>${statusMap[emailType]}</h2>
          <p>Hello ${booking.guest_name},</p>
          <p>${customMessage || defaultMessage}</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p><strong>Property:</strong> ${booking.properties?.name || "Property"}</p>
            <p><strong>Unit:</strong> ${booking.units?.unit_number || "N/A"}</p>
            <p><strong>Check-in:</strong> ${booking.check_in}</p>
            <p><strong>Check-out:</strong> ${booking.check_out}</p>
            ${amountHtml}
            <p><strong>Booking status:</strong> ${readableStatus}</p>
            <p><strong>Payment status:</strong> ${readablePaymentStatus}</p>
            ${invoice ? `<p><strong>Invoice:</strong> ${invoice.invoice_number} (Due ${invoice.due_date})</p>` : ""}
          </div>
          <p>Use the options below to manage this booking:</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin: 18px 0;">
            <a href="${acceptUrl}" style="background:#059669; color:#fff; text-decoration:none; padding:10px 14px; border-radius:6px;">Accept</a>
            <a href="${cancelUrl}" style="background:#dc2626; color:#fff; text-decoration:none; padding:10px 14px; border-radius:6px;">Cancel</a>
            <a href="${payUrl}" style="background:#2563eb; color:#fff; text-decoration:none; padding:10px 14px; border-radius:6px;">Pay Now</a>
          </div>
          <p style="font-size:12px; color:#6b7280;">If buttons do not work, open this link: ${actionBase}</p>
        </div>
      `;

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [booking.guest_email],
        subject: `${companyName}: ${statusMap[emailType]} (${booking.properties?.name || "Shortlet"})`,
        html,
      });

      if ((emailResponse as any)?.error) {
        return jsonResponse({ error: (emailResponse as any).error?.message || "Failed to send email" }, 500);
      }

      await supabase
        .from("bookings")
        .update({ last_status_email_sent_at: new Date().toISOString(), last_status_email_type: emailType })
        .eq("id", booking.id);

      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Shortlet Email Sent",
        message: `${emailType.replace("_", " ")} email sent to ${booking.guest_email}`,
        type: "info",
        link: "/bookings",
      });

      if (ownerProfile?.email) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: [ownerProfile.email],
            subject: `Copy: ${statusMap[emailType]} sent to guest`,
            html: `<p>Email sent to ${booking.guest_name} (${booking.guest_email}) for booking ${booking.id}.</p>`,
          });
        } catch {
          // Non-blocking owner copy notification
        }
      }

      return jsonResponse({ success: true, token, invoiceId: invoice?.id || null, emailId: (emailResponse as any)?.data?.id || null });
    }

    if (operation === "get_action_context") {
      const token = body?.token as string | undefined;
      if (!token) return jsonResponse({ error: "token is required" }, 400);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, guest_name, guest_email, check_in, check_out, total_amount, status, payment_status, guest_response_status, property_id, unit_id, properties:property_id(name), units:unit_id(unit_number)")
        .eq("guest_action_token", token)
        .single();

      if (bookingError || !booking) return jsonResponse({ error: "Invalid or expired booking action token" }, 404);

      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, paid_amount, due_date, status")
        .eq("booking_id", booking.id)
        .maybeSingle();

      return jsonResponse({ success: true, booking, invoice });
    }

    if (operation === "submit_action") {
      const token = body?.token as string | undefined;
      const action = body?.action as "accept" | "cancel" | "pay";

      if (!token || !action) {
        return jsonResponse({ error: "token and action are required" }, 400);
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out, status, payment_status")
        .eq("guest_action_token", token)
        .single();

      if (bookingError || !booking) {
        return jsonResponse({ error: "Invalid or expired booking action token" }, 404);
      }

      const nowIso = new Date().toISOString();

      if (action === "accept") {
        const nextStatus = booking.status === "cancelled" ? "pending" : (booking.status === "pending" ? "confirmed" : booking.status);

        await supabase
          .from("bookings")
          .update({
            status: nextStatus,
            guest_response_status: "accepted",
            guest_responded_at: nowIso,
          })
          .eq("id", booking.id);

        await ensureBookingInvoice(supabase, booking);

        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          title: "Guest accepted booking",
          message: `${booking.guest_name} accepted the booking request.`,
          type: "info",
          link: "/bookings",
        });

        return jsonResponse({ success: true, message: "Booking accepted." });
      }

      if (action === "cancel") {
        await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            guest_response_status: "cancelled",
            guest_responded_at: nowIso,
          })
          .eq("id", booking.id);

        await supabase
          .from("invoices")
          .update({ status: "cancelled", updated_at: nowIso })
          .eq("booking_id", booking.id)
          .neq("status", "paid");

        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          title: "Guest cancelled booking",
          message: `${booking.guest_name} cancelled the booking.`,
          type: "warning",
          link: "/bookings",
        });

        return jsonResponse({ success: true, message: "Booking cancelled." });
      }

      if (action === "pay") {
        const amount = Number(body?.amount || 0);
        const method = body?.method as PaymentMethod;
        const reference = (body?.reference as string | undefined) || null;

        if (!Number.isFinite(amount) || amount <= 0) {
          return jsonResponse({ error: "Valid payment amount is required" }, 400);
        }

        if (!ALLOWED_PAYMENT_METHODS.includes(method)) {
          return jsonResponse({ error: "Invalid payment method" }, 400);
        }

        const invoice = await ensureBookingInvoice(supabase, booking);
        const remaining = Number(invoice.amount) - Number(invoice.paid_amount);

        if (amount - remaining > 0.0001) {
          return jsonResponse({ error: `Amount exceeds remaining balance (${remaining.toFixed(2)})` }, 400);
        }

        const newPaidAmount = Number(invoice.paid_amount) + amount;
        const nextInvoiceStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partial";
        const nextBookingPaymentStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partial";

        const { error: paymentInsertError } = await supabase
          .from("payments")
          .insert({
            user_id: booking.user_id,
            invoice_id: invoice.id,
            tenant_id: null,
            booking_id: booking.id,
            amount,
            method,
            reference,
            status: "completed",
            payer_name: booking.guest_name,
            payer_email: booking.guest_email,
            source: "shortlet_booking",
          });

        if (paymentInsertError) {
          return jsonResponse({ error: paymentInsertError.message || "Failed to record payment" }, 500);
        }

        const { error: invoiceUpdateError } = await supabase
          .from("invoices")
          .update({
            paid_amount: newPaidAmount,
            status: nextInvoiceStatus,
            paid_at: nextInvoiceStatus === "paid" ? nowIso : null,
            updated_at: nowIso,
          })
          .eq("id", invoice.id);

        if (invoiceUpdateError) {
          return jsonResponse({ error: invoiceUpdateError.message || "Failed to update invoice" }, 500);
        }

        await supabase
          .from("bookings")
          .update({
            payment_status: nextBookingPaymentStatus,
            guest_response_status: "accepted",
            guest_responded_at: nowIso,
          })
          .eq("id", booking.id);

        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          title: "Shortlet payment received",
          message: `${booking.guest_name} paid ${amount.toFixed(2)} for booking ${booking.id}.`,
          type: "success",
          link: "/payments",
        });

        return jsonResponse({
          success: true,
          message: "Payment recorded successfully.",
          invoice: {
            id: invoice.id,
            status: nextInvoiceStatus,
            paid_amount: newPaidAmount,
            total_amount: Number(invoice.amount),
          },
        });
      }

      return jsonResponse({ error: "Unsupported action" }, 400);
    }

    return jsonResponse({ error: "Unsupported operation" }, 400);
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    console.error("shortlet-booking-email error:", error);
    return jsonResponse({ error: error?.message || "Internal server error" }, 500);
  }
});
