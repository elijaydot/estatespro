# Document 7 — Storage Migration Guide

## 1. Bucket inventory (derived from migrations and application code)

| # | Bucket | Contents | Public? | Path convention | Consumers |
|---|---|---|---|---|---|
| 1 | `property-images` | Property/unit galleries, up to 10 photos per entity, room labels | Public read (project convention) | `<auth.uid()>/…` folder-level ownership | `Properties`, `PropertyDetail`, `Units`, marketplace listings |
| 2 | `company-logos` | Branding on invoices, leases, emails | Public read | company-scoped | Settings, PDF generators, email templates |
| 3 | `avatars` | User profile images | Public read (documented as intentional in security memory) | `<auth.uid()>/…` | Profile settings, messaging |
| 4 | `lease-documents` | Generated lease PDFs | **Private** (created `public=false`) | lease/company scoped | `generate-lease-pdf`, `send-lease-email` |
| 5 | `lease-attachments` | Uploaded lease annexes | **Private** | `useLeaseAttachments`, `LeaseAttachments.tsx` | Leases |
| 6 | `signatures` | E-signature images | **Private** (created `public=false`) | lease scoped | Lease e-signature workflow |
| 7 | `maintenance-photos` | Tenant/PM issue photos | **Private**, folder ownership enforced (hardened) | `<auth.uid()>/…` | Maintenance, tenant portal |
| 8 | `message-attachments` | Chat file attachments | **Private** | thread/user scoped | `MessagesPageV2`, `message_attachments` |
| 9 | `tenant-exit-inventory` | Move-in/move-out inventory photos | **Private** | tenant/exit scoped | `TenantInventoryBaseline`, `TenantExitWorkflow`, `InventoryPhotoUploader` |
| 10 | `verification-documents` | Publisher/landlord KYC documents | **Private, highest sensitivity** | publisher scoped | `MarketplaceVerification`, reviewer queue |
| 11 | `crm-documents` | CRM deal/contract documents | **Private** | company/CRM scoped | `MarketplaceCrmDocuments` |
| 12 | `vendor-documents` | Vendor contracts, insurance, compliance | **Private** | company/vendor scoped | `Vendors`, `VendorDetail` |

Object counts, total bytes, and per-bucket `file_size_limit` / `allowed_mime_types`: **MANUAL REVIEW REQUIRED** (live Storage API needed).

Access pattern: private buckets are read through **signed URLs** (`useSignedUrl` hook) generated client-side with the user's JWT; RLS on `storage.objects` enforces `bucket_id` + folder ownership.

## 2. Migration process (provider-agnostic)

```text
1. Enumerate    → for each bucket: list objects (paginated, service-role), write manifest.jsonl
                  {bucket, name, size, etag/md5, content_type, created_at, last_accessed_at}
2. Verify       → manifest row count == storage.objects row count per bucket
3. Transfer     → stream download → upload to target, preserving the exact key path
                  (parallelism 8–16; resumable; retry with backoff on 5xx)
4. Reconcile    → per object: size + checksum match; produce failures.jsonl; re-run until empty
5. Re-point     → application: swap the storage client; keep identical key paths so no DB column changes
6. Re-policy    → recreate access rules (Section 4)
7. Dual-read    → for 2 weeks, fall back to source on 404 (only feasible while source is alive)
8. Freeze       → source bucket set read-only at T-0; delta re-sync after freeze
```

**Key rule: never rewrite object paths.** Paths are embedded in `lease_attachments`, `listing_media`, `verification_documents`, `crm_documents`, `vendor_documents`, `message_attachments`, `exit_inspection_items` and property/unit image arrays. Preserving keys reduces the migration to a byte copy.

## 3. Target options

### Option A — Supabase Storage on the self-owned project *(recommended)*
- **Bucket mapping**: 1:1, identical names and paths.
- **Policies**: the existing `bucket_id = '<name>'` RLS statements in the migrations replay unchanged.
- **Code change**: **none** (`supabase.storage.from(...)`, `useSignedUrl` unchanged).
- **CDN**: Supabase serves through a CDN with image transformations available.
- **Cost**: ~$0.021/GB-month storage + ~$0.09/GB egress (indicative).
- **Effort**: 2–4 days including transfer.

