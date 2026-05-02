## Plan: Deploy guest-booking Edge Function

The `guest-booking` edge function is already deployed but was failing with an error: `cannot insert a non-DEFAULT value into column "nights"` — the `nights` column in the `bookings` table is a generated column.

### Analysis
The current source code in `supabase/functions/guest-booking/index.ts` does **not** include `nights` in the insert object, so the fix may have already been applied but not redeployed. The function just needs a fresh deployment.

### Steps
1. **Redeploy** the `guest-booking` edge function to pick up the current code.
2. **Test** the function with a curl call to verify it works end-to-end.

No code changes needed — just a redeployment.