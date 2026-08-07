import { useMemo } from 'react';
import { GripVertical, Loader2, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    <article
      className={cn(
        'w-full rounded-md border bg-card p-2.5 text-left shadow-sm transition-colors',
        selected
          ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
          : 'border-border/80 hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(lead.id)}>
        <div className="mb-2 flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{lead.contact_name || 'Lead'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No contact details'}</p>
          </div>
          <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">{lead.score ?? 0}</Badge>
        </div>
        <div className="mb-2 rounded bg-muted/50 px-2 py-1.5">
          <p className="truncate text-xs font-medium">{lead.listing_title || 'No listing linked'}</p>
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">{lead.priority}</Badge>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">{lead.status}</Badge>
        </div>
      </button>
      <Select value={lead.stage} onValueChange={(value) => onChangeStage(lead.id, value)} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Update stage" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STAGE_ORDER.map((stage) => (
            <SelectItem key={stage} value={stage} className="text-xs">{LEAD_STAGE_LABEL[stage]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
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
    <Card className="min-w-0 overflow-hidden border-emerald-500/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600" />
          Pipeline Board
          {(isLoading || isUpdating) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>Move work through each stage and select a lead to open its complete record below.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4">
        <ScrollArea className="w-full pb-3">
          <div className="flex w-max min-w-full items-start gap-3 pb-2">
            {LEAD_STAGE_ORDER.map((stage) => (
              <section key={stage} className={cn('flex h-[560px] w-64 shrink-0 flex-col overflow-hidden rounded-md border', STAGE_ACCENT[stage] || 'border-border')}>
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-3 backdrop-blur-sm">
                  <p className="truncate text-xs font-semibold uppercase text-foreground/80">{LEAD_STAGE_LABEL[stage]}</p>
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">{groupedLeads[stage]?.length || 0}</Badge>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
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
                  {(groupedLeads[stage] || []).length === 0 && (
                    <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/60 px-3 text-center text-xs text-muted-foreground">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}