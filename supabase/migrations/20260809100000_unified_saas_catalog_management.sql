-- Unified FishGate catalog ladder and safe catalog-change workflow.

ALTER TABLE public.saas_plans
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 90 CHECK (trial_days >= 0);

ALTER TABLE public.saas_plans DROP CONSTRAINT IF EXISTS saas_plans_tier_check;
ALTER TABLE public.saas_plans
  ADD CONSTRAINT saas_plans_tier_check CHECK (
    tier IN ('free', 'bronze', 'silver', 'gold', 'platinum', 'starter', 'growth', 'professional', 'enterprise')
  );

ALTER TABLE public.saas_plan_quotas
  ADD COLUMN IF NOT EXISTS is_unlimited boolean NOT NULL DEFAULT false;

INSERT INTO public.saas_quota_dimensions (code, name, description, unit) VALUES
  ('marketplace_listings_active', 'Marketplace Listings', 'Maximum live/pending marketplace listings.', 'count'),
  ('crm_contacts', 'CRM Contacts', 'Maximum active CRM contacts/leads.', 'count'),
  ('guest_bookings_active', 'Guest Bookings', 'Maximum active guest bookings.', 'count'),
  ('mobile_money_collections_monthly', 'Mobile Money Collections', 'Maximum mobile money collections per month.', 'count'),
  ('maintenance_tickets_monthly', 'Maintenance Tickets', 'Maximum maintenance tickets created per month.', 'count')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.saas_entitlement_keys (key, domain, value_type, description) VALUES
  ('notifications.whatsapp.enabled', 'notifications', 'boolean', 'WhatsApp Business API notifications.'),
  ('portal.tenant.enabled', 'portal', 'boolean', 'Tenant self-service portal access.'),
  ('portal.owner.enabled', 'portal', 'boolean', 'Owner/investor self-service portal access.'),
  ('api.access.level', 'platform', 'json', 'API access level: "none" | "limited" | "full".')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.saas_plans (product_id, code, name, tier, description, sort_order, trial_days) VALUES
  (NULL, 'fishgate_starter', 'Starter', 'starter', 'Unified FishGate entry plan.', 1, 90),
  (NULL, 'fishgate_growth', 'Growth', 'growth', 'Unified FishGate growth plan.', 2, 90),
  (NULL, 'fishgate_professional', 'Professional', 'professional', 'Unified FishGate professional plan.', 3, 90),
  (NULL, 'fishgate_enterprise', 'Enterprise', 'enterprise', 'Unified FishGate enterprise plan.', 4, 90)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  trial_days = EXCLUDED.trial_days;

WITH prices(plan_code, amount_minor) AS (
  VALUES
    ('fishgate_starter', 900),
    ('fishgate_growth', 2900),
    ('fishgate_professional', 6900),
    ('fishgate_enterprise', 14900)
)
INSERT INTO public.saas_plan_prices (plan_id, currency_code, amount_minor, billing_interval, is_default)
SELECT p.id, 'USD', prices.amount_minor, 'monthly', true
FROM prices
JOIN public.saas_plans p ON p.code = prices.plan_code
ON CONFLICT (plan_id, currency_code, billing_interval) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  is_default = EXCLUDED.is_default;

