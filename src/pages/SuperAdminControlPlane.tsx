import { useEffect, useMemo, useState } from 'react';
import { Shield, Siren, Activity, Fingerprint, RefreshCw, Sparkles, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import {
  useAssignPlatformOperatorRole,
  useControlPlaneAlerts,
  useControlPlaneEvents,
  useEntitlementDecisions,
  usePlatformAnalyticsSnapshots,
  usePlatformDriftChecks,
  usePlatformOperatorRoles,
  useRemovePlatformOperatorRole,
  useRunPlatformPhase10,
  useUpdateGovernanceAlertStatus,
  useUsageSnapshots,
} from '@/hooks/useControlPlane';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useSearchParams } from 'react-router-dom';
import { downloadCsv, downloadJson, isInTimeRange, matchesSearch, rowsToCsv, type TimeRange } from '@/lib/controlPlane';
import {
  parseControlPlaneUiState,
  toControlPlaneSearchParams,
  type AlertStatusFilter,
  type ControlPlaneTab,
  type DecisionFilter,
  type EventResultFilter,
  type SeverityFilter,
} from '@/lib/controlPlaneState';
import { EmptyState } from '@/components/control-plane/EmptyState';
import { AnalyticsOpsTab } from '@/components/control-plane/tabs/AnalyticsOpsTab';
import { OverviewTab } from '@/components/control-plane/tabs/OverviewTab';
import { OperatorsTab, type OperatorRole } from '@/components/control-plane/tabs/OperatorsTab';
import {
  buildCompany360Rows,
  buildCorrelationSummary,
  buildIncidentTimeline,
  buildUser360Rows,
} from '@/lib/controlPlaneViews';
import { getControlPlaneExportRows } from '@/lib/controlPlaneExports';
import {
  buildCompanyRiskRows,
  buildModuleAdoptionRows,
  buildOpsSignals,
} from '@/lib/controlPlaneAnalytics';
import {
  buildCorrelationFilterOptions,
  matchesCompanyFilter,
  matchesUserFilter,
  type CompanyDirectoryEntry,
  type UserDirectoryEntry,
} from '@/lib/controlPlaneFilterHelpers';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive">critical</Badge>;
  if (severity === 'warning') return <Badge variant="secondary">warning</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