### Option B — Azure Blob Storage
- **Mapping**: 1 container per bucket; keys become blob names.
- **Security**: private containers + user-delegation SAS (short-lived, replaces signed URLs); Entra RBAC for service principals; encryption with CMK in Key Vault; soft delete + versioning on.
- **Policy translation**: Postgres RLS on `storage.objects` has **no equivalent** — folder-ownership enforcement must move into an API layer (an Azure Function that checks the JWT and the DB, then mints the SAS). This is the main cost.
- **CDN**: Azure Front Door / CDN with SAS-aware caching for public buckets only.
- **Cost**: Hot LRS ~$0.018/GB-mo + $0.0044/10k reads + egress.
- **Effort**: 2–3 weeks (mostly the SAS-broker service and `useSignedUrl` rewrite).

### Option C — AWS S3
- **Mapping**: one bucket per current bucket (or one bucket, prefix per current bucket — preferred for lifecycle simplicity).
- **Security**: Block Public Access on all private buckets; presigned URLs from a Lambda broker; SSE-KMS; bucket policies + IAM roles; Object Lock for `verification-documents` retention.
- **CDN**: CloudFront + OAC; signed cookies/URLs for private content.
- **Cost**: $0.023/GB-mo Standard + requests + egress ($0.085/GB, cheaper via CloudFront).
- **Effort**: 2–3 weeks (same broker pattern as Azure).

### Option D — Cloudflare R2
- **Mapping**: one bucket per current bucket, S3-compatible API (`aws-sdk` works).
- **Security**: presigned URLs via Workers; bucket-level tokens; no public access unless attached to a custom domain.
- **CDN**: **zero egress fees** and Cloudflare's edge network — the strongest cost story for image-heavy `property-images`.
- **Cost**: $0.015/GB-mo, **$0 egress**, Class A/B operation fees.
- **Effort**: 2–3 weeks (Worker-based signing broker).

### Option E — Google Cloud Storage
- **Mapping**: 1 bucket per bucket; signed URLs via service account.
- **Security**: uniform bucket-level access + IAM; CMEK.
- **CDN**: Cloud CDN.
- **Cost**: $0.020/GB-mo + egress.
- **Effort**: 2–3 weeks. No advantage over B/C/D given no other GCP usage.

### Comparison

| | A Supabase | B Azure | C S3 | D R2 | E GCS |
|---|---|---|---|---|---|
| Code changes | **None** | High | High | High | High |
| RLS-equivalent authorisation | **Native** | Broker service required | Broker required | Broker required | Broker required |
| Egress cost | Medium | Medium | Medium | **Zero** | Medium |
| Effort | **2–4 d** | 2–3 wk | 2–3 wk | 2–3 wk | 2–3 wk |

## 4. Security design for non-Supabase targets

If Options B/C/D/E are chosen, implement a single **Storage Access Broker**:

```text
Client ──JWT──▶ /storage/sign  (edge function)
                 ├── verify JWT
                 ├── resolve principal → user_id / tenant_id / company_id
                 ├── SELECT authz check against the same predicates used in the RLS policy
                 └── return short-lived (≤300s) presigned URL, single-object scope
```
Rules: never issue bucket-wide or write-capable URLs to browsers for private buckets; log every signing event to `audit_events`; rate-limit per user; keep `verification-documents` signing behind an additional reviewer-role check and a step-up (MFA) requirement.

## 5. CDN strategy

- Public buckets (`property-images`, `company-logos`, `avatars`): long `Cache-Control` (`public, max-age=31536000, immutable`) with content-hashed keys; serve through CDN.
- Private buckets: `Cache-Control: private, no-store`; never cached at the edge.
- Add responsive image variants for `property-images` (marketplace is the highest-traffic public surface) — currently full-size originals are served, which is a performance gap worth fixing during migration.

## 6. Validation checklist

- [ ] Object count parity per bucket (source vs target)
- [ ] Byte-size and checksum parity for a 100% sample of private buckets, 10% of public buckets
- [ ] Signed-URL expiry behaviour verified (expired URL returns 403)
- [ ] Cross-tenant access attempt returns 403 for each of the 9 private buckets
- [ ] Lease PDF generate → store → email → download round-trip
- [ ] Marketplace listing images render on `/rent/:citySlug`
- [ ] Tenant uploads a maintenance photo and only their company's PM can see it
