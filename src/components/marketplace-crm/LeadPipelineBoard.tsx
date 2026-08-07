import { useMemo } from 'react';
import { Loader2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CrmLead } from '@/hooks/useMarketplace';

export const LEAD_STAGE_ORDER = [
  'new',
  'attempted_contact',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_made',
  'lease_in_progress',
  'converted',
  'lost',
] as const;

export const LEAD_STAGE_LABEL: Record<string, string> = {
  new: 'New',
  attempted_contact: 'Attempted',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing_scheduled: 'Viewing',
  offer_made: 'Offer',
  lease_in_progress: 'Lease In Progress',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_ACCENT: Record<string, string> = {
  new: 'bg-sky-500/10 border-sky-500/30',
  attempted_contact: 'bg-amber-500/10 border-amber-500/30',
  contacted: 'bg-indigo-500/10 border-indigo-500/30',
  qualified: 'bg-emerald-500/10 border-emerald-500/30',
  viewing_scheduled: 'bg-cyan-500/10 border-cyan-500/30',
  offer_made: 'bg-violet-500/10 border-violet-500/30',
  lease_in_progress: 'bg-fuchsia-500/10 border-fuchsia-500/30',
  converted: 'bg-green-500/10 border-green-500/30',
  lost: 'bg-rose-500/10 border-rose-500/30',
};

function LeadCard({
  lead,
  selected,
  onChangeStage,
  onSelect,
  disabled,
}: {
  lead: CrmLead;
  selected: boolean;
  onChangeStage: (leadId: string, stage: string) => void;
  onSelect: (leadId: string) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead.id)}
      className={cn(
        'w-full rounded-lg border p-3 text-left shadow-sm backdrop-blur-sm transition',
        selected
          ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-400/30'
          : 'border-border/70 bg-card/80 hover:bg-card',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{lead.contact_name || 'Lead'}</p>
          <p className="text-xs text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No phone or email'}</p>
        </div>
        <Badge variant="outline">Score {lead.score ?? 0}</Badge>
      </div>
      <div className="mb-3">
        <p className="text-xs text-muted-foreground">Listing</p>
        <p className="truncate text-sm">{lead.listing_title || 'No listing linked'}</p>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">Priority</p>
          <Badge variant="secondary" className="mt-1 text-[11px]">{lead.priority}</Badge>
        </div>
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">Status</p>
          <Badge variant="outline" className="mt-1 text-[11px]">{lead.status}</Badge>
        </div>
      </div>
      <Select value={lead.stage} onValueChange={(value) => onChangeStage(lead.id, value)} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Update stage" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STAGE_ORDER.map((stage) => (
            <SelectItem key={stage} value={stage} className="text-xs">{LEAD_STAGE_LABEL[stage]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </button>
  );
}

type LeadPipelineBoardProps = {
  leads: CrmLead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  onChangeStage: (leadId: string, stage: string) => void;
  isLoading?: boolean;
  isUpdating?: boolean;
};

export function LeadPipelineBoard({
  leads,
  selectedLeadId,
  onSelectLead,
  onChangeStage,
  isLoading = false,
  isUpdating = false,
}: LeadPipelineBoardProps) {
  const groupedLeads = useMemo(() => {
    const groups: Record<string, CrmLead[]> = {};
    for (const stage of LEAD_STAGE_ORDER) groups[stage] = [];
    for (const lead of leads) groups[groups[lead.stage] ? lead.stage : 'new'].push(lead);
    return groups;
  }, [leads]);

  return (
    <Card className="min-w-0 border-emerald-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600" />
          Pipeline Board
          {(isLoading || isUpdating) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>Choose a lead to open timeline, notes, assignment, and task actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex min-w-full gap-3 pr-2">
            {LEAD_STAGE_ORDER.map((stage) => (
              <div key={stage} className={cn('min-h-[520px] w-[280px] rounded-lg border p-3', STAGE_ACCENT[stage] || 'border-border')}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{LEAD_STAGE_LABEL[stage]}</p>
                  <Badge variant="secondary">{groupedLeads[stage]?.length || 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(groupedLeads[stage] || []).map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      selected={lead.id === selectedLeadId}
                      disabled={isUpdating}
                      onSelect={onSelectLead}
                      onChangeStage={onChangeStage}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}