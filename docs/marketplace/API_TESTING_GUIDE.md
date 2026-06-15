# Marketplace API Testing Guide

## Recommendation

Use Postman first for smoke tests.
Use Swagger/OpenAPI for contract review and quick manual calls.

You do not need local Supabase CLI for either option.

## Artifacts

1. OpenAPI spec: [docs/marketplace/openapi.marketplace.v1.yaml](docs/marketplace/openapi.marketplace.v1.yaml)
2. Postman collection: [docs/marketplace/postman/FishGate_Marketplace_Day2.postman_collection.json](docs/marketplace/postman/FishGate_Marketplace_Day2.postman_collection.json)

## Fastest path (Postman)

1. Import collection file.
2. Set variables:
- baseUrl
- listingId
- listingIdOrSlug
- idempotencyKey
3. Run requests in this order:
- Public Listings - List
- Public Listings - Detail
- Inquiry - Create
- Inquiry - Idempotency Replay

If you have no live listings yet, run:
- [docs/marketplace/SEED_TEST_LISTING.sql](docs/marketplace/SEED_TEST_LISTING.sql)

Then copy values from the verification query:
- listingId = id
- listingIdOrSlug = slug (or id)

Expected:
- List returns 200
- Detail returns 200 for live listing
- Inquiry create returns 201 first call
- Idempotency replay returns 200 with reused=true

Important:
- If you reuse an existing Idempotency-Key from earlier runs, the first request in your current session can return 200 with reused=true.
- To force the full create-then-replay sequence, set a brand new idempotencyKey before running the two inquiry requests.

## Swagger/OpenAPI usage

1. Open Swagger Editor at https://editor.swagger.io/
2. Paste file content from [docs/marketplace/openapi.marketplace.v1.yaml](docs/marketplace/openapi.marketplace.v1.yaml)
3. Use Try it out for each endpoint.

Notes:
- For marketplace-inquiry, always provide Idempotency-Key.
- Use a live listing id/slug for detail and inquiry calls.

## If a call fails

1. 404 on detail/inquiry:
- Listing might not be live.

2. 429:
- Rate limit triggered; wait and retry.

3. 500:
- Confirm SQL migrations were applied in correct order.
- Confirm both edge functions deployed with latest code.

## What to share back

Send these results so implementation can continue:

1. HTTP status and body for each request.
2. Any error text from failed calls.
3. The listing id/slug used for testing.
