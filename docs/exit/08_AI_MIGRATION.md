# Document 8 — AI Migration Guide

## 1. AI inventory (measured)

All AI runs server-side in edge functions. **Zero AI calls originate in the browser.** Every function calls the same endpoint with the same model:

- Endpoint: `POST https://ai.gateway.lovable.dev/v1/chat/completions`
- Auth: `Authorization: Bearer ${LOVABLE_API_KEY}`
- Model: **`google/gemini-3-flash-preview`** (9 of 9 functions)
- Wire format: **OpenAI-compatible chat completions**, including OpenAI-style `tools` / `tool_choice` function calling

| # | Function | Purpose | Auth | Quota debit (`enforceAiCreditQuota`) | Output shape |
|---|---|---|---|---|---|
| 1 | `ai-chat` | General assistant for operators | JWT | yes | streamed/plain text |
| 2 | `ai-tenant-chatbot` | Tenant-facing Q&A in the portal | JWT (tenant) | yes | text |
| 3 | `ai-smart-search` | Natural-language search over portfolio data | JWT | yes | markdown (rendered via `react-markdown`, XSS-hardened) |
| 4 | `ai-suggest-reply` | 3 suggested replies in messaging | JWT | 1 credit | tool call `suggest_replies` → `{suggestions: string[]}`; hardcoded fallback on parse failure |
| 5 | `ai-maintenance-triage` | Priority/urgency classification | JWT (`getClaims`) | 2 credits | tool call `triage_request` → `{suggested_priority, urgency_category, reasoning, estimated_response_time}`; safe defaults on failure |
| 6 | `ai-generate-description` | Property/unit listing copy | JWT (`getUser`) | 2 credits | plain text |
| 7 | `ai-financial-insights` | Financial analysis | JWT | yes | **strict JSON** (system prompt forbids markdown) |
| 8 | `ai-predictive-analytics` | Forecasting (occupancy/arrears trends) | JWT | yes | JSON |
| 9 | `ai-document-intelligence` | Document extraction/summarisation | JWT | yes | JSON/text |

Cross-cutting behaviour in all nine: `handleCorsPreflight` → `checkRateLimit(req, {limit: 40, windowMs: 60_000})` → JWT verification → `enforceAiCreditQuota` (`supabase/functions/_shared/saas-quota.ts`, ties AI usage to `saas_usage_counters`/`saas_usage_events`) → gateway call → explicit 429/402 pass-through → `jsonResponse`. Enforced by `tests/week4/ai-edge-functions.test.ts`, which asserts the ordering limiter → auth → provider.

### 1.1 What is NOT present (important, and good news)
- ❌ No RAG pipeline
- ❌ No embeddings, no `pgvector`, no vector store
- ❌ No persistent conversation memory table (context is assembled per request from the caller's payload)
- ❌ No fine-tuned or custom models
- ❌ No image/audio generation, no TTS/STT

**Consequence: the AI layer is the *cheapest* component to migrate in the entire platform** — no data to move, no index to rebuild.

## 2. Current prompts (verbatim system prompts, for portability)

| Function | System prompt |
|---|---|
| `ai-generate-description` | "You are a professional real estate copywriter. Write engaging, accurate property descriptions." |
| `ai-maintenance-triage` | "You are a maintenance triage expert for property management. Analyze maintenance requests and categorize them." |
| `ai-suggest-reply` | "You are a professional property management assistant. Generate 3 short suggested replies for the property manager to respond to tenant messages. Be professional, helpful, and concise. Return a JSON array of 3 strings." |
| `ai-financial-insights` | "You are a property management financial analyst. Always respond with valid JSON only, no markdown or code blocks." |
| `ai-chat`, `ai-tenant-chatbot`, `ai-smart-search`, `ai-predictive-analytics`, `ai-document-intelligence` | See each `index.ts`; prompts are inline and must be lifted verbatim into `_shared/prompts.ts` during migration (Step 1 below) |

User-prompt templates (e.g. the property/unit description templates in `ai-generate-description`) are string-interpolated inline and must move with them.

## 3. Per-feature migration specification

Template applied to all nine; the only per-feature variance is the tool schema and expected output.

| Field | Value |
|---|---|
| **Existing workflow** | Client → `supabase.functions.invoke('<fn>')` → CORS/rate-limit → JWT → quota → gateway → parse → JSON response → TanStack Query cache → UI |
| **Orchestration** | Single-turn. No agent loop, no multi-step tool execution (tools are used only to force structured output) |
| **Required inputs** | Function-specific JSON body (see `_shared` contracts and each `index.ts`), plus a bearer JWT |
| **Required outputs** | Text, markdown, strict JSON, or a single tool call payload; all functions must retain their existing fallback defaults |
| **Migration approach** | Replace only the transport: base URL, auth header, model id. Message array, tools, and tool_choice remain OpenAI-shaped for options A/B/C-via-shim/D-via-shim |

### 3.1 Token and cost estimation

Per-call estimates (measure against real logs to confirm — **MANUAL REVIEW REQUIRED** for actual call volumes, which are recorded in `saas_usage_events`):

| Function | Input tok | Output tok | Est. calls/mo (1k active units) |
|---|---|---|---|
| `ai-suggest-reply` | 600 | 150 | 3,000 |
| `ai-maintenance-triage` | 400 | 200 | 1,500 |
| `ai-generate-description` | 350 | 400 | 500 |
| `ai-smart-search` | 900 | 500 | 2,000 |
| `ai-chat` | 1,500 | 700 | 2,500 |
| `ai-tenant-chatbot` | 1,200 | 500 | 4,000 |
| `ai-financial-insights` | 2,500 | 800 | 600 |
| `ai-predictive-analytics` | 3,000 | 900 | 400 |
| `ai-document-intelligence` | 4,000 | 800 | 300 |
| **Total** | **≈ 34 M input tok/mo** | **≈ 8 M output tok/mo** | **≈ 14,800 calls/mo** |

Indicative monthly cost at those volumes (list prices, verify before commit):

| Provider / model | Est. monthly |
|---|---|
| Google Gemini Flash (direct API) — closest to today | **$10–25** |
| OpenAI `gpt-5.x` mini/flash-class | $25–60 |
| Azure OpenAI (same class, PTU off, pay-go) | $30–70 |
| Anthropic Claude Haiku-class | $25–55 |
| Anthropic Claude Sonnet-class (quality upgrade) | $150–350 |

AI is a **low-cost, low-risk** line item; do not let it drive platform selection.

## 4. Provider options

### Option A — Azure OpenAI
- Endpoint per deployment; `api-key` header; model = deployment name; `api-version` query param.
- **Pros**: EU data residency, private networking, enterprise agreements, content filtering.
- **Cons**: deployment/quota management overhead; tool-calling schema is OpenAI-compatible (easy), but the URL shape differs from the standard OpenAI path — the shim handles it.

### Option B — OpenAI API *(simplest drop-in)*
- Change base URL to `https://api.openai.com/v1`, header to `Authorization: Bearer ${OPENAI_API_KEY}`, model to an OpenAI id. **The rest of every one of the nine functions is unchanged**, including `tools`/`tool_choice`.
- Effort: **~2 hours total** with the shim in place.

### Option C — Anthropic Claude
- Different wire format (`/v1/messages`, `system` as a top-level field, `tools` with `input_schema`, `max_tokens` required).
- Requires a translation adapter in the shim (~150 LOC) — worth it only if Claude quality is desired for `ai-document-intelligence` / `ai-financial-insights`.

### Option D — Google Gemini direct
- Either the OpenAI-compatibility endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`) — drop-in like Option B — or the native `generateContent` API.
- **Preserves today's exact model family**, so prompt behaviour and output shapes are least likely to regress. **Recommended default.**

## 5. Provider-independent target architecture

Create `supabase/functions/_shared/ai-provider.ts`:

```ts
// Single seam. Every AI function imports chatCompletion() and nothing else.
export type ChatRequest = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  tools?: unknown[];
  tool_choice?: unknown;
  maxOutputTokens?: number;
  temperature?: number;
};

