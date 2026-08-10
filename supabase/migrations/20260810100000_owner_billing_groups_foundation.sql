-- Owner Billing Groups foundation.
-- Per-company subscriptions remain the default; this migration adds group identity
-- and subscription storage without changing existing company billing tables.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.saas_plans') IS NULL
     OR to_regclass('public.saas_addons') IS NULL
     OR to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.update_updated_at_column()') IS NULL THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUPS_PREREQUISITES_MISSING: Run company, SaaS catalog, metering, and unified catalog migrations first.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.companies
    WHERE owner_id IS NULL
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUPS_INVALID_COMPANY_OWNER: Every company must have an owner before enabling billing groups.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.saas_plans
    WHERE product_id IS NULL
      AND code IN ('fishgate_starter', 'fishgate_growth', 'fishgate_professional', 'fishgate_enterprise')
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUPS_UNIFIED_PLANS_MISSING: Run the unified SaaS catalog migration first.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.owner_billing_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dissolved')),
  dissolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_billing_groups_owner_name_key UNIQUE (owner_id, name),
  CONSTRAINT owner_billing_groups_dissolution_state_check CHECK (
    (status = 'active' AND dissolved_at IS NULL)
    OR (status = 'dissolved' AND dissolved_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.owner_billing_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_billing_group_members_company_key UNIQUE (company_id),
  CONSTRAINT owner_billing_group_members_group_company_key UNIQUE (group_id, company_id)
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'paused', 'canceled', 'expired')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  grace_end_at timestamptz,
  renewal_interval text NOT NULL DEFAULT 'monthly' CHECK (renewal_interval = 'monthly'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_renewal_at timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  payment_state text NOT NULL DEFAULT 'current' CHECK (payment_state IN ('current', 'pending', 'past_due', 'grace', 'canceled')),
  dunning_attempt_count integer NOT NULL DEFAULT 0 CHECK (dunning_attempt_count >= 0),
  last_dunning_attempt_at timestamptz,
  last_paid_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.saas_addons(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'paused', 'canceled', 'expired')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  grace_end_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_owner_group_addon_subscriptions_group_addon_key UNIQUE (group_id, addon_id)
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_quota_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  quota_dimension_id uuid NOT NULL REFERENCES public.saas_quota_dimensions(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('increment', 'set')),
  increment_by integer,
  hard_limit_override integer,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_owner_group_quota_overrides_group_dimension_key UNIQUE (group_id, quota_dimension_id),
  CONSTRAINT saas_owner_group_quota_overrides_value_check CHECK (
    (mode = 'increment' AND increment_by IS NOT NULL AND increment_by >= 0 AND hard_limit_override IS NULL)
    OR (mode = 'set' AND hard_limit_override IS NOT NULL AND hard_limit_override >= 0 AND increment_by IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  entitlement_key_id uuid NOT NULL REFERENCES public.saas_entitlement_keys(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('allow', 'deny')),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_owner_group_entitlement_overrides_group_key UNIQUE (group_id, entitlement_key_id)
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.saas_owner_group_plan_subscriptions(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.saas_owner_group_plan_subscriptions(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  previous_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  new_plan_id uuid REFERENCES public.saas_plans(id) ON DELETE SET NULL,
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  estimated_credit_minor integer,
  estimated_charge_minor integer,
  effective_at timestamptz NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.saas_owner_group_plan_subscriptions(id) ON DELETE CASCADE,
  invoice_kind text NOT NULL CHECK (invoice_kind IN ('plan_change_proration', 'renewal', 'addon_renewal', 'manual_adjustment')),
  invoice_status text NOT NULL DEFAULT 'open' CHECK (invoice_status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  period_start timestamptz,
  period_end timestamptz,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  due_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  external_reference text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_owner_group_subscription_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.saas_owner_group_subscription_invoices(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.owner_billing_groups(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.saas_owner_group_plan_subscriptions(id) ON DELETE CASCADE,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  gateway text NOT NULL CHECK (gateway IN ('paystack', 'flutterwave')),
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'mtn_momo', 'link')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency_code text NOT NULL CHECK (currency_code IN ('USD', 'NGN', 'GBP')),
  idempotency_key text NOT NULL UNIQUE,
  gateway_reference text NOT NULL,
  gateway_transaction_id text,
  correlation_id text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_owner_group_payment_attempts_gateway_reference_key UNIQUE (gateway, gateway_reference)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_owner_group_active_plan_subscription
  ON public.saas_owner_group_plan_subscriptions(group_id)
  WHERE status IN ('active', 'grace_period');

CREATE INDEX IF NOT EXISTS idx_owner_billing_groups_owner
  ON public.owner_billing_groups(owner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_billing_group_members_group
  ON public.owner_billing_group_members(group_id, added_at);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_plan_subscriptions_group
  ON public.saas_owner_group_plan_subscriptions(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_plan_subscriptions_renewal
  ON public.saas_owner_group_plan_subscriptions(next_renewal_at)
  WHERE status IN ('active', 'grace_period');

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_addon_subscriptions_group
  ON public.saas_owner_group_addon_subscriptions(group_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_quota_overrides_group
  ON public.saas_owner_group_quota_overrides(group_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_entitlement_overrides_group
  ON public.saas_owner_group_entitlement_overrides(group_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_subscription_events_scope
  ON public.saas_owner_group_subscription_events(group_id, subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_subscription_change_log_scope
  ON public.saas_owner_group_subscription_change_log(group_id, subscription_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_owner_group_invoice_external_reference
  ON public.saas_owner_group_subscription_invoices(external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_subscription_invoices_scope
  ON public.saas_owner_group_subscription_invoices(group_id, subscription_id, invoice_status, due_at);

CREATE INDEX IF NOT EXISTS idx_saas_owner_group_payment_attempts_scope
  ON public.saas_owner_group_subscription_payment_attempts(group_id, payment_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.owner_billing_group_guard_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_OWNER_IMMUTABLE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_guard_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_owner_id uuid;
  v_group_status text;
  v_company_owner_id uuid;
BEGIN
  SELECT owner_id, status
  INTO v_group_owner_id, v_group_status
  FROM public.owner_billing_groups
  WHERE id = NEW.group_id
  FOR UPDATE;

  IF v_group_owner_id IS NULL OR v_group_status <> 'active' THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_NOT_ACTIVE';
  END IF;

  SELECT owner_id
  INTO v_company_owner_id
  FROM public.companies
  WHERE id = NEW.company_id
  FOR UPDATE;

  IF v_company_owner_id IS NULL OR v_company_owner_id <> v_group_owner_id THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_COMPANY_OWNER_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_billing_group_guard_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.saas_plans
    WHERE id = NEW.plan_id
      AND product_id IS NULL
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'OWNER_BILLING_GROUP_REQUIRES_ACTIVE_UNIFIED_PLAN';
  END IF;

  IF NEW.status IN ('active', 'grace_period') THEN
    SELECT count(*)
    INTO v_member_count
    FROM public.owner_billing_group_members
    WHERE group_id = NEW.group_id;

    IF v_member_count < 2 THEN
      RAISE EXCEPTION 'OWNER_BILLING_GROUP_REQUIRES_TWO_MEMBERS';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_billing_groups_guard_owner ON public.owner_billing_groups;
CREATE TRIGGER trg_owner_billing_groups_guard_owner
  BEFORE UPDATE ON public.owner_billing_groups
  FOR EACH ROW EXECUTE FUNCTION public.owner_billing_group_guard_owner();

DROP TRIGGER IF EXISTS trg_owner_billing_group_members_guard_owner ON public.owner_billing_group_members;
CREATE TRIGGER trg_owner_billing_group_members_guard_owner
  BEFORE INSERT OR UPDATE ON public.owner_billing_group_members
  FOR EACH ROW EXECUTE FUNCTION public.owner_billing_group_guard_member();

DROP TRIGGER IF EXISTS trg_saas_owner_group_plan_guard ON public.saas_owner_group_plan_subscriptions;
CREATE TRIGGER trg_saas_owner_group_plan_guard
  BEFORE INSERT OR UPDATE OF plan_id ON public.saas_owner_group_plan_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.owner_billing_group_guard_plan();

DROP TRIGGER IF EXISTS trg_owner_billing_groups_updated_at ON public.owner_billing_groups;
CREATE TRIGGER trg_owner_billing_groups_updated_at
  BEFORE UPDATE ON public.owner_billing_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_plan_subscriptions_updated_at ON public.saas_owner_group_plan_subscriptions;
CREATE TRIGGER trg_saas_owner_group_plan_subscriptions_updated_at
  BEFORE UPDATE ON public.saas_owner_group_plan_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_addon_subscriptions_updated_at ON public.saas_owner_group_addon_subscriptions;
CREATE TRIGGER trg_saas_owner_group_addon_subscriptions_updated_at
  BEFORE UPDATE ON public.saas_owner_group_addon_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_quota_overrides_updated_at ON public.saas_owner_group_quota_overrides;
CREATE TRIGGER trg_saas_owner_group_quota_overrides_updated_at
  BEFORE UPDATE ON public.saas_owner_group_quota_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_entitlement_overrides_updated_at ON public.saas_owner_group_entitlement_overrides;
CREATE TRIGGER trg_saas_owner_group_entitlement_overrides_updated_at
  BEFORE UPDATE ON public.saas_owner_group_entitlement_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_subscription_invoices_updated_at ON public.saas_owner_group_subscription_invoices;
CREATE TRIGGER trg_saas_owner_group_subscription_invoices_updated_at
  BEFORE UPDATE ON public.saas_owner_group_subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_saas_owner_group_payment_attempts_updated_at ON public.saas_owner_group_subscription_payment_attempts;
CREATE TRIGGER trg_saas_owner_group_payment_attempts_updated_at
  BEFORE UPDATE ON public.saas_owner_group_subscription_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.saas_user_can_access_owner_billing_group(
  p_user_id uuid,
  p_group_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_super_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.owner_billing_groups group_record
      WHERE group_record.id = p_group_id
        AND group_record.owner_id = p_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.saas_user_can_access_owner_billing_group(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_user_can_access_owner_billing_group(uuid, uuid) TO authenticated;

ALTER TABLE public.owner_billing_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_billing_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_addon_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_quota_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_subscription_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_owner_group_subscription_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own billing groups"
ON public.owner_billing_groups
FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Super admins can view owner billing groups"
ON public.owner_billing_groups
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view billing group members"
ON public.owner_billing_group_members
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view billing group members"
ON public.owner_billing_group_members
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group plan subscriptions"
ON public.saas_owner_group_plan_subscriptions
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group plan subscriptions"
ON public.saas_owner_group_plan_subscriptions
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group addon subscriptions"
ON public.saas_owner_group_addon_subscriptions
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group addon subscriptions"
ON public.saas_owner_group_addon_subscriptions
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group quota overrides"
ON public.saas_owner_group_quota_overrides
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group quota overrides"
ON public.saas_owner_group_quota_overrides
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group entitlement overrides"
ON public.saas_owner_group_entitlement_overrides
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group entitlement overrides"
ON public.saas_owner_group_entitlement_overrides
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group subscription events"
ON public.saas_owner_group_subscription_events
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group subscription events"
ON public.saas_owner_group_subscription_events
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group subscription change log"
ON public.saas_owner_group_subscription_change_log
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group subscription change log"
ON public.saas_owner_group_subscription_change_log
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group subscription invoices"
ON public.saas_owner_group_subscription_invoices
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group subscription invoices"
ON public.saas_owner_group_subscription_invoices
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Authorized users can view group payment attempts"
ON public.saas_owner_group_subscription_payment_attempts
FOR SELECT TO authenticated
USING (public.saas_user_can_access_owner_billing_group(auth.uid(), group_id));

CREATE POLICY "Super admins can view group payment attempts"
ON public.saas_owner_group_subscription_payment_attempts
FOR SELECT TO authenticated
USING (public.is_platform_super_admin(auth.uid()));

REVOKE ALL ON public.owner_billing_groups FROM anon;
REVOKE ALL ON public.owner_billing_group_members FROM anon;
REVOKE ALL ON public.saas_owner_group_plan_subscriptions FROM anon;
REVOKE ALL ON public.saas_owner_group_addon_subscriptions FROM anon;
REVOKE ALL ON public.saas_owner_group_quota_overrides FROM anon;
REVOKE ALL ON public.saas_owner_group_entitlement_overrides FROM anon;
REVOKE ALL ON public.saas_owner_group_subscription_events FROM anon;
REVOKE ALL ON public.saas_owner_group_subscription_change_log FROM anon;
REVOKE ALL ON public.saas_owner_group_subscription_invoices FROM anon;
REVOKE ALL ON public.saas_owner_group_subscription_payment_attempts FROM anon;

GRANT SELECT ON public.owner_billing_groups TO authenticated;
GRANT SELECT ON public.owner_billing_group_members TO authenticated;
GRANT SELECT ON public.saas_owner_group_plan_subscriptions TO authenticated;
GRANT SELECT ON public.saas_owner_group_addon_subscriptions TO authenticated;
GRANT SELECT ON public.saas_owner_group_quota_overrides TO authenticated;
GRANT SELECT ON public.saas_owner_group_entitlement_overrides TO authenticated;
GRANT SELECT ON public.saas_owner_group_subscription_events TO authenticated;
GRANT SELECT ON public.saas_owner_group_subscription_change_log TO authenticated;
GRANT SELECT ON public.saas_owner_group_subscription_invoices TO authenticated;
GRANT SELECT ON public.saas_owner_group_subscription_payment_attempts TO authenticated;

