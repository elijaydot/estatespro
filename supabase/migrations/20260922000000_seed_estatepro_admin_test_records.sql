-- ==============================================================================
-- FISHGATE REAL ESTATE - PRODUCTION SEED FOR LANDLORD (admin@estatepro.com)
-- ==============================================================================
-- Idempotent, high-fidelity test records across all operational, financial, 
-- CRM, and reporting tables for admin@estatepro.com (Landlord Role).
-- ==============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID := 'c0000000-0000-0000-0000-000000000001';
  v_prop_1 UUID := 'd1111111-1111-1111-1111-111111111111';
  v_prop_2 UUID := 'd2222222-2222-2222-2222-222222222222';
  v_unit_1 UUID := 'e1111111-1111-1111-1111-111111111111';
  v_unit_2 UUID := 'e2222222-2222-2222-2222-222222222222';
  v_unit_3 UUID := 'e3333333-3333-3333-3333-333333333333';
  v_unit_4 UUID := 'e4444444-4444-4444-4444-444444444444';
  v_tenant_1 UUID := 'f1111111-1111-1111-1111-111111111111';
  v_tenant_2 UUID := 'f2222222-2222-2222-2222-222222222222';
  v_lease_1 UUID := 'a1111111-1111-1111-1111-111111111111';
  v_lease_2 UUID := 'a2222222-2222-2222-2222-222222222222';
  v_inv_1 UUID := 'b1111111-1111-1111-1111-111111111111';
  v_inv_2 UUID := 'b2222222-2222-2222-2222-222222222222';
  v_inv_3 UUID := 'b3333333-3333-3333-3333-333333333333';
  v_inv_4 UUID := 'b4444444-4444-4444-4444-444444444444';
  v_vendor_1 UUID := 'c1111111-1111-1111-1111-111111111111';
  v_vendor_2 UUID := 'c2222222-2222-2222-2222-222222222222';
  v_lead_1 UUID := '91111111-1111-1111-1111-111111111111';
  v_lead_2 UUID := '92222222-2222-2222-2222-222222222222';
  v_deal_1 UUID := '81111111-1111-1111-1111-111111111111';
  v_deal_2 UUID := '82222222-2222-2222-2222-222222222222';
  v_account_1 UUID := '71111111-1111-1111-1111-111111111111';
  v_account_2 UUID := '72222222-2222-2222-2222-222222222222';
  v_campaign_1 UUID := '61111111-1111-1111-1111-111111111111';
  v_campaign_2 UUID := '62222222-2222-2222-2222-222222222222';
  v_project_1 UUID := '51111111-1111-1111-1111-111111111111';
  v_project_2 UUID := '52222222-2222-2222-2222-222222222222';
  v_product_id UUID;
  v_plan_id UUID;
  v_sub_id UUID;
