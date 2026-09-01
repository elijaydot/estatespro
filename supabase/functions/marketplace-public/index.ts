import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";

type ListingRow = {
  id: string;
  [key: string]: unknown;
};

type ListingMediaRow = {
  listing_id: string;
  storage_path: string;
};
import { createCorrelationId, emitAuditEvent } from "../_shared/observability.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req, "GET, OPTIONS"), "Content-Type": "application/json" },
  });
}

function toPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, Math.floor(parsed));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req, "GET, OPTIONS");
  if (req.method !== "GET") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "marketplace-public",
    limit: 180,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    await emitAuditEvent({
      event_type: "marketplace.public.rate_limited",
      source: "marketplace-public",
      severity: "warning",
      details: { method: req.method },
    });
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(req, { error: "Missing server configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);
    const correlationId = createCorrelationId();

    const mode = (url.searchParams.get("mode") || "list").toLowerCase();

    if (mode === "detail") {
      const idOrSlug = (url.searchParams.get("id_or_slug") || "").trim();
      if (!idOrSlug) return jsonResponse(req, { error: "id_or_slug is required for detail mode" }, 400);

      const { data: detail, error: detailError } = await supabase
        .rpc("get_public_marketplace_listing_detail", { p_id_or_slug: idOrSlug })
        .maybeSingle();

      if (detailError) {
        await emitAuditEvent({
          event_type: "marketplace.public.detail.error",
          source: "marketplace-public",
          severity: "error",
          correlation_id: correlationId,
          details: { message: detailError.message },
        });
        return jsonResponse(req, { error: "Unable to fetch listing detail" }, 500);
      }

      if (!detail) return jsonResponse(req, { error: "Listing not found" }, 404);

      const { data: media, error: mediaError } = await supabase
        .from("listing_media")
        .select("id, storage_path, is_cover, sort_order")
        .eq("listing_id", detail.id)
        .eq("moderation_state", "approved")
        .order("sort_order", { ascending: true });

      if (mediaError) {
        await emitAuditEvent({
          event_type: "marketplace.public.detail.media_error",
          source: "marketplace-public",
          severity: "warning",
          correlation_id: correlationId,
          details: { message: mediaError.message, listing_id: detail.id },
        });
      }

      return jsonResponse(req, {
        data: {
          ...detail,
          media: media ?? [],
        },
        error: null,
        meta: { correlationId },
      });
    }

    const city = (url.searchParams.get("city") || "").trim() || null;
    const area = (url.searchParams.get("area") || "").trim() || null;
    const minRent = url.searchParams.get("min_rent");
    const maxRent = url.searchParams.get("max_rent");
    const bedrooms = url.searchParams.get("bedrooms");
    const page = toPositiveInt(url.searchParams.get("page"), 1, 10_000);
    const pageSize = toPositiveInt(url.searchParams.get("page_size"), 20, 100);

    const { data: rows, error: listError } = await supabase.rpc("get_public_marketplace_listings", {
      p_city: city,
      p_area: area,
      p_min_rent: minRent ? Number(minRent) : null,
      p_max_rent: maxRent ? Number(maxRent) : null,
      p_bedrooms: bedrooms ? Number(bedrooms) : null,
      p_page: page,
      p_page_size: pageSize,
    });

    if (listError) {
      await emitAuditEvent({
        event_type: "marketplace.public.list.error",
        source: "marketplace-public",
        severity: "error",
        correlation_id: correlationId,
        details: { message: listError.message },
      });
      return jsonResponse(req, { error: "Unable to fetch listings" }, 500);
    }

    const typedRows = (rows ?? []) as ListingRow[];
    const listingIds = typedRows.map((r) => r.id).filter(Boolean);
    const coverByListingId = new Map<string, string>();

    if (listingIds.length > 0) {
      const { data: mediaRows } = await supabase
        .from("listing_media")
        .select("listing_id, storage_path, is_cover, sort_order")
        .in("listing_id", listingIds)
        .eq("moderation_state", "approved")
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true });

      for (const media of (mediaRows ?? []) as ListingMediaRow[]) {
        if (!coverByListingId.has(media.listing_id)) {
          coverByListingId.set(media.listing_id, media.storage_path);
        }
      }
    }

    return jsonResponse(req, {
      data: typedRows.map((row) => ({
        ...row,
        cover_media_url: coverByListingId.get(row.id) ?? null,
      })),
      error: null,
      meta: {
        page,
        page_size: pageSize,
        count: typedRows.length,
        correlationId,
      },
    });
  } catch (error: unknown) {
    console.error("marketplace-public error", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
