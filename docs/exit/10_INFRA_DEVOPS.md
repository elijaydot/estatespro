# Document 10 — Infrastructure & DevOps Guide

## 1. Current state

| Area | Current |
|---|---|
| Frontend hosting | Lovable managed (`estatespro.lovable.app`); `vercel.json` already committed (SPA rewrites) |
| Build | Vite 8 + SWC; `npm run build`; `lovable-tagger` injected in dev mode only |
| Backend hosting | Lovable-managed Supabase (`eu-west-1`) |
| Function deploys | Performed through the Lovable/Supabase tooling on demand |
| Migrations | 153 files in `supabase/migrations`, applied via the platform migration flow |
| CI | 3 GitHub workflows: `.github/workflows/week1-ci.yml`, `week2-quality.yml`, `rls-isolation.yml` |
| Tests | Vitest; `test`, `test:week2`, `test:week4`, `test:rls` scripts; ~90 test files under `tests/week2..4` |
| Quality gates | `npm run lint`, `npm run check:audit` (`scripts/check-audit-threshold.js`), `npm run check:contracts` (`scripts/check-contract-inventory.js`) |
| Docs generation | `npm run docs:api` → `public/openapi.json`; types via `npm run types:supabase` |
| Environments | Production only (preview URLs are ephemeral). **No dedicated staging project** — a material gap |
| IaC | **None** — all infrastructure is click/platform-provisioned |
| Observability | Platform logs only; **no APM, no error tracking, no uptime monitoring, no log retention** |
| Secrets | Lovable Cloud secret store (11 runtime secrets) |

**Two structural gaps to close during migration: a real staging environment, and infrastructure-as-code.**

## 2. Target environment model

| Environment | Purpose | Data |
|---|---|---|
| `dev` | Local: `supabase start` + `npm run dev` | Seeded synthetic |
| `staging` | Full parity: own Supabase project, own functions, own domain (`staging.<domain>`) | Anonymised production subset |
| `production` | Live | Real |

Every environment gets its own: Supabase project, storage buckets, secret set, AI provider key with a spend cap, and payment-gateway **test** keys (staging) vs live keys (production).

## 3. Reference deployment architecture — Recommended (Supabase Cloud + Vercel)

```text
GitHub repo (main / release/* / feature/*)
   │
   ├── PR  ──▶ CI: lint · typecheck · vitest · check:contracts · check:audit
   │            └─▶ Vercel Preview deploy (points at staging Supabase)
   │
   ├── merge main ──▶ staging: supabase db push + functions deploy + Vercel deploy(staging)
   │                   └─▶ smoke suite + RLS isolation tests
   │
   └── tag v* ──▶ production: manual approval gate
                    ├─ pre-deploy backup (pg_dump + storage manifest)
                    ├─ supabase db push (migrations only, forward-only)
                    ├─ supabase functions deploy (all 41)
                    └─ Vercel production promote  → post-deploy smoke → auto-rollback on failure
```

Rollback: Vercel instant rollback to the previous immutable deployment; functions redeployed from the previous tag; database is forward-fix-only (PITR restore reserved for data-destructive incidents).

## 4. Reference deployment architecture — Azure

```text
Azure DevOps / GitHub Actions
  ├─ Static Web Apps (or Storage + Front Door)      ← SPA
  ├─ Azure Functions (Premium plan, VNet)           ← 41 functions
  ├─ Azure Database for PostgreSQL Flexible Server  ← DB (HA zone-redundant, PITR 35d)
  ├─ Azure Blob Storage + Front Door CDN            ← 12 containers
  ├─ Entra External ID (or Auth0)                   ← identity
  ├─ Key Vault                                      ← secrets, CMK
  ├─ Azure Cache for Redis                          ← distributed rate limiting
  ├─ Application Insights + Log Analytics           ← APM, logs, alerts
  └─ Bicep modules per resource, deployed per env
```
Notes: `pg_net` unavailable → move DB-initiated HTTP to Timer-triggered Functions; PostgREST replacement required (self-hosted PostgREST container on Container Apps is the cheapest path to preserve the direct-data-API pattern).

## 5. Reference deployment architecture — AWS

