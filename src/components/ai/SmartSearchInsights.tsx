import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, Loader2, TrendingUp, FileBarChart, Printer, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AiMarkdownResult } from '@/components/ai/AiMarkdownResult';
import { buildAiExportBaseName, printAiResult } from '@/lib/aiResultExport';
import { useActiveCompany } from '@/contexts/useActiveCompany';

const EXAMPLE_QUERIES = {
  search: [
    "Show me all properties with overdue rent",
    "Which tenants have the highest balance?",
    "List vacant units across all properties",
  ],
  trends: [
    "What maintenance issues are most common?",
    "How has occupancy changed over time?",
    "Which payment methods are most popular?",
  ],
  report: [
    "Generate a summary of Q1 performance",
    "Create a rent collection report",
    "Summarize maintenance costs by property",
  ],
};

export function SmartSearchInsights({ embedded = false }: { embedded?: boolean }) {
  const { activeCompanyId } = useActiveCompany();
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<'search' | 'trends' | 'report'>('search');
  const [response, setResponse] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResponse('');
    setSubmittedQuery('');
  }, [activeCompanyId]);

  const handleSubmit = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    if (!activeCompanyId) { toast.error('Select a company before using AI features.'); return; }
    setIsLoading(true);
    setResponse('');
    setSubmittedQuery(searchQuery.trim());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please log in.'); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-smart-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ query: searchQuery, action, companyId: activeCompanyId }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('Rate limit exceeded.'); return; }
        if (resp.status === 402) { toast.error('AI credits depleted.'); return; }
        throw new Error('Request failed');
      }

      const reader = resp.body?.getReader();
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
            if (delta) { content += delta; setResponse(content); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch { toast.error('Failed to get results.'); }
    finally { setIsLoading(false); }
  };

  const actionConfig = {
    search: { icon: Search, label: 'Search', resultLabel: 'Search result' },
    trends: { icon: TrendingUp, label: 'Trends', resultLabel: 'Trend analysis' },
    report: { icon: FileBarChart, label: 'Reports', resultLabel: 'Generated report' },
  };
  const exportBaseName = buildAiExportBaseName(action, submittedQuery);

  const handlePrint = () => {
    if (!resultRef.current) return;
    try {
      printAiResult({
        title: actionConfig[action].resultLabel,
        query: submittedQuery,
        resultElement: resultRef.current,
        documentTitle: exportBaseName,
      });
    } catch {
      toast.error('Unable to open print preview.');
    }
  };

  const content = (
      <div className="space-y-4">
        <div className="flex gap-2">
          {(Object.keys(actionConfig) as Array<keyof typeof actionConfig>).map((key) => {
            const cfg = actionConfig[key];
            const Icon = cfg.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={action === key ? 'default' : 'outline'}
                onClick={() => { setAction(key); setResponse(''); setSubmittedQuery(''); }}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </Button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your portfolio…"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          <Button onClick={() => handleSubmit()} disabled={isLoading || !query.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {!response && !isLoading && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES[action].map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); handleSubmit(q); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="overflow-hidden rounded-lg border border-border bg-background/70" aria-live="polite" aria-busy={isLoading}>
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
              {(() => {
                const ResultIcon = actionConfig[action].icon;
                return <ResultIcon className="h-4 w-4 text-primary" aria-hidden="true" />;
              })()}
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{actionConfig[action].resultLabel}</p>
              {isLoading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Generating response" />}
              <Button type="button" variant="outline" size="sm" className="ml-auto h-8 gap-1.5" onClick={handlePrint} disabled={isLoading}>
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
            <div ref={resultRef} className="p-4 text-sm leading-6 text-foreground sm:p-5">
              <AiMarkdownResult content={response} filenameBase={exportBaseName} exportEnabled={!isLoading} />
            </div>
          </div>
        )}
      </div>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Search & Insights
          <Badge variant="secondary" className="text-xs">AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
