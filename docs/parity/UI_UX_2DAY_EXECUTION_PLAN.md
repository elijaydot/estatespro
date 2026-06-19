# UI/UX 2-Day Execution Plan (No-Break)

## Objective
Ship a high-impact UI/UX and branding uplift in 2 days without destabilizing core flows.

## Constraints
1. No routing changes.
2. No database/schema changes.
3. No API contract changes.
4. No behavior changes in checkout/verify/payment logic.
5. Visual and interaction improvements must be additive and reversible.

## Brand Direction
1. Primary system font: Roboto (already applied globally).
2. Accent/display typeface: Lato (already applied globally).
3. Visual tone: trusted, operational, enterprise-ready.
4. UX principle: exception-first and action-first.

## Scope Lock (2 days only)
Focus only on these surfaces:
1. `src/components/layout/AppHeader.tsx`
2. `src/components/layout/AppSidebar.tsx`
3. `src/components/layout/AppLayout.tsx`
4. `src/pages/Dashboard.tsx`
5. `src/pages/Payments.tsx`
6. `src/pages/Tenants.tsx`
7. `src/pages/Properties.tsx`
8. `src/pages/MarketplaceManage.tsx`

Do not touch tenant portal pages in this sprint.

## Success Criteria (must all be true)
1. Navigation clarity improves (less visual noise, clearer hierarchy).
2. Exception-first callouts appear on Dashboard and Payments.
3. Primary actions are visible above the fold on desktop and mobile.
4. Typography hierarchy is consistent (Roboto body, Lato headings/accents).
5. Local gates pass:
   - `npm run build`
   - `npm run test:week2`
   - `npm run check:contracts`

## Day 1 Plan (Foundation + Shell)

### 1) App Shell Polish
Targets:
1. `AppHeader`
2. `AppSidebar`
3. `AppLayout`

Changes:
1. Tighten spacing scale for header/sidebar controls.
2. Strengthen active nav item contrast and focus states.
3. Add "Today" context strip in header (date + quick state indicators).
4. Make primary action button style consistent (`Quick Add`, notifications).
5. Improve mobile header icon hit areas and contrast.

Acceptance:
1. Keyboard focus clearly visible on all header/sidebar actions.
2. Active route is visually obvious within 1 second.
3. Header remains one-row on desktop without clipping.

### 2) Typography and Semantic Hierarchy Audit
Targets:
1. Dashboard/Payments/Tenants/Properties page titles and section headings.

Changes:
1. Standardize title scale and weights.
2. Apply `.font-display` only to page-level headings and key KPI labels.
3. Ensure body copy uses Roboto consistently.

Acceptance:
1. No mixed title scales on same page.
2. Minimum 4.5:1 contrast for body text.

## Day 2 Plan (Exception-First + Workflow Speed)

### 1) Dashboard Exception Layer
Target:
1. `src/pages/Dashboard.tsx`

Changes:
1. Add top "Needs Attention" strip with 3-5 critical cards:
   - overdue payments
   - lease expirations
   - unresolved maintenance
   - pending approvals
2. Add direct action buttons per card (View, Resolve, Assign).

Acceptance:
1. Exceptions visible without scrolling on desktop.
2. Each exception card has one primary action.

### 2) Payments Workflow Fast-Path
Target:
1. `src/pages/Payments.tsx`

Changes:
1. Add compact status summary bar (pending/partial/failed/reconciled).
2. Add one-click filters for exception states.
3. Surface recent verify outcomes and correlation hints in a details drawer or row expansion.

Acceptance:
1. User can isolate failed/partial payments in <= 2 clicks.
2. Payment state understanding improves without opening multiple pages.

### 3) CRM + Property Ops Scanability
Targets:
1. `src/pages/Tenants.tsx`
2. `src/pages/Properties.tsx`
3. `src/pages/MarketplaceManage.tsx`

Changes:
1. Add consistent page top action row (primary + secondary + quick filter).
2. Improve table/list row density and readability.
3. Add status chips with consistent visual language.
4. Ensure key identifiers (name, unit/property, status, last action) are first scan column.

Acceptance:
1. Core row state can be understood in one horizontal scan.
2. At least one saved filter preset pattern introduced (or placeholder UI for it).

## No-Break Implementation Rules
1. Prefer CSS class additions and composition updates over refactors.
2. Do not rename exported component props unless fully backward compatible.
3. Avoid large data mapping rewrites in this sprint.
4. Keep all existing route paths unchanged.
5. Ship in small commits by surface:
   - shell
   - dashboard
   - payments
   - tenants/properties/marketplace

## QA Checklist
1. Desktop widths: 1280, 1440, 1920.
2. Mobile widths: 390, 430.
3. Keyboard tab flow: header, sidebar, primary actions.
4. Light/dark mode visual checks.
5. Top user journeys:
   - login -> dashboard
   - open payment exceptions
   - open tenant list and apply filter
   - open marketplace manage and change stage

## Rollback Safety
1. Keep style-only changes isolated per file.
2. If any regression appears, revert the affected page bundle commit only.
3. Do not couple this sprint with backend or migration deployments.

## Deliverables by End of Day 2
1. Updated shell UX across `AppHeader`, `AppSidebar`, `AppLayout`.
2. Exception-first dashboard + payments surfaces.
3. Unified heading/typography hierarchy in scoped pages.
4. Build/tests/contracts checks green.
5. Before/after screenshots for the 8 scoped surfaces.

## Post-2-Day Follow-Up (not in sprint)
1. Tenant portal visual parity.
2. Integration health panel (webhook attempts/dead letters) in UI.
3. Saved views and command-palette actions across data-heavy pages.
