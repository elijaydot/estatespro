import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  Clock3,
  DollarSign,
  FileText,
  KeyRound,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { sendTransactionalSms, smsTemplates } from '@/lib/smsGateway';
import { initiateMobilePayment } from '@/lib/eastAfricaPayments';
import { useAuth } from '@/contexts/useAuth';
import {
  useAssignCrmLead,
  useAutoRouteLead,
  useBookUnitAtomic,
  useConvertCrmLead,
  useCreateCrmLeadNote,
  useCreateCrmLeadTask,
  useCrmAvailableUnits,
  useCrmLeadActivities,
  useCrmLeadTasks,
  useRecordLeadActivityAutoAdvance,
  useScheduleLeadFollowup,
  useSimulateConcurrencyCollision,
  useUpdateCrmLeadStage,
  useUpdateCrmLeadTaskStatus,
  type CrmAssignableUser,
  type CrmLead,
  type CrmLeadTask,
} from '@/hooks/useMarketplace';
import type { CrmInventoryUnit } from '@/lib/crmService';
import { cn } from '@/lib/utils';
import {
  CANONICAL_LEAD_STAGES,
  LEAD_STAGE_DESCRIPTION,
  LEAD_STAGE_LABEL,
  normalizeLeadStage,
} from './leadStageConfig';
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
  if (typeof payload.stage === 'string' && payload.stage)
    return `Moved to ${LEAD_STAGE_LABEL[payload.stage] || payload.stage.replace(/_/g, ' ')}`;
  if (typeof payload.unit_number === 'string')
    return `Unit ${payload.unit_number} reserved atomically with confirmed booking.`;
  return 'Activity recorded';
}

function isTaskOverdue(task: CrmLeadTask) {
  return task.status === 'open' && new Date(task.due_at).getTime() < Date.now();
}

