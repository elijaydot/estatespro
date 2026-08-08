import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, CircleHelp, Pause, Play, Plus, RotateCcw, Trash2, Workflow } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState } from '@/components/marketplace-crm/CrmWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import { toast } from '@/components/ui/use-toast';
import {
  useCreateCrmAutomationRule,
  useCrmAutomationRules,
  useCrmAutomationRuns,
  usePreviewCrmAutomationRule,
  useReplayCrmAutomationRun,
  useUpdateCrmAutomationRule,
} from '@/hooks/useMarketplaceCrm';
import {
  CRM_AUTOMATION_EVENT_DEFINITIONS,
  getEventDefinition,
  getInvalidConditionFields,
  serializeActionRows,
  serializeConditionRows,
  type ActionBuilderRow,
  type ActionBuilderType,
  type ConditionBuilderRow,
} from '@/lib/crmAutomationBuilder';

const ACTION_LABELS: Record<ActionBuilderType, string> = {
  create_task: 'Create a follow-up task',
  audit_event: 'Add an audit record',
  set_handoff_status: 'Update handoff status',
  send_notification: 'Send an in-app notification',
  send_message: 'Send a message',
  update_lead_stage: 'Move the lead to another stage',
  reassign_lead: 'Assign the lead to a teammate',
  provision_tenant: 'Create the tenant and lease',
};

const AUTOMATION_TASK_TYPES = [
  ['follow_up', 'General follow-up'],
  ['handoff_prep', 'Prepare customer handoff'],
  ['call_follow_up', 'Call follow-up'],
  ['meeting_follow_up', 'Meeting follow-up'],
  ['lease_renewal_follow_up', 'Lease renewal follow-up'],
  ['collections_follow_up', 'Payment collection follow-up'],
  ['automation_follow_up', 'Automation follow-up'],
] as const;

function eventLabel(eventType: string) {
  return getEventDefinition(eventType).label;
}

function actionSummary(actions: Array<Record<string, unknown>>) {
  if (!actions.length) return 'No actions';
  const firstType = String(actions[0].type || '') as ActionBuilderType;
  const firstLabel = ACTION_LABELS[firstType] || 'Custom action';
  return actions.length === 1 ? firstLabel : `${firstLabel} +${actions.length - 1}`;
}

function createConditionRow(): ConditionBuilderRow {
  return {
    id: `condition-${crypto.randomUUID()}`,
    field: '',
    operator: 'equals',
    value: '',
  };
}

function createActionRow(): ActionBuilderRow {
  return {
    id: `action-${crypto.randomUUID()}`,
    type: 'create_task',
    taskType: 'automation_follow_up',
    dueInHours: '24',
    ownerUserId: '',
    notes: '',
    eventType: 'crm.automation.executed',
    severity: 'info',
    status: 'ready',
    recipientUserId: '',
    notificationTitle: '',
    notificationMessage: '',
    notificationLink: '',
    messageSubject: '',
    messageContent: '',
    leadStage: 'qualified',
    leaseStart: '',
    leaseEnd: '',
    monthlyRent: '',
    securityDeposit: '0',
  };
}

