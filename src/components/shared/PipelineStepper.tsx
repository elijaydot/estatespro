import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function PipelineStepper({ steps, currentStep, className }: PipelineStepperProps) {
  return (
    <ol className={cn('flex w-full items-start', className)} aria-label="Progress">
      {steps.map((step, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center gap-2 text-center last:flex-none">
            {index < steps.length - 1 && <span className={cn('absolute left-1/2 top-4 h-0.5 w-full bg-border', complete && 'bg-primary')} />}
            <span className={cn('relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-card text-xs font-semibold', (complete || active) && 'border-primary bg-primary text-primary-foreground')}>
              {complete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={cn('max-w-28 text-xs text-muted-foreground', active && 'font-medium text-foreground')}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}