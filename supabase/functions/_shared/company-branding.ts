type AnyClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, string | null> | null }>;
      };
    };
  };
};

export type BrandingSource = 'companies' | 'default';

export type ResolvedCompanyBranding = {
  companyId: string | null;
  companyName: string;
  companyEmail: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  logoUrl: string | null;
  source: BrandingSource;
};

type ResolveBrandingInput = {
  supabase: AnyClient;
  userId?: string | null;
  companyId?: string | null;
  propertyId?: string | null;
  invoiceId?: string | null;
  leaseId?: string | null;
  paymentId?: string | null;
  bookingId?: string | null;
};

async function resolveCompanyIdFromProperty(supabase: AnyClient, propertyId: string): Promise<string | null> {
  const { data } = await supabase
    .from('properties')
    .select('company_id')
    .eq('id', propertyId)
    .maybeSingle();

  return data?.company_id || null;
}

export async function resolveCompanyBranding(input: ResolveBrandingInput): Promise<ResolvedCompanyBranding> {
  const {
    supabase,
    propertyId = null,
    invoiceId = null,
    leaseId = null,
    paymentId = null,
    bookingId = null,
  } = input;

  let resolvedCompanyId = input.companyId || null;

  if (!resolvedCompanyId && propertyId) {
    resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, propertyId);
  }

  if (!resolvedCompanyId && invoiceId) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('property_id')
      .eq('id', invoiceId)
      .maybeSingle();

    if (invoice?.property_id) {
      resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, invoice.property_id);
    }
  }

  if (!resolvedCompanyId && leaseId) {
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id')
      .eq('id', leaseId)
      .maybeSingle();

    if (lease?.property_id) {
      resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, lease.property_id);
    }
  }

  if (!resolvedCompanyId && bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('property_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (booking?.property_id) {
      resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, booking.property_id);
    }
  }

  if (!resolvedCompanyId && paymentId) {
    const { data: payment } = await supabase
      .from('payments')
      .select('invoice_id, booking_id')
      .eq('id', paymentId)
      .maybeSingle();

    if (payment?.invoice_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('property_id')
        .eq('id', payment.invoice_id)
        .maybeSingle();

      if (invoice?.property_id) {
        resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, invoice.property_id);
      }
    }

    if (!resolvedCompanyId && payment?.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('property_id')
        .eq('id', payment.booking_id)
        .maybeSingle();

      if (booking?.property_id) {
        resolvedCompanyId = await resolveCompanyIdFromProperty(supabase, booking.property_id);
      }
    }
  }

  if (resolvedCompanyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, email, phone, address, logo_url')
      .eq('id', resolvedCompanyId)
      .maybeSingle();

    if (company) {
      return {
        companyId: company.id,
        companyName: company.name || 'Property Management',
        companyEmail: company.email || null,
        companyPhone: company.phone || null,
        companyAddress: company.address || null,
        logoUrl: company.logo_url || null,
        source: 'companies',
      };
    }
  }

  return {
    companyId: resolvedCompanyId,
    companyName: 'Property Management',
    companyEmail: null,
    companyPhone: null,
    companyAddress: null,
    logoUrl: null,
    source: 'default',
  };
}
