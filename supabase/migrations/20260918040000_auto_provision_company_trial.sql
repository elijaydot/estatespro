-- Auto-provision 90-day trial subscription on new company creation
-- and backfill existing companies without a subscription.

CREATE OR REPLACE FUNCTION public.auto_provision_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_plan_id uuid;
  v_trial_days integer := 90;
BEGIN
  -- Get core property product
  SELECT id INTO v_product_id 
  FROM public.saas_products 
  WHERE code = 'core_property' AND is_active = true 
  LIMIT 1;

  -- Get default onboarding plan (fishgate_growth or highest available trial plan)
  SELECT id, COALESCE(trial_days, 90) INTO v_plan_id, v_trial_days
  FROM public.saas_plans
  WHERE code = 'fishgate_growth' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    SELECT id, COALESCE(trial_days, 90) INTO v_plan_id, v_trial_days
    FROM public.saas_plans
    WHERE is_active = true
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NOT NULL AND v_product_id IS NOT NULL THEN
    INSERT INTO public.saas_company_plan_subscriptions (
      company_id,
      product_id,
      plan_id,
      status,
      start_at,
      trial_end_at,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      v_product_id,
      v_plan_id,
      'trialing',
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.created_at, now()) + make_interval(days => v_trial_days),
      NEW.owner_id,
      jsonb_build_object('auto_provisioned', true, 'trial_days', v_trial_days)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_provision_company_trial ON public.companies;

CREATE TRIGGER trg_auto_provision_company_trial
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.auto_provision_company_trial();

-- Backfill any existing companies that do not yet have an active or trialing subscription
DO $$
DECLARE
  r RECORD;
  v_product_id uuid;
  v_plan_id uuid;
  v_trial_days integer := 90;
BEGIN
  SELECT id INTO v_product_id 
  FROM public.saas_products 
  WHERE code = 'core_property' AND is_active = true 
  LIMIT 1;

  SELECT id, COALESCE(trial_days, 90) INTO v_plan_id, v_trial_days
  FROM public.saas_plans
  WHERE code = 'fishgate_growth' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NOT NULL AND v_product_id IS NOT NULL THEN
    FOR r IN 
      SELECT c.id, c.owner_id, c.created_at
      FROM public.companies c
      WHERE NOT EXISTS (
        SELECT 1 FROM public.saas_company_plan_subscriptions s
        WHERE s.company_id = c.id
          AND s.status IN ('active', 'trialing', 'grace_period')
      )
    LOOP
      INSERT INTO public.saas_company_plan_subscriptions (
        company_id,
        product_id,
        plan_id,
        status,
        start_at,
        trial_end_at,
        created_by,
        metadata
      ) VALUES (
        r.id,
        v_product_id,
        v_plan_id,
        'trialing',
        COALESCE(r.created_at, now()),
        COALESCE(r.created_at, now()) + make_interval(days => v_trial_days),
        r.owner_id,
        jsonb_build_object('auto_provisioned', true, 'backfilled', true, 'trial_days', v_trial_days)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
