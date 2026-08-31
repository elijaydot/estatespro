import { LayoutGrid, List, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'compact' | 'table';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-xs',
        className
      )}
      role="group"
      aria-label="Display view switch"
    >
      <Button
        type="button"
        size="icon"
        variant={view === 'cards' ? 'secondary' : 'ghost'}
        className={cn(
          'h-8 w-8 rounded-md transition-colors',
          view === 'cards' && 'bg-background shadow-xs text-foreground font-medium'
        )}
        title="Card / Grid View"
        onClick={() => onViewChange('cards')}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={view === 'compact' ? 'secondary' : 'ghost'}
        className={cn(
          'h-8 w-8 rounded-md transition-colors',
          view === 'compact' && 'bg-background shadow-xs text-foreground font-medium'
        )}
        title="Compact / List View"
        onClick={() => onViewChange('compact')}
        aria-label="Compact view"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={view === 'table' ? 'secondary' : 'ghost'}
        className={cn(
          'h-8 w-8 rounded-md transition-colors',
          view === 'table' && 'bg-background shadow-xs text-foreground font-medium'
        )}
        title="Data Table View"
        onClick={() => onViewChange('table')}
        aria-label="Table view"
      >
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