WITH quota_values(plan_code, quota_code, hard_limit, is_unlimited) AS (
  VALUES
    ('fishgate_starter', 'properties_managed', 3, false),
    ('fishgate_starter', 'units_managed', 10, false),
    ('fishgate_starter', 'active_tenants', 20, false),
    ('fishgate_starter', 'property_manager_seats', 1, false),
    ('fishgate_starter', 'marketplace_listings_active', 5, false),
    ('fishgate_starter', 'crm_contacts', 100, false),
    ('fishgate_starter', 'guest_bookings_active', 5, false),
    ('fishgate_starter', 'mobile_money_collections_monthly', 50, false),
    ('fishgate_starter', 'maintenance_tickets_monthly', 25, false),
    ('fishgate_growth', 'properties_managed', 15, false),
    ('fishgate_growth', 'units_managed', 75, false),
    ('fishgate_growth', 'active_tenants', 150, false),
    ('fishgate_growth', 'property_manager_seats', 3, false),
    ('fishgate_growth', 'marketplace_listings_active', 25, false),
    ('fishgate_growth', 'crm_contacts', 1000, false),
    ('fishgate_growth', 'guest_bookings_active', 25, false),
    ('fishgate_growth', 'mobile_money_collections_monthly', 500, false),
    ('fishgate_growth', 'maintenance_tickets_monthly', 250, false),
    ('fishgate_professional', 'properties_managed', 50, false),
    ('fishgate_professional', 'units_managed', 300, false),
    ('fishgate_professional', 'active_tenants', 750, false),
    ('fishgate_professional', 'property_manager_seats', 10, false),
    ('fishgate_professional', 'marketplace_listings_active', 100, false),
    ('fishgate_professional', 'crm_contacts', 5000, false),
    ('fishgate_professional', 'guest_bookings_active', 150, false),
    ('fishgate_professional', 'mobile_money_collections_monthly', 2500, false),
    ('fishgate_professional', 'maintenance_tickets_monthly', 1000, false),
    ('fishgate_enterprise', 'properties_managed', 200, false),
    ('fishgate_enterprise', 'units_managed', 2000, false),
    ('fishgate_enterprise', 'active_tenants', 5000, false),
    ('fishgate_enterprise', 'property_manager_seats', 50, false),
    ('fishgate_enterprise', 'marketplace_listings_active', 0, true),
    ('fishgate_enterprise', 'crm_contacts', 0, true),
    ('fishgate_enterprise', 'guest_bookings_active', 0, true),
    ('fishgate_enterprise', 'mobile_money_collections_monthly', 0, true),
    ('fishgate_enterprise', 'maintenance_tickets_monthly', 0, true)
)
INSERT INTO public.saas_plan_quotas (plan_id, quota_dimension_id, soft_limit, hard_limit, is_unlimited)
SELECT p.id, q.id,
  CASE WHEN v.is_unlimited THEN 0 ELSE floor(v.hard_limit * 0.8)::integer END,
  v.hard_limit,
  v.is_unlimited
FROM quota_values v
JOIN public.saas_plans p ON p.code = v.plan_code
JOIN public.saas_quota_dimensions q ON q.code = v.quota_code
ON CONFLICT (plan_id, quota_dimension_id) DO UPDATE SET
  soft_limit = EXCLUDED.soft_limit,
  hard_limit = EXCLUDED.hard_limit,
  is_unlimited = EXCLUDED.is_unlimited;

WITH bool_grants(plan_code, entitlement_key) AS (
  SELECT p.code, e.key
  FROM public.saas_plans p
  CROSS JOIN public.saas_entitlement_keys e
  WHERE p.code LIKE 'fishgate_%'
    AND e.key IN ('notifications.whatsapp.enabled', 'portal.tenant.enabled', 'portal.owner.enabled')
)
INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, bool_value)
SELECT p.id, e.id, true
FROM bool_grants g
JOIN public.saas_plans p ON p.code = g.plan_code
JOIN public.saas_entitlement_keys e ON e.key = g.entitlement_key
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE SET
  bool_value = EXCLUDED.bool_value,
  int_value = NULL,
  json_value = NULL;

WITH api_grants(plan_code, access_level) AS (
  VALUES
    ('fishgate_starter', 'none'),
    ('fishgate_growth', 'none'),
    ('fishgate_professional', 'limited'),
    ('fishgate_enterprise', 'full')
)
INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, json_value)
SELECT p.id, e.id, to_jsonb(g.access_level)
FROM api_grants g
JOIN public.saas_plans p ON p.code = g.plan_code
JOIN public.saas_entitlement_keys e ON e.key = 'api.access.level'
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE SET
  bool_value = NULL,
  int_value = NULL,
  json_value = EXCLUDED.json_value;

