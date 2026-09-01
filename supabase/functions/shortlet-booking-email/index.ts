import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
	buildCorsHeaders,
	checkRateLimit,
	handleCorsPreflight,
} from "../_shared/security.ts";
import { resolveCompanyBranding } from "../_shared/company-branding.ts";

const defaultCorsHeaders = {
	"Access-Control-Allow-Origin": (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",")[0]?.trim() || "null",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fishgate-signature",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Vary": "Origin",
};

type EmailType =
	| "status_update"
	| "payment_request"
	| "reminder"
	| "check_in_details"
	| "cancellation_notice";

type Action = "accept" | "cancel" | "pay";

const ALLOWED_PAYMENT_METHODS = ["cash", "bank_transfer", "mtn_momo", "card", "other"] as const;

function jsonResponse(body: unknown, status = 200, req?: Request) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...(req ? buildCorsHeaders(req) : defaultCorsHeaders), "Content-Type": "application/json" },
	});
}

function getAppUrl(origin?: string | null) {
	if (origin && origin.startsWith("http")) return origin;
	const configured = Deno.env.get("PUBLIC_APP_URL");
	if (configured && configured.startsWith("http")) return configured;
	return "http://localhost:5173";
}

async function requireUserFromBearer(req: Request, supabaseUrl: string, serviceRoleKey: string) {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Unauthorized");
	}

	const token = authHeader.replace("Bearer ", "").trim();
	if (!token) {
		throw new Error("Unauthorized");
	}

	// Validate token explicitly with auth.getUser(token)
	const authClient = createClient(supabaseUrl, serviceRoleKey);
	const { data, error } = await authClient.auth.getUser(token);
	if (error || !data.user) {
		console.error("shortlet auth failed", error);
		throw new Error("Unauthorized");
	}

	return data.user;
}