function ActivityTypeIcon({ type }: { type: string }) {
  const Icon =
    type === 'call'
      ? Phone
      : type === 'email'
      ? Mail
      : type === 'sms' || type === 'whatsapp'
      ? MessageCircle
      : type === 'viewing'
      ? CalendarDays
      : type === 'note'
      ? MessageSquareText
      : type === 'unit_booked_atomic'
      ? KeyRound
      : type === 'followup_scheduled'
      ? CalendarClock
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

export function LeadDetailPanel({
  companyId,
  lead,
  assignableUsers,
  staleLeadCount,
}: LeadDetailPanelProps) {
  const { user } = useAuth();
  const [noteDraft, setNoteDraft] = useState('');
  const [taskOwner, setTaskOwner] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskNote, setTaskNote] = useState('');

  // Modals state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [concurrencySimDialogOpen, setConcurrencySimDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  // Booking form state
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [bookingAmount, setBookingAmount] = useState<number>(0);
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<string>('bank_transfer');
  const [bookingNotes, setBookingNotes] = useState<string>('');

  // Follow-up form state
  const [customFollowupDate, setCustomFollowupDate] = useState<string>('');
  const [followupNote, setFollowupNote] = useState<string>('');

  // Concurrency sim state
  const [simResult, setSimResult] = useState<any>(null);

  // Table & Activity filters
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

  // Queries & Mutations
  const activitiesQuery = useCrmLeadActivities(lead?.id);
  const tasksQuery = useCrmLeadTasks(lead?.id);
  const availableUnitsQuery = useCrmAvailableUnits(companyId);

  const assignLead = useAssignCrmLead(companyId);
  const updateLeadStage = useUpdateCrmLeadStage(companyId);
  const convertLead = useConvertCrmLead(companyId);
  const createNote = useCreateCrmLeadNote(companyId);
  const createTask = useCreateCrmLeadTask(companyId);
  const updateTaskStatus = useUpdateCrmLeadTaskStatus(companyId);
  const bookUnitAtomic = useBookUnitAtomic(companyId);
  const scheduleFollowup = useScheduleLeadFollowup(companyId);
  const simulateCollision = useSimulateConcurrencyCollision(companyId);
  const autoRouteLead = useAutoRouteLead(companyId);
  const logActivityAutoAdvance = useRecordLeadActivityAutoAdvance(companyId);

  const activities = useMemo(() => activitiesQuery.data || [], [activitiesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);
  const availableUnits = useMemo(() => availableUnitsQuery.data || [], [availableUnitsQuery.data]);

  const openTaskCount = tasks.filter((task) => task.status === 'open').length;
  const overdueTaskCount = tasks.filter(isTaskOverdue).length;

  const matchesDateRange = (value: string, from: string, to: string) => {
    const timestamp = new Date(value).getTime();
    return (
      (!from || timestamp >= new Date(`${from}T00:00:00`).getTime()) &&
      (!to || timestamp <= new Date(`${to}T23:59:59.999`).getTime())
    );
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (taskStatusFilter === 'all' || task.status === taskStatusFilter) &&
          matchesDateRange(task.due_at, taskDateFrom, taskDateTo)
      ),
    [taskDateFrom, taskDateTo, taskStatusFilter, tasks]
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (activity) =>
          (activityTypeFilter === 'all' || activity.activity_type === activityTypeFilter) &&
          matchesDateRange(activity.occurred_at, activityDateFrom, activityDateTo)
      ),
    [activities, activityDateFrom, activityDateTo, activityTypeFilter]
  );

  const taskRows = filteredTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);
  const activityRows = filteredActivities.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize
  );
  const activityTypes = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.activity_type))),
    [activities]
  );

  useEffect(() => {
    if (!taskDueAt) {
      const future = new Date(Date.now() + 24 * 3600000);
      const localIso = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString();
      setTaskDueAt(localIso.slice(0, 16));
    }
  }, [taskDueAt]);

  useEffect(() => {
    setTaskOwner(lead?.assigned_to || '');
    if (lead?.interested_unit_id) {
      setSelectedUnitId(lead.interested_unit_id);
    }
  }, [lead?.assigned_to, lead?.id, lead?.interested_unit_id]);

  useEffect(() => setTaskPage(1), [lead?.id, taskStatusFilter, taskDateFrom, taskDateTo, taskPageSize]);
  useEffect(
    () => setActivityPage(1),
    [lead?.id, activityTypeFilter, activityDateFrom, activityDateTo, activityPageSize]
  );

  const isWorking =
    assignLead.isPending ||
    updateLeadStage.isPending ||
    convertLead.isPending ||
    createNote.isPending ||
    createTask.isPending ||
    updateTaskStatus.isPending ||
    bookUnitAtomic.isPending ||
    scheduleFollowup.isPending;

  const taskOwnerOptions = useMemo(() => {
    if (!taskOwner || assignableUsers.some((member) => member.user_id === taskOwner)) return assignableUsers;
    return [...assignableUsers, { user_id: taskOwner, name: taskOwner, email: '', role: 'member' }];
  }, [assignableUsers, taskOwner]);

  const selectedUnit = useMemo(() => {
    return availableUnits.find((u) => u.unit_id === selectedUnitId) || null;
  }, [availableUnits, selectedUnitId]);

  // Quick follow-up scheduling preset
  const handleQuickFollowup = (hours: number, label: string) => {
    if (!lead?.id) return;
    const targetDate = new Date(Date.now() + hours * 3600000).toISOString();
    scheduleFollowup.mutate({
      leadId: lead.id,
      nextFollowupAt: targetDate,
      note: `Scheduled ${label}`,
    });
  };

  const handleCustomFollowupSubmit = () => {
    if (!lead?.id || !customFollowupDate) return;
    scheduleFollowup.mutate(
      {
        leadId: lead.id,
        nextFollowupAt: new Date(customFollowupDate).toISOString(),
        note: followupNote || undefined,
      },
      {
        onSuccess: () => {
          setFollowupDialogOpen(false);
          setCustomFollowupDate('');
          setFollowupNote('');
        },
      }
    );
  };

  const handleSendDirectSms = async () => {
    if (!lead?.contact_phone || !smsText.trim() || !lead?.id) return;
    setSmsSending(true);
    try {
      const res = await sendTransactionalSms({
        to: lead.contact_phone,
        message: smsText.trim(),
        senderId: 'FishGate',
      });

      if (res.success) {
        toast({
          title: 'SMS Sent Successfully',
          description: `Dispatched to ${res.recipient} via ${res.provider}.`,
        });

        // Automatically record activity and advance lead
        await logActivityAutoAdvance.mutateAsync({
          leadId: lead.id,
          activityType: 'sms',
          payload: { note: `Outbound SMS: "${smsText.trim().slice(0, 60)}..."` },
        });

        setSmsDialogOpen(false);
        setSmsText('');
      } else {
        toast({ title: 'SMS Failed', description: 'Could not send SMS.', variant: 'destructive' });
      }
    } finally {
      setSmsSending(false);
    }
  };

  const handleBookUnitSubmit = () => {
    if (!companyId || !lead?.id || !selectedUnitId) return;
    const finalAmount = bookingAmount > 0 ? bookingAmount : selectedUnit?.rent_amount || 0;

    bookUnitAtomic.mutate(
      {
        companyId,
        unitId: selectedUnitId,
        leadId: lead.id,
        bookingAmount: finalAmount,
        paymentMethod: bookingPaymentMethod,
        notes: bookingNotes,
        userId: user?.id,
      },
      {
        onSuccess: async () => {
          setBookingDialogOpen(false);
          setBookingNotes('');

          // If MoMo/Airtel Money is chosen, trigger USSD push prompt & transactional SMS
          if (
            (bookingPaymentMethod === 'mtn_momo' || bookingPaymentMethod === 'airtel_money') &&
            lead.contact_phone
          ) {
            try {
              const res = await initiateMobilePayment({
                phone: lead.contact_phone,
                amount: finalAmount,
                currency: 'RWF',
                invoiceId: `BOOKING-${lead.id.slice(0, 8)}`,
                tenantName: lead.contact_name,
                unitNumber: selectedUnit?.unit_number,
              });

              if (res.success) {
                toast({
                  title: '📲 MoMo Deposit Prompt Pushed',
                  description: res.ussdPromptMessage,
                });

                await sendTransactionalSms({
                  to: lead.contact_phone,
                  message: smsTemplates.unitHoldExpiringAlert(
                    lead.contact_name || 'Prospect',
                    selectedUnit?.unit_number || 'Unit',
                    selectedUnit?.property_name || 'FishGate Property',
                    48
                  ),
                });
              }
            } catch (err) {
              console.warn('MoMo trigger notice:', err);
            }
          }
        },
      }
    );
  };

  const handleRunConcurrencySimulation = async () => {
    if (!companyId || !selectedUnitId || !lead?.id) return;
    setSimResult(null);
    simulateCollision.mutate(
      {
        unitId: selectedUnitId,
        leadId1: lead.id,
        leadId2: lead.id, // Concurrent double-request test
        amount: 500,
      },
      {
        onSuccess: (data) => {
          setSimResult(data);
        },
      }
    );
  };

  if (!lead) {
    return (
      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle>Lead Intelligence Panel</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select a lead from the pipeline to open the CRM panel.
        </CardContent>
      </Card>
    );
  }

  const canonicalStage = normalizeLeadStage(lead.stage);

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(360px,5fr)]">
      <div className="min-w-0 space-y-4">
        {/* Main Lead Card */}
        <Card className="overflow-hidden border-cyan-500/20 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0 border border-cyan-400/20 bg-cyan-500/10">
                  <AvatarFallback className="bg-cyan-500/10 text-cyan-200">
                    {(lead.contact_name || 'LD').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-4 w-4 text-cyan-400" />
                    {lead.contact_name || 'Lead'}
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No phone or email'}</span>
                    {lead.contact_phone && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <a
                          href={`tel:${lead.contact_phone}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Call Lead"
                        >
                          <Phone className="h-2.5 w-2.5" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${lead.contact_phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp Chat"
                        >
                          <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px] text-cyan-400 hover:bg-cyan-500/10"
                          onClick={() => {
                            setSmsText(`Muraho ${lead.contact_name || ''}, twifuzaga kubaza niba mukeneye kureba inzu muri FishGate Property?`);
                            setSmsDialogOpen(true);
                          }}
                        >
                          <MessageSquareText className="h-2.5 w-2.5 mr-1" /> SMS
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {lead.listing_title || 'General Property Inquiry'} · {LEAD_STAGE_LABEL[canonicalStage]}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {lead.priority}
                </Badge>
                <Badge variant="outline" className={cn('capitalize', leadStatusClasses(lead.status))}>
                  {lead.status}
                </Badge>
                <Badge variant="outline" className={leadScoreClasses(lead.score || 0)}>
                  Score {lead.score || 0}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Owner & Stage Controls */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Assigned Owner</p>
                  {!lead.assigned_to && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px] text-cyan-400 hover:bg-cyan-500/10"
                      disabled={autoRouteLead.isPending}
                      onClick={() => autoRouteLead.mutate({ leadId: lead.id })}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Auto-Route (Least-Loaded)
                    </Button>
                  )}
                </div>
                <Select
                  value={lead.assigned_to || 'unassigned'}
                  onValueChange={(value) =>
                    assignLead.mutate({
                      leadId: lead.id,
                      assigneeUserId: value === 'unassigned' ? null : value,
                      actorUserId: user?.id,
                    })
                  }
                  disabled={isWorking}
                >
                  <SelectTrigger className="h-10 bg-background/60 text-xs transition-colors hover:border-cyan-400/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignableUsers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase text-muted-foreground">
                  Sales Pipeline Stage
                </p>
                <Select
                  value={canonicalStage}
                  onValueChange={(stage) => updateLeadStage.mutate({ leadId: lead.id, stage })}
                  disabled={isWorking}
                >
                  <SelectTrigger className="h-10 bg-background/60 text-xs transition-colors hover:border-cyan-400/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_LEAD_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {LEAD_STAGE_LABEL[stage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {LEAD_STAGE_DESCRIPTION[canonicalStage]}
                </p>
              </div>
            </div>

            {/* Automated Activity-Driven Triggers Strip */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Self-Service Activity Triggers (Hands-off Stage Advancement)
                </span>
                <span className="text-[10px] text-muted-foreground">No manual stage drag needed</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] hover:border-indigo-400"
                  disabled={logActivityAutoAdvance.isPending}
                  onClick={() =>
                    logActivityAutoAdvance.mutate({
                      leadId: lead.id,
                      activityType: 'call',
                      payload: { note: 'Completed phone outreach' },
                    })
                  }
                >
                  <Phone className="mr-1 h-3 w-3 text-indigo-400" />
                  Log Call ➔ Contacted
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] hover:border-cyan-400"
                  disabled={logActivityAutoAdvance.isPending}
                  onClick={() =>
                    logActivityAutoAdvance.mutate({
                      leadId: lead.id,
                      activityType: 'site_visit',
                      payload: { note: 'Property walkthrough completed' },
                    })
                  }
                >
                  <CalendarDays className="mr-1 h-3 w-3 text-cyan-400" />
                  Log Tour ➔ Site Visit
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] hover:border-emerald-400"
                  disabled={logActivityAutoAdvance.isPending}
                  onClick={() =>
                    logActivityAutoAdvance.mutate({
                      leadId: lead.id,
                      activityType: 'unit_selected',
                      payload: { note: 'Floorplan and unit confirmed' },
                    })
                  }
                >
                  <Building2 className="mr-1 h-3 w-3 text-emerald-400" />
                  Unit Selected ➔ Interested
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] hover:border-violet-400"
                  disabled={logActivityAutoAdvance.isPending}
                  onClick={() =>
                    logActivityAutoAdvance.mutate({
                      leadId: lead.id,
                      activityType: 'negotiation_started',
                      payload: { note: 'Payment terms and quote issued' },
                    })
                  }
                >
                  <DollarSign className="mr-1 h-3 w-3 text-violet-400" />
                  Issue Quote ➔ Negotiation
                </Button>
              </div>
            </div>

            {/* EstateFlow Key Action Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setNoteDialogOpen(true)}>
                <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
                Add Note
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFollowupDialogOpen(true)}>
                <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                Schedule Follow-up
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Task
              </Button>

              {/* Atomic Unit Booking Flow Trigger */}
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                disabled={isWorking || canonicalStage === 'booked'}
                onClick={() => setBookingDialogOpen(true)}
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                Book Unit (Atomic)
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setConcurrencySimDialogOpen(true)}
                title="Demonstrate atomic race condition protection"
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5 text-cyan-400" />
                Test Concurrency Lock
              </Button>
            </div>

            {/* Post-Booking Operational Handoff Banner */}
            {canonicalStage === 'booked' && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">Unit Successfully Reserved & Locked</p>
                    <p className="text-[11px] text-muted-foreground">
                      Physical inventory confirmed. Transition this customer directly into active leasing and tenant onboarding.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 shadow-sm" asChild>
                    <Link to={`/leases?add=true&unitId=${lead.interested_unit_id || ''}`}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Draft Lease Contract
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Summary Strip */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 text-xs sm:grid-cols-4">
              <div className="bg-card px-3 py-3">
                <p className="text-muted-foreground">Next Follow-up</p>
                <p className="mt-1.5 font-semibold">
                  {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleDateString() : 'Not scheduled'}
                </p>
              </div>
              <div className="bg-card px-3 py-3">
                <p className="text-muted-foreground">Open tasks</p>
                <p className="mt-1.5 font-semibold text-amber-300">{openTaskCount}</p>
              </div>
              <div className="bg-card px-3 py-3">
                <p className="text-muted-foreground">Overdue tasks</p>
                <p className="mt-1.5 font-semibold text-rose-400">{overdueTaskCount}</p>
              </div>
              <div className="bg-card px-3 py-3">
                <p className="text-muted-foreground">Last activity</p>
                <p className="mt-1.5 font-semibold">{formatRelativeTime(lead.last_activity_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Atomic Unit Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-500" />
                Atomic Unit Booking · EstateFlow Concurrency Engine
              </DialogTitle>
              <DialogDescription>
                Reserves a physical inventory unit with database row-level locking (SELECT ... FOR UPDATE) and partial unique index protection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Select Available Unit</label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="mt-1 h-10 text-xs">
                    <SelectValue placeholder="Choose unit from property inventory..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {availableUnits.map((u) => (
                      <SelectItem key={u.unit_id} value={u.unit_id} className="text-xs">
                        {u.property_name} - Unit {u.unit_number} ({u.bedrooms} Bed, {u.bathrooms} Bath) · ${u.rent_amount}/mo
                      </SelectItem>
                    ))}
                    {availableUnits.length === 0 && (
                      <SelectItem value="none" disabled className="text-xs">
                        No vacant units currently available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedUnit && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                  <p className="font-semibold text-emerald-400">Unit Selected: {selectedUnit.property_name} - #{selectedUnit.unit_number}</p>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-muted-foreground">
                    <span>Floor: {selectedUnit.floor}</span>
                    <span>Sqft: {selectedUnit.sqft}</span>
                    <span>Standard Rate: ${selectedUnit.rent_amount}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Token Deposit / Amount ($)</label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1 h-9 text-xs"
                    value={bookingAmount || ''}
                    placeholder={selectedUnit ? `${selectedUnit.rent_amount}` : '0'}
                    onChange={(e) => setBookingAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Payment Method</label>
                  <Select value={bookingPaymentMethod} onValueChange={setBookingPaymentMethod}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn_momo">MTN Mobile Money (*182#)</SelectItem>
                      <SelectItem value="airtel_money">Airtel Money (*175#)</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="paypack">Paypack Online</SelectItem>
                      <SelectItem value="cash">Cash / Cheque</SelectItem>
                      <SelectItem value="pos">Card / POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Booking Notes / Terms</label>
                <Textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  className="mt-1 text-xs"
                  placeholder="Special stipulations, target move-in date, key handover instructions..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!selectedUnitId || selectedUnitId === 'none' || bookUnitAtomic.isPending}
                onClick={handleBookUnitSubmit}
                className="bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <KeyRound className="mr-1.5 h-4 w-4" />
                {bookUnitAtomic.isPending ? 'Executing Concurrency Lock...' : 'Confirm Atomic Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Follow-up Scheduling Modal */}
        <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-cyan-400" />
                Schedule Lead Follow-up
              </DialogTitle>
              <DialogDescription>
                Set a reminder time to re-engage this prospect during their consideration cycle.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Quick Presets</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      handleQuickFollowup(2, 'in 2 hours');
                      setFollowupDialogOpen(false);
                    }}
                  >
                    In 2 Hours
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      handleQuickFollowup(24, 'tomorrow');
                      setFollowupDialogOpen(false);
                    }}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      handleQuickFollowup(168, 'next week');
                      setFollowupDialogOpen(false);
                    }}
                  >
                    Next Week
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Or Custom Date & Time</label>
                <Input
                  type="datetime-local"
                  className="mt-1 h-9 text-xs"
                  value={customFollowupDate}
                  onChange={(e) => setCustomFollowupDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Follow-up Note (Optional)</label>
                <Input
                  className="mt-1 h-9 text-xs"
                  placeholder="Ask about floor preference, discuss payment terms..."
                  value={followupNote}
                  onChange={(e) => setFollowupNote(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!customFollowupDate || scheduleFollowup.isPending}
                onClick={handleCustomFollowupSubmit}
              >
                Save Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Concurrency Collision Simulator Dialog */}
        <Dialog open={concurrencySimDialogOpen} onOpenChange={setConcurrencySimDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                Simulate Concurrency Collision (EstateFlow Race Condition Test)
              </DialogTitle>
              <DialogDescription>
                Fires 2 simultaneous requests in the same millisecond trying to book the same unit row. Proves that SELECT ... FOR UPDATE pessimistic row-locking prevents double-booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Target Unit to Stress Test</label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="mt-1 h-10 text-xs">
                    <SelectValue placeholder="Select unit to test..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((u) => (
                      <SelectItem key={u.unit_id} value={u.unit_id} className="text-xs">
                        {u.property_name} - Unit {u.unit_number} (${u.rent_amount}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-cyan-600 text-white hover:bg-cyan-500"
                disabled={!selectedUnitId || simulateCollision.isPending}
                onClick={handleRunConcurrencySimulation}
              >
                {simulateCollision.isPending ? 'Simulating Race Condition...' : 'Fire Concurrent Booking Requests'}
              </Button>

              {simResult && (
                <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Collision Guard Result:</span>
                    <Badge variant={simResult.collisionPrevented ? 'default' : 'destructive'}>
                      {simResult.collisionPrevented ? 'Collision Safely Blocked' : 'Race Failure'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{simResult.explanation}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="rounded bg-muted/50 p-2">
                      <p className="font-semibold text-foreground">Attempt 1:</p>
                      <p>{simResult.firstAttempt.success ? '✅ Succeeded (Acquired lock)' : `❌ Rejected (${simResult.firstAttempt.error || 'Blocked'})`}</p>
                    </div>
                    <div className="rounded bg-muted/50 p-2">
                      <p className="font-semibold text-foreground">Attempt 2:</p>
                      <p>{simResult.secondAttempt.success ? '✅ Succeeded' : `❌ Rejected (${simResult.secondAttempt.error || 'Blocked by lock'})`}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConcurrencySimDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Existing Note Dialog */}
        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add lead note</DialogTitle>
              <DialogDescription>
                Capture context that should remain on this lead’s activity record.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={5}
              placeholder="Budget fit, objections, preferred move-in date..."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createNote.isPending || !noteDraft.trim()}
                onClick={() =>
                  createNote.mutate(
                    { leadId: lead.id, actorUserId: user?.id, note: noteDraft },
                    {
                      onSuccess: () => {
                        setNoteDraft('');
                        setNoteDialogOpen(false);
                      },
                    }
                  )
                }
              >
                <MessageSquareText className="mr-1.5 h-4 w-4" />
                Save note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Outbound Transactional SMS Dialog */}
        <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-cyan-400" />
                <DialogTitle>Send SMS to Prospect</DialogTitle>
              </div>
              <DialogDescription>
                Dispatched directly via Africa's Talking / Twilio to {lead.contact_phone}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="flex flex-wrap gap-1.5 pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setSmsText(`Muraho ${lead.contact_name || ''}, twifuzaga kubatumira gusura umushinga wa FishGate Property uyu munsi?`)
                  }
                >
                  🇷🇼 Invite Tour (RW)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setSmsText(`Hello ${lead.contact_name || ''}, are you available for a property viewing tour this week?`)
                  }
                >
                  🇬🇧 Invite Tour (EN)
                </Button>
              </div>

              <Textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                rows={4}
                className="text-xs font-mono"
                placeholder="Enter SMS message to dispatch..."
              />

              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Parts: {Math.ceil(smsText.length / 160) || 1} ({smsText.length} chars)</span>
                <span>Carrier: Africa's Talking (East Africa)</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSmsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5"
                disabled={smsSending || !smsText.trim()}
                onClick={handleSendDirectSms}
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                {smsSending ? 'Dispatching SMS...' : 'Send SMS Now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Existing Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create follow-up task</DialogTitle>
              <DialogDescription>Assign the next action and give it a clear deadline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Select value={taskOwner} onValueChange={setTaskOwner}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Task owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskOwnerOptions.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
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
                rows={3}
                placeholder="Task notes (optional)"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createTask.isPending || !taskOwner || !taskDueAt}
                onClick={() =>
                  createTask.mutate(
                    {
                      leadId: lead.id,
                      ownerUserId: taskOwner,
                      dueAt: new Date(taskDueAt).toISOString(),
                      notes: taskNote,
                      taskType: 'follow_up',
                    },
                    {
                      onSuccess: () => {
                        setTaskNote('');
                        setTaskDialogOpen(false);
                      },
                    }
                  )
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Task Register Dialog */}
        <Dialog open={taskRegisterOpen} onOpenChange={setTaskRegisterOpen}>
          <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
            <DialogHeader>
              <DialogTitle>All lead tasks · {lead.contact_name || 'Lead'}</DialogTitle>
              <DialogDescription>
                {tasks.length} tasks retained for this lead. Filter by status or due date.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                aria-label="All lead tasks status"
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value)}
              >
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="done">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
              <Input
                aria-label="All tasks due from"
                type="date"
                value={taskDateFrom}
                onChange={(event) => setTaskDateFrom(event.target.value)}
              />
              <Input
                aria-label="All tasks due to"
                type="date"
                value={taskDateTo}
                onChange={(event) => setTaskDateTo(event.target.value)}
              />
            </div>
            <div className="min-h-0 overflow-y-auto rounded-lg border border-border/70">
              <div className="divide-y divide-border/60">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-start justify-between gap-3 p-3',
                      isTaskOverdue(task) && 'bg-rose-500/5'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium capitalize">{task.task_type.replace(/_/g, ' ')}</p>
                        <Badge
                          variant={
                            task.status === 'done'
                              ? 'default'
                              : task.status === 'canceled'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {new Date(task.due_at).toLocaleString()}
                      </p>
                      {task.notes && <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.status === 'done' || updateTaskStatus.isPending}
                        onClick={() =>
                          updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'done' })
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={task.status === 'canceled' || updateTaskStatus.isPending}
                        onClick={() =>
                          updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'canceled' })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">No tasks match this view.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskRegisterOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setTaskRegisterOpen(false);
                  setTaskDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Register Dialog */}
        <Dialog open={activityRegisterOpen} onOpenChange={setActivityRegisterOpen}>
          <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col">
            <DialogHeader>
              <DialogTitle>Complete activity timeline · {lead.contact_name || 'Lead'}</DialogTitle>
              <DialogDescription>{activities.length} recorded events, newest first.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                aria-label="All activity type"
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={activityTypeFilter}
                onChange={(event) => setActivityTypeFilter(event.target.value)}
              >
                <option value="all">All activity</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Input
                aria-label="All activities from date"
                type="date"
                value={activityDateFrom}
                onChange={(event) => setActivityDateFrom(event.target.value)}
              />
              <Input
                aria-label="All activities to date"
                type="date"
                value={activityDateTo}
                onChange={(event) => setActivityDateTo(event.target.value)}
              />
            </div>
            <div className="min-h-0 overflow-y-auto rounded-lg border border-border/70">
              <div className="divide-y divide-border/60">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {activity.activity_type.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activityMessage(activity.payload_json)}
                      </p>
                      {activity.channel && (
                        <Badge variant="outline" className="mt-2 capitalize">
                          {activity.channel}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      <p>{new Date(activity.occurred_at).toLocaleString()}</p>
                      <p className="mt-1">{formatRelativeTime(activity.occurred_at)}</p>
                    </div>
                  </div>
                ))}
                {filteredActivities.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">No activities match this view.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityRegisterOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setActivityRegisterOpen(false);
                  setNoteDialogOpen(true);
                }}
              >
                <MessageSquareText className="mr-1.5 h-4 w-4" />
                Add note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lead Tasks Card */}
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                    <CheckSquare className="h-4 w-4" />
                  </span>
                  Lead Tasks
                </CardTitle>
                <CardDescription className="mt-1">SLA execution and next actions.</CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTaskStatusFilter('all');
                  setTaskDateFrom('');
                  setTaskDateTo('');
                  setTaskRegisterOpen(true);
                }}
              >
                View all ({tasks.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 gap-2 border-b border-border/50 p-4 sm:grid-cols-3">
              <select
                aria-label="Task status"
                className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs transition-colors hover:border-cyan-400/40"
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value)}
              >
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="done">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
              <Input
                aria-label="Tasks due from"
                type="date"
                className="bg-background/60"
                value={taskDateFrom}
                onChange={(event) => setTaskDateFrom(event.target.value)}
              />
              <Input
                aria-label="Tasks due to"
                type="date"
                className="bg-background/60"
                value={taskDateTo}
                onChange={(event) => setTaskDateTo(event.target.value)}
              />
            </div>
            <div className="divide-y divide-border/60">
              {taskRows.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'p-4 transition-colors hover:bg-muted/30',
                    isTaskOverdue(task) && 'bg-rose-500/5 hover:bg-rose-500/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold capitalize">{task.task_type.replace(/_/g, ' ')}</p>
                      <p
                        className={cn(
                          'mt-1 text-xs text-muted-foreground',
                          isTaskOverdue(task) && 'text-rose-400'
                        )}
                      >
                        {isTaskOverdue(task) ? 'Overdue' : 'Due'} {new Date(task.due_at).toLocaleString()}
                      </p>
                      {task.notes && (
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{task.notes}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize',
                        task.status === 'done'
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                          : isTaskOverdue(task)
                          ? 'border-rose-400/30 bg-rose-500/15 text-rose-300'
                          : task.status === 'open'
                          ? 'border-amber-400/30 bg-amber-500/15 text-amber-300'
                          : ''
                      )}
                    >
                      {isTaskOverdue(task) ? 'overdue' : task.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={task.status === 'done' || updateTaskStatus.isPending}
                      onClick={() =>
                        updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'done' })
                      }
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={task.status === 'canceled' || updateTaskStatus.isPending}
                      onClick={() =>
                        updateTaskStatus.mutate({ taskId: task.id, leadId: lead.id, status: 'canceled' })
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
              {!tasksQuery.isLoading && filteredTasks.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No tasks match this view.</p>
              )}
            </div>
            {filteredTasks.length > 0 && (
              <div className="bg-background/25">
                <TablePagination
                  page={taskPage}
                  pageSize={taskPageSize}
                  total={filteredTasks.length}
                  onPageChange={setTaskPage}
                  onPageSizeChange={setTaskPageSize}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-black/10 transition-shadow duration-200 hover:shadow-xl hover:shadow-black/15 xl:sticky xl:top-4">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                  <Clock3 className="h-4 w-4" />
                </span>
                Activity Timeline
              </CardTitle>
              <CardDescription className="mt-1">Full contact and internal activity trace.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setActivityTypeFilter('all');
                setActivityDateFrom('');
                setActivityDateTo('');
                setActivityRegisterOpen(true);
              }}
            >
              View all ({activities.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-2 border-b border-border/50 p-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <select
              aria-label="Activity type"
              className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs transition-colors hover:border-cyan-400/40"
              value={activityTypeFilter}
              onChange={(event) => setActivityTypeFilter(event.target.value)}
            >
              <option value="all">All activity</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <Input
              aria-label="Activities from date"
              type="date"
              className="bg-background/60"
              value={activityDateFrom}
              onChange={(event) => setActivityDateFrom(event.target.value)}
            />
            <Input
              aria-label="Activities to date"
              type="date"
              className="bg-background/60"
              value={activityDateTo}
              onChange={(event) => setActivityDateTo(event.target.value)}
            />
          </div>
          <div className="px-4 py-2">
            {activityRows.map((activity) => (
              <div key={activity.id} className="group relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-4">
                <div className="relative flex justify-center">
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-cyan-300 transition-colors duration-200 group-hover:border-cyan-300/50 group-hover:bg-cyan-500/20">
                    <ActivityTypeIcon type={activity.activity_type} />
                  </span>
                  <span
                    className="absolute bottom-[-16px] top-8 w-px bg-border/80 group-last:hidden"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 rounded-lg px-1 transition-transform duration-200 group-hover:translate-x-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold capitalize">
                      {activity.activity_type.replace(/_/g, ' ')}
                    </p>
                    <p className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTime(activity.occurred_at)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {activityMessage(activity.payload_json)}
                  </p>
                  {activity.channel && (
                    <Badge variant="outline" className="mt-2 capitalize">
                      {activity.channel}
                    </Badge>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground/70">
                    {new Date(activity.occurred_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {!activitiesQuery.isLoading && filteredActivities.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No activities match this view.</p>
            )}
          </div>
          {filteredActivities.length > 0 && (
            <div className="bg-background/25">
              <TablePagination
                page={activityPage}
                pageSize={activityPageSize}
                total={filteredActivities.length}
                onPageChange={setActivityPage}
                onPageSizeChange={setActivityPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
