# Document 12 — Business Continuity Plan

## 1. Criticality tiers and objectives

| Tier | Capability | RPO | RTO |
|---|---|---|---|
| T0 | Authentication, core data reads (properties, units, tenants, leases) | 5 min | 1 h |
| T1 | Payments capture + verification, invoicing, partner API | 5 min | 2 h |
| T2 | Messaging, notifications, maintenance, bookings | 1 h | 4 h |
| T3 | Marketplace public surfaces, CRM, reporting | 4 h | 8 h |
| T4 | AI features, analytics snapshots, broadcasts | 24 h | 24 h (degrade, do not block) |

Current achievable RPO/RTO on Lovable-managed infrastructure: **MANUAL REVIEW REQUIRED** — no customer-controlled backup exists today and PITR settings are not visible. Assume **RPO = unknown, RTO = vendor-dependent** until the first customer-owned backup is taken. This is the single largest continuity risk in the platform.

## 2. Disaster-recovery plan

### 2.1 Scenarios and responses

| Scenario | Detection | Immediate response | Recovery |
|---|---|---|---|
| Database corruption / bad migration | Error-rate alert, failed smoke | Freeze writes; announce maintenance | PITR restore to the last good LSN; replay verified deltas; forward-fix migration |
| Full region outage | Uptime synthetics | Status page; hold payment callbacks (gateways retry) | Restore latest logical dump into the secondary region; repoint DNS |
| Accidental mass delete | Audit-event anomaly / user report | Revoke the actor's session; freeze the affected table | PITR to just before the transaction; targeted row-level restore |
| Storage loss | Object 404 spike | Serve placeholders; suspend uploads | Restore from the weekly full + daily incremental mirror |
| Auth outage | Login failure alert | Public/marketplace routes remain up | Provider failover or restore `auth` schema from dump |
| Compromised secret | Anomalous usage, provider alert | Rotate immediately; revoke sessions/API keys | Forensics from `audit_events`, `api_request_events`, `security_audit_events` |
| Vendor termination / account loss | Notice or lockout | Execute Document 13 emergency path | Stand up from the latest backup on the standby target |

### 2.2 Recovery procedure (database)

```text
1. Declare incident, assign IC, open the incident channel
2. Freeze writes (revoke INSERT/UPDATE/DELETE from authenticated at the DB, or take the SPA to maintenance)
3. Identify the recovery point (last known-good timestamp from audit_events)
4. Restore: PITR into a NEW instance (never in place)
5. Validate: Document 5 §7 checks 1–8 on the restored instance
6. Repoint the application (env var change + function redeploy)
7. Reconcile: payment gateway transactions vs payments table for the gap window
8. Replay: webhook_dead_letters and unprocessed scheduled_messages
9. Unfreeze; post-incident review within 5 business days
```

## 3. Service-outage plan (graceful degradation)

Design principle: **a dependency failure must degrade a feature, never the whole app.**

| Dependency down | Required app behaviour | Status today |
|---|---|---|
| AI Gateway | Hide/disable AI affordances; show a clear message; `ai-maintenance-triage` already falls back to safe defaults | Partial — implement a shared `aiAvailable` flag |
| Email (Resend) | Queue the message, retry with backoff, surface a clipboard fallback for invites (already used for unverified domains) | Partial |
| Payment gateway | Show gateway-specific outage notice; allow cash/bank recording to continue; never lose the invoice | Partial |
| Realtime | Fall back to polling refetch (TanStack Query `refetchInterval`) | To implement |
| Storage | Disable uploads with a clear message; keep text CRUD working | To implement |
| Partner webhooks | Already durable: attempts + dead letters + replay | ✅ |

## 4. Zero-credit contingency plan (Lovable-specific)

Trigger: workspace credit balance falls below a defined floor.

| Threshold | Action |
|---|---|
| 40% remaining | Alert the owner; review the usage page; pause non-essential AI features |
| 20% remaining | Freeze build-mode work; take an immediate fresh full backup (DB + storage + auth); set AI features to degraded mode |
| 10% remaining | Executive decision: top up, or begin the accelerated exit in Document 13; notify customers of a possible maintenance window |
| 0% | **Cloud services pause shortly after.** No export is possible from a paused project — recovery depends entirely on backups taken earlier |