type ShortletBooking = {
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

type EmailSendResult = {
	error?: {
		message?: string;
	};
};

async function ensureBookingInvoice(supabase: ReturnType<typeof createClient>, booking: ShortletBooking) {
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
		return handleCorsPreflight(req);
	}

	const rateCheck = checkRateLimit(req, {
		keyPrefix: "shortlet-booking-email",
		limit: 40,
		windowMs: 60_000,
	});

	if (!rateCheck.allowed) {
		return jsonResponse({ error: "Rate limit exceeded" }, 429, req);
	}

	if (req.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

		if (!supabaseUrl || !serviceRoleKey) {
			return jsonResponse({ error: "Missing server configuration" }, 500);
		}

		const body = await req.json();
		const operation = body?.operation as "send_email" | "get_action_context" | "submit_action";
		const supabase = createClient(supabaseUrl, serviceRoleKey);

		if (operation === "send_email") {
			const user = await requireUserFromBearer(req, supabaseUrl, serviceRoleKey);

			const bookingId = body?.bookingId as string | undefined;
			const companyId = body?.companyId as string | undefined;
			const emailType = body?.emailType as EmailType | undefined;
			const customMessage = body?.customMessage as string | undefined;
			const appUrl = getAppUrl(body?.origin);

			if (!bookingId || !emailType) {
				return jsonResponse({ error: "bookingId and emailType are required" }, 400);
			}

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

			const branding = await resolveCompanyBranding({
				supabase,
				userId: booking.user_id,
				companyId: companyId || null,
				bookingId: booking.id,
				propertyId: booking.property_id || null,
			});
			console.log("brand.resolve", {
				function: "shortlet-booking-email",
				source: branding.source,
				requestedCompanyId: companyId || null,
				resolvedCompanyId: branding.companyId,
				bookingId: booking.id,
				propertyId: booking.property_id || null,
				emailType,
			});

			const companyName = branding.companyName || "FishGate";
			const fromEmail = branding.companyEmail
				? `${companyName} <${branding.companyEmail}>`
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
					<p><strong>Property:</strong> ${booking.properties?.name || "Property"}</p>
					<p><strong>Unit:</strong> ${booking.units?.unit_number || "N/A"}</p>
					<p><strong>Check-in:</strong> ${booking.check_in}</p>
					<p><strong>Check-out:</strong> ${booking.check_out}</p>
					<p><strong>Total:</strong> ${Number(booking.total_amount).toLocaleString()}</p>
					${invoice ? `<p><strong>Invoice:</strong> ${invoice.invoice_number} (Due ${invoice.due_date})</p>` : ""}
					<p>Actions:</p>
					<p><a href="${acceptUrl}">Accept</a> | <a href="${cancelUrl}">Cancel</a> | <a href="${payUrl}">Pay Now</a></p>
				</div>
			`;

			const resend = new Resend(resendApiKey);
			const emailResponse = await resend.emails.send({
				from: fromEmail,
				to: [booking.guest_email],
				subject: `${companyName}: ${statusMap[emailType]} (${booking.properties?.name || "Shortlet"})`,
				html,
			});

			const emailResult = emailResponse as EmailSendResult;
			if (emailResult?.error) {
				return jsonResponse({ error: emailResult.error.message || "Failed to send email" }, 500);
			}

			await supabase
				.from("bookings")
				.update({ last_status_email_sent_at: new Date().toISOString(), last_status_email_type: emailType })
				.eq("id", booking.id);

			return jsonResponse({
				success: true,
				token,
				invoiceId: invoice?.id || null,
				brandingSource: branding.source,
				companyId: branding.companyId,
			});
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
			const action = body?.action as Action | undefined;

			if (!token || !action) return jsonResponse({ error: "token and action are required" }, 400);

			const { data: booking, error: bookingError } = await supabase
				.from("bookings")
				.select("id, user_id, property_id, unit_id, guest_name, guest_email, total_amount, check_in, check_out, status, payment_status")
				.eq("guest_action_token", token)
				.single();

			if (bookingError || !booking) return jsonResponse({ error: "Invalid or expired booking action token" }, 404);

			const nowIso = new Date().toISOString();

			if (action === "accept") {
				const nextStatus = booking.status === "pending" ? "confirmed" : booking.status;
				await supabase
					.from("bookings")
					.update({ status: nextStatus, guest_response_status: "accepted", guest_responded_at: nowIso })
					.eq("id", booking.id);
				await ensureBookingInvoice(supabase, booking);
				return jsonResponse({ success: true, message: "Booking accepted." });
			}

			if (action === "cancel") {
				await supabase
					.from("bookings")
					.update({ status: "cancelled", guest_response_status: "cancelled", guest_responded_at: nowIso })
					.eq("id", booking.id);
				await supabase.from("invoices").update({ status: "cancelled", updated_at: nowIso }).eq("booking_id", booking.id).neq("status", "paid");
				return jsonResponse({ success: true, message: "Booking cancelled." });
			}

			if (action === "pay") {
				const amount = Number(body?.amount || 0);
				const method = body?.method as (typeof ALLOWED_PAYMENT_METHODS)[number];
				const reference = (body?.reference as string | undefined) || null;

				if (!Number.isFinite(amount) || amount <= 0) return jsonResponse({ error: "Valid payment amount is required" }, 400);
				if (!ALLOWED_PAYMENT_METHODS.includes(method)) return jsonResponse({ error: "Invalid payment method" }, 400);

				const invoice = await ensureBookingInvoice(supabase, booking);
				const remaining = Number(invoice.amount) - Number(invoice.paid_amount);
				if (amount > remaining + 0.0001) return jsonResponse({ error: `Amount exceeds remaining balance (${remaining.toFixed(2)})` }, 400);

				const newPaidAmount = Number(invoice.paid_amount) + amount;
				const nextInvoiceStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partial";
				const nextBookingPaymentStatus = newPaidAmount >= Number(invoice.amount) ? "paid" : "partial";

				const { error: paymentInsertError } = await supabase.from("payments").insert({
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

				if (paymentInsertError) return jsonResponse({ error: paymentInsertError.message || "Failed to record payment" }, 500);

				const { error: invoiceUpdateError } = await supabase.from("invoices").update({
					paid_amount: newPaidAmount,
					status: nextInvoiceStatus,
					paid_at: nextInvoiceStatus === "paid" ? nowIso : null,
					updated_at: nowIso,
				}).eq("id", invoice.id);

				if (invoiceUpdateError) return jsonResponse({ error: invoiceUpdateError.message || "Failed to update invoice" }, 500);

				await supabase.from("bookings").update({
					payment_status: nextBookingPaymentStatus,
					guest_response_status: "accepted",
					guest_responded_at: nowIso,
				}).eq("id", booking.id);

				return jsonResponse({ success: true, message: "Payment recorded successfully." });
			}

			return jsonResponse({ error: "Unsupported action" }, 400);
		}

		return jsonResponse({ error: "Unsupported operation" }, 400);
	} catch (error: unknown) {
		if (error instanceof Error && error.message === "Unauthorized") {
			return jsonResponse({ error: "Unauthorized" }, 401);
		}

		console.error("shortlet-booking-email error:", error);
		return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
	}
});

