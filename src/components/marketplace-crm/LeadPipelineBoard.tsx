import { useMemo } from 'react';
import { CalendarClock, CheckCircle2, GripVertical, KeyRound, Loader2, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CrmLead } from '@/hooks/useMarketplace';
import {
  ACTIVE_CANONICAL_STAGES,
  CANONICAL_LEAD_STAGES,
  LEAD_STAGE_DESCRIPTION,
  LEAD_STAGE_LABEL,
  normalizeLeadStage,
  STAGE_ACCENT,
} from './leadStageConfig';

function formatFollowupBadge(nextFollowupAt?: string | null) {
  if (!nextFollowupAt) return null;
  const target = new Date(nextFollowupAt).getTime();
  const now = Date.now();
  const diffHours = (target - now) / 3600000;

  if (diffHours < 0) {
    return { label: 'Overdue Follow-up', variant: 'destructive' as const };
  }
  if (diffHours <= 24) {
    return { label: 'Follow-up Today', variant: 'warning' as const };
  }
  return { label: `Follow-up in ${Math.round(diffHours / 24)}d`, variant: 'outline' as const };
}

function LeadCard({
  lead,
  selected,
  onChangeStage,
  onSelect,
  onOpenBooking,
  disabled,
}: {
  lead: CrmLead;
  selected: boolean;
  onChangeStage: (leadId: string, stage: string) => void;
  onSelect: (leadId: string) => void;
  onOpenBooking?: (lead: CrmLead) => void;
  disabled: boolean;
}) {
  const canonicalStage = normalizeLeadStage(lead.stage);
  const followup = formatFollowupBadge(lead.next_followup_at);

  return (
    <article
      className={cn(
        'w-full rounded-md border bg-card p-3 text-left shadow-sm transition-all duration-200',
        selected
          ? 'border-emerald-500/70 ring-2 ring-emerald-500/20'
          : 'border-border/80 hover:border-foreground/30 hover:bg-muted/20',
      )}
    >
      <button type="button" className="w-full text-left" onClick={() => onSelect(lead.id)}>
        <div className="mb-2 flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{lead.contact_name || 'Prospect'}</p>
            <p className="truncate text-[11px] text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No contact details'}</p>
          </div>
          <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-mono">
            {lead.score ?? 0} pts
          </Badge>
        </div>

        {/* Listing / Property Context */}
        <div className="mb-2 rounded bg-muted/60 px-2 py-1.5">
          <p className="truncate text-xs font-medium text-foreground/90">
            {lead.listing_title || 'General Property Inquiry'}
          </p>
          {lead.budget_max && lead.budget_max > 0 ? (
            <p className="text-[10px] text-muted-foreground">
              Budget: up to ${lead.budget_max.toLocaleString()}
            </p>
          ) : null}
        </div>

        {/* Follow-up reminder badge */}
        {followup && (
          <div className="mb-2 flex items-center gap-1 text-[11px]">
            <CalendarClock className="h-3 w-3 text-muted-foreground" />
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                followup.variant === 'destructive'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : followup.variant === 'warning'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-muted text-muted-foreground border border-border'
              )}
            >
              {followup.label}
            </span>
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] capitalize">
            {lead.priority}
          </Badge>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
            {lead.status}
          </Badge>
          {lead.interested_unit_id && (
            <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-1.5 py-0 text-[10px]">
              Unit Selected
            </Badge>
          )}
        </div>
      </button>

      {/* Stage Selector & Quick Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <div className="flex-1 min-w-0">
          <Select value={canonicalStage} onValueChange={(value) => onChangeStage(lead.id, value)} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Update stage" />
            </SelectTrigger>
            <SelectContent>
              {CANONICAL_LEAD_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage} className="text-xs">
                  {LEAD_STAGE_LABEL[stage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 1-Click Atomic Booking Button when lead is ready */}
        {onOpenBooking && (canonicalStage === 'negotiation' || canonicalStage === 'interested') && (
          <Button
            size="sm"
            variant="default"
            className="h-7 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-500"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBooking(lead);
            }}
            title="Book unit atomically with concurrency protection"
          >
            <KeyRound className="mr-1 h-3 w-3" />
            Book
          </Button>
        )}
      </div>
    </article>
  );
}

type LeadPipelineBoardProps = {
  leads: CrmLead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  onChangeStage: (leadId: string, stage: string) => void;
  onOpenBooking?: (lead: CrmLead) => void;
  isLoading?: boolean;
  isUpdating?: boolean;
};

export function LeadPipelineBoard({
  leads,
  selectedLeadId,
  onSelectLead,
  onChangeStage,
  onOpenBooking,
  isLoading = false,
  isUpdating = false,
}: LeadPipelineBoardProps) {
  const groupedLeads = useMemo(() => {
    const groups: Record<string, CrmLead[]> = {};
    for (const stage of CANONICAL_LEAD_STAGES) groups[stage] = [];
    for (const lead of leads) {
      const canonical = normalizeLeadStage(lead.stage);
      if (groups[canonical]) {
        groups[canonical].push(lead);
      } else {
        groups.new.push(lead);
      }
    }
    return groups;
  }, [leads]);

  return (
    <Card className="min-w-0 overflow-hidden border-emerald-500/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-emerald-500" />
              Canonical 7-Stage Sales Pipeline (EstateFlow Funnel)
              {(isLoading || isUpdating) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription className="text-xs">
              Drag or advance prospective buyers from ingestion through tour, floorplan negotiation, and atomic unit booking.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Concurrency-safe bookings enabled
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 sm:px-4">
        <ScrollArea className="w-full pb-3">
          <div className="flex w-max min-w-full items-start gap-3 pb-2">
            {CANONICAL_LEAD_STAGES.map((stage) => {
              const stageLeads = groupedLeads[stage] || [];
              const isTerminalWon = stage === 'booked';
              const isTerminalLost = stage === 'lost';

              return (
                <section
                  key={stage}
                  className={cn(
                    'flex h-[420px] w-64 shrink-0 flex-col overflow-hidden rounded-md border shadow-sm transition-colors',
                    STAGE_ACCENT[stage] || 'border-border'
                  )}
                >
                  {/* Column Header */}
                  <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/85 px-3 backdrop-blur-sm">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
                        {LEAD_STAGE_LABEL[stage]}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {isTerminalWon ? 'Won' : isTerminalLost ? 'Closed' : 'Active'}
                      </p>
                    </div>
                    <Badge
                      variant={isTerminalWon ? 'default' : isTerminalLost ? 'destructive' : 'secondary'}
                      className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
                    >
                      {stageLeads.length}
                    </Badge>
                  </div>

                  {/* Cards Area */}
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
                    {stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        selected={lead.id === selectedLeadId}
                        disabled={isUpdating}
                        onSelect={onSelectLead}
                        onChangeStage={onChangeStage}
                        onOpenBooking={onOpenBooking}
                      />
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border/60 px-3 text-center text-xs text-muted-foreground">
                        No prospects in {LEAD_STAGE_LABEL[stage]}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
