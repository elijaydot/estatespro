-- SaaS foundation: product catalog, tier plans, pricing, quotas, and entitlement baselines.
-- Phases covered:
--   Phase 1: Product and plan catalog foundation
--   Phase 2: Tier model and packaging
--   Phase 3 (baseline): entitlement key catalog + grant scaffolding

CREATE OR REPLACE FUNCTION public.is_platform_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.saas_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_standalone boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('free', 'bronze', 'silver', 'gold', 'platinum')),
  name text NOT NULL,
  description text,
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval = 'monthly'),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier)
);

CREATE TABLE IF NOT EXISTS public.saas_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval = 'monthly'),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, currency_code, billing_interval)
);

CREATE TABLE IF NOT EXISTS public.saas_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  attach_scope text NOT NULL DEFAULT 'any_product' CHECK (attach_scope IN ('any_product', 'core_only', 'marketplace_only', 'crm_only')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_addon_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.saas_addons(id) ON DELETE CASCADE,
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval = 'monthly'),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (addon_id, currency_code, billing_interval)
);

CREATE TABLE IF NOT EXISTS public.saas_entitlement_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  domain text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('boolean', 'integer', 'json')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  entitlement_key_id uuid NOT NULL REFERENCES public.saas_entitlement_keys(id) ON DELETE CASCADE,
  bool_value boolean,
  int_value integer,
  json_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, entitlement_key_id),
  CHECK (
    ((bool_value IS NOT NULL)::integer + (int_value IS NOT NULL)::integer + (json_value IS NOT NULL)::integer) <= 1
  )
);

CREATE TABLE IF NOT EXISTS public.saas_addon_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.saas_addons(id) ON DELETE CASCADE,
  entitlement_key_id uuid NOT NULL REFERENCES public.saas_entitlement_keys(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'set' CHECK (mode IN ('set', 'increment')),
  bool_value boolean,
  int_value integer,
  json_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (addon_id, entitlement_key_id),
  CHECK (
    ((bool_value IS NOT NULL)::integer + (int_value IS NOT NULL)::integer + (json_value IS NOT NULL)::integer) <= 1
  )
);

CREATE TABLE IF NOT EXISTS public.saas_quota_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_plan_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  quota_dimension_id uuid NOT NULL REFERENCES public.saas_quota_dimensions(id) ON DELETE CASCADE,
  soft_limit integer NOT NULL CHECK (soft_limit >= 0),
  hard_limit integer NOT NULL CHECK (hard_limit >= soft_limit),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, quota_dimension_id)
);

