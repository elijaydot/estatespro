import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      property_id,
      unit_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      num_guests,
      special_requests,
    } = body;

    // Validate required fields
    if (!property_id || !unit_id || !guest_name || !guest_email || !check_in || !check_out) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: property_id, unit_id, guest_name, guest_email, check_in, check_out" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guest_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (checkOutDate <= checkInDate) {
      return new Response(
        JSON.stringify({ error: "Check-out must be after check-in" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify property exists and is short_let type
    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .select("id, user_id, type, name")
      .eq("id", property_id)
      .eq("type", "short_let")
      .single();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ error: "Property not found or not available for short-let bookings" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify unit exists and belongs to property
    const { data: unit, error: unitError } = await supabaseAdmin
      .from("units")
      .select("id, rent_amount, property_id")
      .eq("id", unit_id)
      .eq("property_id", property_id)
      .single();

    if (unitError || !unit) {
      return new Response(
        JSON.stringify({ error: "Unit not found or does not belong to this property" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for overlapping bookings
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("unit_id", unit_id)
      .not("status", "in", '("cancelled","no_show")')
      .lt("check_in", check_out)
      .gt("check_out", check_in);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "This unit is not available for the selected dates" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate pricing
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const nightly_rate = unit.rent_amount || 0;
    const total_amount = nightly_rate * nights;

    // Create booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        property_id,
        unit_id,
        user_id: property.user_id, // owned by the property owner
        guest_name,
        guest_email,
        guest_phone: guest_phone || null,
        check_in,
        check_out,
        nightly_rate,
        total_amount,
        num_guests: num_guests || 1,
        special_requests: special_requests || null,
        status: "pending",
        payment_status: "unpaid",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify the property owner
    await supabaseAdmin.from("notifications").insert({
      user_id: property.user_id,
      title: "New Booking Request",
      message: `${guest_name} has requested to book at ${property.name} from ${check_in} to ${check_out} (${nights} nights).`,
      type: "info",
      link: "/bookings",
    });

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        nights,
        nightly_rate,
        total_amount,
        message: "Booking request submitted successfully! The property owner will confirm your reservation.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Guest booking error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
