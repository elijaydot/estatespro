import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const apiBase = `${import.meta.env.VITE_SUPABASE_URL || 'https://<project>.supabase.co'}/functions/v1/fishgate-api`;

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-slate-950 px-5 py-8 text-white sm:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-amber-400">FishGate Developer Platform</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Public API v1</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Integrate property operations, Marketplace, and CRM data through company-scoped bearer keys.</p>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[15rem_1fr] lg:px-10">
        <nav className="space-y-2 text-sm lg:sticky lg:top-6 lg:self-start" aria-label="API guides">
          {['getting-started', 'authentication', 'rate-limits', 'pagination', 'errors', 'webhooks', 'changelog'].map((id) => <a key={id} href={`#${id}`} className="block border-l-2 border-slate-200 px-3 py-1.5 capitalize text-slate-600 hover:border-blue-600 hover:text-blue-700">{id.replace('-', ' ')}</a>)}
        </nav>
        <div className="min-w-0 space-y-10">
          <article id="getting-started" className="space-y-3"><h2 className="text-2xl font-bold">Getting started</h2><p>Request an API key from your FishGate account representative. Send it as a bearer credential and begin with a read request:</p><pre className="overflow-x-auto bg-slate-950 p-4 text-sm text-slate-100"><code>{`curl "${apiBase}/v1/properties?per_page=20" \\\n  -H "Authorization: Bearer fg_live_your_key"`}</code></pre><p>Full-tier partners can write Property Management, Marketplace, and CRM resources. Every POST and PATCH request requires an <code>Idempotency-Key</code> header.</p></article>
          <article id="authentication" className="space-y-3"><h2 className="text-2xl font-bold">Authentication</h2><p>Keys begin with <code>fg_live_</code> or <code>fg_test_</code>. FishGate stores only a SHA-256 hash. Revocation takes effect on the next request. For zero-downtime rotation, create a new key, deploy it to the integration, confirm traffic, then revoke the old key.</p></article>
          <article id="rate-limits" className="space-y-3"><h2 className="text-2xl font-bold">Rate limits and tiers</h2><p>Limited keys can call documented read endpoints. Full keys can also access Full-only resources and writes. Responses include <code>X-RateLimit-Remaining</code> and <code>X-RateLimit-Reset</code>. On <code>429</code>, wait for <code>Retry-After</code> seconds and retry with exponential backoff.</p></article>
          <article id="pagination" className="space-y-3"><h2 className="text-2xl font-bold">Pagination, filtering, and sorting</h2><p>Collections use <code>page</code> and <code>per_page</code> (maximum 100), status filters use <code>filter[status]</code>, and descending sort fields begin with <code>-</code>. Every collection response reports <code>total</code> and <code>has_more</code>.</p></article>
          <article id="errors" className="space-y-3"><h2 className="text-2xl font-bold">Errors</h2><p>All errors use the standard envelope. Common codes are <code>invalid_api_key</code>, <code>scope_denied</code>, <code>upgrade_required</code>, <code>validation_failed</code>, <code>not_found</code>, <code>conflict</code>, <code>quota_exceeded</code>, <code>rate_limit_exceeded</code>, and <code>internal_error</code>. Quote <code>meta.request_id</code> when contacting support.</p></article>
          <article id="webhooks" className="space-y-3"><h2 className="text-2xl font-bold">Webhooks</h2><p>Full-tier integrations can receive <code>lease.signed</code>, <code>payment.received</code>, <code>lead.converted</code>, and <code>listing.published</code>. Verify <code>x-webhook-signature</code> against <code>{'${timestamp}.${rawBody}'}</code> with HMAC-SHA256 before parsing the body. Delivery IDs are stable across retries, so receivers should process <code>event_id</code> idempotently.</p></article>
          <article id="changelog" className="space-y-3"><h2 className="text-2xl font-bold">Changelog</h2><p><strong>2026-08-12:</strong> Initial v1 Property Management, Marketplace, and CRM read/write surface. Breaking deprecations will be announced at least 90 days in advance and responses will include <code>Deprecation</code> and <code>Sunset</code> headers.</p></article>
        </div>
      </section>

      <section className="border-t border-slate-200 px-2 py-8 sm:px-6" aria-label="API reference">
        <SwaggerUI url="/openapi.json" deepLinking displayRequestDuration persistAuthorization />
      </section>
    </main>
  );
}