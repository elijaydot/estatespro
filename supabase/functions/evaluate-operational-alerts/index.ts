import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from '../_shared/security.ts';

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req);
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: 'evaluate-operational-alerts',
    limit: 6,
    windowMs: 60_000,
  });
  if (!rateCheck.allowed) return jsonResponse(req, { error: 'Rate limit exceeded' }, 429);

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return jsonResponse(req, { error: 'Unauthorized' }, 401);

  let payload: { companyId?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON body' }, 400);
  }

  if (!payload.companyId) return jsonResponse(req, { error: 'companyId is required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return jsonResponse(req, { error: 'Server configuration error' }, 500);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonResponse(req, { error: 'Unauthorized' }, 401);

  const { data, error } = await supabase.rpc('evaluate_operational_alerts', {
    p_company_id: payload.companyId,
  });
  if (error) {
    const forbidden = error.code === '42501' || error.message.includes('COMPANY_ACCESS_DENIED');
    return jsonResponse(req, { error: forbidden ? 'Company access denied' : error.message }, forbidden ? 403 : 500);
  }

  return jsonResponse(req, { success: true, result: data });
});
