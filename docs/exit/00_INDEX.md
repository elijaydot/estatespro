# FishGate / EstatesPro — Lovable Exit & Migration Package

Generated: 2026-08-19 (UTC). Source of truth: this repository at HEAD plus `supabase/migrations/*` (153 files).

## Discovery method and integrity notes

| Source | Status |
|---|---|
| Frontend source (`src/`) | Fully inspected |
| Edge functions (`supabase/functions/`) | Fully inspected (41 functions + `_shared`) |
| Migrations (`supabase/migrations/`) | Fully inspected (153 files) — schema derived from DDL |
| Live database introspection (`information_schema`, `storage.buckets`, `cron.job`) | **FAILED — connection timeout at time of writing.** Every live-only fact below is marked `MANUAL REVIEW REQUIRED` and must be re-run against the live instance before execution |
| Row counts / data volumes | **MANUAL REVIEW REQUIRED** (requires live DB) |
| Storage object counts and bytes | **MANUAL REVIEW REQUIRED** (requires live Storage API) |
| Auth user counts, provider config, MFA factor counts | **MANUAL REVIEW REQUIRED** (requires live Auth admin API) |

Re-run `docs/exit/scripts/live-introspection.sql` against the live database and attach output as Appendix A before the migration board review.

## Documents

| # | Document | File |
|---|---|---|
| 1 | Executive Summary | `01_EXECUTIVE_SUMMARY.md` |
| 2 | Application Architecture Overview | `02_ARCHITECTURE_OVERVIEW.md` |
| 3 | Dependency Inventory | `03_DEPENDENCY_INVENTORY.md` |
| 4 | Export Readiness Assessment | `04_EXPORT_READINESS.md` |
| 5 | Database Migration Guide | `05_DATABASE_MIGRATION.md` |
| 6 | Authentication Migration Guide | `06_AUTH_MIGRATION.md` |
| 7 | Storage Migration Guide | `07_STORAGE_MIGRATION.md` |
| 8 | AI Migration Guide | `08_AI_MIGRATION.md` |
| 9 | Edge Functions Migration Guide | `09_EDGE_FUNCTIONS_MIGRATION.md` |
| 10 | Infrastructure & DevOps Guide | `10_INFRA_DEVOPS.md` |
| 11 | Security Review | `11_SECURITY_REVIEW.md` |
| 12 | Business Continuity Plan | `12_BUSINESS_CONTINUITY.md` |
| 13 | Runbook — Complete Lovable Exit | `13_EXIT_RUNBOOK.md` |
| 14 | Step-by-Step Migration Execution Plan | `14_EXECUTION_PLAN.md` |
| 15 | Migration Effort Estimate | `15_EFFORT_ESTIMATE.md` |
| 16 | Risk Register | `16_RISK_REGISTER.md` |
| 17 | Asset Inventory | `17_ASSET_INVENTORY.md` |
| 18 | Environment Variable Catalog | `18_ENV_VAR_CATALOG.md` |
| 19 | Open Questions and Assumptions | `19_OPEN_QUESTIONS.md` |
| 20 | Final Recommendation | `20_FINAL_RECOMMENDATION.md` |

Supporting artifacts: `scripts/live-introspection.sql`, `scripts/export-all.sh`.
