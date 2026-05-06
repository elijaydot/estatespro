import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BroadcastRequest = {
  title: string;
  message: string;
  companyId: string;
  propertyId?: string | null;
  unitId?: string | null;
  targetRole?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: "Missing backend configuration" }, 500);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT verification failed", claimsError);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const rawBody = (await req.json()) as Partial<BroadcastRequest>;
    const title = rawBody.title?.trim();
    const message = rawBody.message?.trim();
    const companyId = rawBody.companyId?.trim();
    const propertyId = rawBody.propertyId?.trim() || null;
    const unitId = rawBody.unitId?.trim() || null;
    const targetRole = rawBody.targetRole?.trim() || "tenant";

    if (!title || !message || !companyId) {
      return json({ error: "title, message, and companyId are required" }, 400);
    }

    if (!['tenant', 'property_manager', 'landlord', 'all'].includes(targetRole)) {
      return json({ error: "Invalid targetRole" }, 400);
    }

    const { data: membership } = await adminClient
      .from("company_members")
      .select("status")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle();

    const { data: company } = await adminClient
      .from("companies")
      .select("owner_id, name")
      .eq("id", companyId)
      .maybeSingle();

    const isOwner = company?.owner_id === userId;
    const isApprovedPm = !!membership;

    if (!isOwner && !isApprovedPm) {
      return json({ error: "Forbidden" }, 403);
    }

    let allowedPropertyIds: string[] = [];

    if (isOwner) {
      const { data: ownedProperties, error: ownedPropertiesError } = await adminClient
        .from("properties")
        .select("id")
        .eq("company_id", companyId);

      if (ownedPropertiesError) {
        console.error("Failed to fetch company properties", ownedPropertiesError);
        return json({ error: "Failed to resolve property scope" }, 500);
      }

      allowedPropertyIds = (ownedProperties ?? []).map((property) => property.id);
    } else {
      const { data: assignedProperties, error: assignedPropertiesError } = await adminClient
        .from("property_manager_assignments")
        .select("property_id")
        .eq("company_id", companyId)
        .eq("manager_id", userId);

      if (assignedPropertiesError) {
        console.error("Failed to fetch PM assignments", assignedPropertiesError);
        return json({ error: "Failed to resolve property scope" }, 500);
      }

      allowedPropertyIds = (assignedProperties ?? []).map((assignment) => assignment.property_id);
    }

    if (allowedPropertyIds.length === 0) {
      return json({ error: "No allowed properties found for this company" }, 403);
    }

    if (propertyId && !allowedPropertyIds.includes(propertyId)) {
      return json({ error: "Invalid property scope" }, 400);
    }

    if (unitId) {
      const unitQuery = adminClient
        .from("units")
        .select("id, property_id")
        .eq("id", unitId);

      if (propertyId) {
        unitQuery.eq("property_id", propertyId);
      }

      const { data: unit } = await unitQuery.maybeSingle();
      if (!unit) {
        return json({ error: "Invalid unit scope" }, 400);
      }
    }

    const { data: broadcast, error: broadcastError } = await adminClient
      .from("broadcasts")
      .insert({
        title,
        message,
        company_id: companyId,
        property_id: propertyId,
        unit_id: unitId,
        created_by: userId,
        target_role: targetRole,
      })
      .select("id")
      .single();

    if (broadcastError) {
      console.error("Failed to create broadcast", broadcastError);
      return json({ error: "Failed to create broadcast" }, 500);
    }

    const scopedPropertyIds = propertyId ? [propertyId] : allowedPropertyIds;

    let tenantQuery = adminClient
      .from("tenants")
      .select("id, tenant_user_id, property_id, unit_id")
      .in("property_id", scopedPropertyIds);

    if (unitId) {
      tenantQuery = tenantQuery.eq("unit_id", unitId);
    }

    const { data: tenants, error: tenantsError } = await tenantQuery;
    if (tenantsError) {
      console.error("Failed to fetch tenant recipients", tenantsError);
      return json({ error: "Failed to resolve recipients" }, 500);
    }

    const recipientUserIds = new Set<string>();

    if (targetRole === "tenant" || targetRole === "all") {
      for (const tenant of tenants ?? []) {
        if (tenant.tenant_user_id) {
          recipientUserIds.add(tenant.tenant_user_id);
        }
      }
    }

    if (targetRole === "property_manager" || targetRole === "all") {
      const { data: managers } = await adminClient
        .from("company_members")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("status", "approved")
        .eq("role", "property_manager");

      for (const manager of managers ?? []) {
        recipientUserIds.add(manager.user_id);
      }
    }

    if (targetRole === "landlord" || targetRole === "all") {
      if (company?.owner_id) {
        recipientUserIds.add(company.owner_id);
      }
    }

    recipientUserIds.delete(userId);

    const notificationRows = Array.from(recipientUserIds).map((recipientId) => ({
      user_id: recipientId,
      title,
      message,
      type: "info",
      link: "/messages",
      metadata: {
        source: "broadcast",
        broadcast_id: broadcast.id,
        company_id: companyId,
        property_id: propertyId,
        unit_id: unitId,
        target_role: targetRole,
        company_name: company?.name ?? null,
      },
    }));

    if (notificationRows.length > 0) {
      const { error: notificationsError } = await adminClient
        .from("notifications")
        .insert(notificationRows);

      if (notificationsError) {
        console.error("Failed to create notifications", notificationsError);
        return json({ error: "Broadcast created but notifications failed" }, 500);
      }
    }

    return json({
      success: true,
      broadcastId: broadcast.id,
      recipients: notificationRows.length,
    });
  } catch (error) {
    console.error("Error in send-broadcast", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});