CREATE TABLE IF NOT EXISTS public.saas_addon_quota_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.saas_addons(id) ON DELETE CASCADE,
  quota_dimension_id uuid NOT NULL REFERENCES public.saas_quota_dimensions(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'increment' CHECK (mode IN ('increment', 'set')),
  increment_by integer,
  hard_limit_override integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (addon_id, quota_dimension_id),
  CHECK (
    (mode = 'increment' AND increment_by IS NOT NULL AND increment_by >= 0)
    OR (mode = 'set' AND hard_limit_override IS NOT NULL AND hard_limit_override >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_product_sort
  ON public.saas_plans(product_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_plan_prices_plan_currency
  ON public.saas_plan_prices(plan_id, currency_code);

CREATE INDEX IF NOT EXISTS idx_saas_plan_entitlements_plan
  ON public.saas_plan_entitlements(plan_id);

CREATE INDEX IF NOT EXISTS idx_saas_plan_quotas_plan
  ON public.saas_plan_quotas(plan_id);

DO $$
BEGIN
  IF to_regclass('public.saas_products') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_products ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_plans') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_plan_prices') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_plan_prices ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_addons') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_addons ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_addon_prices') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_addon_prices ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_entitlement_keys') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_entitlement_keys ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_plan_entitlements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_plan_entitlements ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_addon_entitlements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_addon_entitlements ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_quota_dimensions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_quota_dimensions ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_plan_quotas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_plan_quotas ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.saas_addon_quota_overrides') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.saas_addon_quota_overrides ENABLE ROW LEVEL SECURITY';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_products'
      AND policyname = 'Public can read active SaaS products'
  ) THEN
    CREATE POLICY "Public can read active SaaS products"
    ON public.saas_products
    FOR SELECT TO anon, authenticated
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_plans'
      AND policyname = 'Public can read active SaaS plans'
  ) THEN
    CREATE POLICY "Public can read active SaaS plans"
    ON public.saas_plans
    FOR SELECT TO anon, authenticated
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_plan_prices'
      AND policyname = 'Public can read SaaS plan prices'
  ) THEN
    CREATE POLICY "Public can read SaaS plan prices"
    ON public.saas_plan_prices
    FOR SELECT TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_addons'
      AND policyname = 'Public can read active SaaS addons'
  ) THEN
    CREATE POLICY "Public can read active SaaS addons"
    ON public.saas_addons
    FOR SELECT TO anon, authenticated
    USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_addon_prices'
      AND policyname = 'Public can read SaaS addon prices'
  ) THEN
    CREATE POLICY "Public can read SaaS addon prices"
    ON public.saas_addon_prices
    FOR SELECT TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_entitlement_keys'
      AND policyname = 'Authenticated can read SaaS entitlement keys'
  ) THEN
    CREATE POLICY "Authenticated can read SaaS entitlement keys"
    ON public.saas_entitlement_keys
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_plan_entitlements'
      AND policyname = 'Authenticated can read SaaS plan entitlements'
  ) THEN
    CREATE POLICY "Authenticated can read SaaS plan entitlements"
    ON public.saas_plan_entitlements
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_addon_entitlements'
      AND policyname = 'Authenticated can read SaaS addon entitlements'
  ) THEN
    CREATE POLICY "Authenticated can read SaaS addon entitlements"
    ON public.saas_addon_entitlements
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_quota_dimensions'
      AND policyname = 'Authenticated can read quota dimensions'
  ) THEN
    CREATE POLICY "Authenticated can read quota dimensions"
    ON public.saas_quota_dimensions
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_plan_quotas'
      AND policyname = 'Authenticated can read plan quotas'
  ) THEN
    CREATE POLICY "Authenticated can read plan quotas"
    ON public.saas_plan_quotas
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saas_addon_quota_overrides'
      AND policyname = 'Authenticated can read addon quota overrides'
  ) THEN
    CREATE POLICY "Authenticated can read addon quota overrides"
    ON public.saas_addon_quota_overrides
    FOR SELECT TO authenticated
    USING (true);
  END IF;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'saas_products',
    'saas_plans',
    'saas_plan_prices',
    'saas_addons',
    'saas_addon_prices',
    'saas_entitlement_keys',
    'saas_plan_entitlements',
    'saas_addon_entitlements',
    'saas_quota_dimensions',
    'saas_plan_quotas',
    'saas_addon_quota_overrides'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'Super admins can manage ' || v_table
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()))',
        'Super admins can manage ' || v_table,
        v_table
      );
    END IF;
  END LOOP;
END;
$$;

-- Keep catalog timestamps consistent on update.
DROP TRIGGER IF EXISTS update_saas_products_updated_at ON public.saas_products;
CREATE TRIGGER update_saas_products_updated_at
BEFORE UPDATE ON public.saas_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_plans_updated_at ON public.saas_plans;
CREATE TRIGGER update_saas_plans_updated_at
BEFORE UPDATE ON public.saas_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_plan_prices_updated_at ON public.saas_plan_prices;
CREATE TRIGGER update_saas_plan_prices_updated_at
BEFORE UPDATE ON public.saas_plan_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_addons_updated_at ON public.saas_addons;
CREATE TRIGGER update_saas_addons_updated_at
BEFORE UPDATE ON public.saas_addons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_addon_prices_updated_at ON public.saas_addon_prices;
CREATE TRIGGER update_saas_addon_prices_updated_at
BEFORE UPDATE ON public.saas_addon_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_plan_entitlements_updated_at ON public.saas_plan_entitlements;
CREATE TRIGGER update_saas_plan_entitlements_updated_at
BEFORE UPDATE ON public.saas_plan_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_addon_entitlements_updated_at ON public.saas_addon_entitlements;
CREATE TRIGGER update_saas_addon_entitlements_updated_at
BEFORE UPDATE ON public.saas_addon_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_plan_quotas_updated_at ON public.saas_plan_quotas;
CREATE TRIGGER update_saas_plan_quotas_updated_at
BEFORE UPDATE ON public.saas_plan_quotas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saas_addon_quota_overrides_updated_at ON public.saas_addon_quota_overrides;
CREATE TRIGGER update_saas_addon_quota_overrides_updated_at
BEFORE UPDATE ON public.saas_addon_quota_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed product catalog.
INSERT INTO public.saas_products (code, name, description, is_standalone, is_active, sort_order)
VALUES
  ('core_property', 'Core Property Management', 'Primary property management product line.', true, true, 1),
  ('marketplace', 'Marketplace', 'Standalone marketplace product line for listing and demand generation.', true, true, 2),
  ('crm', 'CRM', 'Standalone CRM product line for lead and deal management.', true, true, 3)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_standalone = EXCLUDED.is_standalone,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Seed tier plans per product.
