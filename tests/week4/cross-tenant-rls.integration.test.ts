import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const supabaseUrl = process.env.SUPABASE_TEST_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const integrationRequired = process.env.RLS_TEST_REQUIRED === 'true';
const credentialsAvailable = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (integrationRequired && !credentialsAvailable) {
  throw new Error('RLS integration tests require Supabase URL, anon key, and service-role key');
}

const describeWithSupabase = credentialsAvailable ? describe : describe.skip;

type SeedContext = {
  ownerId: string;
  companyId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  leaseId: string;
  invoiceId: string;
};

type ProtectedFixture = {
  table: string;
  id: string;
  hostileUpdate: Record<string, unknown>;
  hostileInsert: Record<string, unknown>;
};

describeWithSupabase('cross-tenant RLS isolation', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const password = `Rls-${runId}-A9!`;
  const createdUserIds: string[] = [];
  let admin: SupabaseClient;
  let companyAClient: SupabaseClient;
  let companyBClient: SupabaseClient;
  let companyBUserId: string;
  let companyBPropertyId: string;
  let companyBTenantId: string;
  let companyBCorporateAccountId: string;
  let companyBOwnerAccountId: string;
  let tenantAClient: SupabaseClient;
  let companyA: SeedContext;
  let companyACorporateAccountId: string;
  let companyAOwnerAccountId: string;
  let crmContactId: string;
  let fixtures: ProtectedFixture[];
  let otherTenantRowIds: Record<string, string>;
  let teamMemberId: string;
  let evaluatorVendorDocumentId: string;
  let operationalAlertId: string;

  async function insertOne(table: string, values: Record<string, unknown>) {
    const { data, error } = await admin.from(table).insert(values).select('id').single();
    expect(error, `service-role seed failed for ${table}`).toBeNull();
    return data!.id as string;
  }

  async function createOwner(label: 'a' | 'b') {
    const email = `rls-${label}-${runId}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `RLS Company ${label.toUpperCase()}`, role: 'landlord' },
    });
    expect(error).toBeNull();
    const userId = data.user!.id;
    createdUserIds.push(userId);

    const client = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signIn = await client.auth.signInWithPassword({ email, password });
    expect(signIn.error).toBeNull();

    const companyId = await insertOne('companies', {
      name: `RLS Company ${label.toUpperCase()} ${runId}`,
      owner_id: userId,
    });
    return { client, companyId, userId };
  }

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ownerA = await createOwner('a');
    const ownerB = await createOwner('b');
    companyAClient = ownerA.client;
    companyBClient = ownerB.client;
    companyBUserId = ownerB.userId;

    companyBPropertyId = await insertOne('properties', {
      user_id: ownerB.userId,
      company_id: ownerB.companyId,
      name: `RLS Company B Property ${runId}`,
      address: '2 Isolation Way',
      city: 'Accra',
      state: 'Greater Accra',
      zip_code: '00000',
    });
    const companyBUnitId = await insertOne('units', {
      user_id: ownerB.userId,
      property_id: companyBPropertyId,
      unit_number: `RLS-B-${runId}`,
    });
    companyBTenantId = await insertOne('tenants', {
      user_id: ownerB.userId,
      property_id: companyBPropertyId,
      unit_id: companyBUnitId,
      name: 'Company B Tenant',
      email: `tenant-b-${runId}@example.test`,
      phone: '+233200000004',
    });
    companyBCorporateAccountId = await insertOne('crm_accounts', {
      company_id: ownerB.companyId,
      name: `Company B Corporate ${runId}`,
      account_kind: 'corporate_tenant',
      metadata: { scope: 'company-b' },
    });
    companyBOwnerAccountId = await insertOne('crm_accounts', {
      company_id: ownerB.companyId,
      name: `Company B Owner ${runId}`,
      account_kind: 'owner_investor',
      metadata: { scope: 'company-b' },
    });

    const tenantEmail = `rls-tenant-${runId}@example.test`;
    const tenantAuth = await admin.auth.admin.createUser({
      email: tenantEmail,
      password,
      email_confirm: true,
      user_metadata: { name: 'RLS Tenant A', role: 'tenant' },
    });
    expect(tenantAuth.error).toBeNull();
    createdUserIds.push(tenantAuth.data.user!.id);
    tenantAClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect((await tenantAClient.auth.signInWithPassword({ email: tenantEmail, password })).error).toBeNull();

    const memberAuth = await admin.auth.admin.createUser({
      email: `rls-member-${runId}@example.test`,
      password,
      email_confirm: true,
      user_metadata: { name: 'RLS Team Member', role: 'property_manager' },
    });
    expect(memberAuth.error).toBeNull();
    teamMemberId = memberAuth.data.user!.id;
    createdUserIds.push(teamMemberId);

    const propertyId = await insertOne('properties', {
      user_id: ownerA.userId,
      company_id: ownerA.companyId,
      name: `RLS Property ${runId}`,
      address: '1 Isolation Way',
      city: 'Accra',
      state: 'Greater Accra',
      zip_code: '00000',
    });
    const unitId = await insertOne('units', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_number: `RLS-${runId}`,
    });
    const tenantId = await insertOne('tenants', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: unitId,
      name: 'Company A Tenant',
      email: `tenant-a-${runId}@example.test`,
      phone: '+233200000001',
      tenant_user_id: tenantAuth.data.user!.id,
    });
    const leaseId = await insertOne('leases', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: unitId,
      tenant_id: tenantId,
      lease_number: `LEASE-${runId}`,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
    const invoiceId = await insertOne('invoices', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: unitId,
      tenant_id: tenantId,
      invoice_number: `INV-${runId}`,
      amount: 1000,
      due_date: '2026-02-01',
      description: 'RLS fixture',
    });

    companyA = { ownerId: ownerA.userId, companyId: ownerA.companyId, propertyId, unitId, tenantId, leaseId, invoiceId };
    companyACorporateAccountId = await insertOne('crm_accounts', {
      company_id: ownerA.companyId,
      name: `Company A Corporate ${runId}`,
      account_kind: 'corporate_tenant',
      metadata: { scope: 'company-a' },
    });
    companyAOwnerAccountId = await insertOne('crm_accounts', {
      company_id: ownerA.companyId,
      name: `Company A Owner ${runId}`,
      account_kind: 'owner_investor',
      metadata: { scope: 'company-a' },
    });

    const crmLeadId = await insertOne('leads', {
      company_id: ownerA.companyId,
      source: 'manual',
      stage: 'qualified',
      status: 'open',
      priority: 'normal',
    });
    crmContactId = await insertOne('lead_contacts', {
      lead_id: crmLeadId,
      full_name: 'CRM Contact A',
      email: `crm-contact-a-${runId}@example.test`,
      phone_e164: '+233200000005',
    });

    const seeded = {
      lease_attachments: await insertOne('lease_attachments', {
        lease_id: leaseId,
        user_id: ownerA.userId,
        file_name: 'signed-lease.pdf',
        file_url: `${ownerA.userId}/${leaseId}/signed-lease.pdf`,
        file_type: 'application/pdf',
        file_size: 128,
      }),
      payments: await insertOne('payments', {
        user_id: ownerA.userId,
        invoice_id: invoiceId,
        tenant_id: tenantId,
        amount: 100,
        method: 'cash',
      }),
      messages: await insertOne('messages', {
        user_id: ownerA.userId,
        sender_id: ownerA.userId,
        recipient_id: ownerA.userId,
        property_id: propertyId,
        subject: 'Private Company A message',
        content: 'RLS fixture',
      }),
      maintenance_requests: await insertOne('maintenance_requests', {
        user_id: ownerA.userId,
        property_id: propertyId,
        unit_id: unitId,
        tenant_id: tenantId,
        title: 'Private Company A request',
        description: 'RLS fixture',
      }),
    };

    const otherUnitId = await insertOne('units', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_number: `RLS-OTHER-${runId}`,
    });
    const otherTenantId = await insertOne('tenants', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: otherUnitId,
      name: 'Other Company A Tenant',
      email: `tenant-other-${runId}@example.test`,
      phone: '+233200000003',
    });
    const otherLeaseId = await insertOne('leases', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: otherUnitId,
      tenant_id: otherTenantId,
      lease_number: `LEASE-OTHER-${runId}`,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
    const otherInvoiceId = await insertOne('invoices', {
      user_id: ownerA.userId,
      property_id: propertyId,
      unit_id: otherUnitId,
      tenant_id: otherTenantId,
      invoice_number: `INV-OTHER-${runId}`,
      amount: 900,
      due_date: '2026-02-01',
      description: 'Other tenant invoice',
    });
    otherTenantRowIds = {
      leases: otherLeaseId,
      invoices: otherInvoiceId,
      payments: await insertOne('payments', {
        user_id: ownerA.userId,
        invoice_id: otherInvoiceId,
        tenant_id: otherTenantId,
        amount: 90,
        method: 'cash',
      }),
      maintenance_requests: await insertOne('maintenance_requests', {
        user_id: ownerA.userId,
        property_id: propertyId,
        unit_id: otherUnitId,
        tenant_id: otherTenantId,
        title: 'Other tenant request',
        description: 'Private to the other tenant',
      }),
    };

    await insertOne('company_members', {
      company_id: ownerA.companyId,
      user_id: teamMemberId,
      role: 'property_manager',
      status: 'approved',
    });

    const vendorId = await insertOne('vendors', {
      company_id: ownerA.companyId,
      name: `RLS Vendor ${runId}`,
      vendor_type: 'plumbing',
      created_by: ownerA.userId,
    });
    const expiryDate = new Date();
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 5);
    evaluatorVendorDocumentId = await insertOne('vendor_documents', {
      company_id: ownerA.companyId,
      vendor_id: vendorId,
      document_type: 'insurance',
      storage_path: `${ownerA.companyId}/${vendorId}/insurance.pdf`,
      mime_type: 'application/pdf',
      expiry_date: expiryDate.toISOString().slice(0, 10),
      uploaded_by: ownerA.userId,
    });
    const vendorPaymentId = await insertOne('vendor_payments', {
      company_id: ownerA.companyId,
      vendor_id: vendorId,
      maintenance_request_id: seeded.maintenance_requests,
      amount: 250,
      currency: 'RWF',
      created_by: ownerA.userId,
    });
    const thresholdId = await insertOne('alert_thresholds', {
      company_id: ownerA.companyId,
      alert_type: 'lease_expiry',
      threshold_days: 30,
    });
    operationalAlertId = await insertOne('operational_alerts', {
      company_id: ownerA.companyId,
      alert_type: 'lease_expiry',
      severity: 'warning',
      title: 'Private Company A alert',
      reference_table: 'leases',
      reference_id: leaseId,
    });

    fixtures = [
      {
        table: 'crm_accounts', id: companyACorporateAccountId,
        hostileUpdate: { metadata: { scope: 'company-b-overwrite' } },
        hostileInsert: { company_id: ownerA.companyId, name: 'Injected account', account_kind: 'corporate_tenant' },
      },
      {
        table: 'operational_alerts', id: operationalAlertId,
        hostileUpdate: { status: 'dismissed' },
        hostileInsert: { company_id: ownerA.companyId, alert_type: 'vacant_unit', severity: 'warning', title: 'Injected alert', reference_table: 'units', reference_id: unitId },
      },
      {
        table: 'alert_thresholds', id: thresholdId,
        hostileUpdate: { threshold_days: 365 },
        hostileInsert: { company_id: ownerA.companyId, alert_type: 'vacant_unit', threshold_days: 1 },
      },
      {
        table: 'vendors', id: vendorId,
        hostileUpdate: { name: 'Company B overwrite' },
        hostileInsert: { company_id: ownerA.companyId, name: 'Injected vendor', created_by: companyBUserId },
      },
      {
        table: 'vendor_documents', id: evaluatorVendorDocumentId,
        hostileUpdate: { expiry_date: '2099-01-01' },
        hostileInsert: { company_id: ownerA.companyId, vendor_id: vendorId, document_type: 'license', storage_path: `${ownerA.companyId}/${vendorId}/injected.pdf`, mime_type: 'application/pdf', uploaded_by: companyBUserId },
      },
      {
        table: 'vendor_payments', id: vendorPaymentId,
        hostileUpdate: { amount: 1 },
        hostileInsert: { company_id: ownerA.companyId, vendor_id: vendorId, amount: 1, currency: 'RWF', created_by: companyBUserId },
      },
      {
        table: 'tenants', id: tenantId,
        hostileUpdate: { name: 'Company B overwrite' },
        hostileInsert: { user_id: companyBUserId, property_id: propertyId, unit_id: unitId, name: 'Injected tenant', email: `injected-${runId}@example.test`, phone: '+233200000002' },
      },
      {
        table: 'leases', id: leaseId,
        hostileUpdate: { status: 'cancelled' },
        hostileInsert: { user_id: companyBUserId, property_id: propertyId, unit_id: unitId, tenant_id: tenantId, lease_number: `INJECTED-${runId}`, start_date: '2026-01-01', end_date: '2026-12-31' },
      },
      {
        table: 'lease_attachments', id: seeded.lease_attachments,
        hostileUpdate: { description: 'Company B overwrite' },
        hostileInsert: { user_id: companyBUserId, lease_id: leaseId, file_name: 'injected.pdf', file_url: `${companyBUserId}/${leaseId}/injected.pdf`, file_type: 'application/pdf', file_size: 1 },
      },
      {
        table: 'invoices', id: invoiceId,
        hostileUpdate: { description: 'Company B overwrite' },
        hostileInsert: { user_id: companyBUserId, property_id: propertyId, unit_id: unitId, tenant_id: tenantId, invoice_number: `INJECTED-${runId}`, amount: 1, due_date: '2026-02-01', description: 'Injected' },
      },
      {
        table: 'payments', id: seeded.payments,
        hostileUpdate: { notes: 'Company B overwrite' },
        hostileInsert: { user_id: companyBUserId, invoice_id: invoiceId, tenant_id: tenantId, amount: 1, method: 'cash' },
      },
      {
        table: 'messages', id: seeded.messages,
        hostileUpdate: { is_read: true },
        hostileInsert: { user_id: companyBUserId, sender_id: companyBUserId, recipient_id: companyA.ownerId, property_id: propertyId, subject: 'Injected', content: 'Injected' },
      },
      {
        table: 'maintenance_requests', id: seeded.maintenance_requests,
        hostileUpdate: { priority: 'urgent' },
        hostileInsert: { user_id: companyBUserId, property_id: propertyId, unit_id: unitId, tenant_id: tenantId, title: 'Injected', description: 'Injected' },
      },
    ];
  }, 60_000);

  afterAll(async () => {
    await Promise.all(createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId)));
  });

  it.each([
    'crm_accounts',
    'operational_alerts',
    'alert_thresholds',
    'vendors',
    'vendor_documents',
    'vendor_payments',
    'leases',
    'lease_attachments',
    'tenants',
    'payments',
    'invoices',
    'messages',
    'maintenance_requests',
  ])('prevents Company B from selecting or mutating Company A %s', async (table) => {
    const fixture = fixtures.find((candidate) => candidate.table === table)!;

    const selected = await companyBClient.from(table).select('id').eq('id', fixture.id);
    expect(selected.error).toBeNull();
    expect(selected.data).toEqual([]);

    const updated = await companyBClient.from(table).update(fixture.hostileUpdate).eq('id', fixture.id).select('id');
    expect(updated.error).toBeNull();
    expect(updated.data).toEqual([]);

    const deleted = await companyBClient.from(table).delete().eq('id', fixture.id).select('id');
    expect(deleted.error).toBeNull();
    expect(deleted.data).toEqual([]);

    const inserted = await companyBClient.from(table).insert(fixture.hostileInsert);
    expect(inserted.error, `${table} accepted a cross-company foreign key`).not.toBeNull();
    expect(inserted.error?.code).toBe('42501');
  });

  it('rejects cross-company tenant and property account links before allowing valid links', async () => {
    const hostileTenantLink = await companyAClient.from('tenants')
      .update({ account_id: companyBCorporateAccountId }).eq('id', companyA.tenantId);
    expect(hostileTenantLink.error).not.toBeNull();
    expect(hostileTenantLink.error?.code).toBe('42501');

    const hostilePropertyLink = await companyAClient.from('properties')
      .update({ owner_account_id: companyBOwnerAccountId }).eq('id', companyA.propertyId);
    expect(hostilePropertyLink.error).not.toBeNull();
    expect(hostilePropertyLink.error?.code).toBe('42501');

    expect((await companyAClient.from('tenants').update({ account_id: companyACorporateAccountId })
      .eq('id', companyA.tenantId).select('account_id').single()).data?.account_id).toBe(companyACorporateAccountId);
    expect((await companyAClient.from('properties').update({ owner_account_id: companyAOwnerAccountId })
      .eq('id', companyA.propertyId).select('owner_account_id').single()).data?.owner_account_id).toBe(companyAOwnerAccountId);
  });

  it('does not widen core row visibility through account links', async () => {
    expect((await companyBClient.from('tenants').select('id, account_id').eq('id', companyA.tenantId)).data).toEqual([]);
    expect((await companyBClient.from('properties').select('id, owner_account_id').eq('id', companyA.propertyId)).data).toEqual([]);
    expect((await companyAClient.from('tenants').select('id').eq('id', companyBTenantId)).data).toEqual([]);
    expect((await companyAClient.from('properties').select('id').eq('id', companyBPropertyId)).data).toEqual([]);
  });

  it('creates one idempotent system-alert lead through the existing alert path', async () => {
    const first = await admin.from('leads').select('id, pipeline_kind, source')
      .eq('company_id', companyA.companyId).eq('source_reference_id', operationalAlertId);
    expect(first.error).toBeNull();
    expect(first.data).toHaveLength(1);
    expect(first.data?.[0]).toMatchObject({ pipeline_kind: 'renewal', source: 'system_alert' });

    expect((await admin.rpc('crm_process_operational_alert', { p_alert_id: operationalAlertId })).error).toBeNull();
    const replayed = await admin.from('leads').select('id')
      .eq('company_id', companyA.companyId).eq('source_reference_id', operationalAlertId);
    expect(replayed.data).toHaveLength(1);
  });

  it('rejects linking a visible CRM contact to another company tenant', async () => {
    const hostileLink = await companyAClient
      .from('lead_contacts')
      .update({ tenant_id: companyBTenantId })
      .eq('id', crmContactId);

    expect(hostileLink.error).not.toBeNull();
    expect(hostileLink.error?.code).toBe('42501');
  });

  it('allows linking a CRM contact to a tenant in the same company without widening tenant reads', async () => {
    const allowedLink = await companyAClient
      .from('lead_contacts')
      .update({ tenant_id: companyA.tenantId })
      .eq('id', crmContactId)
      .select('tenant_id')
      .single();

    expect(allowedLink.error).toBeNull();
    expect(allowedLink.data?.tenant_id).toBe(companyA.tenantId);

    const companyBRead = await companyBClient.from('lead_contacts').select('id, tenant_id').eq('id', crmContactId);
    expect(companyBRead.error).toBeNull();
    expect(companyBRead.data).toEqual([]);
  });

  it('evaluates operational alerts idempotently and resolves cleared conditions', async () => {
    const first = await companyAClient.rpc('evaluate_operational_alerts', { p_company_id: companyA.companyId });
    expect(first.error).toBeNull();

    const firstAlerts = await companyAClient.from('operational_alerts').select('id, status')
      .eq('alert_type', 'vendor_document_expiring').eq('reference_id', evaluatorVendorDocumentId);
    expect(firstAlerts.error).toBeNull();
    expect(firstAlerts.data).toHaveLength(1);

    const second = await companyAClient.rpc('evaluate_operational_alerts', { p_company_id: companyA.companyId });
    expect(second.error).toBeNull();
    const secondAlerts = await companyAClient.from('operational_alerts').select('id')
      .eq('alert_type', 'vendor_document_expiring').eq('reference_id', evaluatorVendorDocumentId);
    expect(secondAlerts.data).toHaveLength(1);

    expect((await companyAClient.from('vendor_documents').update({ expiry_date: '2099-01-01' }).eq('id', evaluatorVendorDocumentId)).error).toBeNull();
    expect((await companyAClient.rpc('evaluate_operational_alerts', { p_company_id: companyA.companyId })).error).toBeNull();
    const resolved = await companyAClient.from('operational_alerts').select('status, resolved_at')
      .eq('alert_type', 'vendor_document_expiring').eq('reference_id', evaluatorVendorDocumentId).single();
    expect(resolved.data?.status).toBe('resolved');
    expect(resolved.data?.resolved_at).not.toBeNull();
  });

  it.each(['leases', 'invoices', 'payments', 'maintenance_requests'])('prevents a tenant from reading another tenant\'s %s', async (table) => {
    const result = await tenantAClient.from(table).select('id').eq('id', otherTenantRowIds[table]);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('supports the lease signature and lifecycle happy path', async () => {
    const signedAt = new Date().toISOString();
    const signed = await companyAClient.from('leases').update({
      status: 'active',
      landlord_signature_url: 'signatures/landlord.png',
      landlord_signed_at: signedAt,
      tenant_signature_url: 'signatures/tenant.png',
      tenant_signed_at: signedAt,
    }).eq('id', companyA.leaseId).select('status, landlord_signed_at, tenant_signed_at').single();

    expect(signed.error).toBeNull();
    expect(signed.data).toMatchObject({ status: 'active', landlord_signed_at: signedAt, tenant_signed_at: signedAt });
  });

  it('supports the maintenance request state machine', async () => {
    const requestId = fixtures.find((fixture) => fixture.table === 'maintenance_requests')!.id;
    for (const status of ['in_progress', 'completed']) {
      const result = await companyAClient.from('maintenance_requests').update({ status }).eq('id', requestId).select('status').single();
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe(status);
    }

    const cancelled = await companyAClient.from('maintenance_requests').update({ status: 'cancelled' })
      .eq('id', otherTenantRowIds.maintenance_requests).select('status').single();
    expect(cancelled.error).toBeNull();
    expect(cancelled.data?.status).toBe('cancelled');
  });

  it('supports the tenant exit workflow state machine', async () => {
    const exit = await companyAClient.from('tenant_exits').insert({
      tenant_id: companyA.tenantId,
      property_id: companyA.propertyId,
      unit_id: companyA.unitId,
      initiated_by: companyA.ownerId,
      user_id: companyA.ownerId,
      exit_reason: 'lease_expiry',
      deposit_amount: 1000,
    }).select('id, status').single();
    expect(exit.error).toBeNull();

    for (const status of ['inspection_complete', 'deposit_decided', 'approved', 'completed']) {
      const result = await companyAClient.from('tenant_exits').update({ status }).eq('id', exit.data!.id).select('status').single();
      expect(result.error).toBeNull();
      expect(result.data?.status).toBe(status);
    }
  });

  it('supports messaging and scoped broadcast CRUD', async () => {
    const message = await companyAClient.from('messages').insert({
      user_id: companyA.ownerId,
      sender_id: companyA.ownerId,
      recipient_id: teamMemberId,
      property_id: companyA.propertyId,
      subject: 'Integration message',
      content: 'Hello team',
    }).select('id').single();
    expect(message.error).toBeNull();

    const broadcast = await companyAClient.from('broadcasts').insert({
      company_id: companyA.companyId,
      created_by: companyA.ownerId,
      title: 'Integration broadcast',
      message: 'Hello tenants',
      target_role: 'tenant',
      property_id: companyA.propertyId,
    }).select('id, target_role').single();
    expect(broadcast.error).toBeNull();
    expect(broadcast.data?.target_role).toBe('tenant');
    expect((await companyAClient.from('broadcasts').delete().eq('id', broadcast.data!.id)).error).toBeNull();
  });

  it('supports property and unit CRUD', async () => {
    const property = await companyAClient.from('properties').insert({
      user_id: companyA.ownerId,
      company_id: companyA.companyId,
      name: `CRUD Property ${runId}`,
      address: '2 Integration Way',
      city: 'Accra',
      state: 'Greater Accra',
      zip_code: '00000',
    }).select('id').single();
    expect(property.error).toBeNull();

    const unit = await companyAClient.from('units').insert({
      user_id: companyA.ownerId,
      property_id: property.data!.id,
      unit_number: `CRUD-${runId}`,
    }).select('id').single();
    expect(unit.error).toBeNull();
    expect((await companyAClient.from('units').update({ status: 'maintenance' }).eq('id', unit.data!.id).select('status').single()).data?.status).toBe('maintenance');
    expect((await companyAClient.from('properties').delete().eq('id', property.data!.id)).error).toBeNull();
  });

  it('supports notification CRUD', async () => {
    const created = await companyAClient.from('notifications').insert({
      user_id: companyA.ownerId,
      title: 'Integration notification',
      message: 'Unread',
      type: 'info',
    }).select('id, is_read').single();
    expect(created.error).toBeNull();
    expect(created.data?.is_read).toBe(false);

    const markedRead = await companyAClient.from('notifications').update({ is_read: true }).eq('id', created.data!.id).select('is_read').single();
    expect(markedRead.data?.is_read).toBe(true);
    expect((await companyAClient.from('notifications').delete().eq('id', created.data!.id)).error).toBeNull();
  });

  it('supports company and team-member role changes', async () => {
    const company = await companyAClient.from('companies').update({ phone: '+233200000009' }).eq('id', companyA.companyId).select('phone').single();
    expect(company.data?.phone).toBe('+233200000009');

    const member = await companyAClient.from('company_members').update({ role: 'landlord' })
      .eq('company_id', companyA.companyId).eq('user_id', teamMemberId).select('role').single();
    expect(member.error).toBeNull();
    expect(member.data?.role).toBe('landlord');
  });

  it('supports saved-report CRUD', async () => {
    const created = await companyAClient.from('reports').insert({
      user_id: companyA.ownerId,
      name: 'Integration occupancy report',
      type: 'occupancy',
      config: { range: 'month' },
    }).select('id').single();
    expect(created.error).toBeNull();
    expect((await companyAClient.from('reports').update({ name: 'Updated occupancy report' }).eq('id', created.data!.id).select('name').single()).data?.name).toBe('Updated occupancy report');
    expect((await companyAClient.from('reports').delete().eq('id', created.data!.id)).error).toBeNull();
  });
});