```text
GitHub Actions + OIDC → AWS
  ├─ S3 + CloudFront (OAC)                 ← SPA
  ├─ Lambda + Function URLs / API Gateway  ← 41 functions (WAF on the partner API)
  ├─ Aurora PostgreSQL Serverless v2       ← DB (Multi-AZ, PITR)
  ├─ S3 (12 prefixes) + CloudFront         ← storage, Object Lock on verification-documents
  ├─ Cognito or Auth0                      ← identity
  ├─ Secrets Manager (rotation)            ← secrets
  ├─ ElastiCache / DynamoDB                ← rate limiting + idempotency
  ├─ EventBridge Scheduler                 ← 6 cron workers
  ├─ SQS + DLQ                             ← webhook dispatch (replaces polling worker)
  └─ CloudWatch + X-Ray                    ← observability
```

## 6. Reference deployment architecture — GCP

```text
Cloud Build / GitHub Actions
  ├─ Firebase Hosting or Cloud Storage + Cloud CDN  ← SPA
  ├─ Cloud Run (containerised functions)            ← 41 functions
  ├─ Cloud SQL for PostgreSQL (HA, PITR)            ← DB
  ├─ Cloud Storage (12 buckets) + Cloud CDN         ← storage
  ├─ Identity Platform                              ← identity
  ├─ Secret Manager                                 ← secrets
  ├─ Cloud Scheduler + Pub/Sub                      ← cron + webhook fanout
  └─ Cloud Logging / Monitoring / Error Reporting   ← observability
```

## 7. CI/CD pipeline specification

Stages (identical across targets; only the deploy step differs):

1. **Install** — `npm ci` (add `.npmrc` only if a private registry is introduced).
2. **Static quality** — `npm run lint`; `tsc --noEmit`.
3. **Unit + contract tests** — `npm run test` (~90 files), `npm run check:contracts`, `npm run check:audit`.
4. **Security** — `npm audit --audit-level=high`, secret scanning (gitleaks), SAST (CodeQL), dependency review.
5. **Build** — `npm run build`; upload artifact; fail on bundle-size regression >10%.
6. **DB migration (staging)** — `supabase db push --dry-run` diff posted to the PR; apply on merge.
7. **Deploy staging** — functions + SPA; then `npm run test:rls` and the smoke checklist against staging.
8. **Manual approval** — release manager.
9. **Pre-prod backup** — `pg_dump -Fc` + storage manifest to the backup bucket; record SHA-256.
10. **Deploy production** — migrations → functions → SPA promote.
11. **Post-deploy verification** — smoke suite, synthetic checks, error-rate watch for 30 min.
12. **Rollback on failure** — automatic SPA rollback; function redeploy from previous tag; incident opened.

Branching: trunk-based on `main` with short-lived feature branches; `release/*` tags for production. Migrations are **forward-only and never edited after merge**.

## 8. Infrastructure as code

Adopt Terraform (multi-cloud) or Bicep (Azure-only). Minimum modules: database, storage buckets + policies, functions/hosting, secrets, DNS/CDN, monitoring/alerts, IAM. State in a remote encrypted backend with locking. `terraform plan` runs on every PR that touches `infra/`.

## 9. Observability requirements (net new)

| Signal | Tool (any target) | Alert |
|---|---|---|
| Frontend errors | Sentry | New error type; error rate >1% of sessions |
| API/function errors | Platform logs → Sentry/App Insights/CloudWatch | 5xx rate >1% over 5 min |
| Payment failures | Custom metric from `payments` + `saas_subscription_payment_attempts` | Any failure spike; verification lag >5 min |
| Webhook health | `webhook_delivery_attempts`, `webhook_dead_letters` | Any dead letter; retry backlog >50 |
| Cron liveness | Heartbeat row per job | Missed run |
| DB health | Provider metrics | Connections >80%, CPU >80%, replication lag |
| Storage | Object count/bytes growth | Anomalous growth |
| AI | Provider dashboard + `saas_usage_events` | 402/403 (circuit breaker), cost >budget |
| Uptime | Synthetic checks on `/`, `/rent`, `/api/docs`, `/tenant/login` | 2 consecutive failures |

## 10. Cost summary (indicative, 2 environments)

| Target | Monthly |
|---|---|
| Supabase Cloud + Vercel (recommended) | **$120–350** |
| Azure (Flexible Server + Functions Premium + Blob + Front Door + App Insights) | $600–1,200 |
| AWS (Aurora Serverless v2 + Lambda + S3 + CloudFront + WAF) | $500–1,100 |
| GCP (Cloud SQL + Cloud Run + GCS + CDN) | $500–1,000 |
| Self-hosted Supabase (2 VMs + backups) + Vercel | $150–350 infra **+ 0.3–0.5 FTE** |

All figures exclude AI ($10–70/mo, Document 8), Resend, and payment-gateway fees. **MANUAL REVIEW REQUIRED** against live usage data.