WITH base AS (
  SELECT p.id AS product_id, p.code AS product_code
  FROM public.saas_products p
  WHERE p.code IN ('core_property', 'marketplace', 'crm')
), tiers AS (
  SELECT *
  FROM (VALUES
    ('free', 1),
    ('bronze', 2),
    ('silver', 3),
    ('gold', 4),
    ('platinum', 5)
  ) AS t(tier, sort_order)
)
INSERT INTO public.saas_plans (
  product_id,
  code,
  tier,
  name,
  description,
  billing_interval,
  is_active,
  sort_order
)
SELECT
  b.product_id,
  b.product_code || '_' || t.tier AS code,
  t.tier,
  initcap(t.tier) || ' - ' || initcap(replace(b.product_code, '_', ' ')) AS name,
  initcap(t.tier) || ' monthly tier for ' || replace(b.product_code, '_', ' ') || '.',
  'monthly',
  true,
  t.sort_order
FROM base b
CROSS JOIN tiers t
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing_interval = EXCLUDED.billing_interval,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Seed monthly multi-currency prices in minor units.
-- Amounts are launch defaults and can be revised by super_admin without schema changes.
WITH price_map AS (
  SELECT *
  FROM (VALUES
    ('core_property_free',      0,    0,       0),
    ('core_property_bronze',    3900, 6240000, 3120),
    ('core_property_silver',    8900, 14240000, 7120),
    ('core_property_gold',      14900,23840000,11920),
    ('core_property_platinum',  24900,39840000,19920),

    ('marketplace_free',        0,    0,       0),
    ('marketplace_bronze',      1900, 3040000, 1520),
    ('marketplace_silver',      4900, 7840000, 3920),
    ('marketplace_gold',        9900, 15840000, 7920),
    ('marketplace_platinum',    19900,31840000,15920),

    ('crm_free',                0,    0,       0),
    ('crm_bronze',              2400, 3840000, 1920),
    ('crm_silver',              5900, 9440000, 4720),
    ('crm_gold',                11900,19040000,9520),
    ('crm_platinum',            21900,35040000,17520)
  ) AS v(plan_code, usd_minor, ngn_minor, gbp_minor)
), expanded AS (
  SELECT p.id AS plan_id, pm.plan_code, 'USD'::text AS currency_code, pm.usd_minor AS amount_minor FROM price_map pm JOIN public.saas_plans p ON p.code = pm.plan_code
  UNION ALL
  SELECT p.id AS plan_id, pm.plan_code, 'NGN'::text AS currency_code, pm.ngn_minor AS amount_minor FROM price_map pm JOIN public.saas_plans p ON p.code = pm.plan_code
  UNION ALL
  SELECT p.id AS plan_id, pm.plan_code, 'GBP'::text AS currency_code, pm.gbp_minor AS amount_minor FROM price_map pm JOIN public.saas_plans p ON p.code = pm.plan_code
)
INSERT INTO public.saas_plan_prices (
  plan_id,
  currency_code,
  amount_minor,
  billing_interval,
  is_default
)
SELECT
  e.plan_id,
  e.currency_code,
  e.amount_minor,
  'monthly',
  (e.currency_code = 'USD')
