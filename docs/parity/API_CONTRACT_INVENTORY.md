# API and Edge Contract Inventory (Wave 1)

## Purpose
Baseline inventory of externally meaningful contracts to support versioning, compatibility, and integration planning.

Related policy:
- docs/parity/API_VERSIONING_POLICY.md

## Contract Policy (Initial)
1. Backward-compatible changes only in minor revisions.
2. Breaking changes require explicit version bump and migration notes.
3. Every contract should define: auth requirements, idempotency behavior, error model, correlation ID behavior.

## Critical Edge Function Contracts

### Payments and Checkout
- Endpoint: supabase/functions/payment-checkout
  - Responsibility: initialize checkout session and route payment gateway flow.
  - Inputs (core): source, paymentMethod, amount, currency, gateway, callbackUrl, correlationId.
  - Outputs (core): success, checkoutUrl, reference, gateway, invoiceId, correlationId.
  - Error envelope (core): success=false, error, errorCode, correlationId.

- Endpoint: supabase/functions/verify-payment
  - Responsibility: verify provider payment and persist authoritative state transition.
  - Inputs (core): gateway, reference, bookingToken|invoiceId, correlationId, test_mode.
  - Outputs (core): success, verified, source, paymentId, alreadyProcessed, amount, correlationId.
  - Error envelope (core): success=false, error, errorCode, correlationId.
  - Webhook runtime: emits `payment.verified` envelope (`v1.0`) and persists delivery attempts/dead-letter outcomes.

- Endpoint: supabase/functions/send-payment-confirmation
  - Responsibility: transactional confirmation messaging for successful payment events.

### Booking and Guest Flow
- Endpoint: supabase/functions/shortlet-booking-email
  - Responsibility: guest booking notifications, tokenized actions, and booking payment link flow.

### Tenant and Invite Lifecycle
- Endpoint: supabase/functions/send-tenant-invite
  - Responsibility: tenant invitation dispatch with branded messaging.

- Endpoint: supabase/functions/accept-tenant-invite
  - Responsibility: invite acceptance and tenant account linking.

- Endpoint: supabase/functions/invite-token
  - Responsibility: invite token validation and consumption workflow.

### CRM and Marketplace
- Endpoint: supabase/functions/marketplace-public
  - Responsibility: public listing retrieval and marketplace visibility path.

- Endpoint: supabase/functions/send-broadcast
  - Responsibility: scoped audience broadcast and notification fanout.

### Document/Communication Support
- Endpoint: supabase/functions/generate-invoice-pdf
- Endpoint: supabase/functions/generate-lease-pdf
- Endpoint: supabase/functions/send-lease-email
- Endpoint: supabase/functions/send-maintenance-notification
- Endpoint: supabase/functions/send-exit-summary

### AI Assistant Capabilities
- Endpoint: supabase/functions/ai-chat
- Endpoint: supabase/functions/ai-document-intelligence
- Endpoint: supabase/functions/ai-predictive-analytics
- Endpoint: supabase/functions/ai-smart-search
- Endpoint: supabase/functions/ai-suggest-reply
- Endpoint: supabase/functions/ai-tenant-chatbot

## Required Next Actions for Each Contract
1. Add explicit request/response schema (TS or JSON schema).
2. Define deterministic error codes and status mapping.
3. Document idempotency keys and duplicate handling behavior.
4. Add contract smoke tests for happy path and top failure path.
5. Attach observability fields (correlation_id, actor, company_id where applicable).
6. For webhook-capable contracts, define signature scheme, retry policy, and dead-letter behavior.

## Owner Mapping (Proposed)
1. Payment contracts: Backend + Billing owner.
2. Booking/Invite contracts: Backend + Product owner.
3. Marketplace/CRM contracts: Platform + CRM owner.
4. AI contracts: AI Platform owner.

## Exit Criteria (Wave 1)
1. Schemas published for all payment and invite contracts first.
2. Contract test coverage for payment-checkout and verify-payment merged.
3. Compatibility policy approved and linked in release checklist.

## Webhook Replay and Operations
- Dead-letter entries are stored in `webhook_dead_letters` for failed terminal deliveries.
- Delivery attempts are stored in `webhook_delivery_attempts` with retry metadata.
- Operational replay procedure reference: WEEK2_STAGING_RUNBOOK.md.
- Full staging webhook test playbook: docs/ops/WEBHOOK_STAGING_TEST_README.md.