type Provider = "gemini" | "openai" | "azure" | "anthropic" | "lovable";

const PROVIDER = (Deno.env.get("AI_PROVIDER") ?? "lovable") as Provider;
const MODEL    = Deno.env.get("AI_MODEL")    ?? "google/gemini-3-flash-preview";

export async function chatCompletion(req: ChatRequest): Promise<{
  text: string;
  toolArguments?: Record<string, unknown>;
  raw: unknown;
}> {
  const { url, headers, body } = buildRequest(PROVIDER, MODEL, req); // per-provider adapter
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new AiGatewayError(res.status, await res.text()); // preserve 402/429 semantics
  return normalise(PROVIDER, await res.json());                        // uniform output shape
}
```

Migration steps:
1. Lift all system/user prompt templates into `_shared/prompts.ts` (single place to review, version and A/B).
2. Add `_shared/ai-provider.ts` with adapters for `lovable`, `gemini`, `openai`, `azure`, `anthropic`.
3. Refactor each of the nine functions to call `chatCompletion()` — delete the inline `fetch` blocks. Keep the existing rate-limit, quota, error-status and fallback code untouched.
4. Set `AI_PROVIDER=lovable` initially → zero behaviour change, deploy, verify all nine.
5. At cutover flip `AI_PROVIDER=gemini` (+ `GEMINI_API_KEY`) — no code deploy required.
6. Keep an `AI_FALLBACK_PROVIDER` for automatic failover on 5xx.

Error-contract requirements to preserve in the shim: **only 429 and 5xx are retryable** (bounded backoff, honour `Retry-After`); 400/401/402/403 are terminal and must be surfaced to the UI, never masked as a generic 500. Background/batch AI work must treat 402/403 as circuit breakers.

## 6. Migration checklist

- [ ] Extract prompts to `_shared/prompts.ts` (9 functions)
- [ ] Implement `_shared/ai-provider.ts` with 5 adapters + normalised tool-call output
- [ ] Refactor 9 functions to the shim; keep quota/rate-limit ordering (guarded by `tests/week4/ai-edge-functions.test.ts`)
- [ ] Add golden-output regression tests: 3 fixtures per function, asserting shape not wording
- [ ] Provision target provider key as a secret (`GEMINI_API_KEY` / `OPENAI_API_KEY` / `AZURE_OPENAI_*`)
- [ ] Shadow-run: 48 h dual-call in staging comparing Lovable vs target outputs on the structured functions (`triage`, `suggest_replies`, `financial-insights`)
- [ ] Flip `AI_PROVIDER`; monitor error rates, latency p95, and cost for 7 days
- [ ] Decommission `LOVABLE_API_KEY`
