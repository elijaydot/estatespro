import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Company = { id: string; name: string };
type ApiKey = { id: string; name: string; key_prefix: string; scopes: string[]; tier: 'limited' | 'full'; rate_limit_per_min: number; created_at: string; last_used_at: string | null; revoked_at: string | null };
type ApiRequest = { id: string; method: string; route: string; status_code: number; duration_ms: number; created_at: string };
type ManagementPayload = { data: { keys: ApiKey[]; recent_requests: ApiRequest[] }; error: null } | { data: null; error: { message: string } };
const scopes = ['pm:read', 'pm:write', 'marketplace:read', 'marketplace:write', 'crm:read', 'crm:write'];

async function apiKeysRequest(path = '', init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication is required.');
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${baseUrl}/functions/v1/api-keys${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'API key operation failed.');
  return payload;
}

export function ApiAccessManagement() {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState('');
  const [form, setForm] = useState({ name: '', tier: 'limited' as 'limited' | 'full', scopes: ['pm:read'], rateLimit: '60' });

  const companies = useQuery({ queryKey: ['api-key-companies'], queryFn: async () => {
    const { data, error } = await untypedSupabase.from('companies').select('id,name').order('name');
    if (error) throw error;
    return (data || []) as Company[];
  }});
  const management = useQuery({ queryKey: ['api-key-management', companyId], enabled: Boolean(companyId), queryFn: () => apiKeysRequest(`?company_id=${companyId}`) as Promise<ManagementPayload> });
  const createKey = useMutation({ mutationFn: () => apiKeysRequest('', { method: 'POST', body: JSON.stringify({ company_id: companyId, name: form.name, tier: form.tier, scopes: form.scopes, rate_limit_per_min: Number(form.rateLimit) }) }), onSuccess: (payload) => { setRevealedKey(payload.data.key); setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['api-key-management', companyId] }); }, onError: (error) => toast.error(error.message) });
  const revokeKey = useMutation({ mutationFn: (id: string) => apiKeysRequest(`/${id}`, { method: 'DELETE' }), onSuccess: () => { toast.success('API key revoked.'); queryClient.invalidateQueries({ queryKey: ['api-key-management', companyId] }); }, onError: (error) => toast.error(error.message) });
  const data = management.data?.data;

  const toggleScope = (scope: string) => setForm((current) => ({ ...current, scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope] }));
  const copyKey = async () => { await navigator.clipboard.writeText(revealedKey); toast.success('API key copied.'); };

  return <div className="space-y-6 pt-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="w-full max-w-sm space-y-2"><Label>Company</Label><Select value={companyId} onValueChange={setCompanyId}><SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger><SelectContent>{(companies.data || []).map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent></Select></div>
      <Button disabled={!companyId} onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create key</Button>
    </div>

    {revealedKey && <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"><div className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" />Copy this key now. It will not be shown again.</div><div className="mt-3 flex gap-2"><Input readOnly value={revealedKey} className="font-mono" /><Button variant="outline" size="icon" onClick={copyKey} title="Copy API key"><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setRevealedKey('')} title="Dismiss"><Check className="h-4 w-4" /></Button></div></div>}

    <div className="overflow-x-auto border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Prefix</TableHead><TableHead>Tier</TableHead><TableHead>Scopes</TableHead><TableHead>Last used</TableHead><TableHead>Status</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>{(data?.keys || []).map((key) => <TableRow key={key.id}><TableCell className="font-medium">{key.name}</TableCell><TableCell className="font-mono text-xs">{key.key_prefix}...</TableCell><TableCell><Badge variant={key.tier === 'full' ? 'default' : 'secondary'}>{key.tier}</Badge></TableCell><TableCell className="max-w-xs text-xs">{key.scopes.join(', ')}</TableCell><TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</TableCell><TableCell><Badge variant={key.revoked_at ? 'destructive' : 'outline'}>{key.revoked_at ? 'Revoked' : 'Active'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" disabled={Boolean(key.revoked_at) || revokeKey.isPending} onClick={() => revokeKey.mutate(key.id)} title="Revoke API key"><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>

    <section className="space-y-3"><div><h3 className="font-semibold">Recent usage</h3><p className="text-sm text-muted-foreground">The latest calls recorded for this company.</p></div><div className="overflow-x-auto border"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Method</TableHead><TableHead>Route</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader><TableBody>{(data?.recent_requests || []).map((request) => <TableRow key={request.id}><TableCell>{new Date(request.created_at).toLocaleString()}</TableCell><TableCell>{request.method}</TableCell><TableCell className="font-mono text-xs">{request.route}</TableCell><TableCell>{request.status_code}</TableCell><TableCell>{request.duration_ms} ms</TableCell></TableRow>)}</TableBody></Table></div></section>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create API key</DialogTitle><DialogDescription>The company plan is enforced again by the server when this key is created.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="api-key-name">Name</Label><Input id="api-key-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Production integration" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Tier</Label><Select value={form.tier} onValueChange={(tier: 'limited' | 'full') => setForm({ ...form, tier, scopes: tier === 'limited' ? form.scopes.filter((scope) => !scope.endsWith(':write')) : form.scopes })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="limited">Limited</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="api-rate-limit">Requests/minute</Label><Input id="api-rate-limit" type="number" min="1" max="10000" value={form.rateLimit} onChange={(event) => setForm({ ...form, rateLimit: event.target.value })} /></div></div><fieldset className="space-y-2"><legend className="text-sm font-medium">Scopes</legend>{scopes.map((scope) => <label key={scope} className="flex items-center gap-2 text-sm"><Checkbox checked={form.scopes.includes(scope)} disabled={form.tier === 'limited' && scope.endsWith(':write')} onCheckedChange={() => toggleScope(scope)} />{scope}</label>)}</fieldset></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={!form.name || form.scopes.length === 0 || createKey.isPending} onClick={() => createKey.mutate()}>{createKey.isPending ? 'Creating...' : 'Create key'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}