#!/usr/bin/env bash
# Q1 workaround: full data + auth + storage export through the `exit-export`
# edge function, which holds the service-role key server-side.
#
# Prerequisites:
#   1. The hosted backend is RUNNING (a paused project serves nothing).
#   2. EXIT_EXPORT_SECRET is set as a backend secret (ask Lovable to add it).
#
# Usage:
#   export FUNCTIONS_URL="https://<project-ref>.supabase.co/functions/v1/exit-export"
#   export EXIT_EXPORT_SECRET="<the same value stored as a backend secret>"
#   ./docs/exit/scripts/export-via-function.sh
#
# Output: ./exit-export/<timestamp>/{tables,auth,storage}/...

set -euo pipefail

: "${FUNCTIONS_URL:?set FUNCTIONS_URL}"
: "${EXIT_EXPORT_SECRET:?set EXIT_EXPORT_SECRET}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_DIR:-./exit-export/$STAMP}"
PAGE_SIZE="${PAGE_SIZE:-1000}"
mkdir -p "$OUT/tables" "$OUT/auth" "$OUT/storage"

call() { curl -sSf -H "x-export-secret: $EXIT_EXPORT_SECRET" "$FUNCTIONS_URL?$1"; }

echo "=== 1. Table inventory ==="
call "mode=tables" > "$OUT/tables/_inventory.json"
mapfile -t TABLES < <(python3 -c 'import json,sys;print("\n".join(json.load(open(sys.argv[1]))["tables"]))' "$OUT/tables/_inventory.json")
echo "${#TABLES[@]} tables"

echo "=== 2. Row export (paged JSONL) ==="
: > "$OUT/tables/_rowcounts.csv"
for t in "${TABLES[@]}"; do
  offset=0
  : > "$OUT/tables/$t.jsonl"
  while :; do
    body="$(call "mode=rows&table=$t&limit=$PAGE_SIZE&offset=$offset")"
    n="$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("returned",0));[print(json.dumps(r),file=open(sys.argv[1],"a")) for r in d.get("rows") or []]' "$OUT/tables/$t.jsonl" <<<"$body")"
    offset=$((offset + n))
    [ "$n" -lt "$PAGE_SIZE" ] && break
  done
  echo "$t,$offset" >> "$OUT/tables/_rowcounts.csv"
  echo "  $t: $offset rows"
done

echo "=== 3. Auth users (no password hashes — see 06_AUTH_MIGRATION.md) ==="
page=1
: > "$OUT/auth/users.jsonl"
while :; do
  body="$(call "mode=auth_users&page=$page&per_page=200")"
  n="$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("returned",0));[print(json.dumps(u),file=open(sys.argv[1],"a")) for u in d.get("users") or []]' "$OUT/auth/users.jsonl" <<<"$body")"
  [ "$n" -lt 200 ] && break
  page=$((page + 1))
done
echo "  $(wc -l < "$OUT/auth/users.jsonl") users"

echo "=== 4. Storage manifest + object download ==="
call "mode=buckets" > "$OUT/storage/_buckets.json"
mapfile -t BUCKETS < <(python3 -c 'import json,sys;print("\n".join(b["name"] for b in json.load(open(sys.argv[1]))["buckets"]))' "$OUT/storage/_buckets.json")
for b in "${BUCKETS[@]}"; do
  echo "  bucket: $b"
  call "mode=objects&bucket=$b&limit=1000&offset=0" > "$OUT/storage/$b.manifest.json"
  mapfile -t PATHS < <(python3 -c 'import json,sys;print("\n".join(o["name"] for o in json.load(open(sys.argv[1]))["objects"] if o.get("id")))' "$OUT/storage/$b.manifest.json")
  mkdir -p "$OUT/storage/objects/$b"
  for p in "${PATHS[@]}"; do
    signed="$(call "mode=sign&bucket=$b&path=$p&expires=3600" | python3 -c 'import json,sys;print(json.load(sys.stdin)["signedUrl"])')"
    mkdir -p "$OUT/storage/objects/$b/$(dirname "$p")"
    curl -sSfL "$signed" -o "$OUT/storage/objects/$b/$p" || echo "{\"bucket\":\"$b\",\"path\":\"$p\"}" >> "$OUT/storage/failures.jsonl"
  done
done

echo "=== 5. Checksums ==="
( cd "$OUT" && find . -type f ! -name SHA256SUMS -exec sha256sum {} + > SHA256SUMS )

echo "Done: $OUT"
echo "NOTE: nested storage prefixes need a recursive list — extend step 4 if buckets use >1 folder level."
