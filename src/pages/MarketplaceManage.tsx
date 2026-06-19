import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  CircleOff,
  Clock3,
  Eye,
  Flame,
  Loader2,
  Megaphone,
  MessageSquareText,
  Phone,
  Plus,
  Rocket,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  ToggleLeft,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/useAuth';
import { cn } from '@/lib/utils';
import {
  useAssignCrmLead,
  useConvertCrmLead,
  useCreateCrmLeadNote,
  useCreateCrmLeadTask,
  useCrmAssignableUsers,
  useCrmLeadActivities,
  useCrmLeads,
  useCrmLeadTasks,
  useManagedMarketplaceListings,
  useModerationCases,
  usePublisherVerification,
  useToggleMarketplacePublish,
  useUpdateCrmLeadStage,
  useUpdateCrmLeadTaskStatus,
  useUpdateModerationCaseState,
  type CrmLead,
  type CrmLeadTask,
} from '@/hooks/useMarketplace';

const LEAD_STAGE_ORDER = [
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

const LEAD_STAGE_LABEL: Record<string, string> = {
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

function formatCurrency(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

function formatRelativeTime(value?: string | null) {
  if (!value) return 'No activity yet';
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = Math.max(0, now - then);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function activityMessage(payload: Record<string, unknown>) {
  const note = payload.note;
  if (typeof note === 'string' && note.trim().length > 0) return note;

  const assignedTo = payload.assigned_to;
  if (typeof assignedTo === 'string' && assignedTo.length > 0) return 'Lead reassigned';
  return 'Activity recorded';
}

function isTaskOverdue(task: CrmLeadTask) {
  return task.status === 'open' && new Date(task.due_at).getTime() < Date.now();
}

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
        'w-full rounded-xl border p-3 text-left shadow-sm backdrop-blur-sm transition',
        selected
          ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-400/30'
          : 'border-border/70 bg-card/80 hover:bg-card'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{lead.contact_name || 'Unnamed Lead'}</p>
          <p className="text-xs text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No contact details'}</p>
        </div>
        <Badge variant="outline">Score {lead.score ?? 0}</Badge>
      </div>

      <div className="mb-3">
        <p className="text-xs text-muted-foreground">Listing</p>
        <p className="truncate text-sm">{lead.listing_title || 'No listing linked'}</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p>
          <Badge variant="secondary" className="mt-1 text-[11px]">
            {lead.priority}
          </Badge>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
          <Badge variant="outline" className="mt-1 text-[11px]">
            {lead.status}
          </Badge>
        </div>
      </div>

      <Select value={lead.stage} onValueChange={(value) => onChangeStage(lead.id, value)} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Update stage" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STAGE_ORDER.map((stage) => (
            <SelectItem key={stage} value={stage} className="text-xs">
              {LEAD_STAGE_LABEL[stage]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </button>
  );
}

export default function MarketplaceManage() {
  const { user } = useAuth();
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager } = useUserRole();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [taskOwner, setTaskOwner] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskNote, setTaskNote] = useState('');

  useEffect(() => {
    if (!taskDueAt) {
      const future = new Date(Date.now() + 24 * 3600000);
      const iso = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString();
      setTaskDueAt(iso.slice(0, 16));
    }
  }, [taskDueAt]);

  const leadsQuery = useCrmLeads(activeCompanyId);
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const moderationCasesQuery = useModerationCases(activeCompanyId);
  const verificationQuery = usePublisherVerification(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);

  const updateLeadStage = useUpdateCrmLeadStage(activeCompanyId);
  const assignLead = useAssignCrmLead(activeCompanyId);
  const createNote = useCreateCrmLeadNote(activeCompanyId);
  const createTask = useCreateCrmLeadTask(activeCompanyId);
  const updateTaskStatus = useUpdateCrmLeadTaskStatus(activeCompanyId);
  const convertLead = useConvertCrmLead(activeCompanyId);
  const togglePublish = useToggleMarketplacePublish(activeCompanyId);
  const updateModerationState = useUpdateModerationCaseState(activeCompanyId);

  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);
  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);
  const moderationCases = useMemo(() => moderationCasesQuery.data ?? [], [moderationCasesQuery.data]);
  const assignableUsers = useMemo(() => assignableUsersQuery.data ?? [], [assignableUsersQuery.data]);

  useEffect(() => {
    if (!selectedLeadId && leads.length > 0) {
      setSelectedLeadId(leads[0].id);
    }
    if (selectedLeadId && !leads.find((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(leads[0]?.id ?? null);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? null, [leads, selectedLeadId]);
  const leadActivitiesQuery = useCrmLeadActivities(selectedLead?.id);
  const leadTasksQuery = useCrmLeadTasks(selectedLead?.id);
  const leadActivities = useMemo(() => leadActivitiesQuery.data ?? [], [leadActivitiesQuery.data]);
  const leadTasks = useMemo(() => leadTasksQuery.data ?? [], [leadTasksQuery.data]);

  useEffect(() => {
    if (!taskOwner && selectedLead?.assigned_to) {
      setTaskOwner(selectedLead.assigned_to);
    }
  }, [selectedLead?.assigned_to, taskOwner]);

  const groupedLeads = useMemo(() => {
    const bucket: Record<string, CrmLead[]> = {};
    for (const stage of LEAD_STAGE_ORDER) bucket[stage] = [];
    for (const lead of leads) {
      const key = bucket[lead.stage] ? lead.stage : 'new';
      bucket[key].push(lead);
    }
    return bucket;
  }, [leads]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter((lead) => ['qualified', 'viewing_scheduled', 'offer_made', 'lease_in_progress'].includes(lead.stage)).length;
    const converted = leads.filter((lead) => lead.stage === 'converted').length;
    const openTasks = leadTasks.filter((task) => task.status === 'open').length;
    const overdueTasks = leadTasks.filter((task) => isTaskOverdue(task)).length;
    const staleLeads = leads.filter((lead) => {
      if (!lead.last_activity_at) return true;
      return Date.now() - new Date(lead.last_activity_at).getTime() > 48 * 3600000;
    }).length;
    const activeListings = listings.filter((listing) => listing.status === 'live').length;

    return { total, qualified, converted, openTasks, overdueTasks, staleLeads, activeListings };
  }, [leadTasks, leads, listings]);

  if (!isLandlord && !isPropertyManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const companyName = companies.find((company) => company.id === activeCompanyId)?.name || 'Active company';
  const verificationState = verificationQuery.data?.state ?? 'pending';
  const verificationBadgeVariant = verificationState === 'verified' ? 'default' : verificationState === 'rejected' ? 'destructive' : 'secondary';
  const conversionRate = metrics.total > 0 ? Math.round((metrics.converted / metrics.total) * 100) : 0;
  const isWorkingMutation =
    updateLeadStage.isPending ||
    assignLead.isPending ||
    createNote.isPending ||
    createTask.isPending ||
    updateTaskStatus.isPending ||
    convertLead.isPending;

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Marketplace Control Room</p>
            <h1 className="text-2xl font-semibold">Revenue CRM + Marketplace Ops</h1>
            <p className="text-sm text-muted-foreground">Run assignment, conversion, publishing and trust workflows for {companyName}.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Command center active
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-2xl">{metrics.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">All captured marketplace leads.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified Pipeline</CardDescription>
            <CardTitle className="text-2xl">{metrics.qualified}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Leads ready for viewing and offer flow.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-2xl">{metrics.converted}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Leads moved to lease conversion.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-2xl">{conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={conversionRate} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Listings</CardDescription>
            <CardTitle className="text-2xl">{metrics.activeListings}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Listings currently visible publicly.</CardContent>
        </Card>
      </section>

      <Tabs defaultValue="crm" className="space-y-5">
        <TabsList className="h-auto w-full justify-start gap-2 rounded-xl bg-muted/60 p-1.5">
          <TabsTrigger value="crm" className="rounded-lg px-4 py-2 text-xs">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            CRM Workstation
          </TabsTrigger>
          <TabsTrigger value="listings" className="rounded-lg px-4 py-2 text-xs">
            <Megaphone className="mr-1.5 h-3.5 w-3.5" />
            Listing Controls
          </TabsTrigger>
          <TabsTrigger value="trust" className="rounded-lg px-4 py-2 text-xs">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            Trust + Moderation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm" className="space-y-4">
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Pipeline Board
                  {(leadsQuery.isLoading || isWorkingMutation) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
                <CardDescription>Choose a lead to open timeline, notes, assignment and task actions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                  <div className="flex min-w-full gap-3 pr-2">
                    {LEAD_STAGE_ORDER.map((stage) => (
                      <div key={stage} className={cn('min-h-[520px] w-[280px] rounded-xl border p-3', STAGE_ACCENT[stage] || 'border-border')}>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{LEAD_STAGE_LABEL[stage]}</p>
                          <Badge variant="secondary">{groupedLeads[stage]?.length || 0}</Badge>
                        </div>

                        <div className="space-y-2">
                          {(groupedLeads[stage] || []).map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              selected={lead.id === selectedLead?.id}
                              disabled={updateLeadStage.isPending}
                              onSelect={setSelectedLeadId}
                              onChangeStage={(leadId, nextStage) => updateLeadStage.mutate({ leadId, stage: nextStage })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/20 bg-gradient-to-br from-card via-card to-cyan-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-500" />
                  Lead Intelligence Panel
                </CardTitle>
                <CardDescription>Full lead CRM: assign, convert, add notes, and execute SLA tasks.</CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedLead && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Select a lead from the pipeline to open the CRM panel.
                  </div>
                )}

                {selectedLead && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 border border-border/80">
                            <AvatarFallback>{(selectedLead.contact_name || 'LD').slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{selectedLead.contact_name || 'Unnamed Lead'}</p>
                            <p className="text-xs text-muted-foreground">{selectedLead.contact_phone || selectedLead.contact_email || 'No contact details'}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{selectedLead.priority}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-border/70 p-2">
                          <p className="text-muted-foreground">Score</p>
                          <p className="font-medium">{selectedLead.score || 0}</p>
                        </div>
                        <div className="rounded-lg border border-border/70 p-2">
                          <p className="text-muted-foreground">Last activity</p>
                          <p className="font-medium">{formatRelativeTime(selectedLead.last_activity_at)}</p>
                        </div>
                        <div className="rounded-lg border border-border/70 p-2">
                          <p className="text-muted-foreground">Source</p>
                          <p className="font-medium">{selectedLead.source}</p>
                        </div>
                        <div className="rounded-lg border border-border/70 p-2">
                          <p className="text-muted-foreground">Listing</p>
                          <p className="truncate font-medium">{selectedLead.listing_title || 'No listing'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/60 p-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Assign owner</p>
                        <Select
                          value={selectedLead.assigned_to || 'unassigned'}
                          onValueChange={(value) =>
                            assignLead.mutate({
                              leadId: selectedLead.id,
                              assigneeUserId: value === 'unassigned' ? null : value,
                              actorUserId: user?.id,
                            })
                          }
                          disabled={assignLead.isPending || assignableUsersQuery.isLoading}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Assign owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              Unassigned
                            </SelectItem>
                            {assignableUsers.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id} className="text-xs">
                                {member.name} ({member.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-xl border border-border/60 p-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Advance stage</p>
                        <Select
                          value={selectedLead.stage}
                          onValueChange={(value) => updateLeadStage.mutate({ leadId: selectedLead.id, stage: value })}
                          disabled={updateLeadStage.isPending}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Set stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STAGE_ORDER.map((stage) => (
                              <SelectItem key={stage} value={stage} className="text-xs">
                                {LEAD_STAGE_LABEL[stage]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Quick actions</p>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8"
                          disabled={convertLead.isPending || selectedLead.stage === 'converted'}
                          onClick={() => convertLead.mutate({ leadId: selectedLead.id })}
                        >
                          <Rocket className="mr-1.5 h-3.5 w-3.5" />
                          Convert Lead
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border border-border/60 p-2">
                          <p className="text-muted-foreground">Open tasks</p>
                          <p className="font-semibold">{metrics.openTasks}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 p-2">
                          <p className="text-muted-foreground">Overdue</p>
                          <p className="font-semibold text-rose-600">{metrics.overdueTasks}</p>
                        </div>
                        <div className="rounded-lg border border-border/60 p-2">
                          <p className="text-muted-foreground">Stale leads</p>
                          <p className="font-semibold text-amber-600">{metrics.staleLeads}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Add note</p>
                      <Textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        rows={3}
                        placeholder="Capture context: budget fit, objections, preferred move-in date..."
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={createNote.isPending || noteDraft.trim().length === 0}
                          onClick={() => {
                            createNote.mutate(
                              { leadId: selectedLead.id, actorUserId: user?.id, note: noteDraft },
                              { onSuccess: () => setNoteDraft('') }
                            );
                          }}
                        >
                          <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
                          Save note
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Create follow-up task</p>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Select value={taskOwner} onValueChange={setTaskOwner}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Task owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableUsers.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id} className="text-xs">
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <input
                          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                          type="datetime-local"
                          value={taskDueAt}
                          onChange={(event) => setTaskDueAt(event.target.value)}
                        />
                      </div>
                      <Textarea
                        value={taskNote}
                        onChange={(event) => setTaskNote(event.target.value)}
                        rows={2}
                        className="mt-2"
                        placeholder="Task notes (optional)"
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={createTask.isPending || !taskOwner || !taskDueAt}
                          onClick={() => {
                            createTask.mutate(
                              {
                                leadId: selectedLead.id,
                                ownerUserId: taskOwner,
                                dueAt: new Date(taskDueAt).toISOString(),
                                notes: taskNote,
                                taskType: 'follow_up',
                              },
                              { onSuccess: () => setTaskNote('') }
                            );
                          }}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add task
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {selectedLead && (
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckSquare className="h-4 w-4" />
                    Lead Tasks
                  </CardTitle>
                  <CardDescription>SLA execution board for this lead.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {leadTasksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}

                  {leadTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn('rounded-xl border p-3', isTaskOverdue(task) ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/70')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{task.task_type}</p>
                          <p className="text-xs text-muted-foreground">Due {new Date(task.due_at).toLocaleString()}</p>
                          {task.notes && <p className="mt-1 text-xs text-muted-foreground">{task.notes}</p>}
                        </div>
                        <Badge variant={task.status === 'done' ? 'default' : task.status === 'canceled' ? 'outline' : 'secondary'}>{task.status}</Badge>
                      </div>

                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={task.status === 'done' || updateTaskStatus.isPending}
                          onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: selectedLead.id, status: 'done' })}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          disabled={task.status === 'canceled' || updateTaskStatus.isPending}
                          onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: selectedLead.id, status: 'canceled' })}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}

                  {!leadTasksQuery.isLoading && leadTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks for this lead yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock3 className="h-4 w-4" />
                    Activity Timeline
                  </CardTitle>
                  <CardDescription>Full contact and internal activity trace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {leadActivitiesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading timeline...</p>}

                  {leadActivities.map((activity) => (
                    <div key={activity.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium capitalize">{activity.activity_type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{activityMessage(activity.payload_json)}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{formatRelativeTime(activity.occurred_at)}</p>
                      </div>
                    </div>
                  ))}

                  {!leadActivitiesQuery.isLoading && leadActivities.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activities logged yet.</p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Listing Publish Controls</h2>
              {(listingsQuery.isLoading || togglePublish.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Admin-only Visibility Toggles</CardTitle>
                <CardDescription>
                  {isLandlord
                    ? 'You can publish or pause listings instantly. Property managers can view status only.'
                    : 'You can view listing visibility. Ask a landlord to change publish status.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {listings.map((listing) => {
                  const isLive = listing.status === 'live';
                  return (
                    <div key={listing.id} className="rounded-xl border border-border/70 bg-card/70 p-4 transition hover:bg-card">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{listing.title}</h3>
                            <Badge variant={isLive ? 'default' : 'outline'}>{isLive ? 'Live' : listing.status}</Badge>
                            <Badge variant="secondary">{listing.verification_state}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {listing.city}
                            {listing.area ? `, ${listing.area}` : ''} · {formatCurrency(listing.rent_amount, listing.currency)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {!isLandlord && (
                            <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                              <CircleOff className="h-3 w-3" />
                              Landlord only
                            </div>
                          )}
                          <Switch
                            checked={isLive}
                            disabled={!isLandlord || togglePublish.isPending}
                            onCheckedChange={(checked) => togglePublish.mutate({ listingId: listing.id, publish: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!listingsQuery.isLoading && listings.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No marketplace listings yet for this company.
                  </div>
                )}

                <div className="pt-2">
                  <Button variant="outline" asChild>
                    <a href="/marketplace" target="_blank" rel="noreferrer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Open Public Marketplace View
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="trust" className="space-y-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Verification + Trust Gate</h2>
              {verificationQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verificationState === 'verified' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  Publisher Verification
                </CardTitle>
                <CardDescription>Publish-to-live is server-enforced for landlord role and verified publishers only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Current state:</span>
                  <Badge variant={verificationBadgeVariant}>{verificationState}</Badge>
                </div>
                {verificationQuery.data?.rejection_reason && <p className="text-muted-foreground">Reason: {verificationQuery.data.rejection_reason}</p>}
                {!verificationQuery.data && (
                  <p className="text-muted-foreground">No verification record yet. Submit verification artifacts to unlock publishing.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Moderation Queue</h2>
              {(moderationCasesQuery.isLoading || updateModerationState.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Open and In-Review Cases</CardTitle>
                <CardDescription>Resolve flagged listing and inquiry risk events before broad rollout.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {moderationCases.slice(0, 12).map((moderationCase) => (
                  <div key={moderationCase.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium">{moderationCase.reason_code}</p>
                        <p className="text-xs text-muted-foreground">
                          Severity: {moderationCase.severity} · Queue: {moderationCase.queue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={moderationCase.state === 'open' ? 'destructive' : 'secondary'}>{moderationCase.state}</Badge>
                        <Select
                          value={moderationCase.state}
                          onValueChange={(nextState) =>
                            updateModerationState.mutate({
                              caseId: moderationCase.id,
                              state: nextState as 'open' | 'in_review' | 'resolved' | 'dismissed',
                            })
                          }
                          disabled={!isPropertyManager && !isLandlord}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Set state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open" className="text-xs">
                              Open
                            </SelectItem>
                            <SelectItem value="in_review" className="text-xs">
                              In Review
                            </SelectItem>
                            <SelectItem value="resolved" className="text-xs">
                              Resolved
                            </SelectItem>
                            <SelectItem value="dismissed" className="text-xs">
                              Dismissed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                {!moderationCasesQuery.isLoading && moderationCases.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No active moderation cases for this company.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Overdue tasks
          </div>
          <p className="mt-1 text-xl font-semibold">{metrics.overdueTasks}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
            Stale leads
          </div>
          <p className="mt-1 text-xl font-semibold">{metrics.staleLeads}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-cyan-500" />
            Open calls/tasks
          </div>
          <p className="mt-1 text-xl font-semibold">{metrics.openTasks}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/70 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5 text-emerald-500" />
            Public reach
          </div>
          <p className="mt-1 text-xl font-semibold">{metrics.activeListings}</p>
          <a href="/rent" className="mt-2 inline-flex items-center text-xs text-primary hover:underline">
            Open SEO rent pages
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
