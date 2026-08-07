import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CheckSquare, Clock3, MessageSquareText, Plus, Rocket, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from './LeadPipelineBoard';

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
  return 'Activity recorded';
}

function isTaskOverdue(task: CrmLeadTask) {
  return task.status === 'open' && new Date(task.due_at).getTime() < Date.now();
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

  const activitiesQuery = useCrmLeadActivities(lead?.id);
  const tasksQuery = useCrmLeadTasks(lead?.id);
  const assignLead = useAssignCrmLead(companyId);
  const updateLeadStage = useUpdateCrmLeadStage(companyId);
  const convertLead = useConvertCrmLead(companyId);
  const createNote = useCreateCrmLeadNote(companyId);
  const createTask = useCreateCrmLeadTask(companyId);
  const updateTaskStatus = useUpdateCrmLeadTaskStatus(companyId);

  const activities = activitiesQuery.data || [];
  const tasks = tasksQuery.data || [];
  const openTaskCount = tasks.filter((task) => task.status === 'open').length;
  const overdueTaskCount = tasks.filter(isTaskOverdue).length;

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
    <div className="space-y-4">
      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-600" />Lead Intelligence Panel</CardTitle>
          <CardDescription>Assign, convert, add notes, and execute follow-up tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 p-3">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border border-border/80"><AvatarFallback>{(lead.contact_name || 'LD').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <p className="text-sm font-semibold">{lead.contact_name || 'Lead'}</p>
                  <p className="text-xs text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No phone or email'}</p>
                </div>
              </div>
              <Badge variant="outline">{lead.priority}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Score</p><p className="font-medium">{lead.score || 0}</p></div>
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Last activity</p><p className="font-medium">{formatRelativeTime(lead.last_activity_at)}</p></div>
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Status</p><p className="font-medium">{lead.status}</p></div>
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Listing</p><p className="truncate font-medium">{lead.listing_title || 'No listing'}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-xs uppercase text-muted-foreground">Assign owner</p>
              <Select value={lead.assigned_to || 'unassigned'} onValueChange={(value) => assignLead.mutate({ leadId: lead.id, assigneeUserId: value === 'unassigned' ? null : value, actorUserId: user?.id })} disabled={isWorking}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.name} ({member.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-xs uppercase text-muted-foreground">Advance stage</p>
              <Select value={lead.stage} onValueChange={(stage) => updateLeadStage.mutate({ leadId: lead.id, stage })} disabled={isWorking}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STAGE_ORDER.map((stage) => <SelectItem key={stage} value={stage}>{LEAD_STAGE_LABEL[stage]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs uppercase text-muted-foreground">Quick actions</p>
              <Button size="sm" disabled={convertLead.isPending || lead.stage === 'converted'} onClick={() => convertLead.mutate({ leadId: lead.id })}>
                <Rocket className="mr-1.5 h-3.5 w-3.5" />Convert Lead
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Open tasks</p><p className="font-semibold">{openTaskCount}</p></div>
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Overdue</p><p className="font-semibold text-rose-600">{overdueTaskCount}</p></div>
              <div className="rounded-md border p-2"><p className="text-muted-foreground">Stale leads</p><p className="font-semibold text-amber-600">{staleLeadCount}</p></div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs uppercase text-muted-foreground">Add note</p>
            <Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} placeholder="Capture budget fit, objections, or preferred move-in date" />
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="secondary" disabled={createNote.isPending || !noteDraft.trim()} onClick={() => createNote.mutate({ leadId: lead.id, actorUserId: user?.id, note: noteDraft }, { onSuccess: () => setNoteDraft('') })}>
                <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />Save note
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs uppercase text-muted-foreground">Create follow-up task</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Select value={taskOwner} onValueChange={setTaskOwner}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Task owner" /></SelectTrigger>
                <SelectContent>{taskOwnerOptions.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
              <input className="h-9 rounded-md border border-input bg-background px-3 text-xs" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
            </div>
            <Textarea value={taskNote} onChange={(event) => setTaskNote(event.target.value)} rows={2} className="mt-2" placeholder="Task notes (optional)" />
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" disabled={createTask.isPending || !taskOwner || !taskDueAt} onClick={() => createTask.mutate({ leadId: lead.id, ownerUserId: taskOwner, dueAt: new Date(taskDueAt).toISOString(), notes: taskNote, taskType: 'follow_up' }, { onSuccess: () => setTaskNote('') })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Add task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckSquare className="h-4 w-4" />Lead Tasks</CardTitle><CardDescription>SLA execution for this lead.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className={cn('rounded-lg border p-3', isTaskOverdue(task) && 'border-rose-500/40 bg-rose-500/5')}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-medium">{task.task_type}</p><p className="text-xs text-muted-foreground">Due {new Date(task.due_at).toLocaleString()}</p>{task.notes && <p className="mt-1 text-xs text-muted-foreground">{task.notes}</p>}</div>
                  <Badge variant={task.status === 'done' ? 'default' : task.status === 'canceled' ? 'outline' : 'secondary'}>{task.status}</Badge>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" disabled={task.status === 'done' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'done' })}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Complete</Button>
                  <Button size="sm" variant="ghost" disabled={task.status === 'canceled' || updateTaskStatus.isPending} onClick={() => updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'canceled' })}>Cancel</Button>
                </div>
              </div>
            ))}
            {!tasksQuery.isLoading && tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks for this lead yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" />Activity Timeline</CardTitle><CardDescription>Full contact and internal activity trace.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium capitalize">{activity.activity_type.replace('_', ' ')}</p><p className="text-xs text-muted-foreground">{activityMessage(activity.payload_json)}</p></div><p className="text-[11px] text-muted-foreground">{formatRelativeTime(activity.occurred_at)}</p></div>
              </div>
            ))}
            {!activitiesQuery.isLoading && activities.length === 0 && <p className="text-sm text-muted-foreground">No activities logged yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}