export default function MarketplaceCrmAutomationPage() {
  const { activeCompanyId } = useActiveCompany();
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const rulesQuery = useCrmAutomationRules(activeCompanyId);
  const runsQuery = useCrmAutomationRuns(activeCompanyId);
  const createRule = useCreateCrmAutomationRule(activeCompanyId);
  const updateRule = useUpdateCrmAutomationRule(activeCompanyId);
  const replayRun = useReplayCrmAutomationRun(activeCompanyId);
  const previewRule = usePreviewCrmAutomationRule(activeCompanyId);

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState(CRM_AUTOMATION_EVENT_DEFINITIONS[0].value);
  const [conditionRows, setConditionRows] = useState<ConditionBuilderRow[]>(CRM_AUTOMATION_EVENT_DEFINITIONS[0].defaultConditionRows);
  const [actionRows, setActionRows] = useState<ActionBuilderRow[]>(CRM_AUTOMATION_EVENT_DEFINITIONS[0].defaultActionRows);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedConditionsJson, setAdvancedConditionsJson] = useState(JSON.stringify(serializeConditionRows(CRM_AUTOMATION_EVENT_DEFINITIONS[0].defaultConditionRows), null, 2));
  const [advancedActionsJson, setAdvancedActionsJson] = useState(JSON.stringify(serializeActionRows(CRM_AUTOMATION_EVENT_DEFINITIONS[0].defaultActionRows), null, 2));
  const [retryLimit, setRetryLimit] = useState('3');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewByRuleId, setPreviewByRuleId] = useState<Record<string, Record<string, unknown>>>({});

  const filteredRuns = useMemo(() => {
    const rows = runsQuery.data || [];
    if (statusFilter === 'all') return rows;
    return rows.filter((run) => run.status === statusFilter);
  }, [runsQuery.data, statusFilter]);

  const builderConditions = useMemo(() => serializeConditionRows(conditionRows), [conditionRows]);
  const builderActions = useMemo(() => serializeActionRows(actionRows), [actionRows]);
  const eventDefinition = getEventDefinition(eventType);

  const syncAdvancedFromBuilder = () => {
    setAdvancedConditionsJson(JSON.stringify(builderConditions, null, 2));
    setAdvancedActionsJson(JSON.stringify(builderActions, null, 2));
  };

  const onChangeEventType = (nextEventType: string) => {
    const defaults = getEventDefinition(nextEventType);
    setEventType(defaults.value);
    setConditionRows(defaults.defaultConditionRows);
    setActionRows(defaults.defaultActionRows);
    setAdvancedConditionsJson(JSON.stringify(serializeConditionRows(defaults.defaultConditionRows), null, 2));
    setAdvancedActionsJson(JSON.stringify(serializeActionRows(defaults.defaultActionRows), null, 2));
  };

  const onCreateRule = () => {
    if (!name.trim()) {
      toast({ title: 'Rule name required', description: 'Give this automation a name your team will recognize.' });
      return;
    }

    if (actionRows.length === 0 && !advancedMode) {
      toast({ title: 'Action required', description: 'Add at least one action for this automation.', variant: 'destructive' });
      return;
    }

    let conditions: Record<string, unknown> = builderConditions;
    let actions: Array<Record<string, unknown>> = builderActions;

    if (advancedMode) {
      try {
        const parsedConditions = JSON.parse(advancedConditionsJson || '{}');
        const parsedActions = JSON.parse(advancedActionsJson || '[]');
        conditions = parsedConditions && typeof parsedConditions === 'object' ? parsedConditions : {};
        actions = Array.isArray(parsedActions) ? parsedActions : [];
      } catch {
        toast({ title: 'Invalid JSON', description: 'Conditions or actions JSON is invalid.', variant: 'destructive' });
        return;
      }
    }

    const invalidConditionFields = getInvalidConditionFields(eventType, conditions);
    if (invalidConditionFields.length) {
      toast({
        title: 'Incompatible Conditions',
        description: `These payload fields do not apply to ${eventType}: ${invalidConditionFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const parsedRetry = Number.parseInt(retryLimit, 10);

    createRule.mutate(
      {
        name: name.trim(),
        eventType,
        conditions,
        actions,
        retryLimit: Number.isNaN(parsedRetry) ? 3 : Math.min(Math.max(parsedRetry, 1), 10),
        isActive: true,
      },
      {
        onSuccess: () => {
          setName('');
          setRetryLimit('3');
          setConditionRows(eventDefinition.defaultConditionRows);
          setActionRows(eventDefinition.defaultActionRows);
          setAdvancedMode(false);
        },
      },
    );
  };

  const runPreview = (ruleId: string, ruleEventType: string) => {
    previewRule.mutate(
      {
        ruleId,
        samplePayload: getEventDefinition(ruleEventType).samplePayload,
      },
      {
        onSuccess: (result) => {
          setPreviewByRuleId((current) => ({
            ...current,
            [ruleId]: result,
          }));
        },
      },
    );
  };

  return (
    <CrmWorkspace title="Automation" subtitle="Let FishGate handle routine follow-up when CRM activity happens.">
      <CrmDataCard title="How automation works" description="Rules watch for a specific CRM event and perform the actions you choose.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
            <div><p className="text-sm font-medium">Choose a moment</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A call is logged, a meeting or visit is completed, a lead changes stage, or an alert threshold is crossed.</p></div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
            <div><p className="text-sm font-medium">Narrow it down</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Optional filters make the rule run only for the records that need it.</p></div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
            <div><p className="text-sm font-medium">Let FishGate act</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Create work, notify a teammate, update a lead, or record the event automatically.</p></div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>New rules start active. They run automatically after the selected event occurs. Use <span className="font-medium text-foreground">Test rule</span> to check matching without performing actions, and pause a rule whenever needed.</p>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Build an automation" description="Start with a supported event. FishGate supplies a practical default you can adjust.">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 text-xs font-semibold text-primary">1</span>
              <div><p className="text-sm font-semibold">When this happens</p><p className="text-xs text-muted-foreground">This event starts the rule.</p></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium">
                Rule name
                <input
                  aria-label="Rule name"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  placeholder="Example: Follow up after every viewing"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium">
                Trigger
                <select aria-label="Trigger event" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={eventType} onChange={(event) => onChangeEventType(event.target.value)}>
                  {CRM_AUTOMATION_EVENT_DEFINITIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{eventDefinition.description}</span>
            </div>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 text-xs font-semibold text-primary">2</span>
                <div><p className="text-sm font-semibold">Only if</p><p className="text-xs text-muted-foreground">Optional filters control which records qualify.</p></div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setConditionRows((rows) => [...rows, createConditionRow()])}>
                <Plus className="h-4 w-4" />Add filter
              </Button>
            </div>
            <div className="space-y-2">
              {conditionRows.map((row) => (
                <div key={row.id} className="grid grid-cols-1 gap-2 rounded-md bg-muted/30 p-2 md:grid-cols-12">
                  <select
                    aria-label="Payload field"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-4"
                    value={row.field}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, field: event.target.value } : item))}
                  >
                    <option value="">Choose a field</option>
                    {eventDefinition.conditionFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                  </select>
                  <select
                    aria-label="Condition operator"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-3"
                    value={row.operator}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, operator: event.target.value as 'equals' | 'required' } : item))}
                  >
                    <option value="equals">is exactly</option>
                    <option value="required">has any value</option>
                  </select>
                  <input
                    aria-label="Expected value"
                    className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                    placeholder={row.operator === 'required' ? 'Any value' : 'Enter the value to match'}
                    value={row.value}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))}
                    disabled={row.operator === 'required'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-full md:col-span-1"
                    aria-label="Remove filter"
                    onClick={() => setConditionRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {conditionRows.length === 0 ? <p className="rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">No filters: this rule will run every time the selected event occurs.</p> : null}
            </div>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 text-xs font-semibold text-primary">3</span>
                <div><p className="text-sm font-semibold">Then do this</p><p className="text-xs text-muted-foreground">Actions run in the order shown.</p></div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setActionRows((rows) => [...rows, createActionRow()])}>
                <Plus className="h-4 w-4" />Add action
              </Button>
            </div>
            <div className="space-y-3">
              {actionRows.map((row) => (
                <div key={row.id} className="rounded-md border border-border/70 bg-background p-3">
                  <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-12">
                    <select
                      aria-label="Automation action"
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-6"
                      value={row.type}
                      onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, type: event.target.value as ActionBuilderRow['type'] } : item))}
                    >
                      {eventDefinition.allowedActionTypes.map((actionType) => <option key={actionType} value={actionType}>{ACTION_LABELS[actionType]}</option>)}
                    </select>
                    <Button type="button" variant="ghost" size="sm" className="md:col-span-2 md:col-start-11" onClick={() => setActionRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 className="h-4 w-4" />Remove</Button>
                  </div>

                  {row.type === 'create_task' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <label className="space-y-1 text-xs font-medium md:col-span-3">Task type<select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal" value={row.taskType} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, taskType: event.target.value } : item))}>{AUTOMATION_TASK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className="space-y-1 text-xs font-medium md:col-span-2">Due after<input className="h-9 w-full rounded-md border border-input px-2 text-sm font-normal" aria-label="Task due after hours" type="number" min="1" value={row.dueInHours} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, dueInHours: event.target.value } : item))} /><span className="block font-normal text-muted-foreground">hours</span></label>
                      <label className="space-y-1 text-xs font-medium md:col-span-4">Assignee
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={row.ownerUserId || null}
                          onChange={(next) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, ownerUserId: next || '' } : item))}
                          placeholder="Assignee (optional)"
                          className="h-9"
                        />
                      </label>
                      <label className="space-y-1 text-xs font-medium md:col-span-3">Instructions<input className="h-9 w-full rounded-md border border-input px-2 text-sm font-normal" placeholder="Optional context" value={row.notes} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notes: event.target.value } : item))} /></label>
                    </div>
                  ) : null}

                  {row.type === 'audit_event' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <label className="space-y-1 text-xs font-medium md:col-span-8">Audit event name<input className="h-9 w-full rounded-md border border-input px-2 text-sm font-normal" placeholder="Example: crm.visit.completed.review" value={row.eventType} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, eventType: event.target.value } : item))} /></label>
                      <label className="space-y-1 text-xs font-medium md:col-span-4">Severity<select
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal"
                        value={row.severity}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, severity: event.target.value as ActionBuilderRow['severity'] } : item))}
                      >
                        <option value="info">Information</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select></label>
                    </div>
                  ) : null}

                  {row.type === 'set_handoff_status' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <label className="space-y-1 text-xs font-medium md:col-span-5">New handoff status<select
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal"
                        value={row.status}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, status: event.target.value } : item))}
                      >
                        <option value="pending">Pending</option>
                        <option value="requires_input">Requires input</option>
                        <option value="ready">Ready</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select></label>
                    </div>
                  ) : null}

                  {row.type === 'send_notification' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={row.recipientUserId || null}
                          onChange={(next) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, recipientUserId: next || '' } : item))}
                          placeholder="Recipient"
                          className="h-9"
                          allowUnassigned={false}
                        />
                      </div>
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                        placeholder="Notification title"
                        value={row.notificationTitle}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notificationTitle: event.target.value } : item))}
                      />
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                        placeholder="Notification link (optional)"
                        value={row.notificationLink}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notificationLink: event.target.value } : item))}
                      />
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-12"
                        placeholder="Notification message"
                        value={row.notificationMessage}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notificationMessage: event.target.value } : item))}
                      />
                    </div>
                  ) : null}

                  {row.type === 'send_message' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={row.recipientUserId || null}
                          onChange={(next) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, recipientUserId: next || '' } : item))}
                          placeholder="Recipient"
                          className="h-9"
                          allowUnassigned={false}
                        />
                      </div>
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-8"
                        placeholder="Message subject"
                        value={row.messageSubject}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, messageSubject: event.target.value } : item))}
                      />
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-12"
                        placeholder="Message content"
                        value={row.messageContent}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, messageContent: event.target.value } : item))}
                      />
                    </div>
                  ) : null}

                  {row.type === 'update_lead_stage' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <label className="space-y-1 text-xs font-medium md:col-span-4">New lead stage<select
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal"
                        value={row.leadStage}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, leadStage: event.target.value } : item))}
                      >
                        <option value="new">New</option>
                        <option value="attempted_contact">Attempted contact</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="viewing_scheduled">Viewing scheduled</option>
                        <option value="offer_made">Offer made</option>
                        <option value="lease_in_progress">Lease in progress</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select></label>
                      <label className="space-y-1 text-xs font-medium md:col-span-8">Reason<input className="h-9 w-full rounded-md border border-input px-2 text-sm font-normal" placeholder="Optional note for the lead timeline" value={row.notes} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notes: event.target.value } : item))} /></label>
                    </div>
                  ) : null}

                  {row.type === 'reassign_lead' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={row.recipientUserId || null}
                          onChange={(next) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, recipientUserId: next || '' } : item))}
                          placeholder="Assignee"
                          className="h-9"
                          allowUnassigned={false}
                        />
                      </div>
                    </div>
                  ) : null}

                  {row.type === 'provision_tenant' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      <input aria-label="Lease start" className="h-9 rounded-md border border-input px-2 text-sm" type="date" value={row.leaseStart || ''} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, leaseStart: event.target.value } : item))} />
                      <input aria-label="Lease end" className="h-9 rounded-md border border-input px-2 text-sm" type="date" value={row.leaseEnd || ''} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, leaseEnd: event.target.value } : item))} />
                      <input aria-label="Monthly rent" className="h-9 rounded-md border border-input px-2 text-sm" inputMode="decimal" placeholder="Monthly rent" value={row.monthlyRent || ''} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, monthlyRent: event.target.value } : item))} />
                      <input aria-label="Security deposit" className="h-9 rounded-md border border-input px-2 text-sm" inputMode="decimal" placeholder="Security deposit" value={row.securityDeposit || ''} onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, securityDeposit: event.target.value } : item))} />
                    </div>
                  ) : null}
                </div>
              ))}
              {actionRows.length === 0 ? <p className="rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">Add at least one action to save this rule.</p> : null}
            </div>
          </section>

          <details className="group border-t border-border/60 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              Technical settings
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">Retries are automatic after an action fails. Custom JSON is intended for administrators integrating supported payload fields.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium">
                Maximum attempts
                <input
                  aria-label="Maximum retry attempts"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  type="number"
                  min="1"
                  max="10"
                  value={retryLimit}
                  onChange={(event) => setRetryLimit(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={advancedMode} onChange={(event) => {
                  const enabled = event.target.checked;
                  setAdvancedMode(enabled);
                  if (enabled) syncAdvancedFromBuilder();
                }} />
                Edit generated JSON
              </label>
              {advancedMode ? (
                <>
                  <label className="space-y-1.5 text-xs font-medium">Conditions JSON<textarea className="mt-1 min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs font-normal" value={advancedConditionsJson} onChange={(event) => setAdvancedConditionsJson(event.target.value)} /></label>
                  <label className="space-y-1.5 text-xs font-medium">Actions JSON<textarea className="mt-1 min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs font-normal" value={advancedActionsJson} onChange={(event) => setAdvancedActionsJson(event.target.value)} /></label>
                  <Button type="button" variant="outline" size="sm" className="md:col-span-2" onClick={syncAdvancedFromBuilder}><RotateCcw className="h-4 w-4" />Reset JSON from builder</Button>
                </>
              ) : null}
            </div>
          </details>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">The rule will be active immediately. Test or pause it from the rules register below.</p>
            <Button onClick={onCreateRule} disabled={createRule.isPending || !name.trim() || actionRows.length === 0}>
              <Workflow className="h-4 w-4" />{createRule.isPending ? 'Creating...' : 'Create automation'}
            </Button>
          </div>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Automation rules" description="Test matching safely, then activate or pause each rule." action={<Badge variant="outline">{(rulesQuery.data || []).filter((rule) => rule.is_active).length} active</Badge>}>
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Then</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last test</th>
                <th className="px-3 py-2">Controls</th>
              </tr>
            </thead>
            <tbody>
              {(rulesQuery.data || []).map((rule) => (
                <tr key={rule.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{rule.name}</td>
                  <td className="px-3 py-2">{eventLabel(rule.event_type)}</td>
                  <td className="max-w-64 px-3 py-2 text-xs text-muted-foreground">{actionSummary(rule.actions_json)}</td>
                  <td className="px-3 py-2"><Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Paused'}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {previewByRuleId[rule.id] ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {previewByRuleId[rule.id].would_run_actions ? `Matched · ${String(previewByRuleId[rule.id].action_count ?? 0)} actions` : 'Did not match'}
                      </span>
                    ) : 'Not tested'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runPreview(rule.id, rule.event_type)}
                        disabled={previewRule.isPending}
                      >
                        <Play className="h-4 w-4" />Test rule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateRule.mutate({ ruleId: rule.id, payload: { is_active: !rule.is_active } })}
                        disabled={updateRule.isPending}
                      >
                        {rule.is_active ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Activate</>}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(rulesQuery.data || []).length === 0 ? <div className="p-4"><EmptyState label="No automation rules yet." /></div> : null}
        </div>
      </CrmDataCard>

      <CrmDataCard
        title="Run history"
        description="See what ran, what was skipped, and what needs attention. Failed actions retry automatically."
        action={
          <select className="h-8 rounded-md border border-input px-2 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Attempts</th>
                <th className="px-3 py-2">Correlation</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{new Date(run.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{eventLabel(run.event_type)}</td>
                  <td className="px-3 py-2"><Badge variant={run.status === 'failed' ? 'destructive' : run.status === 'success' ? 'default' : 'secondary'} className="capitalize">{run.status}</Badge></td>
                  <td className="px-3 py-2">{run.attempts}/{run.max_attempts}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.correlation_id || '-'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.last_error || '-'}</td>
                  <td className="px-3 py-2">
                    {(run.status === 'failed' || run.status === 'pending') ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => replayRun.mutate({ runId: run.id })}
                        disabled={replayRun.isPending}
                      >
                        <RotateCcw className="h-4 w-4" />Retry now
                      </Button>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRuns.length === 0 ? <div className="p-4"><EmptyState label="No automation runs for this filter." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
