import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from '../_shared/security.ts';

type TargetRole = 'all' | 'landlord' | 'property_manager' | 'tenant';

type NotificationInsert = {
  user_id: string;
  title: string;
  message: string;
  type: 'info';
  link: string;
  metadata: {
    kind: 'broadcast';
    broadcast_id: string;
    company_id: string;
    target_role: TargetRole;
  };
};

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

    const [{ data: company }, { data: membership }, { data: profile }] = await Promise.all([
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
      adminClient
        .from('profiles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle(),
    ]);

    const isOwner = company?.owner_id === currentUser.id;
    const isApprovedManager = membership?.role === 'property_manager' && membership?.status === 'approved';
    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isOwner && !isApprovedManager && !isSuperAdmin) {
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
    const recipientEmails = new Set<string>();

    if (targetRole === 'all' || targetRole === 'landlord') {
      if (company?.owner_id) {
        recipients.add(company.owner_id);
        const { data: ownerProfile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', company.owner_id)
          .maybeSingle();
        if (ownerProfile?.email) {
          recipientEmails.add(ownerProfile.email);
        }
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
      const managerUserIds = (managers || []).map((m) => m.user_id);
      managerUserIds.forEach((id) => recipients.add(id));

      if (managerUserIds.length > 0) {
        const { data: managerProfiles } = await adminClient
          .from('profiles')
          .select('email')
          .in('id', managerUserIds);
        (managerProfiles || []).forEach((p) => {
          if (p.email) recipientEmails.add(p.email);
        });
      }
    }

    if (targetRole === 'all' || targetRole === 'tenant') {
      let tenantsQuery = adminClient
        .from('tenants')
        .select('tenant_user_id, property_id, unit_id, email, name')
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
        if (tenant.email) {
          recipientEmails.add(tenant.email);
        }
      });
    }

    const recipientList = Array.from(recipients);
    if (recipientList.length > 0) {
      const notificationsPayload: NotificationInsert[] = recipientList.map((recipientId) => ({
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
        .insert(notificationsPayload);

      if (notificationsError) {
        throw notificationsError;
      }
    }

    // Dispatch broadcast email via Resend if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailsDispatched = 0;
    if (resendApiKey && recipientEmails.size > 0) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail =
          Deno.env.get('RESEND_FROM_EMAIL') ||
          `${company?.name || 'FishGate'} <notifications@fishgatepro.com>`;

        const emailRecipientsList = Array.from(recipientEmails);
        // Batch in groups of up to 50 recipients
        for (let i = 0; i < emailRecipientsList.length; i += 50) {
          const batch = emailRecipientsList.slice(i, i + 50);
          await resend.emails.send({
            from: fromEmail,
            to: batch,
            subject: `Announcement: ${title}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${title}</h2>
                <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; margin: 20px 0;">
                  ${message}
                </div>
                <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 0;">
                  Official announcement from ${company?.name || 'FishGate Property Management'}.
                </p>
              </div>
            `,
          });
          emailsDispatched += batch.length;
        }
      } catch (emailErr) {
        console.error('Failed to dispatch broadcast emails via Resend:', emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        broadcast,
        recipients: recipientList.length,
        emailsDispatched,
      }),
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
