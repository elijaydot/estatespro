import { useState } from 'react';
import { Search, Sparkles, Loader2, TrendingUp, FileBarChart, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

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

export function SmartSearchInsights() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<'search' | 'trends' | 'report'>('search');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setResponse('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please log in.'); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-smart-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ query: searchQuery, action }),
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
    search: { icon: Search, label: 'Search', color: 'text-primary' },
    trends: { icon: TrendingUp, label: 'Trends', color: 'text-chart-2' },
    report: { icon: FileBarChart, label: 'Reports', color: 'text-chart-4' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Search & Insights
          <Badge variant="secondary" className="text-xs">AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(Object.keys(actionConfig) as Array<keyof typeof actionConfig>).map((key) => {
            const cfg = actionConfig[key];
            const Icon = cfg.icon;
            return (
              <Button
                key={key}
                size="sm"
                variant={action === key ? 'default' : 'outline'}
                onClick={() => { setAction(key); setResponse(''); }}
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
            placeholder={`${action === 'search' ? 'Search your portfolio...' : action === 'trends' ? 'Ask about trends...' : 'Describe the report you need...'}`}
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
          <div className="rounded-lg border border-border bg-muted/30 p-4 prose prose-sm max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
