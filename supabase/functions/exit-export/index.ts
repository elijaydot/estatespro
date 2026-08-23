// Exit export endpoint — service-role backed data/auth/storage exporter.
//
// Purpose: resolves Open Question Q1 without needing the DB password or the
// service-role key on the client side. The key never leaves the function.
//
// Auth: requires header `x-export-secret` matching the EXIT_EXPORT_SECRET
// runtime secret. If that secret is unset, every request is rejected.
//
// Modes (GET query params):
//   ?mode=tables                                  -> list exportable public tables
//   ?mode=rows&table=<t>&limit=1000&offset=0      -> paged JSON rows for one table
//   ?mode=count&table=<t>                         -> exact row count
//   ?mode=auth_users&page=1&per_page=200          -> auth users (NO password hashes)
//   ?mode=buckets                                 -> storage buckets
//   ?mode=objects&bucket=<b>&limit=1000&offset=0  -> object manifest for a bucket
//   ?mode=sign&bucket=<b>&path=<p>&expires=3600   -> signed download URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPORT_SECRET = Deno.env.get("EXIT_EXPORT_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-export-secret",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!EXPORT_SECRET) {
    return json({ error: "EXIT_EXPORT_SECRET is not configured; endpoint disabled" }, 503);
  }
  const provided = req.headers.get("x-export-secret") ?? "";
  if (!timingSafeEqual(provided, EXPORT_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "server not configured" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "tables";
  const table = url.searchParams.get("table") ?? "";
  const bucket = url.searchParams.get("bucket") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 5000);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    switch (mode) {
      case "tables": {
        // openapi spec of the Data API lists every table exposed to PostgREST
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        });
        const spec = await res.json();
        const tables = Object.keys(spec?.definitions ?? spec?.components?.schemas ?? {}).sort();
        return json({ count: tables.length, tables });
      }

      case "count": {
        if (!table) return json({ error: "table required" }, 400);
        const { count, error } = await admin
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return json({ table, count });
      }

      case "rows": {
        if (!table) return json({ error: "table required" }, 400);
        const { data, error } = await admin
          .from(table)
          .select("*")
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return json({ table, offset, limit, returned: data?.length ?? 0, rows: data });
      }

      case "auth_users": {
        const page = Number(url.searchParams.get("page") ?? 1);
        const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 200), 1000);
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return json({
          page,
          perPage,
          returned: data.users.length,
          note: "password hashes are NOT returned by the Admin API — see docs/exit/06_AUTH_MIGRATION.md",
          users: data.users,
        });
      }

      case "buckets": {
        const { data, error } = await admin.storage.listBuckets();
        if (error) throw error;
        return json({ count: data?.length ?? 0, buckets: data });
      }

      case "objects": {
        if (!bucket) return json({ error: "bucket required" }, 400);
        const prefix = url.searchParams.get("prefix") ?? "";
        const { data, error } = await admin.storage.from(bucket).list(prefix, {
          limit,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw error;
        return json({ bucket, prefix, offset, limit, returned: data?.length ?? 0, objects: data });
      }

      case "sign": {
        const path = url.searchParams.get("path") ?? "";
        if (!bucket || !path) return json({ error: "bucket and path required" }, 400);
        const expires = Math.min(Number(url.searchParams.get("expires") ?? 3600), 86400);
        const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expires);
        if (error) throw error;
        return json({ bucket, path, expiresIn: expires, signedUrl: data?.signedUrl });
      }

      default:
        return json({ error: `unknown mode: ${mode}` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
