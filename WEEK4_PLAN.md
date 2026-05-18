# Week 4 Plan (Execution)

## Theme
World-class UX polish, mobile excellence, and release readiness.

## Must-Do Code Changes

### A) Mobile Navigation Upgrade (from good to world-class)
1. Redesign mobile nav IA into grouped sections:
   - Operations
   - Financials
   - Communication
   - Admin
2. Add top quick actions in mobile header or sheet:
   - Add Tenant
   - Record Payment
   - Create Maintenance Request
3. Add context-aware active state and page breadcrumbs in mobile shell.
4. Improve accessibility:
   - focus trapping and return-focus behavior
   - keyboard traversal
   - larger tap targets and contrast checks

### B) UX Polish Across Critical Journeys
1. Payments and invoices: completion and error recovery flows.
2. Messaging: faster thread switching and draft protection.
3. Tenant portal: tighter loading/empty/error consistency.

### C) Production Readiness and Confidence
1. Full smoke suite execution (Week 1 + Week 2 + Week 4 UX checks).
2. Staging soak test with high-volume payment/notification operations.
3. Final rollback rehearsal and release checklist signoff.

## Week 4 Exit Criteria
1. Mobile nav passes usability review and task-time benchmark.
2. No P0/P1 defects in payment, booking, messaging, and tenant portal flows.
3. CI quality gates green with release notes and runbooks complete.
4. Go-live decision documented with owners and KPIs.
