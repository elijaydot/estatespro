// src/components/forecasts/ForecastsScenarioModal.tsx
// FishGate Design Constitution v1.0 - Create / Save Planning Scenario Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Sliders, Bookmark, CheckCircle2 } from 'lucide-react';

interface ForecastsScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioSaved?: (name: string) => void;
}

export function ForecastsScenarioModal({
  isOpen,
  onClose,
  onScenarioSaved,
}: ForecastsScenarioModalProps) {
  const [scenarioName, setScenarioName] = useState<string>('Q1 2027 Target Plan');
  const [horizon, setHorizon] = useState<string>('q1_2027');
  const [goal, setGoal] = useState<string>('revenue_expansion');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) {
      toast({
        title: 'Scenario Name Required',
        description: 'Please give your planning scenario a descriptive name.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Planning Scenario Created',
      description: `Saved "${scenarioName}" to portfolio planning repository.`,
    });

    if (onScenarioSaved) {
      onScenarioSaved(scenarioName);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Create Planning Scenario</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Define forward operational assumptions to benchmark against baseline forecasts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
              Scenario Name
            </label>
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g., Aggressive Q1 Lease-Up Scenario"
              className="h-8 text-xs bg-white border-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
              Planning Horizon
            </label>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select Horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="q1_2027">Q1 2027 (Next 90 Days)</SelectItem>
                <SelectItem value="h1_2027">H1 2027 (Next 6 Months)</SelectItem>
                <SelectItem value="fy_2027">Full Year 2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
              Strategic Focus
            </label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select Focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue_expansion">Revenue Expansion (+4-8% Indexation)</SelectItem>
                <SelectItem value="occupancy_lock">Occupancy Lock (&gt; 95% Retention)</SelectItem>
                <SelectItem value="cost_containment">Cost Containment (OPEX Minimization)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Save Scenario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
