# Week 3 Plan (Execution)

## Theme
Reliability, correctness, and hardening after Week 2 foundations.

## Must-Do Code Changes

### A) Payment and Workflow Reliability
1. Add retry-safe handling for provider verify timeouts.
2. Add strict duplicate guard tests for invoice/reference and booking/reference permutations.
3. Add integration tests for:
   - tenant invoice payment lifecycle
   - guest booking payment lifecycle
   - partial payment and overpayment clamp behavior

### B) Dependency Security Upgrades
1. Upgrade vulnerable dependencies and lockfile.
2. Validate build and runtime behavior post-upgrade.
3. Add CI audit check threshold (fail on new high severity).

### C) Type and Lint Reliability
1. Reduce explicit-any in highest-risk modules first:
   - payments, tenant portal payments/invoices/messages
   - dashboard stats and reporting hooks
2. Add typed helpers for Supabase relation payloads.
3. Enable stricter lint in changed files and keep zero-new-debt policy.

### D) Monitoring Integration
1. Add event taxonomy documentation and required fields.
2. Emit audit events for key non-payment workflows (invite, lease-email, maintenance transitions).
3. Add alert routing config for warning/error event types.

## Week 3 Exit Criteria
1. Week 2 tests remain green plus new Week 3 tests.
2. No duplicate payment rows possible in tested paths.
3. Dependency vulnerabilities significantly reduced and documented.
4. Monitoring alerts configured for payment failure/rate-limit spikes.
