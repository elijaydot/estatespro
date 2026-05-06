<<<<<<< HEAD
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from '../_shared/security.ts';

type TargetRole = 'all' | 'landlord' | 'property_manager' | 'tenant';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: 'send-broadcast',
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const body = await req.json();
    const companyId = String(body.companyId || '');
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const targetRole = String(body.targetRole || 'all') as TargetRole;
    const propertyId = body.propertyId ? String(body.propertyId) : null;
    const unitId = body.unitId ? String(body.unitId) : null;

    if (!companyId || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['all', 'landlord', 'property_manager', 'tenant'].includes(targetRole)) {
      return new Response(JSON.stringify({ error: 'Invalid target role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentUser = authData.user;

    const [{ data: company }, { data: membership }] = await Promise.all([
      adminClient
        .from('companies')
        .select('id, owner_id')
        .eq('id', companyId)
        .maybeSingle(),
      adminClient
        .from('company_members')
        .select('id, role, status')
        .eq('company_id', companyId)
        .eq('user_id', currentUser.id)
        .eq('status', 'approved')
        .maybeSingle(),
    ]);

    const isOwner = company?.owner_id === currentUser.id;
    const isApprovedManager = membership?.role === 'property_manager' && membership?.status === 'approved';

    if (!isOwner && !isApprovedManager) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let scopedPropertyId = propertyId;
    if (unitId && !scopedPropertyId) {
      const { data: unit } = await adminClient
        .from('units')
        .select('property_id')
        .eq('id', unitId)
        .maybeSingle();
      scopedPropertyId = unit?.property_id || null;
    }

    const { data: broadcast, error: broadcastError } = await adminClient
      .from('broadcasts')
      .insert({
        company_id: companyId,
        created_by: currentUser.id,
        title,
        message,
        target_role: targetRole,
        property_id: scopedPropertyId,
        unit_id: unitId,
      })
      .select('*')
      .single();

    if (broadcastError) {
      throw broadcastError;
    }

    const recipients = new Set<string>();

    if (targetRole === 'all' || targetRole === 'landlord') {
      if (company?.owner_id) {
        recipients.add(company.owner_id);
      }
    }

    if (targetRole === 'all' || targetRole === 'property_manager') {
      let managersQuery = adminClient
        .from('company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .eq('role', 'property_manager');

      if (scopedPropertyId) {
        const { data: assignmentManagers } = await adminClient
          .from('property_manager_assignments')
          .select('manager_id')
          .eq('company_id', companyId)
          .eq('property_id', scopedPropertyId);

        const managerIds = (assignmentManagers || []).map((item) => item.manager_id);
        if (managerIds.length > 0) {
          managersQuery = managersQuery.in('user_id', managerIds);
        }
      }

      const { data: managers } = await managersQuery;
      (managers || []).forEach((manager) => recipients.add(manager.user_id));
    }

    if (targetRole === 'all' || targetRole === 'tenant') {
      let tenantsQuery = adminClient
        .from('tenants')
        .select('tenant_user_id, property_id, unit_id')
        .not('tenant_user_id', 'is', null);

      if (unitId) {
        tenantsQuery = tenantsQuery.eq('unit_id', unitId);
      } else if (scopedPropertyId) {
        tenantsQuery = tenantsQuery.eq('property_id', scopedPropertyId);
      } else {
        const { data: companyProperties } = await adminClient
          .from('properties')
          .select('id')
          .eq('company_id', companyId);

        const propertyIds = (companyProperties || []).map((item) => item.id);
        if (propertyIds.length === 0) {
          tenantsQuery = tenantsQuery.eq('property_id', '00000000-0000-0000-0000-000000000000');
        } else {
          tenantsQuery = tenantsQuery.in('property_id', propertyIds);
        }
      }

      const { data: tenants } = await tenantsQuery;
      (tenants || []).forEach((tenant) => {
        if (tenant.tenant_user_id) {
          recipients.add(tenant.tenant_user_id);
        }
      });
    }

    const recipientList = Array.from(recipients);
    if (recipientList.length > 0) {
      const notificationsPayload = recipientList.map((recipientId) => ({
        user_id: recipientId,
        title,
        message,
        type: 'info',
        link: '/notifications',
        metadata: {
          kind: 'broadcast',
          broadcast_id: broadcast.id,
          company_id: companyId,
          target_role: targetRole,
        },
      }));

      const { error: notificationsError } = await adminClient
        .from('notifications')
        .insert(notificationsPayload as any);

      if (notificationsError) {
        throw notificationsError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, broadcast, recipients: recipientList.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-broadcast error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
=======
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
>>>>>>> main