function normalizeTab(value: string | null): ControlPlaneTab {
  return parseControlPlaneUiState(new URLSearchParams(value ? `cp_tab=${value}` : '')).tab;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export default function SuperAdminControlPlane() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canOverride, overrideEnabled, setOverrideEnabled } = useSuperAdminOverride();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedState = parseControlPlaneUiState(searchParams);

  const events = useControlPlaneEvents(100);
  const alerts = useControlPlaneAlerts(100);
  const decisions = useEntitlementDecisions(100);
  const usage = useUsageSnapshots(100);
  const analyticsSnapshots = usePlatformAnalyticsSnapshots(20);
  const driftChecks = usePlatformDriftChecks(50);
  const operatorRoles = usePlatformOperatorRoles(200);
  const assignOperatorRole = useAssignPlatformOperatorRole();
  const removeOperatorRole = useRemovePlatformOperatorRole();
  const runPhase10 = useRunPlatformPhase10();
  const updateAlertStatus = useUpdateGovernanceAlertStatus();

  const [activeTab, setActiveTab] = useState<ControlPlaneTab>(parsedState.tab);
  const [timeRange, setTimeRange] = useState<TimeRange>(parsedState.timeRange);
  const [search, setSearch] = useState(parsedState.search);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(parsedState.severityFilter);
  const [eventResultFilter, setEventResultFilter] = useState<EventResultFilter>(parsedState.eventResultFilter);
  const [alertStatusFilter, setAlertStatusFilter] = useState<AlertStatusFilter>(parsedState.alertStatusFilter);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>(parsedState.decisionFilter);
  const [companyFilter, setCompanyFilter] = useState(parsedState.companyFilter);
  const [userFilter, setUserFilter] = useState(parsedState.userFilter);
  const [correlationFilter, setCorrelationFilter] = useState(parsedState.correlationFilter);
  const [operatorUserId, setOperatorUserId] = useState('');
  const [operatorRole, setOperatorRole] = useState<OperatorRole>('security_auditor');
  const [companyDirectory, setCompanyDirectory] = useState<Map<string, CompanyDirectoryEntry>>(new Map());
  const [userDirectory, setUserDirectory] = useState<Map<string, UserDirectoryEntry>>(new Map());

  useEffect(() => {
    const next = toControlPlaneSearchParams({
      tab: activeTab,
      timeRange,
      search,
      severityFilter,
      eventResultFilter,
      alertStatusFilter,
      decisionFilter,
      companyFilter,
      userFilter,
      correlationFilter,
    });

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    activeTab,
    alertStatusFilter,
    companyFilter,
    correlationFilter,
    decisionFilter,
    eventResultFilter,
    search,
    searchParams,
    setSearchParams,
    severityFilter,
    timeRange,
    userFilter,
  ]);

  const isLoading = events.isLoading || alerts.isLoading || decisions.isLoading || usage.isLoading || analyticsSnapshots.isLoading || driftChecks.isLoading || operatorRoles.isLoading;
  const hasError = events.error || alerts.error || decisions.error || usage.error || analyticsSnapshots.error || driftChecks.error || operatorRoles.error;

  useEffect(() => {
    const companyIds = new Set<string>();
    const userIds = new Set<string>();

    (events.data || []).forEach((event) => {
      if (event.company_id) companyIds.add(event.company_id);
      if (event.actor_user_id) userIds.add(event.actor_user_id);
    });

    (alerts.data || []).forEach((alert) => {
      if (alert.company_id) companyIds.add(alert.company_id);
    });

    (decisions.data || []).forEach((decision) => {
      if (decision.company_id) companyIds.add(decision.company_id);
      if (decision.actor_user_id) userIds.add(decision.actor_user_id);
    });

    (usage.data || []).forEach((snapshot) => {
      if (snapshot.company_id) companyIds.add(snapshot.company_id);
    });

    (operatorRoles.data || []).forEach((role) => {
      if (role.user_id) userIds.add(role.user_id);
    });

    let cancelled = false;

    const loadDirectory = async () => {
      if (companyIds.size === 0) {
        setCompanyDirectory(new Map());
      }

      if (userIds.size === 0) {
        setUserDirectory(new Map());
      }

      const requests: Promise<void>[] = [];

      if (companyIds.size > 0) {
        const ids = Array.from(companyIds);
        requests.push((async () => {
          const { data, error } = await supabase
            .from('companies' as never)
            .select('id, name, email')
            .in('id', ids);

          if (error || cancelled) return;

          const next = new Map<string, CompanyDirectoryEntry>();
          (data || []).forEach((item: { id: string; name: string | null; email: string | null }) => {
            next.set(item.id, item);
          });
          setCompanyDirectory(next);
        })());
      }

      if (userIds.size > 0) {
        const ids = Array.from(userIds);
        requests.push((async () => {
          const { data, error } = await supabase
            .from('profiles' as never)
            .select('user_id, name, email')
            .in('user_id', ids);

          if (error || cancelled) return;

          const next = new Map<string, UserDirectoryEntry>();
          (data || []).forEach((item: { user_id: string; name: string | null; email: string | null }) => {
            next.set(item.user_id, item);
          });
          setUserDirectory(next);
        })());
      }

      await Promise.all(requests);
    };

    void loadDirectory();

    return () => {
      cancelled = true;
    };
  }, [alerts.data, decisions.data, events.data, operatorRoles.data, usage.data]);

  const refreshAll = () => {
    void events.refetch();
    void alerts.refetch();
    void decisions.refetch();
    void usage.refetch();
    void analyticsSnapshots.refetch();
    void driftChecks.refetch();
    void operatorRoles.refetch();
  };

  const filteredAlerts = useMemo(() => {
    return (alerts.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (alertStatusFilter !== 'all' && item.status !== alertStatusFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter && !(severityFilter === 'error' && item.severity === 'critical')) {
        return false;
      }
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (correlationFilter && item.correlation_id !== correlationFilter) return false;
      return matchesSearch([item.title, item.description, item.alert_type, item.correlation_id, item.company_id, item.status], search);
    });
  }, [alerts.data, alertStatusFilter, companyDirectory, companyFilter, correlationFilter, search, severityFilter, timeRange]);

  const filteredEvents = useMemo(() => {
    return (events.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (eventResultFilter !== 'all' && item.result_status !== eventResultFilter) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (!matchesUserFilter(item.actor_user_id, userFilter, userDirectory)) return false;
      if (correlationFilter && item.correlation_id !== correlationFilter) return false;
      return matchesSearch([
        item.source,
        item.event_type,
        item.module,
        item.action,
        item.actor_user_id,
        item.correlation_id,
        item.company_id,
      ], search);
    });
  }, [companyDirectory, companyFilter, correlationFilter, eventResultFilter, events.data, search, severityFilter, timeRange, userDirectory, userFilter]);

  const filteredDecisions = useMemo(() => {
    return (decisions.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (decisionFilter === 'allowed' && !item.allowed) return false;
      if (decisionFilter === 'denied' && item.allowed) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (!matchesUserFilter(item.actor_user_id, userFilter, userDirectory)) return false;
      if (correlationFilter && item.correlation_id !== correlationFilter) return false;
      return matchesSearch([
        item.module,
        item.action,
        item.entitlement_key,
        item.decision_reason,
        item.actor_user_id,
        item.correlation_id,
        item.company_id,
      ], search);
    });
  }, [companyDirectory, companyFilter, correlationFilter, decisionFilter, decisions.data, search, timeRange, userDirectory, userFilter]);

  const filteredUsage = useMemo(() => {
    return (usage.data || []).filter((item) => {
      if (!isInTimeRange(item.snapshot_at, timeRange)) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      return matchesSearch([item.company_id, item.product_code, item.quota_code, item.limit_state], search);
    });
  }, [companyDirectory, companyFilter, search, timeRange, usage.data]);

  const companyOptions = useMemo(() => {
    return Array.from(companyDirectory.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .slice(0, 200);
  }, [companyDirectory]);

  const userOptions = useMemo(() => {
    return Array.from(userDirectory.values())
      .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
      .slice(0, 300);
  }, [userDirectory]);

  const companyFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const options: SearchableSelectOption[] = [
      {
        value: '',
        label: 'All companies',
        description: 'Clear company filter',
      },
      {
        value: 'unscoped',
        label: 'Unscoped company activity',
        description: 'Rows where company_id is null',
      },
    ];

    companyOptions.forEach((item) => {
      const name = item.name || 'Unnamed company';
      const email = item.email ? ` • ${item.email}` : '';
      options.push({
        value: item.id,
        label: `${name}${email}`,
        description: `UUID: ${item.id}`,
      });
    });

    return options;
  }, [companyOptions]);

  const userFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const options: SearchableSelectOption[] = [
      {
        value: '',
        label: 'All users',
        description: 'Clear user filter',
      },
      {
        value: 'unknown',
        label: 'Unknown actors',
        description: 'Rows where actor_user_id is null',
      },
    ];

    userOptions.forEach((item) => {
      const name = item.name || 'Unknown user';
      const email = item.email ? ` • ${item.email}` : '';
      options.push({
        value: item.user_id,
        label: `${name}${email}`,
        description: `UUID: ${item.user_id}`,
      });
    });

    return options;
  }, [userOptions]);

  const scopedEventsForCorrelationOptions = useMemo(() => {
    return (events.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (eventResultFilter !== 'all' && item.result_status !== eventResultFilter) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (!matchesUserFilter(item.actor_user_id, userFilter, userDirectory)) return false;
      return true;
    });
  }, [companyDirectory, companyFilter, eventResultFilter, events.data, severityFilter, timeRange, userDirectory, userFilter]);

  const correlationFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    return buildCorrelationFilterOptions(scopedEventsForCorrelationOptions).map((row) => ({
      value: row.value,
      label: row.label,
      description: row.description,
    }));
  }, [scopedEventsForCorrelationOptions]);

  const companyRows = useMemo(() => {
    return buildCompany360Rows(filteredEvents, filteredAlerts, filteredDecisions, filteredUsage);
  }, [filteredAlerts, filteredDecisions, filteredEvents, filteredUsage]);

  const userRows = useMemo(() => {
    return buildUser360Rows(filteredEvents, filteredDecisions);
  }, [filteredDecisions, filteredEvents]);

  const incidentTimeline = useMemo(() => {
    return buildIncidentTimeline(filteredEvents);
  }, [filteredEvents]);

  const correlationSummary = useMemo(() => buildCorrelationSummary(filteredEvents), [filteredEvents]);
  const moduleAdoptionRows = useMemo(() => buildModuleAdoptionRows(filteredEvents), [filteredEvents]);
  const opsSignals = useMemo(() => buildOpsSignals(filteredEvents, filteredDecisions, filteredAlerts, filteredUsage), [filteredAlerts, filteredDecisions, filteredEvents, filteredUsage]);
  const companyRiskRows = useMemo(() => buildCompanyRiskRows(filteredEvents, filteredDecisions, filteredAlerts, filteredUsage), [filteredAlerts, filteredDecisions, filteredEvents, filteredUsage]);
  const analyticsRows = useMemo(() => {
    return [
      ...opsSignals.map((row) => ({
        row_type: 'ops_signal',
        signal: row.signal,
        value: row.value,
        threshold: row.threshold,
        status: row.status,
        unit: row.unit,
      })),
      ...moduleAdoptionRows.map((row) => ({
        row_type: 'module_adoption',
        module: row.module,
        events: row.events,
        denied_or_blocked: row.denied_or_blocked,
        high_risk: row.high_risk,
      })),
      ...companyRiskRows.map((row) => ({
        row_type: 'company_risk',
        company_id: row.company_id,
        denial_events: row.denial_events,
        high_risk_events: row.high_risk_events,
        open_alerts: row.open_alerts,
        usage_pressure: row.usage_pressure,
        risk_score: row.risk_score,
      })),
      ...(analyticsSnapshots.data || []).map((row) => ({
        row_type: 'analytics_snapshot',
        snapshot_id: row.id,
        snapshot_window: row.snapshot_window,
        snapshot_start: row.snapshot_start,
        snapshot_end: row.snapshot_end,
        total_events: row.total_events,
        entitlement_denied: row.entitlement_denied,
        critical_open_alerts: row.critical_open_alerts,
        created_at: row.created_at,
      })),
      ...(driftChecks.data || []).map((row) => ({
        row_type: 'drift_check',
        drift_check_id: row.id,
        check_key: row.check_key,
        status: row.status,
        observed_value: row.observed_value,
        threshold_value: row.threshold_value,
        alert_id: row.alert_id,
        created_at: row.created_at,
      })),
    ];
  }, [analyticsSnapshots.data, companyRiskRows, driftChecks.data, moduleAdoptionRows, opsSignals]);

  const openAlerts = filteredAlerts.filter((item) => item.status === 'open').length;
  const blockedEvents = filteredEvents.filter((item) => item.result_status === 'blocked' || item.result_status === 'denied').length;
  const highRiskEvents = filteredEvents.filter((item) => item.risk_score >= 80).length;

  const exportRows = () => {
    return getControlPlaneExportRows(activeTab, {
      openAlerts,
      blockedEvents,
      highRiskEvents,
      alerts: filteredAlerts,
      events: filteredEvents,
      decisions: filteredDecisions,
      usage: filteredUsage,
      incidents: incidentTimeline,
      companyRows,
      userRows,
      analyticsRows,
      operators: operatorRoles.data || [],
      correlationSummary,
    });
  };

  const handleExportCsv = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: 'Nothing to export', description: 'No rows in current view.' });
      return;
    }
    const csv = rowsToCsv(rows as Record<string, unknown>[]);
    downloadCsv(`control-plane-${activeTab}-${Date.now()}.csv`, csv);
  };

  const handleExportJson = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: 'Nothing to export', description: 'No rows in current view.' });
      return;
    }
    downloadJson(`control-plane-${activeTab}-${Date.now()}.json`, rows);
  };

  const handleSeedEvent = async () => {
    const { error } = await supabase.rpc('platform_ingest_audit_event' as never, {
      p_source: 'control_plane_ui',
      p_event_type: 'admin.seed_event',
      p_module: 'admin',
      p_action: 'seed_event',
      p_result_status: 'blocked',
      p_severity: 'warning',
      p_actor_user_id: user?.id ?? null,
      p_company_id: null,
      p_target_entity_type: 'system',
      p_target_entity_id: 'control-plane',
      p_correlation_id: `control-plane-seed-${Date.now()}`,
      p_risk_score: 85,
      p_ip_address: null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      p_device_info: { source: 'super-admin-control-plane' },
      p_metadata: { note: 'seeded from super admin ui' },
    } as never);

    if (error) {
      toast({ title: 'Seed event failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Seed event created', description: 'A synthetic governance event was added.' });
    refreshAll();
  };

  const handleAssignRole = async () => {
    const trimmed = operatorUserId.trim();
    if (!isUuidLike(trimmed)) {
      toast({ title: 'Invalid user ID', description: 'Enter a valid user UUID.', variant: 'destructive' });
      return;
    }

    try {
      await assignOperatorRole.mutateAsync({ userId: trimmed, role: operatorRole });
      setOperatorUserId('');
      toast({ title: 'Operator role assigned', description: `${operatorRole} granted.` });
    } catch (error) {
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Could not assign role.',
        variant: 'destructive',
      });
    }
  };

  const handleUsageSnapshotRefresh = async () => {
    if (!isUuidLike(companyFilter)) {
      toast({ title: 'Company ID required', description: 'Enter a valid company UUID filter first.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.rpc('platform_refresh_usage_snapshot' as never, {
      p_company_id: companyFilter,
      p_product_code: 'core_property',
    } as never);

    if (error) {
      toast({ title: 'Snapshot refresh failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Usage snapshot refreshed', description: 'Usage rows were generated for the company.' });
    void usage.refetch();
  };

  const handleRunPhase10 = async () => {
    try {
      const result = await runPhase10.mutateAsync();
      toast({
        title: 'Phase 10 backend run complete',
        description: `Snapshot ${result.snapshot_id.slice(0, 8)}... captured with ${result.total_events} events.`,
      });
      refreshAll();
    } catch (error) {
      toast({
        title: 'Phase 10 backend run failed',
        description: error instanceof Error ? error.message : 'Could not execute backend analytics run.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAlertStatus = async (id: string, status: 'acknowledged' | 'resolved') => {
    try {
      await updateAlertStatus.mutateAsync({ id, status });
      toast({
        title: 'Alert updated',
        description: `Alert marked as ${status}.`,
      });
      void alerts.refetch();
    } catch (error) {
      toast({
        title: 'Alert update failed',
        description: error instanceof Error ? error.message : 'Could not update alert status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Super Admin Domain</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Control Plane</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-tenant governance, risk visibility, and entitlement decision telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          {canOverride && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Platform Override</span>
              <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportJson}>
            <Download className="h-4 w-4" /> JSON
          </Button>
          <Button variant="outline" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search module, action, company, correlation..." />
          <SearchableSelect
            options={companyFilterOptions}
            value={companyFilter}
            onValueChange={setCompanyFilter}
            placeholder="Company filter (name, email, UUID)"
            searchPlaceholder="Search company by name, email, UUID..."
            emptyMessage="No company options found"
          />
          <SearchableSelect
            options={userFilterOptions}
            value={userFilter}
            onValueChange={setUserFilter}
            placeholder="User filter (name, email, UUID)"
            searchPlaceholder="Search user by name, email, UUID..."
            emptyMessage="No user options found"
          />
          <SearchableSelect
            options={correlationFilterOptions}
            value={correlationFilter}
            onValueChange={setCorrelationFilter}
            placeholder="Correlation filter"
            searchPlaceholder="Search correlation id..."
            emptyMessage="No correlation options found"
          />
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger>
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as 'all' | 'info' | 'warning' | 'error' | 'critical')}>
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventResultFilter} onValueChange={(value) => setEventResultFilter(value as 'all' | 'success' | 'warning' | 'blocked' | 'denied' | 'error')}>
            <SelectTrigger>
              <SelectValue placeholder="Event result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={alertStatusFilter} onValueChange={(value) => setAlertStatusFilter(value as 'all' | 'open' | 'acknowledged' | 'resolved')}>
            <SelectTrigger>
              <SelectValue placeholder="Alert status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alert status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Open Alerts</p>
              <Siren className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{openAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Blocked Events</p>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{blockedEvents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">High Risk Events</p>
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{highRiskEvents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Usage Snapshots</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{filteredUsage.length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading control plane data...</CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            One or more control plane datasets failed to load. Check permissions and Phase 7 migration status.
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(normalizeTab(value))} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="decisions">Entitlements</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="company360">Company 360</TabsTrigger>
            <TabsTrigger value="user360">User 360</TabsTrigger>
            <TabsTrigger value="analytics">Analytics/Ops</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
          </TabsList>

          <OverviewTab
            eventsCount={filteredEvents.length}
            alerts={filteredAlerts}
            correlations={correlationSummary}
            formatDate={formatDate}
            renderSeverity={(severity) => <SeverityBadge severity={severity} />}
          />

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Governance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <EmptyState
                    title="No alerts matched your current filters"
                    description="Adjust filters or generate a synthetic governance event to validate alerting."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Generate Test Event</Button>}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.slice(0, 20).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                          <TableCell>{item.alert_type}</TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={item.status !== 'open' || updateAlertStatus.isPending}
                                onClick={() => void handleUpdateAlertStatus(item.id, 'acknowledged')}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                size="sm"
                                disabled={item.status === 'resolved' || updateAlertStatus.isPending}
                                onClick={() => void handleUpdateAlertStatus(item.id, 'resolved')}
                              >
                                Resolve
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Audit Events</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEvents.length === 0 ? (
                  <EmptyState
                    title="No events matched your current filters"
                    description="Try broadening your filters or generate a synthetic event."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Generate Test Event</Button>}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Correlation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell>{item.module}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.result_status}</TableCell>
                          <TableCell>{item.risk_score}</TableCell>
                          <TableCell className="max-w-[220px] truncate" title={item.correlation_id}>{item.correlation_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decisions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entitlement Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 max-w-xs">
                  <Select value={decisionFilter} onValueChange={(value) => setDecisionFilter(value as 'all' | 'allowed' | 'denied')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Decision filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All decisions</SelectItem>
                      <SelectItem value="allowed">Allowed only</SelectItem>
                      <SelectItem value="denied">Denied only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredDecisions.length === 0 ? (
                  <EmptyState
                    title="No entitlement decisions matched"
                    description="This table populates when entitlement checks are recorded by app flows."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entitlement</TableHead>
                        <TableHead>Allowed</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDecisions.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell>{item.module}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.entitlement_key}</TableCell>
                          <TableCell>{item.allowed ? 'yes' : 'no'}</TableCell>
                          <TableCell>{item.risk_score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => void handleUsageSnapshotRefresh()}>
                    Refresh Snapshot for Company Filter
                  </Button>
                </div>
                {filteredUsage.length === 0 ? (
                  <EmptyState
                    title="No usage snapshots matched"
                    description="Usage snapshots are created when platform_refresh_usage_snapshot is called."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Snapshot</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quota</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Hard Limit</TableHead>
                        <TableHead>Usage %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsage.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.snapshot_at)}</TableCell>
                          <TableCell>{item.product_code}</TableCell>
                          <TableCell>{item.quota_code}</TableCell>
                          <TableCell>{item.used_value}</TableCell>
                          <TableCell>{item.hard_limit}</TableCell>
                          <TableCell>{item.usage_percent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incident Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {incidentTimeline.length === 0 ? (
                  <EmptyState title="No incident timeline entries" description="Use a correlation filter or generate test events." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Correlation</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidentTimeline.slice(-40).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.created_at)}</TableCell>
                          <TableCell className="max-w-[220px] truncate" title={row.correlation_id}>{row.correlation_id}</TableCell>
                          <TableCell>{row.module}</TableCell>
                          <TableCell>{row.action}</TableCell>
                          <TableCell>{row.detail}</TableCell>
                          <TableCell>{row.risk_score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company360">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company 360</CardTitle>
              </CardHeader>
              <CardContent>
                {companyRows.length === 0 ? (
                  <EmptyState title="No companies in current view" description="Adjust filters to include more company activity." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Alerts</TableHead>
                        <TableHead>Decisions</TableHead>
                        <TableHead>Usage Snapshots</TableHead>
                        <TableHead>Blocked Events</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyRows.map((row) => (
                        <TableRow key={row.company_id}>
                          <TableCell className="max-w-[220px] truncate" title={row.company_id}>{row.company_id}</TableCell>
                          <TableCell>{row.events}</TableCell>
                          <TableCell>{row.alerts}</TableCell>
                          <TableCell>{row.decisions}</TableCell>
                          <TableCell>{row.usage_snapshots}</TableCell>
                          <TableCell>{row.blocked_events}</TableCell>
                          <TableCell>{formatDate(row.last_activity_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user360">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User 360</CardTitle>
              </CardHeader>
              <CardContent>
                {userRows.length === 0 ? (
                  <EmptyState title="No user activity in current filters" description="Use broader filters or seed events." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Decisions</TableHead>
                        <TableHead>High Risk</TableHead>
                        <TableHead>Blocked</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRows.map((row) => (
                        <TableRow key={row.user_id}>
                          <TableCell className="max-w-[260px] truncate" title={row.user_id}>{row.user_id}</TableCell>
                          <TableCell>{row.event_count}</TableCell>
                          <TableCell>{row.decision_count}</TableCell>
                          <TableCell>{row.high_risk_events}</TableCell>
                          <TableCell>{row.blocked_events}</TableCell>
                          <TableCell>{formatDate(row.last_activity_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <AnalyticsOpsTab
            moduleRows={moduleAdoptionRows}
            opsSignals={opsSignals}
            companyRiskRows={companyRiskRows}
            snapshots={analyticsSnapshots.data || []}
            driftChecks={driftChecks.data || []}
            onRunPhase10={() => void handleRunPhase10()}
            onRefreshPhase10={refreshAll}
            isRunPending={runPhase10.isPending}
            formatDate={formatDate}
          />

          <OperatorsTab
            roles={operatorRoles.data || []}
            operatorUserId={operatorUserId}
            operatorRole={operatorRole}
            isAssignPending={assignOperatorRole.isPending}
            isRemovePending={removeOperatorRole.isPending}
            onOperatorUserIdChange={setOperatorUserId}
            onOperatorRoleChange={setOperatorRole}
            onAssign={() => void handleAssignRole()}
            onRemove={(id) => {
              void (async () => {
                try {
                  await removeOperatorRole.mutateAsync(id);
                  toast({ title: 'Operator role removed', description: 'Role revoked.' });
                } catch (error) {
                  toast({
                    title: 'Removal failed',
                    description: error instanceof Error ? error.message : 'Could not remove role.',
                    variant: 'destructive',
                  });
                }
              })();
            }}
            formatDate={formatDate}
          />
        </Tabs>
      )}
    </div>
  );
}
