import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search, SlidersHorizontal, UserRoundSearch } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCrmLeadSearch, type CrmLead } from '@/hooks/useMarketplace';
import { cn } from '@/lib/utils';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from './leadStageConfig';

type LeadRecordNavigatorProps = {
  companyId?: string | null;
  selectedLead: CrmLead | null;
  fallbackLeads: CrmLead[];
  onSelectLead: (leadId: string) => void;
};

function initials(name?: string | null) {
  return (name || 'Lead')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function statusClasses(status: string) {
  if (status === 'won') return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300';
  if (status === 'lost') return 'border-rose-400/30 bg-rose-500/15 text-rose-300';
  return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
}

export function LeadRecordNavigator({ companyId, selectedLead, fallbackLeads, onSelectLead }: LeadRecordNavigatorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [status, setStatus] = useState('all');
  const searchQuery = useCrmLeadSearch(companyId, debouncedSearch, stage, status, open);
  const fallbackResults = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    return fallbackLeads
      .filter((lead) => (
        (stage === 'all' || lead.stage === stage)
        && (status === 'all' || lead.status === status)
        && (!query || `${lead.contact_name || ''} ${lead.contact_email || ''} ${lead.contact_phone || ''} ${lead.listing_title || ''} ${lead.stage} ${lead.status}`.toLowerCase().includes(query))
      ))
      .sort((left, right) => right.score - left.score || Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, 30);
  }, [debouncedSearch, fallbackLeads, stage, status]);
  const isUsingFallback = searchQuery.isError;
  const results = isUsingFallback ? fallbackResults : searchQuery.data || [];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <section className="rounded-lg border border-border/70 bg-card/95 p-3 shadow-sm shadow-black/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Lead record</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Search the full company pipeline without paging through records.</p>
        </div>
        <Badge variant="outline" className="hidden gap-1.5 text-muted-foreground sm:flex"><UserRoundSearch className="h-3.5 w-3.5" />Record finder</Badge>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="lead-record-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-16 w-full justify-between gap-3 border-border/80 bg-background/60 px-3 py-2.5 text-left font-normal transition-colors hover:border-cyan-400/40 hover:bg-background"
          >
            {selectedLead ? (
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 border border-cyan-400/20"><AvatarFallback className="bg-cyan-500/10 text-cyan-200">{initials(selectedLead.contact_name)}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="truncate font-semibold text-foreground">{selectedLead.contact_name || 'Unnamed lead'}</span><Badge variant="outline" className={cn('capitalize', statusClasses(selectedLead.status))}>{selectedLead.status}</Badge><Badge variant="secondary">Score {selectedLead.score}</Badge></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{selectedLead.contact_phone || selectedLead.contact_email || 'No contact details'} · {selectedLead.listing_title || 'No listing linked'} · {LEAD_STAGE_LABEL[selectedLead.stage] || selectedLead.stage}</p>
                </div>
              </div>
            ) : <span className="text-muted-foreground">Find a lead record</span>}
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Find another</span><ChevronsUpDown className="h-4 w-4" /></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] overflow-hidden p-0" align="start" sideOffset={6}>
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Search name, phone, email, listing, stage..." />
            <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/60 p-2">
              <span className="flex h-9 items-center justify-center px-2 text-muted-foreground"><SlidersHorizontal className="h-4 w-4" /></span>
              <select aria-label="Finder stage" className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All stages</option>{LEAD_STAGE_ORDER.map((value) => <option key={value} value={value}>{LEAD_STAGE_LABEL[value]}</option>)}</select>
              <select aria-label="Finder status" className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option></select>
            </div>
            <CommandList className="max-h-[420px]">
              {searchQuery.isLoading || search !== debouncedSearch ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching company leads...</div>
              ) : results.length === 0 ? (
                <CommandEmpty>No leads match this search and filter combination.</CommandEmpty>
              ) : <>
                {isUsingFallback && <div className="border-b border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">Showing loaded pipeline results while indexed search is being deployed.</div>}
                {results.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={lead.id}
                  className="group gap-3 border-b border-border/40 px-3 py-3 text-foreground transition-colors duration-150 last:border-0 data-[selected=true]:bg-cyan-500/10 data-[selected=true]:text-foreground data-[selected=true]:shadow-[inset_3px_0_0_0_rgb(34_211_238/0.8)]"
                  onSelect={() => {
                    onSelectLead(lead.id);
                    setOpen(false);
                  }}
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-transparent transition-colors group-data-[selected=true]:border-cyan-400/30"><AvatarFallback className="bg-muted text-xs text-foreground group-data-[selected=true]:bg-cyan-500/15 group-data-[selected=true]:text-cyan-100">{initials(lead.contact_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="truncate font-medium">{lead.contact_name || 'Unnamed lead'}</p><Badge variant="outline" className={cn('shrink-0 capitalize', statusClasses(lead.status))}>{lead.status}</Badge></div>
                    <p className="mt-1 truncate text-xs text-muted-foreground group-data-[selected=true]:text-foreground/75">{lead.contact_phone || lead.contact_email || 'No contact details'} · {lead.listing_title || 'No listing'}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground group-data-[selected=true]:text-foreground/65">{LEAD_STAGE_LABEL[lead.stage] || lead.stage} · Score {lead.score} · Last activity {lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : 'not recorded'}</p>
                  </div>
                  <Check className={cn('h-4 w-4 shrink-0 text-cyan-400', selectedLead?.id === lead.id ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
                ))}
              </>}
            </CommandList>
            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground"><span>{debouncedSearch ? `${results.length} best matches` : 'Recent high-score leads'}</span><span>Up to 30 results · refine to narrow</span></div>
          </Command>
        </PopoverContent>
      </Popover>
    </section>
  );
}