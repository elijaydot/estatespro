import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SuggestedRepliesProps {
  messages: any[];
  tenantName: string;
  onSelect: (reply: string) => void;
}

export function SuggestedReplies({ messages, tenantName, onSelect }: SuggestedRepliesProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI features.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-suggest-reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: messages.slice(-6),
            tenantName,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Try again later.');
          return;
        }
        throw new Error('Failed to get suggestions');
      }

      const result = await response.json();
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Suggest reply error:', error);
      toast.error('Failed to generate suggestions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {suggestions.length === 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={isLoading || messages.length === 0}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isLoading ? 'Thinking...' : 'AI Suggest Reply'}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Suggestions:
          </span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(s);
                setSuggestions([]);
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left max-w-[250px] truncate"
            >
              {s}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuggestions([])}
            className="text-xs h-7 px-2"
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
