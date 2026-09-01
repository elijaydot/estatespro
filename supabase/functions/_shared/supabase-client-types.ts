// Shared Supabase client factory + loose client type for edge functions.
//
// The generated database types are not available inside Deno functions, so the
// strict generics of recent postgrest-js releases resolve every query result to
// `never`, which breaks type checking everywhere. Edge functions import the
// factory below instead of calling `createClient` from esm.sh directly.

import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// deno-lint-ignore no-explicit-any
export type LooseSupabaseClient = any;

export function createClient(
  url: string,
  key: string,
  options?: Record<string, unknown>,
): LooseSupabaseClient {
  // deno-lint-ignore no-explicit-any
  return createSupabaseClient(url, key, options as any) as LooseSupabaseClient;
}
