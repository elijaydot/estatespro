import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generatePropertyDescriptionFallback } from '@/lib/portfolioAiFallback';

interface GenerateDescriptionButtonProps {
  type: 'property' | 'unit';
  data: Record<string, unknown>;
  onGenerated: (description: string) => void;
}

export function GenerateDescriptionButton({ type, data, onGenerated }: GenerateDescriptionButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let resolvedDescription = '';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-description`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ type, data }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.description) {
              resolvedDescription = result.description;
            }
          }
        }
      } catch (remoteErr) {
        console.warn('Remote description API unavailable, using template generator:', remoteErr);
      }

      if (!resolvedDescription) {
        resolvedDescription = generatePropertyDescriptionFallback(type, data);
      }

      onGenerated(resolvedDescription);
      toast.success('Description generated!');
    } catch (error) {
      console.error('Generate description error:', error);
      const fallback = generatePropertyDescriptionFallback(type, data);
      onGenerated(fallback);
      toast.success('Description generated!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating}
      className="gap-1.5 text-xs"
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {isGenerating ? 'Generating...' : 'AI Generate'}
    </Button>
  );
}
