import { useMemo, useState } from 'react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState } from '@/components/marketplace-crm/CrmWidgets';
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
  deserializeConditionRows,
  getEventDefinition,
  serializeActionRows,
  serializeConditionRows,
  type ActionBuilderRow,
  type ConditionBuilderRow,
} from '@/lib/crmAutomationBuilder';

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
  const [samplePayloadJson, setSamplePayloadJson] = useState(JSON.stringify(CRM_AUTOMATION_EVENT_DEFINITIONS[0].samplePayload, null, 2));
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

  const syncAdvancedFromBuilder = () => {
    setAdvancedConditionsJson(JSON.stringify(builderConditions, null, 2));
    setAdvancedActionsJson(JSON.stringify(builderActions, null, 2));
  };

  const onChangeEventType = (nextEventType: string) => {
    setEventType(nextEventType as 'call.logged' | 'deal.stage_changed' | 'meeting.completed' | 'visit.completed');

    const defaults = getEventDefinition(nextEventType);
    setConditionRows(defaults.defaultConditionRows);
    setActionRows(defaults.defaultActionRows);
    setSamplePayloadJson(JSON.stringify(defaults.samplePayload, null, 2));
    setAdvancedConditionsJson(JSON.stringify(serializeConditionRows(defaults.defaultConditionRows), null, 2));
    setAdvancedActionsJson(JSON.stringify(serializeActionRows(defaults.defaultActionRows), null, 2));
  };

  const onCreateRule = () => {
    if (!name.trim()) {
      toast({ title: 'Rule Name Required', description: 'Provide a rule name before creating automation.' });
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

    const parsedRetry = Number.parseInt(retryLimit, 10);

    createRule.mutate({
      name: name.trim(),
      eventType,
      conditions,
      actions,
      retryLimit: Number.isNaN(parsedRetry) ? 3 : parsedRetry,
      isActive: true,
    });

    setName('');
    setRetryLimit('3');
  };

  const runPreview = (ruleId: string) => {
    let payload: Record<string, unknown>;

    try {
      const parsed = JSON.parse(samplePayloadJson || '{}');
      payload = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      toast({ title: 'Invalid Sample Payload', description: 'Sample payload JSON must be valid.', variant: 'destructive' });
      return;
    }

    previewRule.mutate(
      {
        ruleId,
        samplePayload: payload,
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
    <CrmWorkspace title="Automation" subtitle="Rule engine controls and execution telemetry for CRM events.">
      <CrmDataCard title="Create Automation Rule" description="Build event-triggered automation without hand-writing JSON.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            aria-label="Rule name"
            className="h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Rule name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select aria-label="Trigger event" className="h-9 rounded-md border border-input px-3 text-sm" value={eventType} onChange={(event) => onChangeEventType(event.target.value)}>
            {CRM_AUTOMATION_EVENT_DEFINITIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <div className="rounded-md border border-border/70 p-3 md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Conditions</p>
              <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => setConditionRows((rows) => [...rows, createConditionRow()])}>
                Add Condition
              </button>
            </div>
            <div className="space-y-2">
              {conditionRows.map((row) => (
                <div key={row.id} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                  <input
                    aria-label="Payload field"
                    className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                    placeholder="Payload field"
                    value={row.field}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, field: event.target.value } : item))}
                  />
                  <select
                    aria-label="Condition operator"
                    className="h-9 rounded-md border border-input px-2 text-sm md:col-span-3"
                    value={row.operator}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, operator: event.target.value as 'equals' | 'required' } : item))}
                  >
                    <option value="equals">equals</option>
                    <option value="required">required</option>
                  </select>
                  <input
                    aria-label="Expected value"
                    className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                    placeholder="Expected value"
                    value={row.value}
                    onChange={(event) => setConditionRows((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))}
                    disabled={row.operator === 'required'}
                  />
                  <button
                    className="h-9 rounded border border-input px-2 text-xs md:col-span-1"
                    onClick={() => setConditionRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {conditionRows.length === 0 ? <p className="text-xs text-muted-foreground">No conditions means this rule always evaluates as matched.</p> : null}
            </div>
          </div>

          <div className="rounded-md border border-border/70 p-3 md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Actions</p>
              <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => setActionRows((rows) => [...rows, createActionRow()])}>
                Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actionRows.map((row) => (
                <div key={row.id} className="rounded-md border border-border/50 p-2">
                  <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-12">
                    <select
                      className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                      value={row.type}
                      onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, type: event.target.value as ActionBuilderRow['type'] } : item))}
                    >
                      <option value="create_task">create_task</option>
                      <option value="audit_event">audit_event</option>
                      <option value="set_handoff_status">set_handoff_status</option>
                      <option value="send_notification">send_notification</option>
                      <option value="send_message">send_message</option>
                      <option value="update_lead_stage">update_lead_stage</option>
                      <option value="reassign_lead">reassign_lead</option>
                    </select>
                    <button className="h-9 rounded border border-input px-2 text-xs md:col-span-2 md:col-start-11" onClick={() => setActionRows((current) => current.filter((item) => item.id !== row.id))}>Remove</button>
                  </div>

                  {row.type === 'create_task' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-3"
                        placeholder="Task type"
                        value={row.taskType}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, taskType: event.target.value } : item))}
                      />
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-2"
                        placeholder="Due (hours)"
                        value={row.dueInHours}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, dueInHours: event.target.value } : item))}
                      />
                      <div className="md:col-span-4">
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={row.ownerUserId || null}
                          onChange={(next) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, ownerUserId: next || '' } : item))}
                          placeholder="Assignee (optional)"
                          className="h-9"
                        />
                      </div>
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-3"
                        placeholder="Task notes (optional)"
                        value={row.notes}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notes: event.target.value } : item))}
                      />
                    </div>
                  ) : null}

                  {row.type === 'audit_event' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-8"
                        placeholder="Audit event type"
                        value={row.eventType}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, eventType: event.target.value } : item))}
                      />
                      <select
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                        value={row.severity}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, severity: event.target.value as ActionBuilderRow['severity'] } : item))}
                      >
                        <option value="info">info</option>
                        <option value="warning">warning</option>
                        <option value="critical">critical</option>
                      </select>
                    </div>
                  ) : null}

                  {row.type === 'set_handoff_status' ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <select
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-5"
                        value={row.status}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, status: event.target.value } : item))}
                      >
                        <option value="pending">pending</option>
                        <option value="requires_input">requires_input</option>
                        <option value="ready">ready</option>
                        <option value="in_progress">in_progress</option>
                        <option value="completed">completed</option>
                        <option value="failed">failed</option>
                      </select>
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
                      <select
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-4"
                        value={row.leadStage}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, leadStage: event.target.value } : item))}
                      >
                        <option value="new">new</option>
                        <option value="attempted_contact">attempted_contact</option>
                        <option value="contacted">contacted</option>
                        <option value="qualified">qualified</option>
                        <option value="viewing_scheduled">viewing_scheduled</option>
                        <option value="offer_made">offer_made</option>
                        <option value="lease_in_progress">lease_in_progress</option>
                        <option value="converted">converted</option>
                        <option value="lost">lost</option>
                      </select>
                      <input
                        className="h-9 rounded-md border border-input px-2 text-sm md:col-span-8"
                        placeholder="Reason (optional)"
                        value={row.notes}
                        onChange={(event) => setActionRows((current) => current.map((item) => item.id === row.id ? { ...item, notes: event.target.value } : item))}
                      />
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
                </div>
              ))}
              {actionRows.length === 0 ? <p className="text-xs text-muted-foreground">No actions configured yet.</p> : null}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={advancedMode} onChange={(event) => {
              const enabled = event.target.checked;
              setAdvancedMode(enabled);
              if (enabled) syncAdvancedFromBuilder();
            }} />
            Advanced JSON mode
          </label>

          {advancedMode ? (
            <>
              <textarea
                className="min-h-[88px] rounded-md border border-input px-3 py-2 text-sm md:col-span-2"
                placeholder="Conditions JSON"
                value={advancedConditionsJson}
                onChange={(event) => setAdvancedConditionsJson(event.target.value)}
              />
              <textarea
                className="min-h-[88px] rounded-md border border-input px-3 py-2 text-sm md:col-span-2"
                placeholder="Actions JSON"
                value={advancedActionsJson}
                onChange={(event) => setAdvancedActionsJson(event.target.value)}
              />
              <button className="h-9 rounded-md border border-input px-3 text-sm md:col-span-2" onClick={syncAdvancedFromBuilder}>
                Reset JSON From Builder
              </button>
            </>
          ) : (
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 text-xs md:col-span-2">
              <p className="font-medium">Generated Payload</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify({ conditions: builderConditions, actions: builderActions }, null, 2)}</pre>
            </div>
          )}

          <input
            className="h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Retry limit"
            value={retryLimit}
            onChange={(event) => setRetryLimit(event.target.value)}
          />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={onCreateRule} disabled={createRule.isPending}>
            Create Rule
          </button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Rules" description="Activate, pause, and preview automation rules before live execution.">
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <textarea
            className="min-h-[90px] rounded-md border border-input px-3 py-2 text-sm"
            value={samplePayloadJson}
            onChange={(event) => setSamplePayloadJson(event.target.value)}
            placeholder="Sample payload JSON"
          />
          <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Test this rule</p>
            <p className="mt-1">Click Preview on any rule row to run crm_preview_automation_rule against this sample payload without creating run records or executing actions.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Retry Limit</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Preview</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(rulesQuery.data || []).map((rule) => (
                <tr key={rule.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{rule.name}</td>
                  <td className="px-3 py-2">{rule.event_type}</td>
                  <td className="px-3 py-2">{rule.retry_limit}</td>
                  <td className="px-3 py-2">{rule.is_active ? 'active' : 'inactive'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {previewByRuleId[rule.id] ? (
                      <span>
                        {previewByRuleId[rule.id].would_run_actions ? 'matched' : 'skipped'}
                        {' · actions: '}
                        {String(previewByRuleId[rule.id].action_count ?? 0)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => runPreview(rule.id)}
                        disabled={previewRule.isPending}
                      >
                        Preview
                      </button>
                      <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => updateRule.mutate({ ruleId: rule.id, payload: { is_active: !rule.is_active } })}
                        disabled={updateRule.isPending}
                      >
                        {rule.is_active ? 'Pause' : 'Activate'}
                      </button>
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
        title="Run History"
        description="Recent execution outcomes by event and correlation id."
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
                  <td className="px-3 py-2">{run.event_type}</td>
                  <td className="px-3 py-2">{run.status}</td>
                  <td className="px-3 py-2">{run.attempts}/{run.max_attempts}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.correlation_id || '-'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.last_error || '-'}</td>
                  <td className="px-3 py-2">
                    {(run.status === 'failed' || run.status === 'pending') ? (
                      <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => replayRun.mutate({ runId: run.id })}
                        disabled={replayRun.isPending}
                      >
                        Replay
                      </button>
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
