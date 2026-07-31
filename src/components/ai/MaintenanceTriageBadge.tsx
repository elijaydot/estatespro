import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TriageResult {
  suggested_priority: string;
  urgency_category: string;
  reasoning: string;
  estimated_response_time: string;
}

interface MaintenanceTriageBadgeProps {
  title: string;
  description: string;
  category: string;
  onPrioritySelect: (priority: string) => void;
}

export function MaintenanceTriageBadge({ title, description, category, onPrioritySelect }: MaintenanceTriageBadgeProps) {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTriage = async () => {
    if (!title || !description) {
      toast.error('Please fill in title and description first.');
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use AI features.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-maintenance-triage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ title, description, category }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) { toast.error('Rate limit exceeded.'); return; }
        throw new Error('Triage failed');
      }

      const result = await response.json();
      setTriage(result.triage);
      if (result.triage?.suggested_priority) {
        // Advisory only: the parent updates form state; persistence occurs on form submission.
        onPrioritySelect(result.triage.suggested_priority);
      }
    } catch (error) {
      console.error('Triage error:', error);
      toast.error('Failed to analyze request.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyIcon = (category: string) => {
    switch (category) {
      case 'emergency': return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'important': return <Clock className="h-3.5 w-3.5" />;
      case 'routine': return <CheckCircle className="h-3.5 w-3.5" />;
      default: return <Info className="h-3.5 w-3.5" />;
    }
  };

  const getUrgencyColor = (cat: string) => {
    switch (cat) {
      case 'emergency': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'important': return 'bg-warning/10 text-warning border-warning/20';
      case 'routine': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (triage) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Triage Result
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={cn('gap-1', getUrgencyColor(triage.urgency_category))}>
            {getUrgencyIcon(triage.urgency_category)}
            {triage.urgency_category}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Priority: {triage.suggested_priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Response: {triage.estimated_response_time}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{triage.reasoning}</p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleTriage}
      disabled={isLoading || !title || !description}
      className="gap-1.5 text-xs"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {isLoading ? 'Analyzing...' : 'AI Triage'}
    </Button>
  );
}
