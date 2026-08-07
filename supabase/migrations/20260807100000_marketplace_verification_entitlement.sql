INSERT INTO public.saas_entitlement_keys (key, domain, value_type, description)
VALUES (
  'marketplace.verification.manage',
  'marketplace',
  'boolean',
  'Submit and track marketplace publisher verification.'
)
ON CONFLICT (key) DO UPDATE
SET
  domain = EXCLUDED.domain,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description;

INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, bool_value)
SELECT plans.id, keys.id, true
FROM public.saas_plans AS plans
CROSS JOIN public.saas_entitlement_keys AS keys
WHERE plans.code LIKE 'marketplace_%'
  AND keys.key = 'marketplace.verification.manage'
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE
SET bool_value = EXCLUDED.bool_value;