FROM expanded e
ON CONFLICT (plan_id, currency_code, billing_interval) DO UPDATE
SET
  amount_minor = EXCLUDED.amount_minor,
  is_default = EXCLUDED.is_default;

-- Seed AI add-on and prices.
INSERT INTO public.saas_addons (code, name, description, attach_scope, is_active, sort_order)
VALUES
  ('ai_addon_pack', 'AI Add-on Pack', 'Cross-product AI capability bundle with monthly credits.', 'any_product', true, 1)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  attach_scope = EXCLUDED.attach_scope,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

WITH a AS (
  SELECT id
  FROM public.saas_addons
  WHERE code = 'ai_addon_pack'
)
INSERT INTO public.saas_addon_prices (addon_id, currency_code, amount_minor, billing_interval, is_default)
SELECT a.id, x.currency_code, x.amount_minor, 'monthly', (x.currency_code = 'USD')
FROM a
CROSS JOIN (
  VALUES
    ('USD'::text, 2900),
    ('NGN'::text, 4640000),
    ('GBP'::text, 2320)
) AS x(currency_code, amount_minor)
ON CONFLICT (addon_id, currency_code, billing_interval) DO UPDATE
SET
  amount_minor = EXCLUDED.amount_minor,
  is_default = EXCLUDED.is_default;

-- Seed entitlement keys (baseline).
INSERT INTO public.saas_entitlement_keys (key, domain, value_type, description)
VALUES
  ('core.properties.manage', 'core', 'boolean', 'Manage properties in core product.'),
  ('core.units.manage', 'core', 'boolean', 'Manage units in core product.'),
  ('core.tenants.manage', 'core', 'boolean', 'Manage tenants in core product.'),
  ('core.leases.manage', 'core', 'boolean', 'Manage leases in core product.'),
  ('core.invoices.manage', 'core', 'boolean', 'Manage invoices in core product.'),
  ('core.payments.manage', 'core', 'boolean', 'Manage payments in core product.'),
  ('core.maintenance.manage', 'core', 'boolean', 'Manage maintenance in core product.'),
  ('core.messaging.manage', 'core', 'boolean', 'Manage messaging in core product.'),
  ('core.reports.view', 'core', 'boolean', 'View reports in core product.'),

  ('marketplace.listings.manage', 'marketplace', 'boolean', 'Manage marketplace listings.'),
  ('marketplace.inquiries.manage', 'marketplace', 'boolean', 'Manage marketplace inquiries.'),
  ('marketplace.moderation.view', 'marketplace', 'boolean', 'View marketplace moderation and verification queues.'),

  ('crm.leads.manage', 'crm', 'boolean', 'Manage CRM leads.'),
  ('crm.deals.manage', 'crm', 'boolean', 'Manage CRM deals.'),
  ('crm.calls_meetings.manage', 'crm', 'boolean', 'Manage CRM calls and meetings.'),
  ('crm.automation.manage', 'crm', 'boolean', 'Manage CRM automations and replay controls.'),

  ('ai.assistant.enabled', 'ai', 'boolean', 'Enable AI assistant capabilities.')
ON CONFLICT (key) DO UPDATE
SET
  domain = EXCLUDED.domain,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description;

-- Seed baseline plan entitlements by product (all tiers include product capabilities; quotas enforce packaging depth).
WITH plan_domains AS (
  SELECT id AS plan_id, code
  FROM public.saas_plans
), key_map AS (
  SELECT id AS key_id, key
  FROM public.saas_entitlement_keys
), grants AS (
  SELECT pd.plan_id, km.key_id, true AS bool_value
  FROM plan_domains pd
  JOIN key_map km ON (
    (pd.code LIKE 'core_property_%' AND km.key LIKE 'core.%')
    OR (pd.code LIKE 'marketplace_%' AND km.key LIKE 'marketplace.%')
    OR (pd.code LIKE 'crm_%' AND km.key LIKE 'crm.%')
  )
)
INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, bool_value)
SELECT g.plan_id, g.key_id, g.bool_value
FROM grants g
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE
SET bool_value = EXCLUDED.bool_value;

