import { useState } from 'react';
import { FileText, Sparkles, Loader2, Calendar, DollarSign, AlertTriangle, BookOpen, Send, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface LeaseForSelect {
  id: string;
  lease_number: string;
  tenants?: { name: string } | null;
  properties?: { name: string } | null;
}

interface DocumentIntelligenceProps {
  leases: LeaseForSelect[];
}

type ExtractDateItem = {
  label: string;
  date: string;
  importance: 'high' | 'medium' | 'low';
};

type ExtractFinancialItem = {
  label: string;
  amount: string;
  frequency: string;
};

type ExtractClauseItem = {
  title: string;
  risk_level: 'high' | 'medium' | 'low';
  summary: string;
};

type ExtractResult = {
  key_dates?: ExtractDateItem[];
  financial_terms?: ExtractFinancialItem[];
  special_clauses?: ExtractClauseItem[];
};

type SummaryResult = {
  overview?: string;
  duration?: {
    start?: string;
    end?: string;
    remaining_months?: number;
  };
  financials?: {
    monthly_rent?: string;
    security_deposit?: string;
  };
  risk_flags?: string[];
};

type CompareDifference = {
  category: string;
  details?: string[];
};

type CompareResult = {
  summary?: string;
  differences?: CompareDifference[];
  recommendations?: string[];
};

type ActionType = 'extract' | 'summary' | 'compare';
type ActionBody = {
  action: ActionType;
  leaseId?: string;
  leaseIds?: string[];
};

type ActionResponse = {
  result?: unknown;
};

export function DocumentIntelligence({ leases }: DocumentIntelligenceProps) {
  const [selectedLease, setSelectedLease] = useState<string>('');
  const [compareLease, setCompareLease] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [qaResponse, setQaResponse] = useState('');
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { toast.error('Please log in.'); return null; }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const handleQA = async () => {
    if (!selectedLease || !question.trim()) { toast.error('Select a lease and enter a question.'); return; }
    setLoading('qa');
    setQaResponse('');
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-document-intelligence`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'qa', leaseId: selectedLease, question }) }
      );
      if (!response.ok) throw new Error('Request failed');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { content += delta; setQaResponse(content); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch { toast.error('Failed to get answer.'); }
    finally { setLoading(null); }
  };

  const handleAction = async (action: ActionType) => {
    const leaseId = action === 'compare' ? undefined : selectedLease;
    if (action !== 'compare' && !selectedLease) { toast.error('Select a lease first.'); return; }
    if (action === 'compare' && (!selectedLease || !compareLease)) { toast.error('Select two leases to compare.'); return; }
    setLoading(action);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const body: ActionBody = { action };
      if (action === 'compare') body.leaseIds = [selectedLease, compareLease];
      else body.leaseId = leaseId;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-document-intelligence`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );
      if (!response.ok) throw new Error('Request failed');
      const data = (await response.json()) as ActionResponse;
      if (action === 'extract') setExtractResult((data.result || null) as ExtractResult | null);
      else if (action === 'summary') setSummaryResult((data.result || null) as SummaryResult | null);
      else if (action === 'compare') setCompareResult((data.result || null) as CompareResult | null);
    } catch { toast.error(`Failed to ${action}.`); }
    finally { setLoading(null); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Document Intelligence
          <Badge variant="secondary" className="text-xs">AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Select Lease</label>
              <select
                value={selectedLease}
                onChange={(e) => setSelectedLease(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Choose a lease...</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lease_number} — {l.tenants?.name || 'Unknown'} ({l.properties?.name || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" variant="outline" onClick={() => handleAction('extract')} disabled={!!loading || !selectedLease} className="gap-1.5">
                {loading === 'extract' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
                Extract Terms
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction('summary')} disabled={!!loading || !selectedLease} className="gap-1.5">
                {loading === 'summary' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Summarize
              </Button>
            </div>
          </div>

          <Tabs defaultValue="qa" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="qa">Lease Q&A</TabsTrigger>
              <TabsTrigger value="extract">Key Terms</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="qa" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this lease..." className="min-h-[60px]" />
                <Button size="icon" onClick={handleQA} disabled={loading === 'qa' || !selectedLease || !question.trim()}>
                  {loading === 'qa' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {qaResponse && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 prose prose-sm max-w-none">
                  <ReactMarkdown>{qaResponse}</ReactMarkdown>
                </div>
              )}
            </TabsContent>

            <TabsContent value="extract" className="mt-3">
              {extractResult ? (
                <div className="space-y-4">
                  {extractResult.key_dates?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2"><Calendar className="h-4 w-4 text-primary" />Key Dates</h4>
                      <div className="space-y-1">
                        {extractResult.key_dates.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                            <span>{d.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{d.date}</span>
                              <Badge variant={d.importance === 'high' ? 'destructive' : 'secondary'} className="text-xs">{d.importance}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractResult.financial_terms?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2"><DollarSign className="h-4 w-4 text-primary" />Financial Terms</h4>
                      <div className="space-y-1">
                        {extractResult.financial_terms.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                            <span>{f.label}</span>
                            <span className="font-medium">{f.amount} ({f.frequency})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractResult.special_clauses?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2"><AlertTriangle className="h-4 w-4 text-warning" />Special Clauses</h4>
                      <div className="space-y-1">
                        {extractResult.special_clauses.map((c, i) => (
                          <div key={i} className="p-2 rounded bg-muted/30 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{c.title}</span>
                              <Badge variant={c.risk_level === 'high' ? 'destructive' : c.risk_level === 'medium' ? 'default' : 'secondary'} className="text-xs">{c.risk_level} risk</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">{c.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Select a lease and click "Extract Terms" to analyze key terms.</p>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-3">
              {summaryResult ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground">{summaryResult.overview}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">{summaryResult.duration?.start} → {summaryResult.duration?.end}</p>
                      <p className="text-xs text-muted-foreground">{summaryResult.duration?.remaining_months} months remaining</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">Monthly Rent</p>
                      <p className="text-sm font-medium">{summaryResult.financials?.monthly_rent}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">Security Deposit</p>
                      <p className="text-sm font-medium">{summaryResult.financials?.security_deposit}</p>
                    </div>
                  </div>
                  {summaryResult.risk_flags?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-destructive flex items-center gap-1.5 mb-1"><AlertTriangle className="h-4 w-4" />Risk Flags</h4>
                      <ul className="text-sm space-y-1">
                        {summaryResult.risk_flags.map((f: string, i: number) => (
                          <li key={i} className="text-muted-foreground">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Select a lease and click "Summarize" to generate a summary.</p>
              )}
            </TabsContent>

            <TabsContent value="compare" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={selectedLease} onChange={(e) => setSelectedLease(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Lease 1...</option>
                  {leases.map((l) => (<option key={l.id} value={l.id}>{l.lease_number} — {l.tenants?.name}</option>))}
                </select>
                <select value={compareLease} onChange={(e) => setCompareLease(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Lease 2...</option>
                  {leases.filter(l => l.id !== selectedLease).map((l) => (<option key={l.id} value={l.id}>{l.lease_number} — {l.tenants?.name}</option>))}
                </select>
              </div>
              <Button size="sm" onClick={() => handleAction('compare')} disabled={!!loading || !selectedLease || !compareLease} className="gap-1.5">
                {loading === 'compare' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitCompare className="h-3.5 w-3.5" />}
                Compare Leases
              </Button>
              {compareResult && (
                <div className="space-y-3">
                  <p className="text-sm">{compareResult.summary}</p>
                  {compareResult.differences?.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <h5 className="text-sm font-medium mb-1">{d.category}</h5>
                      <ul className="text-sm text-muted-foreground space-y-0.5">
                        {d.details?.map((det: string, j: number) => <li key={j}>• {det}</li>)}
                      </ul>
                    </div>
                  ))}
                  {compareResult.recommendations?.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-1">Recommendations</h5>
                      <ul className="text-sm text-muted-foreground space-y-0.5">
                        {compareResult.recommendations.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
