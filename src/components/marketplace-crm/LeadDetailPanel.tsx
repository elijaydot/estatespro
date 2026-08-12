import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  Clock3,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  Plus,
  Rocket,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/useAuth';
import {
  useAssignCrmLead,
  useConvertCrmLead,
  useCreateCrmLeadNote,
  useCreateCrmLeadTask,
  useCrmLeadActivities,
  useCrmLeadTasks,
  useUpdateCrmLeadStage,
  useUpdateCrmLeadTaskStatus,
  type CrmAssignableUser,
  type CrmLead,
  type CrmLeadTask,
} from '@/hooks/useMarketplace';
import { cn } from '@/lib/utils';
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from './leadStageConfig';
import { TablePagination } from './TablePagination';

function formatRelativeTime(value?: string | null) {
  if (!value) return 'No activity recorded';
  const hours = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function activityMessage(payload: Record<string, unknown>) {
  if (typeof payload.note === 'string' && payload.note.trim()) return payload.note;
  if (typeof payload.assigned_to === 'string' && payload.assigned_to) return 'Lead reassigned';
  if (typeof payload.stage === 'string' && payload.stage) return `Moved to ${LEAD_STAGE_LABEL[payload.stage] || payload.stage.replace(/_/g, ' ')}`;
  return 'Activity recorded';
}

function isTaskOverdue(task: CrmLeadTask) {
  return task.status === 'open' && new Date(task.due_at).getTime() < Date.now();
}

function ActivityTypeIcon({ type }: { type: string }) {
  const Icon = type === 'call'
    ? Phone
    : type === 'email'
      ? Mail
      : type === 'sms' || type === 'whatsapp'
        ? MessageCircle
        : type === 'viewing'
          ? CalendarDays
          : type === 'note'
            ? MessageSquareText
            : CircleDot;

  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

function leadStatusClasses(status: string) {
  if (status === 'won') return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300';
  if (status === 'lost') return 'border-rose-400/30 bg-rose-500/15 text-rose-300';
  return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
}

function leadScoreClasses(score: number) {
  if (score >= 70) return 'border-lime-400/30 bg-lime-500/20 text-lime-300';
  if (score >= 40) return 'border-amber-400/30 bg-amber-500/15 text-amber-300';
  return 'border-rose-400/30 bg-rose-500/15 text-rose-300';
}

type LeadDetailPanelProps = {
  companyId?: string | null;
  lead: CrmLead | null;
  assignableUsers: CrmAssignableUser[];
  staleLeadCount: number;
};

export function LeadDetailPanel({ companyId, lead, assignableUsers, staleLeadCount }: LeadDetailPanelProps) {
  const { user } = useAuth();
  const [noteDraft, setNoteDraft] = useState('');
  const [taskOwner, setTaskOwner] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskDateFrom, setTaskDateFrom] = useState('');
  const [taskDateTo, setTaskDateTo] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(10);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityDateFrom, setActivityDateFrom] = useState('');
  const [activityDateTo, setActivityDateTo] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [taskRegisterOpen, setTaskRegisterOpen] = useState(false);
  const [activityRegisterOpen, setActivityRegisterOpen] = useState(false);

  const activitiesQuery = useCrmLeadActivities(lead?.id);
  const tasksQuery = useCrmLeadTasks(lead?.id);
  const assignLead = useAssignCrmLead(companyId);
  const updateLeadStage = useUpdateCrmLeadStage(companyId);
  const convertLead = useConvertCrmLead(companyId);
  const createNote = useCreateCrmLeadNote(companyId);
  const createTask = useCreateCrmLeadTask(companyId);
  const updateTaskStatus = useUpdateCrmLeadTaskStatus(companyId);

  const activities = useMemo(() => activitiesQuery.data || [], [activitiesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);
  const openTaskCount = tasks.filter((task) => task.status === 'open').length;
  const overdueTaskCount = tasks.filter(isTaskOverdue).length;
  const matchesDateRange = (value: string, from: string, to: string) => {
    const timestamp = new Date(value).getTime();
    return (!from || timestamp >= new Date(`${from}T00:00:00`).getTime())
      && (!to || timestamp <= new Date(`${to}T23:59:59.999`).getTime());
  };
  const filteredTasks = useMemo(() => tasks.filter((task) => (
    (taskStatusFilter === 'all' || task.status === taskStatusFilter)
    && matchesDateRange(task.due_at, taskDateFrom, taskDateTo)
  )), [taskDateFrom, taskDateTo, taskStatusFilter, tasks]);
  const filteredActivities = useMemo(() => activities.filter((activity) => (
    (activityTypeFilter === 'all' || activity.activity_type === activityTypeFilter)
    && matchesDateRange(activity.occurred_at, activityDateFrom, activityDateTo)
  )), [activities, activityDateFrom, activityDateTo, activityTypeFilter]);
  const taskRows = filteredTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);
  const activityRows = filteredActivities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);
  const activityTypes = useMemo(() => Array.from(new Set(activities.map((activity) => activity.activity_type))), [activities]);

  useEffect(() => {
    if (!taskDueAt) {
      const future = new Date(Date.now() + 24 * 3600000);
      const localIso = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString();
      setTaskDueAt(localIso.slice(0, 16));
    }
  }, [taskDueAt]);

  useEffect(() => {
    setTaskOwner(lead?.assigned_to || '');
  }, [lead?.assigned_to, lead?.id]);

  useEffect(() => setTaskPage(1), [lead?.id, taskStatusFilter, taskDateFrom, taskDateTo, taskPageSize]);
  useEffect(() => setActivityPage(1), [lead?.id, activityTypeFilter, activityDateFrom, activityDateTo, activityPageSize]);

  const isWorking = assignLead.isPending || updateLeadStage.isPending || convertLead.isPending
    || createNote.isPending || createTask.isPending || updateTaskStatus.isPending;

  const taskOwnerOptions = useMemo(() => {
    if (!taskOwner || assignableUsers.some((member) => member.user_id === taskOwner)) return assignableUsers;
    return [...assignableUsers, { user_id: taskOwner, name: taskOwner, email: '', role: 'member' }];
  }, [assignableUsers, taskOwner]);

  if (!lead) {
    return (
      <Card className="border-cyan-500/20">
        <CardHeader><CardTitle>Lead Intelligence Panel</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a lead from the pipeline to open the CRM panel.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(360px,5fr)]">
      <div className="min-w-0 space-y-4">
      <Card className="overflow-hidden border-cyan-500/20 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3"><Avatar className="h-12 w-12 shrink-0 border border-cyan-400/20 bg-cyan-500/10"><AvatarFallback className="bg-cyan-500/10 text-cyan-200">{(lead.contact_name || 'LD').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-4 w-4 text-cyan-400" />{lead.contact_name || 'Lead'}</CardTitle><CardDescription className="mt-1 truncate">{lead.contact_phone || lead.contact_email || 'No phone or email'}</CardDescription><p className="mt-1 truncate text-xs text-muted-foreground">{lead.listing_title || 'No listing linked'} · {LEAD_STAGE_LABEL[lead.stage] || lead.stage}</p></div></div>
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="capitalize">{lead.priority}</Badge><Badge variant="outline" className={cn('capitalize', leadStatusClasses(lead.status))}>{lead.status}</Badge><Badge variant="outline" className={leadScoreClasses(lead.score || 0)}>Score {lead.score || 0}</Badge></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-muted-foreground">Owner</p>
              <Select value={lead.assigned_to || 'unassigned'} onValueChange={(value) => assignLead.mutate({ leadId: lead.id, assigneeUserId: value === 'unassigned' ? null : value, actorUserId: user?.id })} disabled={isWorking}>
                <SelectTrigger className="h-10 bg-background/60 text-xs transition-colors hover:border-cyan-400/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.name} ({member.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-muted-foreground">Stage</p>
              <Select value={lead.stage} onValueChange={(stage) => updateLeadStage.mutate({ leadId: lead.id, stage })} disabled={isWorking}>
                <SelectTrigger className="h-10 bg-background/60 text-xs transition-colors hover:border-cyan-400/40"><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STAGE_ORDER.map((stage) => <SelectItem key={stage} value={stage}>{LEAD_STAGE_LABEL[stage]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setNoteDialogOpen(true)}><MessageSquareText className="mr-1.5 h-3.5 w-3.5" />Add note</Button><Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New task</Button><Button size="sm" className="bg-lime-600 text-white hover:bg-lime-500" disabled={convertLead.isPending || lead.stage === 'converted'} onClick={() => convertLead.mutate({ leadId: lead.id })}><Rocket className="mr-1.5 h-3.5 w-3.5" />Convert lead</Button></div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 text-xs sm:grid-cols-4"><div className="bg-card px-3 py-3"><p className="text-muted-foreground">Last activity</p><p className="mt-1.5 font-semibold">{formatRelativeTime(lead.last_activity_at)}</p></div><div className="bg-card px-3 py-3"><p className="text-muted-foreground">Open tasks</p><p className="mt-1.5 font-semibold text-amber-300">{openTaskCount}</p></div><div className="bg-card px-3 py-3"><p className="text-muted-foreground">Overdue</p><p className="mt-1.5 font-semibold text-rose-400">{overdueTaskCount}</p></div><div className="bg-card px-3 py-3"><p className="text-muted-foreground">Stale pipeline</p><p className="mt-1.5 font-semibold text-amber-300">{staleLeadCount}</p></div></div>
        </CardContent>
      </Card>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add lead note</DialogTitle><DialogDescription>Capture context that should remain on this lead’s activity record.</DialogDescription></DialogHeader><Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={5} placeholder="Budget fit, objections, preferred move-in date..." /><DialogFooter><Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button><Button disabled={createNote.isPending || !noteDraft.trim()} onClick={() => createNote.mutate({ leadId: lead.id, actorUserId: user?.id, note: noteDraft }, { onSuccess: () => { setNoteDraft(''); setNoteDialogOpen(false); } })}><MessageSquareText className="mr-1.5 h-4 w-4" />Save note</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}><DialogContent><DialogHeader><DialogTitle>Create follow-up task</DialogTitle><DialogDescription>Assign the next action and give it a clear deadline.</DialogDescription></DialogHeader><div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Select value={taskOwner} onValueChange={setTaskOwner}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Task owner" /></SelectTrigger>
                <SelectContent>{taskOwnerOptions.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
              <input className="h-9 rounded-md border border-input bg-background px-3 text-xs" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
            </div>
            <Textarea value={taskNote} onChange={(event) => setTaskNote(event.target.value)} rows={3} placeholder="Task notes (optional)" />
          </div><DialogFooter><Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button><Button disabled={createTask.isPending || !taskOwner || !taskDueAt} onClick={() => createTask.mutate({ leadId: lead.id, ownerUserId: taskOwner, dueAt: new Date(taskDueAt).toISOString(), notes: taskNote, taskType: 'follow_up' }, { onSuccess: () => { setTaskNote(''); setTaskDialogOpen(false); } })}><Plus className="mr-1.5 h-4 w-4" />Add task</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={taskRegisterOpen} onOpenChange={setTaskRegisterOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader><DialogTitle>All lead tasks · {lead.contact_name || 'Lead'}</DialogTitle><DialogDescription>{tasks.length} tasks retained for this lead. Filter by status or due date.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><select aria-label="All lead tasks status" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}><option value="all">All status</option><option value="open">Open</option><option value="done">Completed</option><option value="canceled">Canceled</option></select><Input aria-label="All tasks due from" type="date" value={taskDateFrom} onChange={(event) => setTaskDateFrom(event.target.value)} /><Input aria-label="All tasks due to" type="date" value={taskDateTo} onChange={(event) => setTaskDateTo(event.target.value)} /></div>
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border/70"><div className="divide-y divide-border/60">{filteredTasks.map((task) => <div key={task.id} className={cn('flex items-start justify-between gap-3 p-3', isTaskOverdue(task) && 'bg-rose-500/5')}><div><div className="flex items-center gap-2"><p className="text-sm font-medium capitalize">{task.task_type.replace(/_/g, ' ')}</p><Badge variant={task.status === 'done' ? 'default' : task.status === 'canceled' ? 'outline' : 'secondary'}>{task.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Due {new Date(task.due_at).toLocaleString()}</p>{task.notes && <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>}</div><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" disabled={task.status === 'done' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'done' })}>Complete</Button><Button size="sm" variant="ghost" disabled={task.status === 'canceled' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'canceled' })}>Cancel</Button></div></div>)}{filteredTasks.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No tasks match this view.</p>}</div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTaskRegisterOpen(false)}>Close</Button><Button onClick={() => { setTaskRegisterOpen(false); setTaskDialogOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />New task</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityRegisterOpen} onOpenChange={setActivityRegisterOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
          <DialogHeader><DialogTitle>Complete activity timeline · {lead.contact_name || 'Lead'}</DialogTitle><DialogDescription>{activities.length} recorded events, newest first.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><select aria-label="All activity type" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={activityTypeFilter} onChange={(event) => setActivityTypeFilter(event.target.value)}><option value="all">All activity</option>{activityTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select><Input aria-label="All activities from date" type="date" value={activityDateFrom} onChange={(event) => setActivityDateFrom(event.target.value)} /><Input aria-label="All activities to date" type="date" value={activityDateTo} onChange={(event) => setActivityDateTo(event.target.value)} /></div>
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border/70"><div className="divide-y divide-border/60">{filteredActivities.map((activity) => <div key={activity.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_180px]"><div><p className="text-sm font-medium capitalize">{activity.activity_type.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-muted-foreground">{activityMessage(activity.payload_json)}</p>{activity.channel && <Badge variant="outline" className="mt-2 capitalize">{activity.channel}</Badge>}</div><div className="text-xs text-muted-foreground sm:text-right"><p>{new Date(activity.occurred_at).toLocaleString()}</p><p className="mt-1">{formatRelativeTime(activity.occurred_at)}</p></div></div>)}{filteredActivities.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No activities match this view.</p>}</div></div>
          <DialogFooter><Button variant="outline" onClick={() => setActivityRegisterOpen(false)}>Close</Button><Button onClick={() => { setActivityRegisterOpen(false); setNoteDialogOpen(true); }}><MessageSquareText className="mr-1.5 h-4 w-4" />Add note</Button></DialogFooter>
        </DialogContent>
      </Dialog>

        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15">
          <CardHeader className="border-b border-border/50 pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300"><CheckSquare className="h-4 w-4" /></span>Lead Tasks</CardTitle><CardDescription className="mt-1">SLA execution and next actions.</CardDescription></div><Button size="sm" variant="ghost" onClick={() => { setTaskStatusFilter('all'); setTaskDateFrom(''); setTaskDateTo(''); setTaskRegisterOpen(true); }}>View all ({tasks.length})</Button></div></CardHeader>
          <CardContent className="p-0"><div className="grid grid-cols-1 gap-2 border-b border-border/50 p-4 sm:grid-cols-3"><select aria-label="Task status" className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs transition-colors hover:border-cyan-400/40" value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}><option value="all">All status</option><option value="open">Open</option><option value="done">Completed</option><option value="canceled">Canceled</option></select><Input aria-label="Tasks due from" type="date" className="bg-background/60" value={taskDateFrom} onChange={(event) => setTaskDateFrom(event.target.value)} /><Input aria-label="Tasks due to" type="date" className="bg-background/60" value={taskDateTo} onChange={(event) => setTaskDateTo(event.target.value)} /></div><div className="divide-y divide-border/60">
            {taskRows.map((task) => (
              <div key={task.id} className={cn('p-4 transition-colors hover:bg-muted/30', isTaskOverdue(task) && 'bg-rose-500/5 hover:bg-rose-500/10')}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-semibold capitalize">{task.task_type.replace(/_/g, ' ')}</p><p className={cn('mt-1 text-xs text-muted-foreground', isTaskOverdue(task) && 'text-rose-400')}>{isTaskOverdue(task) ? 'Overdue' : 'Due'} {new Date(task.due_at).toLocaleString()}</p>{task.notes && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{task.notes}</p>}</div>
                  <Badge variant="outline" className={cn('capitalize', task.status === 'done' ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : isTaskOverdue(task) ? 'border-rose-400/30 bg-rose-500/15 text-rose-300' : task.status === 'open' ? 'border-amber-400/30 bg-amber-500/15 text-amber-300' : '')}>{isTaskOverdue(task) ? 'overdue' : task.status}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" disabled={task.status === 'done' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'done' })}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Complete</Button>
                  <Button size="sm" variant="ghost" disabled={task.status === 'canceled' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'canceled' })}>Cancel</Button>
                </div>
              </div>
            ))}
            {!tasksQuery.isLoading && filteredTasks.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tasks match this view.</p>}
            </div>{filteredTasks.length > 0 && <div className="bg-background/25"><TablePagination page={taskPage} pageSize={taskPageSize} total={filteredTasks.length} onPageChange={setTaskPage} onPageSizeChange={setTaskPageSize} /></div>}
          </CardContent>
        </Card>
      </div>
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15 xl:sticky xl:top-4">
          <CardHeader className="border-b border-border/50 pb-4"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300"><Clock3 className="h-4 w-4" /></span>Activity Timeline</CardTitle><CardDescription className="mt-1">Full contact and internal activity trace.</CardDescription></div><Button size="sm" variant="ghost" onClick={() => { setActivityTypeFilter('all'); setActivityDateFrom(''); setActivityDateTo(''); setActivityRegisterOpen(true); }}>View all ({activities.length})</Button></div></CardHeader>
          <CardContent className="p-0"><div className="grid grid-cols-1 gap-2 border-b border-border/50 p-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3"><select aria-label="Activity type" className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs transition-colors hover:border-cyan-400/40" value={activityTypeFilter} onChange={(event) => setActivityTypeFilter(event.target.value)}><option value="all">All activity</option>{activityTypes.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select><Input aria-label="Activities from date" type="date" className="bg-background/60" value={activityDateFrom} onChange={(event) => setActivityDateFrom(event.target.value)} /><Input aria-label="Activities to date" type="date" className="bg-background/60" value={activityDateTo} onChange={(event) => setActivityDateTo(event.target.value)} /></div><div className="px-4 py-2">
            {activityRows.map((activity) => (
              <div key={activity.id} className="group relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-4">
                <div className="relative flex justify-center"><span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300 transition-colors duration-200 group-hover:border-cyan-300/50 group-hover:bg-cyan-500/20"><ActivityTypeIcon type={activity.activity_type} /></span><span className="absolute bottom-[-16px] top-8 w-px bg-border/80 group-last:hidden" aria-hidden="true" /></div>
                <div className="min-w-0 rounded-lg px-1 transition-transform duration-200 group-hover:translate-x-0.5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold capitalize">{activity.activity_type.replace(/_/g, ' ')}</p><p className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(activity.occurred_at)}</p></div><p className="mt-1 text-sm leading-5 text-muted-foreground">{activityMessage(activity.payload_json)}</p>{activity.channel && <Badge variant="outline" className="mt-2 capitalize">{activity.channel}</Badge>}<p className="mt-2 text-[11px] text-muted-foreground/70">{new Date(activity.occurred_at).toLocaleString()}</p></div>
              </div>
            ))}
            {!activitiesQuery.isLoading && filteredActivities.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activities match this view.</p>}
            </div>{filteredActivities.length > 0 && <div className="bg-background/25"><TablePagination page={activityPage} pageSize={activityPageSize} total={filteredActivities.length} onPageChange={setActivityPage} onPageSizeChange={setActivityPageSize} /></div>}
          </CardContent>
        </Card>
    </div>
  );
}