-- AI add-on grants.
WITH a AS (
  SELECT id AS addon_id
  FROM public.saas_addons
  WHERE code = 'ai_addon_pack'
), k AS (
  SELECT id AS key_id
  FROM public.saas_entitlement_keys
  WHERE key = 'ai.assistant.enabled'
)
INSERT INTO public.saas_addon_entitlements (addon_id, entitlement_key_id, mode, bool_value)
SELECT a.addon_id, k.key_id, 'set', true
FROM a
CROSS JOIN k
ON CONFLICT (addon_id, entitlement_key_id) DO UPDATE
SET
  mode = EXCLUDED.mode,
  bool_value = EXCLUDED.bool_value;

-- Quota dimensions and limits.
INSERT INTO public.saas_quota_dimensions (code, name, description, unit)
VALUES
  ('units_managed', 'Units Managed', 'Maximum active units under management.', 'count'),
  ('properties_managed', 'Properties Managed', 'Maximum properties under management.', 'count'),
  ('active_tenants', 'Active Tenants', 'Maximum active tenants.', 'count'),
  ('property_manager_seats', 'Property Manager Seats', 'Maximum assigned property manager seats.', 'count'),
  ('ai_credits_monthly', 'AI Credits Monthly', 'Monthly AI credit allowance.', 'credits')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit;

WITH dims AS (
  SELECT code, id AS dimension_id
  FROM public.saas_quota_dimensions
), plans AS (
  SELECT id AS plan_id, code, tier
  FROM public.saas_plans
), limits AS (
  SELECT
    p.plan_id,
    d.dimension_id,
    CASE
      WHEN d.code = 'units_managed' THEN
        CASE p.tier
          WHEN 'free' THEN 5
          WHEN 'bronze' THEN 50
          WHEN 'silver' THEN 250
          WHEN 'gold' THEN 1000
          ELSE 10000
        END
      WHEN d.code = 'properties_managed' THEN
        CASE p.tier
          WHEN 'free' THEN 1
          WHEN 'bronze' THEN 10
          WHEN 'silver' THEN 40
          WHEN 'gold' THEN 150
          ELSE 1000
        END
      WHEN d.code = 'active_tenants' THEN
        CASE p.tier
          WHEN 'free' THEN 10
          WHEN 'bronze' THEN 100
          WHEN 'silver' THEN 400
          WHEN 'gold' THEN 1500
          ELSE 10000
        END
      WHEN d.code = 'property_manager_seats' THEN
        CASE p.tier
          WHEN 'free' THEN 1
          WHEN 'bronze' THEN 3
          WHEN 'silver' THEN 10
          WHEN 'gold' THEN 30
          ELSE 100
        END
      WHEN d.code = 'ai_credits_monthly' THEN 0
      ELSE 0
    END AS hard_limit
  FROM plans p
  CROSS JOIN dims d
), payload AS (
  SELECT
    l.plan_id,
    l.dimension_id,
    GREATEST(0, floor(l.hard_limit * 0.8)::integer) AS soft_limit,
    l.hard_limit
  FROM limits l
)
INSERT INTO public.saas_plan_quotas (plan_id, quota_dimension_id, soft_limit, hard_limit)
SELECT plan_id, dimension_id, soft_limit, hard_limit
FROM payload
ON CONFLICT (plan_id, quota_dimension_id) DO UPDATE
SET
  soft_limit = EXCLUDED.soft_limit,
  hard_limit = EXCLUDED.hard_limit;

-- AI add-on quota increment.
WITH addon_ref AS (
  SELECT id AS addon_id
  FROM public.saas_addons
  WHERE code = 'ai_addon_pack'
), dim_ref AS (
  SELECT id AS dimension_id
  FROM public.saas_quota_dimensions
  WHERE code = 'ai_credits_monthly'
)
INSERT INTO public.saas_addon_quota_overrides (addon_id, quota_dimension_id, mode, increment_by)
SELECT a.addon_id, d.dimension_id, 'increment', 1000
FROM addon_ref a
CROSS JOIN dim_ref d
ON CONFLICT (addon_id, quota_dimension_id) DO UPDATE
SET
  mode = EXCLUDED.mode,
  increment_by = EXCLUDED.increment_by;
