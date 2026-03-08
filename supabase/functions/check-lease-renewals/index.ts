import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeaseWithDetails {
  id: string;
  lease_number: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  user_id: string;
  tenants: {
    id: string;
    name: string;
    email: string;
  };
  properties: {
    id: string;
    name: string;
  };
  units: {
    id: string;
    unit_number: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Authenticate: require a valid JWT (landlord calling manually or cron with service key)
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 60 days from now
    const today = new Date();
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    
    // Format dates for comparison
    const todayStr = today.toISOString().split('T')[0];
    const sixtyDaysStr = sixtyDaysFromNow.toISOString().split('T')[0];

    // Fetch leases expiring in exactly 60 days (to avoid duplicate emails)
    const { data: expiringLeases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        lease_number,
        end_date,
        monthly_rent,
        status,
        user_id,
        tenants:tenant_id(id, name, email),
        properties:property_id(id, name),
        units:unit_id(id, unit_number)
      `)
      .eq('status', 'active')
      .eq('end_date', sixtyDaysStr);

    if (leasesError) {
      throw leasesError;
    }

    if (!expiringLeases || expiringLeases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No leases expiring in 60 days', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    for (const lease of expiringLeases as unknown as LeaseWithDetails[]) {
      try {
        // Create notification for landlord
        await supabase.from('notifications').insert({
          user_id: lease.user_id,
          title: 'Lease Renewal Reminder',
          message: `Lease ${lease.lease_number} for ${lease.tenants?.name} at ${lease.properties?.name} - ${lease.units?.unit_number} expires in 60 days on ${lease.end_date}. Consider initiating the renewal process.`,
          type: 'warning',
          link: `/leases`,
        });

        // Send email notification if Resend is configured
        if (resend && lease.tenants?.email) {
          // Email to tenant
          await resend.emails.send({
            from: 'EstatePro <noreply@resend.dev>',
            to: [lease.tenants.email],
            subject: `Lease Renewal Reminder - ${lease.properties?.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b;">Lease Renewal Reminder</h2>
                <p>Dear ${lease.tenants?.name},</p>
                <p>This is a friendly reminder that your lease is expiring in <strong>60 days</strong>.</p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #334155;">Lease Details</h3>
                  <p><strong>Property:</strong> ${lease.properties?.name}</p>
                  <p><strong>Unit:</strong> ${lease.units?.unit_number}</p>
                  <p><strong>Lease Number:</strong> ${lease.lease_number}</p>
                  <p><strong>Expiry Date:</strong> ${new Date(lease.end_date).toLocaleDateString()}</p>
                  <p><strong>Monthly Rent:</strong> RWF ${lease.monthly_rent.toLocaleString()}</p>
                </div>
                
                <p>If you wish to renew your lease, please contact your property manager to discuss the terms and next steps.</p>
                
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                  This is an automated reminder from EstatePro Property Management.
                </p>
              </div>
            `,
          });
        }

        results.push({ leaseId: lease.id, status: 'success' });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing lease ${lease.id}:`, error);
        results.push({ leaseId: lease.id, status: 'error', error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Lease renewal check completed', 
        processed: expiringLeases.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-lease-renewals:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
