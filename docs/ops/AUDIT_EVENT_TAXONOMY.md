# Audit Event Taxonomy

## Purpose
This document defines a minimal taxonomy and payload contract for non-payment workflow audit events so monitoring and incident response can consume a stable shape.

## Envelope
Every record in `public.audit_events` should include:

1. `source`: service/workflow origin, e.g. `tenant_invites`, `maintenance_requests`.
2. `event_type`: dot-notated action name, e.g. `tenant.invite.created`.
3. `severity`: `info` | `warning` | `error` | `critical`.
4. `actor_user_id`: authenticated actor when available.
5. `entity_type`: logical entity, e.g. `tenant_invite`, `maintenance_request`.
6. `entity_id`: identifier of the affected entity.
7. `correlation_id`: request/workflow correlation identifier.
8. `details`: event-specific payload as JSON object.

## Naming Convention
Use `<domain>.<entity>.<action>`.

Examples:
- `tenant.invite.created`
- `tenant.invite.deleted`
- `company.pm_invite.created`
- `maintenance.request.created`
- `maintenance.request.status_changed`
- `maintenance.request.updated`

## Required Details By Event Type

### tenant.invite.created
- `tenant_id`
- `email`
- `expires_at`

### tenant.invite.deleted
- `tenant_id` (nullable)
- `email` (nullable)

### company.pm_invite.created
- `company_id`
- `email`
- `expires_at`

### maintenance.request.created
- `property_id`
- `unit_id`
- `tenant_id`
- `priority`
- `status`

### maintenance.request.status_changed
- `previous_status`
- `next_status`
- `previous_assigned_to`
- `next_assigned_to`
- `priority`

### maintenance.request.updated
- `previous_status`
- `next_status`
- `previous_assigned_to`
- `next_assigned_to`
- `priority`

## Alerting Mapping (Initial)

1. `warning` and above:
- Route to operations triage queue.

2. `error` and `critical`:
- Page on-call with correlation id and entity id.

3. `maintenance.request.status_changed` to blocked states:
- Create operational ticket when status enters `pending_vendor` or equivalent custom blocked state.

## Implementation Notes
- Event emission should be best-effort and must not block primary user workflow.
- Include `correlation_id` for every event to support cross-system debugging.
- New event types must be added to this document before rollout.