CREATE TABLE IF NOT EXISTS public.saas_catalog_change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'discarded')),
  title text NOT NULL DEFAULT 'Catalog changes',
  changes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(changes) = 'array'),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_catalog_change_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage catalog change sets"
  ON public.saas_catalog_change_sets FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.saas_check_quota(
  p_company_id uuid,
  p_quota_code text,
  p_requested_delta integer DEFAULT 1,
  p_product_code text DEFAULT 'core_property'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_quota record;
  v_after integer;
  v_is_unlimited boolean := false;
BEGIN
  IF p_requested_delta IS NULL OR p_requested_delta <= 0 THEN
    RAISE EXCEPTION 'REQUESTED_DELTA_MUST_BE_POSITIVE';
  END IF;
  IF auth.role() <> 'service_role' AND (
    v_actor IS NULL OR NOT public.saas_user_can_access_company(v_actor, p_company_id)
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_USAGE';
  END IF;

  SELECT * INTO v_quota
  FROM public.saas_get_effective_quota_limits(p_company_id, p_quota_code, p_product_code);

  SELECT pq.is_unlimited INTO v_is_unlimited
  FROM public.saas_plan_quotas pq
  JOIN public.saas_quota_dimensions q ON q.id = pq.quota_dimension_id
  WHERE pq.plan_id = v_quota.plan_id AND q.code = p_quota_code;

  v_after := v_quota.used_value + p_requested_delta;
  RETURN jsonb_build_object(
    'allowed', v_is_unlimited OR v_after <= v_quota.hard_limit,
    'reason', CASE
      WHEN v_is_unlimited THEN 'ok'
      WHEN v_after > v_quota.hard_limit THEN 'hard_limit_exceeded'
      WHEN v_after > v_quota.soft_limit THEN 'soft_limit_warning'
      ELSE 'ok'
    END,
    'is_unlimited', v_is_unlimited,
    'used_value', v_quota.used_value,
    'requested_delta', p_requested_delta,
    'projected_used_value', v_after,
    'soft_limit', v_quota.soft_limit,
    'hard_limit', v_quota.hard_limit,
    'remaining', CASE WHEN v_is_unlimited THEN NULL ELSE GREATEST(v_quota.hard_limit - v_quota.used_value, 0) END,
    'plan_id', v_quota.plan_id,
    'quota_code', p_quota_code,
    'product_code', p_product_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_check_quota(uuid, text, integer, text) TO authenticated;

-- saas_record_usage performs the authoritative write, so its existing limit
-- comparison must also see unlimited quotas. A high ceiling is never used.
CREATE OR REPLACE FUNCTION public.saas_quota_is_unlimited(p_plan_id uuid, p_quota_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(bool_or(pq.is_unlimited), false)
  FROM public.saas_plan_quotas pq
  JOIN public.saas_quota_dimensions q ON q.id = pq.quota_dimension_id
  WHERE pq.plan_id = p_plan_id AND q.code = p_quota_code;
$$;

GRANT EXECUTE ON FUNCTION public.saas_quota_is_unlimited(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_record_usage(
  p_company_id uuid,
  p_quota_code text,
  p_delta integer,
  p_product_code text DEFAULT 'core_property',
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_dimension_id uuid;
  v_plan_id uuid;
  v_soft_limit integer;
  v_hard_limit integer;
  v_used integer;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_counter_id uuid;
  v_new_used integer;
  v_is_unlimited boolean := false;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'USAGE_DELTA_MUST_BE_POSITIVE';
  END IF;
  IF auth.role() <> 'service_role' AND (
    v_actor IS NULL OR NOT public.saas_user_can_access_company(v_actor, p_company_id)
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_COMPANY_USAGE';
  END IF;

  SELECT q.product_id, q.plan_id, q.soft_limit, q.hard_limit, q.used_value
  INTO v_product_id, v_plan_id, v_soft_limit, v_hard_limit, v_used
  FROM public.saas_get_effective_quota_limits(p_company_id, p_quota_code, p_product_code) q;

  v_is_unlimited := public.saas_quota_is_unlimited(v_plan_id, p_quota_code);
  SELECT id INTO v_dimension_id
  FROM public.saas_quota_dimensions WHERE code = p_quota_code LIMIT 1;

  IF v_product_id IS NULL OR v_dimension_id IS NULL THEN
    RAISE EXCEPTION 'QUOTA_LOOKUP_FAILED';
  END IF;

  INSERT INTO public.saas_usage_counters (
    company_id, product_id, quota_dimension_id, period_start, period_end, used_value
  ) VALUES (
    p_company_id, v_product_id, v_dimension_id, v_period_start, v_period_end, 0
  ) ON CONFLICT (company_id, product_id, quota_dimension_id, period_start, period_end) DO NOTHING;

  SELECT id, used_value INTO v_counter_id, v_used
  FROM public.saas_usage_counters
  WHERE company_id = p_company_id
    AND product_id = v_product_id
    AND quota_dimension_id = v_dimension_id
    AND period_start = v_period_start
    AND period_end = v_period_end
  FOR UPDATE;

  IF NOT v_is_unlimited AND (v_used + p_delta) > v_hard_limit THEN
    INSERT INTO public.saas_usage_events (
      company_id, product_id, quota_dimension_id, actor_user_id, delta,
      resulting_used, allowed, reason, correlation_id, metadata
    ) VALUES (
      p_company_id, v_product_id, v_dimension_id, v_actor, p_delta,
      v_used, false, 'hard_limit_exceeded', p_correlation_id, p_metadata
    );

    INSERT INTO public.audit_events (
      source, event_type, severity, actor_user_id, entity_type, entity_id, details, correlation_id
    ) VALUES (
      'saas_quota', 'entitlement.quota.blocked', 'warning', v_actor, 'company', p_company_id::text,
      jsonb_build_object(
        'product_code', p_product_code, 'quota_code', p_quota_code, 'delta', p_delta,
        'hard_limit', v_hard_limit, 'used_value', v_used, 'plan_id', v_plan_id
      ),
      p_correlation_id
    );

    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'hard_limit_exceeded', 'is_unlimited', false,
      'used_value', v_used, 'soft_limit', v_soft_limit, 'hard_limit', v_hard_limit,
      'remaining', GREATEST(v_hard_limit - v_used, 0), 'plan_id', v_plan_id,
      'quota_code', p_quota_code, 'product_code', p_product_code
    );
  END IF;

  UPDATE public.saas_usage_counters
  SET used_value = used_value + p_delta, updated_at = now()
  WHERE id = v_counter_id
  RETURNING used_value INTO v_new_used;

  INSERT INTO public.saas_usage_events (
    company_id, product_id, quota_dimension_id, actor_user_id, delta,
    resulting_used, allowed, reason, correlation_id, metadata
  ) VALUES (
    p_company_id, v_product_id, v_dimension_id, v_actor, p_delta, v_new_used, true,
    CASE WHEN NOT v_is_unlimited AND v_new_used >= v_soft_limit THEN 'soft_limit_reached' ELSE 'ok' END,
    p_correlation_id, p_metadata
  );

  IF NOT v_is_unlimited AND v_new_used >= v_soft_limit THEN
    INSERT INTO public.audit_events (
      source, event_type, severity, actor_user_id, entity_type, entity_id, details, correlation_id
    ) VALUES (
      'saas_quota', 'entitlement.quota.soft_warning', 'info', v_actor, 'company', p_company_id::text,
      jsonb_build_object(
        'product_code', p_product_code, 'quota_code', p_quota_code,
        'used_value', v_new_used, 'soft_limit', v_soft_limit,
        'hard_limit', v_hard_limit, 'plan_id', v_plan_id
      ),
      p_correlation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', CASE WHEN NOT v_is_unlimited AND v_new_used >= v_soft_limit THEN 'soft_limit_reached' ELSE 'ok' END,
    'is_unlimited', v_is_unlimited, 'used_value', v_new_used,
    'soft_limit', v_soft_limit, 'hard_limit', v_hard_limit,
    'remaining', CASE WHEN v_is_unlimited THEN NULL ELSE GREATEST(v_hard_limit - v_new_used, 0) END,
    'plan_id', v_plan_id, 'quota_code', p_quota_code, 'product_code', p_product_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_record_usage(uuid, text, integer, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_catalog_active_subscription_count(p_plan_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.saas_company_plan_subscriptions
  WHERE plan_id = p_plan_id AND status IN ('active', 'trialing', 'grace_period');
$$;

GRANT EXECUTE ON FUNCTION public.saas_catalog_active_subscription_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_publish_catalog_change_set(p_change_set_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_changes jsonb;
  v_change jsonb;
  v_entity text;
  v_field text;
  v_id uuid;
  v_plan_id uuid;
  v_current_limit integer;
  v_new_limit integer;
  v_affected bigint := 0;
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  SELECT changes INTO v_changes
  FROM public.saas_catalog_change_sets
  WHERE id = p_change_set_id AND status = 'draft'
  FOR UPDATE;

  IF v_changes IS NULL THEN
    RAISE EXCEPTION 'DRAFT_CHANGE_SET_NOT_FOUND';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(v_changes)
  LOOP
    v_entity := v_change->>'entity';
    v_field := v_change->>'field';
    v_id := (v_change->>'id')::uuid;
    v_plan_id := (v_change->>'planId')::uuid;

    IF v_entity = 'quota' AND v_field = 'hard_limit' THEN
      SELECT hard_limit INTO v_current_limit FROM public.saas_plan_quotas WHERE id = v_id;
      v_new_limit := (v_change->>'after')::integer;
      IF v_new_limit < v_current_limit AND EXISTS (
        SELECT 1 FROM public.saas_company_plan_subscriptions
        WHERE plan_id = v_plan_id AND status = 'active'
      ) THEN
        RAISE EXCEPTION 'PAID_SUBSCRIBER_QUOTA_DECREASE_POLICY_REQUIRED';
      END IF;
      UPDATE public.saas_plan_quotas
      SET hard_limit = v_new_limit,
          soft_limit = LEAST(soft_limit, v_new_limit),
          updated_at = now()
      WHERE id = v_id;
    ELSIF v_entity = 'quota' AND v_field = 'is_unlimited' THEN
      UPDATE public.saas_plan_quotas SET is_unlimited = (v_change->>'after')::boolean, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'price' AND v_field = 'amount_minor' THEN
      UPDATE public.saas_plan_prices SET amount_minor = (v_change->>'after')::integer, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'plan' AND v_field = 'trial_days' THEN
      UPDATE public.saas_plans SET trial_days = (v_change->>'after')::integer, updated_at = now() WHERE id = v_id;
    ELSIF v_entity = 'entitlement' AND v_field = 'bool_value' THEN
      UPDATE public.saas_plan_entitlements
      SET bool_value = (v_change->>'after')::boolean, int_value = NULL, json_value = NULL, updated_at = now()
      WHERE id = v_id;
    ELSIF v_entity = 'entitlement' AND v_field = 'json_value' THEN
      UPDATE public.saas_plan_entitlements
      SET bool_value = NULL, int_value = NULL, json_value = v_change->'after', updated_at = now()
      WHERE id = v_id;
    ELSE
      RAISE EXCEPTION 'UNSUPPORTED_CATALOG_CHANGE: %.%', v_entity, v_field;
    END IF;

    v_affected := v_affected + public.saas_catalog_active_subscription_count(v_plan_id);
    INSERT INTO public.platform_audit_events (
      source, event_type, module, action, result_status, actor_user_id,
      target_entity_type, target_entity_id, correlation_id, metadata
    ) VALUES (
      'catalog_management', 'catalog.change.published', 'catalog', 'publish_change', 'success', v_actor,
      v_entity, v_id::text, p_change_set_id::text, v_change
    );
  END LOOP;

  UPDATE public.saas_catalog_change_sets
  SET status = 'published', published_by = v_actor, published_at = now(), updated_at = now()
  WHERE id = p_change_set_id;

  RETURN jsonb_build_object('published_changes', jsonb_array_length(v_changes), 'affected_subscriptions', v_affected);
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_publish_catalog_change_set(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_start_or_replace_subscription(
  p_company_id uuid,
  p_product_code text,
  p_plan_code text,
  p_trial_days integer DEFAULT 0,
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_product_id uuid;
  v_plan_id uuid;
  v_existing_id uuid;
  v_trial_end timestamptz;
  v_status text;
  v_trial_days integer;
  v_is_unified boolean;
BEGIN
  IF auth.role() <> 'service_role' AND (
    v_actor IS NULL OR NOT public.saas_user_can_administer_billing(v_actor, p_company_id)
  ) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN';
  END IF;

  SELECT id INTO v_product_id FROM public.saas_products
  WHERE code = p_product_code AND is_active = true LIMIT 1;
  IF v_product_id IS NULL THEN RAISE EXCEPTION 'UNKNOWN_PRODUCT_CODE'; END IF;

  SELECT id, product_id IS NULL,
    CASE WHEN product_id IS NULL AND p_trial_days = 0 THEN trial_days ELSE p_trial_days END
  INTO v_plan_id, v_is_unified, v_trial_days
  FROM public.saas_plans
  WHERE code = p_plan_code
    AND (product_id = v_product_id OR product_id IS NULL)
    AND is_active = true
  LIMIT 1;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'UNKNOWN_OR_INCOMPATIBLE_PLAN_CODE'; END IF;

  IF v_trial_days > 0 THEN
    v_status := 'trialing';
    v_trial_end := now() + make_interval(days => v_trial_days);
  ELSE
    v_status := 'active';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.saas_company_plan_subscriptions
  WHERE company_id = p_company_id AND product_id = v_product_id
    AND status IN ('active', 'trialing', 'grace_period')
  ORDER BY created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.saas_company_plan_subscriptions
    SET status = 'expired', end_at = now(), updated_at = now(),
        notes = COALESCE(notes, '') || ' Replaced by new subscription on ' || now()::text
    WHERE id = v_existing_id;
  END IF;

  INSERT INTO public.saas_company_plan_subscriptions (
    company_id, product_id, plan_id, status, start_at, trial_end_at, created_by, metadata
  ) VALUES (
    p_company_id, v_product_id, v_plan_id, v_status, now(), v_trial_end, v_actor, p_metadata
  ) RETURNING id INTO v_existing_id;

  INSERT INTO public.saas_subscription_events (
    subscription_id, company_id, product_id, actor_user_id, event_type, details, correlation_id
  ) VALUES (
    v_existing_id, p_company_id, v_product_id, v_actor, 'billing.subscription.started',
    jsonb_build_object('plan_code', p_plan_code, 'status', v_status, 'trial_days', v_trial_days, 'unified_plan', v_is_unified),
    p_correlation_id
  );

  INSERT INTO public.audit_events (
    source, event_type, severity, actor_user_id, entity_type, entity_id, details, correlation_id
  ) VALUES (
    'saas_billing', 'billing.subscription.started', 'info', v_actor, 'company', p_company_id::text,
    jsonb_build_object('product_code', p_product_code, 'plan_code', p_plan_code, 'status', v_status,
      'trial_days', v_trial_days, 'subscription_id', v_existing_id, 'unified_plan', v_is_unified),
    p_correlation_id
  );
  RETURN v_existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.saas_start_or_replace_subscription(uuid, text, text, integer, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.saas_trial_expiry_candidates(p_as_of date DEFAULT CURRENT_DATE)
RETURNS TABLE(subscription_id uuid, days_remaining integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subscription.id, threshold.days_remaining
  FROM public.saas_company_plan_subscriptions subscription
  CROSS JOIN (VALUES (30), (14), (3), (1), (0)) AS threshold(days_remaining)
  WHERE subscription.status = 'trialing'
    AND subscription.trial_end_at::date = p_as_of + threshold.days_remaining;
$$;

REVOKE ALL ON FUNCTION public.saas_trial_expiry_candidates(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_trial_expiry_candidates(date) TO service_role;