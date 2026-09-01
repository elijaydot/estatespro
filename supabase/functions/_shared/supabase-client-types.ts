// Loose structural type for a Supabase client used across edge functions.
// The generated database types are not available inside Deno functions, so the
// strict generic client type resolves query results to `never`. This structural
// type keeps call sites type-safe enough without fighting the generics.

// deno-lint-ignore-file no-explicit-any

/* eslint-disable @typescript-eslint/no-explicit-any */
export type LooseSupabaseClient = {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
    // deno-lint-ignore no-explicit-any
  ) => Promise<{ data: any; error: { message?: string } | null }>;
  // deno-lint-ignore no-explicit-any
  auth?: any;
  // deno-lint-ignore no-explicit-any
  storage?: any;
};
