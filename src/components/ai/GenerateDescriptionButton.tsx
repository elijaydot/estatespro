import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GenerateDescriptionButtonProps {
  type: 'property' | 'unit';
  data: Record<string, any>;
  onGenerated: (description: string) => void;
}

export function GenerateDescriptionButton({ type, data, onGenerated }: GenerateDescriptionButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ type, data }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please try again later.');
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits depleted.');
          return;
        }
        throw new Error('Failed to generate description');
      }

      const result = await response.json();
      if (result.description) {
        onGenerated(result.description);
        toast.success('Description generated!');
      }
    } catch (error) {
      console.error('Generate description error:', error);
      toast.error('Failed to generate description. Please try again.');
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