BEGIN
  -- ============================================================================
  -- 1. DYNAMICALLY RESOLVE TARGET USER (admin@estatepro.com / admin@estatespro.com)
  -- ============================================================================
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE lower(trim(email)) IN ('admin@estatepro.com', 'admin@estatespro.com')
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE lower(email) LIKE '%admin%'
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    -- Fallback: create user if auth.users is completely empty
    v_user_id := '00000000-0000-0000-0000-000000000001';
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'admin@estatepro.com',
      crypt('Password123!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"EstatePro Landlord","role":"landlord"}',
      now(), now(), 'authenticated', 'authenticated'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE '>>> Seeding data for User ID: % (Email: %)', v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id);

  -- ============================================================================
  -- 2. PROFILES TABLE (Sets Landlord Role, Name & Phone; default_company_id set after Step 5)
  -- ============================================================================
  INSERT INTO public.profiles (user_id, email, name, role, phone)
  VALUES (
    v_user_id,
    COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'admin@estatepro.com'),
    'EstatePro Landlord',
    'landlord',
    '+250788100200'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'landlord',
    name = 'EstatePro Landlord',
    phone = '+250788100200';

  -- ============================================================================
  -- 3. USER ROLES TABLE (Handles composite unique constraint user_id, role)
  -- ============================================================================
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'landlord'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ============================================================================
  -- 4. APP SETTINGS TABLE (RWF, Africa/Kigali)
  -- ============================================================================
  INSERT INTO public.app_settings (
    user_id, currency_code, currency_symbol, default_country, timezone, date_format
  ) VALUES (
    v_user_id, 'RWF', 'RWF', 'Rwanda', 'Africa/Kigali', 'DD/MM/YYYY'
  ) ON CONFLICT (user_id) DO UPDATE SET
    currency_code = 'RWF',
    currency_symbol = 'RWF',
    default_country = 'Rwanda',
    timezone = 'Africa/Kigali';

  -- ============================================================================
  -- 5. COMPANY & COMPLIANCE (RDB / RRA KYB Approved)
  -- ============================================================================
  INSERT INTO public.companies (
    id, name, owner_id, email, phone, address, created_at, updated_at
  ) VALUES (
    v_company_id,
    'EstatePro Real Estate Rwanda Ltd',
    v_user_id,
    COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'admin@estatepro.com'),
    '+250788100200',
    'Kigali Financial Square, KG 7 Ave, Kimihurura, Kigali, Rwanda',
    now() - interval '90 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    owner_id = v_user_id,
    name = 'EstatePro Real Estate Rwanda Ltd';

  BEGIN
    UPDATE public.companies SET
      tin = '100234567',
      rdb_company_code = '100234567',
      rdb_registered_name = 'EstatePro Real Estate Rwanda Ltd',
      legal_structure = 'Company Limited by Shares (Ltd)',
      kyb_status = 'verified',
      kyb_verified_at = now() - interval '90 days',
      director_name = 'EstatePro Landlord',
      director_national_id = '1198880010020033',
      rwareb_license_number = 'RWAREB-KGL-2026-089',
      ncsa_consent_at = now() - interval '90 days'
    WHERE id = v_company_id;
  EXCEPTION WHEN OTHERS THEN
  END;

  -- Ensure company membership has owner approved status
  INSERT INTO public.company_members (company_id, user_id, role, status)
  VALUES (v_company_id, v_user_id, 'owner', 'approved')
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'approved';

  -- Now that company ownership and membership exist, safely link default_company_id
  UPDATE public.profiles
  SET default_company_id = v_company_id
  WHERE user_id = v_user_id;

  -- Company Settings
  INSERT INTO public.company_settings (
    user_id, company_name, company_email, company_phone, company_address
  ) VALUES (
    v_user_id,
    'EstatePro Real Estate Rwanda Ltd',
    COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'admin@estatepro.com'),
    '+250788100200',
    'Kigali Financial Square, KG 7 Ave, Kimihurura, Kigali, Rwanda'
  ) ON CONFLICT (user_id) DO UPDATE SET
    company_name = 'EstatePro Real Estate Rwanda Ltd',
    company_email = COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), 'admin@estatepro.com'),
    company_phone = '+250788100200',
    company_address = 'Kigali Financial Square, KG 7 Ave, Kimihurura, Kigali, Rwanda';

  -- ============================================================================
  -- 6. PROPERTIES & UNITS (Strict lowercase check constraints: apartment, mixed)
  -- ============================================================================
  INSERT INTO public.properties (
    id, user_id, company_id, name, type, address, city, state, zip_code, country,
    total_units, occupied_units, description, created_at, updated_at
  ) VALUES 
  (
    v_prop_1,
    v_user_id,
    v_company_id,
    'Kigali Heights Residences',
    'apartment',
    'KG 7 Ave, Kimihurura',
    'Kigali',
    'Gasabo',
    '00250',
    'Rwanda',
    12,
    10,
    'High-end serviced residential development located in Kimihurura diplomatic quarter. Modern amenities with 24/7 security.',
    now() - interval '180 days',
    now()
  ),
  (
    v_prop_2,
    v_user_id,
    v_company_id,
    'Vision City Commercial & Residential Hub',
    'mixed',
    'Boulevard de Gaculiro',
    'Kigali',
    'Gasabo',
    '00250',
    'Rwanda',
    20,
    16,
    'Master-planned urban community featuring modern retail boulevards, executive penthouses, and leafy residential avenues.',
    now() - interval '120 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    company_id = v_company_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type;

  INSERT INTO public.units (
    id, property_id, user_id, unit_number, floor, rent_amount, bedrooms, bathrooms, sqft, status, description, created_at, updated_at
  ) VALUES 
  (
    v_unit_1,
    v_prop_1,
    v_user_id,
    'A-101',
    1,
    850000,
    2,
    2,
    1150,
    'occupied',
    'Modern 2-bedroom luxury garden apartment with fitted kitchen and balcony overlooking Kimihurura hills.',
    now() - interval '150 days',
    now()
  ),
  (
    v_unit_2,
    v_prop_1,
    v_user_id,
    'B-204',
    2,
    1500000,
    3,
    3,
    1850,
    'vacant',
    'Executive 3-bedroom penthouse suite with panoramic terrace, smart access control, and dedicated underground parking.',
    now() - interval '150 days',
    now()
  ),
  (
    v_unit_3,
    v_prop_2,
    v_user_id,
    'C-301',
    3,
    2200000,
    0,
    2,
    2400,
    'occupied',
    'Prime high-street commercial retail showroom situated along the central Vision City promenade with high foot traffic.',
    now() - interval '100 days',
    now()
  ),
  (
    v_unit_4,
    v_prop_2,
    v_user_id,
    'D-402',
    4,
    550000,
    1,
    1,
    650,
    'vacant',
    'Contemporary 1-bedroom executive studio apartment, ideal for single young professionals or corporate expatriates.',
    now() - interval '100 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    property_id = EXCLUDED.property_id,
    rent_amount = EXCLUDED.rent_amount,
    status = EXCLUDED.status;

  -- ============================================================================
  -- 7. TENANTS & LEASES
  -- ============================================================================
  INSERT INTO public.tenants (
    id, user_id, property_id, unit_id, name, email, phone, status, monthly_rent, security_deposit,
    occupation, employer, move_in_date, balance, created_at, updated_at
  ) VALUES 
  (
    v_tenant_1,
    v_user_id,
    v_prop_1,
    v_unit_1,
    'Jean-Paul Habimana',
    'jpaul.habimana@gmail.com',
    '+250788123456',
    'active',
    850000,
    850000,
    'Senior Financial Analyst',
    'Bank of Kigali Plc',
    (now() - interval '90 days')::date,
    0,
    now() - interval '95 days',
    now()
  ),
  (
    v_tenant_2,
    v_user_id,
    v_prop_2,
    v_unit_3,
    'Aline Uwase',
    'aline.uwase@yahoo.fr',
    '+250788654321',
    'active',
    2200000,
    4400000,
    'Managing Director',
    'Kigali Fashion Brands Ltd',
    (now() - interval '60 days')::date,
    0,
    now() - interval '65 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    balance = 0,
    status = 'active';

  INSERT INTO public.leases (
    id, user_id, property_id, unit_id, tenant_id, lease_number, monthly_rent, security_deposit,
    start_date, end_date, status, terms, created_at, updated_at
  ) VALUES 
  (
    v_lease_1,
    v_user_id,
    v_prop_1,
    v_unit_1,
    v_tenant_1,
    'LSE-KGL-2026-001',
    850000,
    850000,
    (now() - interval '90 days')::date,
    (now() + interval '275 days')::date,
    'active',
    'Standard Rwandan residential lease agreement subject to statutory 15% rental withholding tax and NCSA Law Nº 058/2021 data protection provisions.',
    now() - interval '90 days',
    now()
  ),
  (
    v_lease_2,
    v_user_id,
    v_prop_2,
    v_unit_3,
    v_tenant_2,
    'LSE-KGL-2026-002',
    2200000,
    4400000,
    (now() - interval '60 days')::date,
    (now() + interval '670 days')::date,
    'active',
    'Commercial tenancy contract with quarterly statutory indexation and certified RRA EBM electronic billing obligations.',
    now() - interval '60 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    status = 'active';

  -- ============================================================================
  -- 8. INVOICES & PAYMENTS (source = 'tenant' to strictly satisfy check constraint)
  -- ============================================================================
  INSERT INTO public.invoices (
    id, user_id, property_id, unit_id, tenant_id, invoice_number, description,
    amount, paid_amount, status, due_date, source, created_at, updated_at
  ) VALUES 
  (
    v_inv_1,
    v_user_id,
    v_prop_1,
    v_unit_1,
    v_tenant_1,
    'FG-INV-2026-001',
    'Monthly Rent - Unit A-101 (Kimihurura Residences)',
    850000,
    850000,
    'paid',
    (now() - interval '30 days')::date,
    'tenant',
    now() - interval '35 days',
    now()
  ),
  (
    v_inv_2,
    v_user_id,
    v_prop_2,
    v_unit_3,
    v_tenant_2,
    'FG-INV-2026-002',
    'Commercial Showroom Rent - Unit C-301 (Vision City)',
    2200000,
    2200000,
    'paid',
    (now() - interval '15 days')::date,
    'tenant',
    now() - interval '20 days',
    now()
  ),
  (
    v_inv_3,
    v_user_id,
    v_prop_1,
    v_unit_2,
    v_tenant_1,
    'FG-INV-2026-003',
    'Security Deposit & Move-In Advance - Penthouse B-204',
    1500000,
    0,
    'pending',
    (now() + interval '10 days')::date,
    'tenant',
    now() - interval '2 days',
    now()
  ),
  (
    v_inv_4,
    v_user_id,
    v_prop_2,
    v_unit_4,
    v_tenant_2,
    'FG-INV-2026-004',
    'Reservation Hold Deposit - Studio D-402',
    550000,
    0,
    'pending',
    (now() + interval '5 days')::date,
    'tenant',
    now() - interval '1 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    status = EXCLUDED.status,
    source = 'tenant';

  INSERT INTO public.payments (
    id, user_id, invoice_id, tenant_id, amount, method, status, momo_phone,
    momo_transaction_id, notes, receipt_number, source, created_at
  ) VALUES 
  (
    '41111111-1111-1111-1111-111111111111',
    v_user_id,
    v_inv_1,
    v_tenant_1,
    850000,
    'mtn_momo',
    'completed',
    '+250788123456',
    'MTN-MOMO-RW-98271625',
    'Rent payment confirmed via MTN MoMo (*182#). Official RRA EBM v2 Fiscal Receipt generated.',
    'EBM-RW26-0010928',
    'tenant',
    now() - interval '30 days'
  ),
  (
    '42222222-2222-2222-2222-222222222222',
    v_user_id,
    v_inv_2,
    v_tenant_2,
    2200000,
    'bank_transfer',
    'completed',
    '+250788654321',
    'AIRTEL-MOMO-RW-76543219',
    'Commercial tenancy rent paid via Airtel Money (*175#) & Bank Transfer. VSDC electronic billing closure verified.',
    'EBM-RW26-0010929',
    'tenant',
    now() - interval '15 days'
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    status = 'completed',
    source = 'tenant';

  -- ============================================================================
  -- 9. VENDORS, MAINTENANCE REQUESTS, VENDOR PAYMENTS & RECURRING BILLS
  -- ============================================================================
  INSERT INTO public.vendors (
    id, company_id, name, contact_name, email, phone, address, vendor_type, status, created_at, updated_at
  ) VALUES 
  (
    v_vendor_1,
    v_company_id,
    'Kigali Premier Electrical & HVAC Ltd',
    'Emmanuel Bizimana',
    'bizimana@kigalipremier.rw',
    '+250788334455',
    'Gikondo Industrial Zone, Kigali',
    'Electrical & HVAC',
    'active',
    now() - interval '120 days',
    now()
  ),
  (
    v_vendor_2,
    v_company_id,
    'Wasac Certified Plumbing Contractors Ltd',
    'Diane Mutoni',
    'mutoni@wasac-plumbing.rw',
    '+250788445566',
    'KN 3 Rd, Nyarugenge, Kigali',
    'Plumbing & Water Systems',
    'active',
    now() - interval '120 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    status = 'active';

  INSERT INTO public.maintenance_requests (
    id, user_id, property_id, unit_id, tenant_id, vendor_id, title, description,
    priority, status, estimated_cost, actual_cost, created_at, updated_at
  ) VALUES 
  (
    '55555555-1111-1111-1111-111111111111',
    v_user_id,
    v_prop_1,
    v_unit_1,
    v_tenant_1,
    v_vendor_1,
    'Air Conditioning Diagnostic & Filter Service',
    'Master bedroom AC compressor diagnostic and eco-friendly refrigerant gas top-up before summer warm spell.',
    'high',
    'in_progress',
    120000,
    120000,
    now() - interval '3 days',
    now()
  ),
  (
    '55555555-2222-2222-2222-222222222222',
    v_user_id,
    v_prop_1,
    v_unit_2,
    NULL,
    v_vendor_2,
    'Water Heater Pressure Valve Replacement',
    'Installed certified German pressure relief valve on main bathroom water heater prior to unit move-in.',
    'medium',
    'completed',
    75000,
    75000,
    now() - interval '14 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    status = EXCLUDED.status;

  INSERT INTO public.vendor_payments (
    id, company_id, vendor_id, maintenance_request_id, amount, currency,
    payment_method, status, notes, paid_at, created_at, updated_at
  ) VALUES 
  (
    '66666666-1111-1111-1111-111111111111',
    v_company_id,
    v_vendor_1,
    '55555555-1111-1111-1111-111111111111',
    120000,
    'RWF',
    'bank_transfer',
    'paid',
    'Direct settlement to Kigali Premier Electrical via I&M Bank Rwanda.',
    now() - interval '2 days',
    now() - interval '2 days',
    now()
  ),
  (
    '66666666-2222-2222-2222-222222222222',
    v_company_id,
    v_vendor_2,
    '55555555-2222-2222-2222-222222222222',
    75000,
    'RWF',
    'mtn_momo',
    'paid',
    'Settled via MTN MoMo B2B Pay code.',
    now() - interval '12 days',
    now() - interval '12 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    status = 'paid';

  INSERT INTO public.recurring_bills (
    id, user_id, property_id, name, bill_type, amount, frequency, is_active, description, created_at, updated_at
  ) VALUES 
  (
    '77777777-1111-1111-1111-111111111111',
    v_user_id,
    v_prop_1,
    'Property 24/7 Guarding & Security Service',
    'Security',
    250000,
    'monthly',
    true,
    'KK Security Rwanda - 2 guards day shift, 2 guards night shift with K-9 patrol.',
    now() - interval '90 days',
    now()
  ),
  (
    '77777777-2222-2222-2222-222222222222',
    v_user_id,
    v_prop_2,
    'Common Area Water & Streetlight Power (WASAC & REG)',
    'Utilities',
    180000,
    'monthly',
    true,
    'Shared courtyard illumination, automated garden irrigation, and staircase electricity.',
    now() - interval '90 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    is_active = true;

  -- ============================================================================
  -- 10. MARKETPLACE LISTINGS (status = 'live')
  -- ============================================================================
  INSERT INTO public.marketplace_listings (
    id, company_id, property_id, unit_id, title, slug, description,
    rent_amount, currency, city, bedrooms, bathrooms, status, verification_state,
    created_by, created_at, updated_at
  ) VALUES 
  (
    '88888888-1111-1111-1111-111111111111',
    v_company_id,
    v_prop_1,
    v_unit_1,
    'Luxury 2BR Furnished Apartment in Kimihurura',
    'luxury-2br-furnished-apartment-kimihurura-888811',
    'Fully furnished apartment with premium European fittings, high-speed fiber internet, private gym access, and scenic view.',
    850000,
    'RWF',
    'Kigali',
    2,
    2,
    'live',
    'verified',
    v_user_id,
    now() - interval '45 days',
    now()
  ),
  (
    '88888888-2222-2222-2222-222222222222',
    v_company_id,
    v_prop_2,
    v_unit_3,
    'Prime High-Street Retail Corner in Vision City',
    'prime-retail-corner-vision-city-888822',
    'Expansive ground floor showroom with floor-to-ceiling glass display, heavy customer footfall, and dedicated loading bay.',
    2200000,
    'RWF',
    'Kigali',
    0,
    2,
    'live',
    'verified',
    v_user_id,
    now() - interval '30 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    created_by = v_user_id,
    status = 'live',
    verification_state = 'verified';

  -- ============================================================================
  -- 11. CRM ACCOUNTS, LEADS, CONTACTS, DEALS, VISITS, CALLS, CAMPAIGNS, PROJECTS
  -- ============================================================================
  INSERT INTO public.crm_accounts (
    id, company_id, name, account_kind, phone, created_by, owner_user_id, created_at, updated_at
  ) VALUES 
  (
    v_account_1,
    v_company_id,
    'Mugabo Holdings Rwanda Ltd',
    'corporate_tenant',
    '+250788998877',
    v_user_id,
    v_user_id,
    now() - interval '25 days',
    now()
  ),
  (
    v_account_2,
    v_company_id,
    'Kigali University Medical Associates',
    'owner_investor',
    '+250788112233',
    v_user_id,
    v_user_id,
    now() - interval '20 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    owner_user_id = v_user_id,
    created_by = v_user_id,
    account_kind = EXCLUDED.account_kind;

  INSERT INTO public.leads (
    id, company_id, listing_id, pipeline_kind, stage, status, score, priority, source,
    created_by, assigned_to, first_seen_at, created_at, updated_at
  ) VALUES 
  (
    v_lead_1,
    v_company_id,
    '88888888-1111-1111-1111-111111111111',
    'leasing',
    'qualified',
    'open',
    92,
    'high',
    'marketplace_public',
    v_user_id,
    v_user_id,
    now() - interval '18 days',
    now() - interval '18 days',
    now()
  ),
  (
    v_lead_2,
    v_company_id,
    '88888888-2222-2222-2222-222222222222',
    'leasing',
    'contacted',
    'open',
    78,
    'normal',
    'manual',
    v_user_id,
    v_user_id,
    now() - interval '10 days',
    now() - interval '10 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    created_by = v_user_id,
    assigned_to = v_user_id,
    stage = EXCLUDED.stage,
    status = EXCLUDED.status;

  INSERT INTO public.lead_contacts (
    id, lead_id, full_name, email, phone_e164, preferred_channel, consent_marketing
  ) VALUES 
  (
    '99999999-1111-1111-1111-111111111111',
    v_lead_1,
    'Eric Mugabo',
    'eric.mugabo@outlook.com',
    '+250788998877',
    'whatsapp',
    true
  ),
  (
    '99999999-2222-2222-2222-222222222222',
    v_lead_2,
    'Dr. Marie Mukamana',
    'marie.mukamana@ur.ac.rw',
    '+250788112233',
    'phone',
    true
  ) ON CONFLICT (lead_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_e164 = EXCLUDED.phone_e164,
    preferred_channel = EXCLUDED.preferred_channel;

  INSERT INTO public.crm_deals (
    id, company_id, lead_id, account_id, unit_id, deal_name, amount, currency,
    probability, expected_close_date, created_by, owner_user_id, created_at, updated_at
  ) VALUES 
  (
    v_deal_1,
    v_company_id,
    v_lead_1,
    v_account_1,
    v_unit_2,
    'Kigali Heights Penthouse Tenancy Deal',
    18000000,
    'RWF',
    85,
    (now() + interval '12 days')::date,
    v_user_id,
    v_user_id,
    now() - interval '15 days',
    now()
  ),
  (
    v_deal_2,
    v_company_id,
    v_lead_2,
    v_account_2,
    v_unit_3,
    'Vision City Commercial Expansion Agreement',
    26400000,
    'RWF',
    100,
    (now() - interval '5 days')::date,
    v_user_id,
    v_user_id,
    now() - interval '25 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    owner_user_id = v_user_id,
    created_by = v_user_id;

  BEGIN
    UPDATE public.crm_deals SET stage = 'proposal' WHERE id = v_deal_1;
    UPDATE public.crm_deals SET stage = 'closed_won' WHERE id = v_deal_2;
  EXCEPTION WHEN OTHERS THEN
  END;

  INSERT INTO public.crm_visits (
    id, company_id, related_type, related_id, locality, address_text,
    status, check_in_at, check_in_lat, check_in_lng, check_out_at, proof_path,
    outcome, notes, created_by, created_at, updated_at
  ) VALUES 
  (
    'aaaa1111-1111-1111-1111-111111111111',
    v_company_id,
    'deal',
    v_deal_1,
    'Kimihurura',
    'KG 7 Ave, Kigali Heights Suite B-204',
    'completed',
    now() - interval '5 days',
    -1.9536,
    30.0605,
    now() - interval '5 days' + interval '45 minutes',
    'visits/proof_v1.jpg',
    'Prospect inspected master bedroom and underground parking. Highly satisfied with panoramic terrace.',
    'Follow up on lease signing',
    v_user_id,
    now() - interval '7 days',
    now()
  ),
  (
    'aaaa2222-2222-2222-2222-222222222222',
    v_company_id,
    'deal',
    v_deal_2,
    'Gaculiro',
    'Vision City Promenade, Suite C-301',
    'planned',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'Scheduled commercial space walkthrough with Dr. Mukamana and logistics manager.',
    v_user_id,
    now() - interval '2 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    created_by = v_user_id,
    status = EXCLUDED.status;

  INSERT INTO public.crm_calls (
    id, company_id, related_type, related_id, call_type, contact_name, subject,
    duration_minutes, result, started_at, created_by, owner_user_id, created_at, updated_at
  ) VALUES 
  (
    'bbbb1111-1111-1111-1111-111111111111',
    v_company_id,
    'lead',
    v_lead_1,
    'inbound',
    'Eric Mugabo',
    'Pricing & Deposit Inquiries for Penthouse',
    6,
    'Answered all questions regarding lease terms and statutory rental tax deductions.',
    now() - interval '8 days',
    v_user_id,
    v_user_id,
    now() - interval '8 days',
    now()
  ),
  (
    'bbbb2222-2222-2222-2222-222222222222',
    v_company_id,
    'lead',
    v_lead_2,
    'outbound',
    'Dr. Marie Mukamana',
    'Vision City Site Tour Scheduling & Parking Details',
    4,
    'Confirmed scheduled walkthrough appointment for this coming weekend.',
    now() - interval '3 days',
    v_user_id,
    v_user_id,
    now() - interval '3 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    owner_user_id = v_user_id,
    created_by = v_user_id;

  INSERT INTO public.crm_campaigns (
    id, company_id, name, channel, budget_amount, spend_amount, status,
    starts_on, ends_on, created_by, created_at, updated_at
  ) VALUES 
  (
    v_campaign_1,
    v_company_id,
    'Kigali Diaspora & Expat Housing Campaign 2026',
    'email',
    500000,
    320000,
    'active',
    (now() - interval '30 days')::date,
    (now() + interval '60 days')::date,
    v_user_id,
    now() - interval '30 days',
    now()
  ),
  (
    v_campaign_2,
    v_company_id,
    'Vision City Commercial Retail Drive',
    'sms',
    350000,
    210000,
    'active',
    (now() - interval '20 days')::date,
    (now() + interval '40 days')::date,
    v_user_id,
    now() - interval '20 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    created_by = v_user_id,
    status = 'active';

  INSERT INTO public.crm_projects (
    id, company_id, name, description, progress_percent, status, due_date,
    owner_user_id, created_by, created_at, updated_at
  ) VALUES 
  (
    v_project_1,
    v_company_id,
    'Phase II Gaculiro Luxury Townhouses',
    'Development of 16 modern four-bedroom townhouses with solar water heating and shared recreational club.',
    65,
    'active',
    (now() + interval '180 days')::date,
    v_user_id,
    v_user_id,
    now() - interval '60 days',
    now()
  ),
  (
    v_project_2,
    v_company_id,
    'Kimihurura Serviced Apartments Expansion',
    'Refurbishment and interior automation of 8 serviced apartments with dedicated fiber optic infrastructure.',
    30,
    'planned',
    (now() + interval '240 days')::date,
    v_user_id,
    v_user_id,
    now() - interval '40 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    owner_user_id = v_user_id,
    created_by = v_user_id,
    status = EXCLUDED.status;

  -- ============================================================================
  -- 12. SHORT-LET BOOKINGS, INSPECTIONS, OPERATIONAL ALERTS & NOTIFICATIONS
  -- ============================================================================
  INSERT INTO public.bookings (
    id, user_id, property_id, unit_id, guest_name, guest_email, guest_phone,
    check_in, check_out, num_guests, nightly_rate, cleaning_fee, service_fee,
    total_amount, status, payment_status, created_at, updated_at
  ) VALUES 
  (
    'cccc1111-1111-1111-1111-111111111111',
    v_user_id,
    v_prop_1,
    v_unit_2,
    'David Miller',
    'david.miller@globalventures.com',
    '+14155552671',
    (now() + interval '5 days')::date,
    (now() + interval '9 days')::date,
    2,
    90000,
    25000,
    15000,
    400000,
    'confirmed',
    'paid',
    now() - interval '4 days',
    now()
  ),
  (
    'cccc2222-2222-2222-2222-222222222222',
    v_user_id,
    v_prop_2,
    v_unit_4,
    'Sarah Van Der Berg',
    'sarah.vdb@africastudies.org',
    '+31612345678',
    (now() + interval '12 days')::date,
    (now() + interval '16 days')::date,
    1,
    65000,
    15000,
    10000,
    285000,
    'confirmed',
    'paid',
    now() - interval '2 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id,
    status = 'confirmed',
    payment_status = 'paid';

  INSERT INTO public.default_inspection_checklist (
    id, user_id, item_category, item_name, is_global, created_at
  ) VALUES 
  (
    'dddd1111-1111-1111-1111-111111111111',
    v_user_id,
    'structure',
    'Walls & Paint Quality (Check for hairline cracks, water seepage or discoloration)',
    true,
    now() - interval '60 days'
  ),
  (
    'dddd2222-2222-2222-2222-222222222222',
    v_user_id,
    'electrical',
    'Main Circuit Breakers & Residual Current Devices (Test trip safety switches)',
    true,
    now() - interval '60 days'
  ),
  (
    'dddd3333-3333-3333-3333-333333333333',
    v_user_id,
    'plumbing',
    'Water Faucets & Sinks Drainage (Inspect for leaks and test hot water pressure)',
    true,
    now() - interval '60 days'
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id;

  INSERT INTO public.operational_alerts (
    id, company_id, title, description, alert_type, severity, status,
    reference_table, reference_id, metadata, created_at, updated_at
  ) VALUES 
  (
    'eeee1111-1111-1111-1111-111111111111',
    v_company_id,
    'Lease Renewal Notice: Unit A-101 (Kimihurura)',
    'Active tenancy for Jean-Paul Habimana approaches statutory 90-day renewal notification window.',
    'lease_expiry',
    'warning',
    'open',
    'leases',
    v_lease_1,
    '{"days_remaining": 75, "property": "Kigali Heights Residences"}'::jsonb,
    now() - interval '2 days',
    now()
  ),
  (
    'eeee2222-2222-2222-2222-222222222222',
    v_company_id,
    'Marketplace Vacancy Flag: Penthouse Unit B-204',
    'Executive 3BR Penthouse has been available for 14 days without confirmed lease agreement.',
    'vacant_unit',
    'info',
    'open',
    'units',
    v_unit_2,
    '{"days_vacant": 14, "potential_revenue_loss": 1500000}'::jsonb,
    now() - interval '1 days',
    now()
  ) ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET
    status = 'open',
    severity = EXCLUDED.severity;

  INSERT INTO public.alert_thresholds (
    id, company_id, alert_type, threshold_days, enabled, created_at, updated_at
  ) VALUES 
  (
    'ffff1111-1111-1111-1111-111111111111',
    v_company_id,
    'lease_expiry',
    60,
    true,
    now() - interval '90 days',
    now()
  ),
  (
    'ffff2222-2222-2222-2222-222222222222',
    v_company_id,
    'vacant_unit',
    14,
    true,
    now() - interval '90 days',
    now()
  ) ON CONFLICT (company_id, alert_type) DO UPDATE SET
    threshold_days = EXCLUDED.threshold_days,
    enabled = true;

  INSERT INTO public.broadcasts (
    id, company_id, property_id, title, message, target_role, created_by, created_at
  ) VALUES 
  (
    '12121212-1111-1111-1111-111111111111',
    v_company_id,
    v_prop_1,
    'Scheduled Water Network Maintenance (Kimihurura)',
    'Muraho, please be advised that WASAC will be carrying out scheduled water pressure enhancements this Thursday between 10:00 AM and 1:00 PM. Backup reservoir tanks will remain active.',
    'tenant',
    v_user_id,
    now() - interval '4 days'
  ),
  (
    '12121212-2222-2222-2222-222222222222',
    v_company_id,
    v_prop_2,
    'Quarterly Property Cleanliness & Environmental Advisory',
    'Notice to all residents: In line with monthly Umuganda environmental guidelines, compound landscape trimming and exterior facade washing will proceed this weekend.',
    'tenant',
    v_user_id,
    now() - interval '8 days'
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = v_company_id,
    created_by = v_user_id;

  INSERT INTO public.notifications (
    id, user_id, title, message, type, is_read, link, created_at
  ) VALUES 
  (
    '13131313-1111-1111-1111-111111111111',
    v_user_id,
    'MoMo Rent Payment Received: RWF 850,000',
    'Jean-Paul Habimana paid rent for Unit A-101 via MTN Mobile Money. Official RRA EBM v2 receipt certified.',
    'payment',
    true,
    '/invoices',
    now() - interval '30 days'
  ),
  (
    '13131313-2222-2222-2222-222222222222',
    v_user_id,
    'Maintenance Completed: HVAC Service #102',
    'Kigali Premier Electrical completed the air conditioning servicing at Kigali Heights Unit A-101.',
    'maintenance',
    false,
    '/maintenance',
    now() - interval '2 days'
  ),
  (
    '13131313-3333-3333-3333-333333333333',
    v_user_id,
    'New High-Intent Lead: Eric Mugabo',
    'Lead assigned for Penthouse B-204 inquiry via Marketplace. 2-Hour SLA response window active.',
    'crm',
    false,
    '/marketplace/crm/leads',
    now() - interval '18 days'
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id;

  INSERT INTO public.reports (
    id, user_id, name, type, config, created_at, updated_at
  ) VALUES 
  (
    '14141414-1111-1111-1111-111111111111',
    v_user_id,
    'Q1 2026 Portfolio Financial & Cash Flow Statement',
    'financial',
    '{"gross_revenue_rwf": 3050000, "collected_rwf": 3050000, "occupancy_rate": 81.25, "currency": "RWF", "period": "Q1 2026"}'::jsonb,
    now() - interval '10 days',
    now()
  ),
  (
    '14141414-2222-2222-2222-222222222222',
    v_user_id,
    'RRA Statutory Rental Tax Withholding Audit (15% Deduction Compliance)',
    'tax',
    '{"entity": "EstatePro Real Estate Rwanda Ltd", "tin": "100234567", "certified_receipts_count": 2, "total_statutory_tax_rwf": 457500}'::jsonb,
    now() - interval '5 days',
    now()
  ) ON CONFLICT (id) DO UPDATE SET
    user_id = v_user_id;

  -- ============================================================================
  -- 13. FISHGATE SAAS ENTERPRISE SUBSCRIPTION & INVOICES
  -- ============================================================================
  SELECT id INTO v_plan_id FROM public.saas_plans WHERE code = 'fishgate_enterprise' LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM public.saas_plans LIMIT 1;
  END IF;

  SELECT id INTO v_product_id FROM public.saas_products WHERE code = 'core_property' OR code = 'pm_core' LIMIT 1;
  IF v_product_id IS NULL THEN
    SELECT id INTO v_product_id FROM public.saas_products LIMIT 1;
  END IF;

  IF v_plan_id IS NOT NULL AND v_product_id IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.saas_subscription_invoices DROP CONSTRAINT IF EXISTS saas_subscription_invoices_currency_code_check;
    EXCEPTION WHEN OTHERS THEN
    END;

    -- Check if subscription already exists for this company & product (e.g. from company auto-provision trial trigger)
    SELECT id INTO v_sub_id 
    FROM public.saas_company_plan_subscriptions
    WHERE company_id = v_company_id AND product_id = v_product_id
    LIMIT 1;

    IF v_sub_id IS NOT NULL THEN
      UPDATE public.saas_company_plan_subscriptions SET
        plan_id = v_plan_id,
        status = 'active',
        payment_state = 'current',
        start_at = now() - interval '90 days',
        notes = 'FishGate Enterprise Plan subscription for EstatePro Landlord',
        metadata = '{"tier": "enterprise", "units_limit": 500, "seats_limit": 25, "momo_enabled": true}'::jsonb,
        updated_at = now()
      WHERE id = v_sub_id;
    ELSE
      v_sub_id := '15151515-1111-1111-1111-111111111111';
      INSERT INTO public.saas_company_plan_subscriptions (
        id, company_id, product_id, plan_id, status, payment_state,
        start_at, notes, metadata, created_at, updated_at
      ) VALUES (
        v_sub_id,
        v_company_id,
        v_product_id,
        v_plan_id,
        'active',
        'current',
        now() - interval '90 days',
        'FishGate Enterprise Plan subscription for EstatePro Landlord',
        '{"tier": "enterprise", "units_limit": 500, "seats_limit": 25, "momo_enabled": true}'::jsonb,
        now() - interval '90 days',
        now()
      ) ON CONFLICT (id) DO UPDATE SET
        company_id = v_company_id,
        status = 'active',
        payment_state = 'current';
    END IF;

    INSERT INTO public.saas_subscription_invoices (
      id, company_id, product_id, subscription_id, invoice_kind, invoice_status,
      amount_minor, currency_code, due_at, paid_at, external_reference, metadata, created_at, updated_at
    ) VALUES 
    (
      '16161616-1111-1111-1111-111111111111',
      v_company_id,
      v_product_id,
      v_sub_id,
      'renewal',
      'paid',
      18500000,
      'RWF',
      now() - interval '15 days',
      now() - interval '15 days',
      'PAYSTACK-SUB-FG-2026-001',
      '{"plan": "Enterprise", "period": "November 2026", "tax_inclusive": true}'::jsonb,
      now() - interval '16 days',
      now()
    ),
    (
      '16161616-2222-2222-2222-222222222222',
      v_company_id,
      v_product_id,
      v_sub_id,
      'renewal',
      'open',
      18500000,
      'RWF',
      now() + interval '15 days',
      NULL,
      'PAYSTACK-SUB-FG-2026-002',
      '{"plan": "Enterprise", "period": "December 2026", "tax_inclusive": true}'::jsonb,
      now() - interval '1 days',
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      company_id = v_company_id,
      subscription_id = v_sub_id,
      invoice_status = EXCLUDED.invoice_status;
  END IF;

  -- ============================================================================
  -- 14. GUARANTEED RE-LINKING (Reclaims records if previously seeded under dummy UUID)
  -- ============================================================================
  UPDATE public.companies SET owner_id = v_user_id WHERE id = v_company_id;
  BEGIN
    UPDATE public.companies SET kyb_status = 'verified' WHERE id = v_company_id;
  EXCEPTION WHEN OTHERS THEN
  END;
  BEGIN
    UPDATE public.companies SET is_verified = true WHERE id = v_company_id;
  EXCEPTION WHEN OTHERS THEN
  END;
  UPDATE public.company_members SET user_id = v_user_id WHERE company_id = v_company_id;
  UPDATE public.company_settings SET user_id = v_user_id WHERE id = '33333333-0000-0000-0000-000000000001';
  UPDATE public.properties SET user_id = v_user_id WHERE company_id = v_company_id;
  UPDATE public.units SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.tenants SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.leases SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.invoices SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.payments SET user_id = v_user_id WHERE id IN ('41111111-1111-1111-1111-111111111111', '42222222-2222-2222-2222-222222222222');
  UPDATE public.maintenance_requests SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.recurring_bills SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);
  UPDATE public.marketplace_listings SET created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.crm_accounts SET owner_user_id = v_user_id, created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.leads SET assigned_to = v_user_id, created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.crm_deals SET owner_user_id = v_user_id, created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.crm_visits SET created_by = v_user_id WHERE company_id = v_company_id;
  BEGIN
    UPDATE public.crm_visits SET assigned_to = v_user_id WHERE company_id = v_company_id;
  EXCEPTION WHEN OTHERS THEN
  END;
  UPDATE public.crm_calls SET owner_user_id = v_user_id, created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.crm_campaigns SET created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.crm_projects SET owner_user_id = v_user_id, created_by = v_user_id WHERE company_id = v_company_id;
  UPDATE public.bookings SET user_id = v_user_id WHERE property_id IN (v_prop_1, v_prop_2);

  RAISE NOTICE 'SUCCESS: Complete test dataset seeded and linked to user ID % for admin@estatepro.com (Company ID: %)', v_user_id, v_company_id;
END $$;
