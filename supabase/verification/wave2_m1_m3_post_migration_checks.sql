-- Wave 2 Milestone 1-3 post-migration verification
-- Run in Supabase SQL Editor after applying migration 20260621030000_wave2_milestone_1_2_3_core.sql

-- 1) Confirm core relations exist
SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  c.relkind AS object_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'crm_deal_stage_history',
    'crm_followup_automation_log',
    'crm_trust_flags',
    'crm_deal_handoffs',
    'crm_marketplace_funnel_metrics'
  )
ORDER BY c.relname;

-- 2) Confirm critical triggers are installed
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND t.tgisinternal = false
  AND t.tgname IN (
    'enforce_crm_deal_stage_transition_trigger',
    'log_crm_deal_stage_transition_trigger',
    'upsert_crm_deal_handoff_on_closed_won_trigger',
    'create_followup_task_from_call_trigger',
    'create_followup_task_from_meeting_completion_trigger',
    'sync_crm_trust_flag_from_verification_trigger',
    'sync_crm_trust_flag_from_moderation_case_trigger',
    'update_crm_trust_flags_updated_at',
    'update_crm_deal_handoffs_updated_at'
  )
ORDER BY t.tgname;

-- 3) Confirm RLS enabled on new tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'crm_deal_stage_history',
    'crm_followup_automation_log',
    'crm_trust_flags',
    'crm_deal_handoffs'
  )
ORDER BY tablename;

-- 4) Confirm expected policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'crm_deal_stage_history',
    'crm_followup_automation_log',
    'crm_trust_flags',
    'crm_deal_handoffs'
  )
ORDER BY tablename, policyname;

-- 5) Confirm helper functions exist
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_valid_crm_deal_stage_transition',
    'enforce_crm_deal_stage_transition',
    'log_crm_deal_stage_transition',
    'create_followup_task_from_call',
    'create_followup_task_from_meeting_completion',
    'sync_crm_trust_flag_from_verification',
    'sync_crm_trust_flag_from_moderation_case',
    'upsert_crm_deal_handoff_on_closed_won'
  )
ORDER BY p.proname;

-- 6) Current data snapshot (non-destructive)
SELECT
  (SELECT COUNT(*) FROM public.crm_deal_stage_history) AS stage_history_rows,
  (SELECT COUNT(*) FROM public.crm_followup_automation_log) AS followup_log_rows,
  (SELECT COUNT(*) FROM public.crm_trust_flags) AS trust_flag_rows,
  (SELECT COUNT(*) FROM public.crm_deal_handoffs) AS handoff_rows;

-- 7) Funnel view smoke query
SELECT *
FROM public.crm_marketplace_funnel_metrics
ORDER BY company_name
LIMIT 20;

-- 8) Optional behavior checks (replace placeholders before running)
-- These are templates only. They are intentionally commented to avoid accidental writes.
--
-- -- A) Invalid stage transition should fail (example: qualification -> proposal)
-- UPDATE public.crm_deals
-- SET stage = 'proposal'
-- WHERE id = '00000000-0000-0000-0000-000000000000';
--
-- -- B) closed_won without amount should fail
-- UPDATE public.crm_deals
-- SET stage = 'closed_won', amount = 0
-- WHERE id = '00000000-0000-0000-0000-000000000000';
--
-- -- C) successful stage move should write stage history row
-- UPDATE public.crm_deals
-- SET stage = 'needs_analysis'
-- WHERE id = '00000000-0000-0000-0000-000000000000';
-- SELECT * FROM public.crm_deal_stage_history WHERE deal_id = '00000000-0000-0000-0000-000000000000' ORDER BY changed_at DESC;
--
-- -- D) closed_won should upsert handoff row
-- UPDATE public.crm_deals
-- SET stage = 'closed_won', amount = 1000
-- WHERE id = '00000000-0000-0000-0000-000000000000';
-- SELECT * FROM public.crm_deal_handoffs WHERE deal_id = '00000000-0000-0000-0000-000000000000';