Standing mitigations (implement now, independent of migration):
1. **Customer-owned backups on a schedule** — the only real protection. Without them a zero-credit pause is an unbounded outage.
2. Credit-balance monitoring with alerting to the owner and a named deputy.
3. A funded floor: keep a balance covering at least 30 days of expected consumption.
4. Circuit breakers: treat AI `402`/`403` as a persisted paused state checked by every background job entry point (per the gateway error contract), so a credit shortfall never turns into a retry storm.
5. A rehearsed standby target (staging on the destination platform) that can be promoted.

## 5. Data-retention strategy

| Class | Tables / buckets | Retention | Deletion method |
|---|---|---|---|
| Financial records | `payments`, `invoices`, `saas_subscription_invoices`, `vendor_payments` | 7 years (statutory) | Archive, never hard-delete |
| Contracts | `leases`, `lease_attachments`, `lease-documents`, `signatures` | 7 years after lease end | Archive |
| Identity / KYC | `verification_documents`, `verification-documents` bucket | Delete 90 days after verification decision | Hard delete + audit record |
| Tenant PII | `tenants`, `profiles`, `messages` | Duration of relationship + 24 months | Anonymise |
| Guest PII | `bookings`, guest fields | 24 months after checkout | Anonymise |
| Operational logs | `audit_events`, `platform_audit_events`, `security_audit_events`, `api_request_events` | 24 months (security), 12 months (API) | Partition drop |
| Webhook telemetry | `webhook_delivery_attempts`, `webhook_dead_letters` | 90 days | Purge job |
| Analytics snapshots | `platform_*_snapshots`, `usage_snapshots` | 24 months | Purge job |
| Marketing/CRM | `leads`, `crm_*` | 36 months of inactivity | Anonymise |

Implement as pg_cron purge jobs with an audit trail; add subject-access-request and erasure runbooks.

## 6. Backup schedule (target state)

| Asset | Frequency | Retention | Location | Restore test |
|---|---|---|---|---|
| DB logical full | Daily 02:00 UTC | 30 d | Customer bucket, region A | Monthly |
| DB PITR/WAL | Continuous | 7–35 d | Provider | Quarterly |
| DB weekly archive | Weekly | 12 months | Region B, immutable | Quarterly |
| `auth` schema | Daily | 30 d | Encrypted, restricted bucket | Monthly |
| Storage full mirror | Weekly | 30 d | Region B | Monthly (sampled) |
| Storage incremental | Daily | 30 d | Region B | — |
| Secrets inventory (names + owners, no values) | On change | Indefinite | Password manager | — |
| Code | Every push | Indefinite | GitHub + mirror | — |

Backup verification is mandatory: an unrestored backup does not count. Record every restore test in `docs/ops/`.

## 7. Roles and communications

| Role | Responsibility |
|---|---|
| Incident Commander | Declares severity, owns the timeline and the decision to roll back |
| Database Lead | Restores, validates, reconciles |
| Platform Lead | Functions, DNS, hosting, secrets |
| Security Lead | Secret rotation, forensics, breach assessment |
| Comms Lead | Status page, customer email, tenant-facing notice |

Severity: **SEV1** total outage or data loss (page immediately, 15-min updates) · **SEV2** major feature down (1-h updates) · **SEV3** degraded (daily) · **SEV4** cosmetic.

## 8. Continuity test calendar

| Test | Frequency |
|---|---|
| Restore latest DB backup into a scratch instance + run `test:rls` | Monthly |
| Storage restore sample (100 objects, checksum verified) | Monthly |
| Full DR game day (restore + repoint + smoke in the standby target) | Quarterly |
| Zero-credit tabletop exercise | Quarterly, until exit completes |
| Secret-rotation drill | Semi-annually |
| Payment-gateway outage simulation | Semi-annually |
