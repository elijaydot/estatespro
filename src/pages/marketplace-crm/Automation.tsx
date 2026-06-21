import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import {
  useCreateCrmAutomationRule,
  useCrmAutomationRules,
  useCrmAutomationRuns,
  useReplayCrmAutomationRun,
  useUpdateCrmAutomationRule,
} from '@/hooks/useMarketplaceCrm';

const EVENT_OPTIONS = ['deal.stage_changed', 'call.logged', 'meeting.completed', 'visit.completed'];

export default function MarketplaceCrmAutomationPage() {
  const { activeCompanyId } = useActiveCompany();
  const rulesQuery = useCrmAutomationRules(activeCompanyId);
  const runsQuery = useCrmAutomationRuns(activeCompanyId);
  const createRule = useCreateCrmAutomationRule(activeCompanyId);
  const updateRule = useUpdateCrmAutomationRule(activeCompanyId);
  const replayRun = useReplayCrmAutomationRun(activeCompanyId);

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState(EVENT_OPTIONS[0]);
  const [conditionsJson, setConditionsJson] = useState('{"stage": "closed_won"}');
  const [actionsJson, setActionsJson] = useState('[{"type": "create_task", "payload": {"task_type": "handoff_prep"}}]');
  const [retryLimit, setRetryLimit] = useState('3');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRuns = useMemo(() => {
    const rows = runsQuery.data || [];
    if (statusFilter === 'all') return rows;
    return rows.filter((run) => run.status === statusFilter);
  }, [runsQuery.data, statusFilter]);

  const onCreateRule = () => {
    if (!name.trim()) return;

    let conditions: Record<string, unknown> = {};
    let actions: Array<Record<string, unknown>> = [];

    try {
      const parsedConditions = JSON.parse(conditionsJson || '{}');
      const parsedActions = JSON.parse(actionsJson || '[]');
      conditions = parsedConditions && typeof parsedConditions === 'object' ? parsedConditions : {};
      actions = Array.isArray(parsedActions) ? parsedActions : [];
    } catch {
      return;
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
  };

  return (
    <CrmWorkspace title="Automation" subtitle="Rule engine controls and execution telemetry for CRM events.">
      <CrmDataCard title="Create Automation Rule" description="Configure an event trigger, conditions, and actions.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Rule name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select className="h-9 rounded-md border border-input px-3 text-sm" value={eventType} onChange={(event) => setEventType(event.target.value)}>
            {EVENT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <textarea
            className="min-h-[88px] rounded-md border border-input px-3 py-2 text-sm md:col-span-2"
            placeholder="Conditions JSON"
            value={conditionsJson}
            onChange={(event) => setConditionsJson(event.target.value)}
          />
          <textarea
            className="min-h-[88px] rounded-md border border-input px-3 py-2 text-sm md:col-span-2"
            placeholder="Actions JSON"
            value={actionsJson}
            onChange={(event) => setActionsJson(event.target.value)}
          />
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

      <CrmDataCard title="Rules" description="Activate or pause automation rules without redeploying SQL.">
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Retry Limit</th>
                <th className="px-3 py-2">Status</th>
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
                  <td className="px-3 py-2">
                    <button
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() => updateRule.mutate({ ruleId: rule.id, payload: { is_active: !rule.is_active } })}
                      disabled={updateRule.isPending}
                    >
                      {rule.is_active ? 'Pause' : 'Activate'}
                    </button>
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
