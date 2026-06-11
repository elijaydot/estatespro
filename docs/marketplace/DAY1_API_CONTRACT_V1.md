# FishGate Marketplace and CRM API Contract v1

## Purpose

This document defines the Day 1 API contract baseline for the marketplace and lead CRM foundation.

## Conventions

1. Base path: /v1
2. Auth model:
- Public endpoints: anonymous access via API gateway and anti-bot controls.
- Internal endpoints: authenticated user with company-scoped RBAC.
3. Idempotency:
- POST /public/inquiries requires Idempotency-Key header.
4. Envelope:
- Success: { data, meta }
- Error: { error: { code, message, details } }

## Public Marketplace Endpoints

### GET /public/listings

Query parameters:
- city
- area
- min_rent
- max_rent
- bedrooms
- bathrooms
- page (default 1)
- page_size (default 20, max 50)

Response data item:
- id
- slug
- title
- city
- area
- rent_amount
- currency
- bedrooms
- bathrooms
- cover_image_url
- available_from
- verification_state
- published_at

### GET /public/listings/{listingId}

Response data:
- Listing summary fields from list endpoint.
- description
- amenities
- images
- company: { id, name, logo_url }
- manager_profile: { display_name, response_sla_minutes }

### GET /public/companies/{slug}

Response data:
- id
- name
- slug
- logo_url
- verification_state
- active_listings_count

### POST /public/inquiries

Headers:
- Idempotency-Key: required

Request body:
- listing_id: string (uuid)
- full_name: string
- phone_e164: string
- email: string | null
- message: string | null
- move_in_date: string (date) | null
- budget_min: number | null
- budget_max: number | null
- consent_marketing: boolean

Response data:
- inquiry_id
- lead_id
- status

Error codes:
- inquiry_rate_limited
- inquiry_duplicate_request
- listing_not_available
- inquiry_blocked_risk

## Listing Management Endpoints

### POST /listings

Request body:
- company_id
- property_id
- unit_id
- title
- description
- rent_amount
- currency
- bedrooms
- bathrooms
- city
- area
- available_from

Response data:
- id
- status

### PATCH /listings/{listingId}

Request body:
- Any mutable listing field.

Response data:
- id
- status
- updated_at

### POST /listings/{listingId}/publish

Request body:
- publish_notes: string | null

Response data:
- id
- status: live | pending_review | blocked
- published_at

### POST /listings/{listingId}/pause

Request body:
- reason: string | null

Response data:
- id
- status

## CRM Endpoints

### GET /crm/leads

Query parameters:
- company_id
- stage
- assigned_to
- score_min
- page
- page_size

Response lead item:
- id
- listing_id
- stage
- status
- priority
- score
- assigned_to
- last_activity_at

### PATCH /crm/leads/{leadId}

Request body:
- stage
- status
- priority
- lost_reason

Response data:
- id
- stage
- status
- updated_at

### POST /crm/leads/{leadId}/activities

Request body:
- activity_type: call | sms | whatsapp | email | note | viewing
- payload: object
- occurred_at

### POST /crm/leads/{leadId}/tasks

Request body:
- task_type
- owner_user_id
- due_at
- notes

### POST /crm/leads/{leadId}/assign

Request body:
- assignee_user_id
- reason

### POST /crm/leads/{leadId}/convert

Request body:
- tenant_payload
- lease_payload

Response data:
- lead_id
- tenant_id
- lease_id
- status

## Moderation and Risk Endpoints

### POST /moderation/cases

Request body:
- entity_type: listing | inquiry | publisher
- entity_id
- reason_code
- severity
- evidence

### PATCH /moderation/cases/{caseId}

Request body:
- state
- assigned_moderator
- resolution_notes

### POST /risk/evaluate-listing

Request body:
- listing_id

Response data:
- decision: allow | review | block
- score
- reasons

### POST /risk/evaluate-inquiry

Request body:
- inquiry_payload

Response data:
- decision: allow | review | block
- score
- reasons

## RBAC Notes

1. Company owners can read and manage all listings and leads in owned companies.
2. Approved company members can read company listings and leads.
3. Approved property managers can manage listings and leads based on company scope.
4. Public endpoints are never direct table access from clients.

## Day 1 Exit Conditions

1. Endpoint shapes are frozen for implementation.
2. Error code list is accepted by frontend and QA.
3. Idempotency and RBAC behavior are agreed before coding handlers.
