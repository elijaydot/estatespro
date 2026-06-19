# API Versioning and Compatibility Policy

## Scope
Applies to public APIs and externally consumed edge function contracts.

## Version Model
- Use date-stamped release notes plus semantic contract versions for request/response behavior.
- Contract versions follow `vMAJOR.MINOR` semantics:
  - MAJOR: breaking contract change.
  - MINOR: backward-compatible contract expansion.

## Change Classification

Backward-compatible (minor):
- Adding optional request fields.
- Adding response fields that clients can ignore.
- Expanding enum options only when clients are documented to handle unknown values.

Breaking (major):
- Removing or renaming fields.
- Tightening validation in a way that rejects previously valid requests.
- Changing response/error field names or types.
- Changing auth or idempotency requirements.

## Contract Requirements
Every contract must explicitly document:
1. Authentication and authorization requirements.
2. Idempotency behavior and duplicate request handling.
3. Error model and status mapping.
4. Correlation ID requirements and propagation behavior.
5. Retry safety and timeout expectations.

Webhook-capable contracts must additionally define:
1. Signature header format and verification rules.
2. Retry policy (status-code retry matrix, max attempts, backoff strategy).
3. Dead-letter escalation criteria and replay procedure.

## Release Process
1. Contract change proposal includes compatibility classification and migration impact.
2. Contract smoke tests updated before merge.
3. Release notes include endpoint-specific examples for added/changed fields.
4. For major changes:
- provide migration guide
- maintain old contract for at least one deprecation window
- publish cutoff date and rollback strategy

## Enforcement Hooks
- CI check blocks merge if contract inventory is not updated for contract-affecting changes.
- CI check blocks merge for breaking changes without major version and migration note.
- CI check blocks merge if webhook-capable endpoint changes are made without updating webhook policy guidance.
- Error envelope shape for payment pathways is standardized as:
  - `success` (boolean)
  - `error` (string for failures)
  - `errorCode` (stable programmatic code)
  - `correlationId` (trace identifier)

## Immediate Adoption Targets
1. payment-checkout
2. verify-payment
3. accept-tenant-invite
4. invite-token
