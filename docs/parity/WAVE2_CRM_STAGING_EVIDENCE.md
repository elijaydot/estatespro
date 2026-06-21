# Wave 2 CRM Staging Evidence

## Scope
Validate Wave 2 CRM feature-breadth closure in staging for:
1. Stage governance and handoff lifecycle.
2. Automation engine operations and replay.
3. Module workflow depth (contacts/campaigns/documents/projects/accounts/deals/visits/calls/meetings/tasks).
4. Reporting and governance invariants.

## Metadata
- Environment: `staging`
- Build commit: `37daac9`
- Validation date: `2026-06-21`
- Operator: `repo-side execution pass`
- Supabase project ref: `<ref>`

## Preconditions
1. Apply CRM migrations through latest Wave 2 tranche:
   - `supabase/migrations/20260621030000_wave2_milestone_1_2_3_core.sql`
   - `supabase/migrations/20260621042000_wave2_automation_and_handoff_completion.sql`
   - `supabase/migrations/20260621160000_wave2_documents_lifecycle_and_automation_replay.sql`
2. Deploy current branch build to staging.
3. Ensure authenticated test users exist with company manager role.

Precondition status:
- Migration tranche status: `applied` (operator-confirmed)
- Staging deploy status: `pending confirmation`
- Staging users/roles status: `pending confirmation`

## Local Gate Evidence
- `npm run lint`: `pass (0 errors, 1 existing warning)`
- `npm test`: `pass (14 files, 57 tests)`
- `npm run build`: `pass (vite production build successful)`
- Notes:
  - Existing non-blocking lint warning in `src/components/marketplace-crm/CrmWorkspace.tsx` (`react-refresh/only-export-components`).
  - Browserslist update warning appears during build and is non-blocking.

## Functional Validation Matrix

### A. Deals + Handoff Governance
1. Transition a deal forward through valid stages.
2. Attempt an invalid stage jump and confirm rejection.
3. Close a deal as `closed_won` with amount and relationship linkage.
4. Start and complete handoff via UI.

Evidence:
- Deal id: `<uuid>`
- Handoff id: `<uuid>`
- Screenshot/recording links: `<links>`
- Result: `pending staging execution evidence`

### B. Automation Rules + Run Operations
1. Create an active rule for `deal.stage_changed` with create_task action.
2. Trigger source event and confirm run log row appears.
3. Force/identify a failed or pending run.
4. Use manual replay action and confirm new run + audit trace.

Evidence SQL:
```sql
SELECT id, event_type, status, attempts, max_attempts, correlation_id, created_at
FROM public.crm_automation_runs
ORDER BY created_at DESC
LIMIT 20;
```

```sql
SELECT created_at, event_type, source, correlation_id, details
FROM public.audit_events
WHERE source = 'marketplace_crm_automation'
ORDER BY created_at DESC
LIMIT 20;
```

Evidence:
- Rule id: `<uuid>`
- Original run id: `<uuid>`
- Replay run id: `<uuid>`
- Result: `pending staging execution evidence`

### C. Contacts/Campaigns/Projects/Documents Workflow Depth
1. Contacts duplicate candidate appears and merge succeeds.
2. Campaign status and KPI edits persist.
3. Project owner reassignment + lifecycle transitions persist.
4. Document lifecycle transitions (draft/review/approve/reject/archive) and compliance state edits persist.

Evidence SQL:
```sql
SELECT id, full_name, email, phone_e164, preferred_channel, created_at
FROM public.lead_contacts
ORDER BY created_at DESC
LIMIT 30;
```

```sql
SELECT id, name, status, open_rate, click_rate, bounce_rate, updated_at
FROM public.crm_campaigns
ORDER BY updated_at DESC
LIMIT 30;
```

```sql
SELECT id, name, status, owner_user_id, due_date, progress_percent, updated_at
FROM public.crm_projects
ORDER BY updated_at DESC
LIMIT 30;
```

```sql
SELECT id, title, status, compliance_state, expires_at, review_notes, updated_at
FROM public.crm_documents
ORDER BY updated_at DESC
LIMIT 30;
```

Evidence:
- Updated record ids: `<uuid list>`
- Screenshot/recording links: `<links>`
- Result: `pending staging execution evidence`

### D. Reporting and Governance Checks
1. Overview + Reports render with live CRM metrics.
2. Governance release-gate invariants remain valid.

Evidence:
- Report filter scenarios executed: `<list>`
- Query snapshots: `<links>`
- Result: `pending staging execution evidence`

## Defects / Risks Log
- Issue: `<description>`
- Severity: `<low/medium/high>`
- Mitigation: `<action>`
- Owner: `<name>`
- Status: `<open/closed>`

## Final Verdict
- Wave 2 CRM staging validation: `IN_PROGRESS`
- Blockers: `Staging matrix evidence and signoff approvals not yet attached`
- Notes: `Repo-side gates are green at commit 37daac9; staging functional evidence capture remains.`
