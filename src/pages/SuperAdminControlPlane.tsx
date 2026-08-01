import { useEffect, useMemo, useState } from 'react';
import { Shield, Siren, Activity, Fingerprint, RefreshCw, Sparkles, Download, ChevronLeft, ChevronRight, Building2, Users } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  useAdminChangeCompanyPlan,
  useAdminSetCompanyAddonStatus,
  useActiveSuspensions,
  useAssignPlatformOperatorRole,
  useBillingCatalog,
  useCompanyAdminSnapshot,
  useCompanyBillingContext,
  useCompanyDirectory,
  useControlPlaneAlerts,
  useControlPlaneEvents,
  useEntitlementKeyCatalog,
  useEntitlementOverrides,
  useEntitlementDecisions,
  useImpersonationSessions,
  usePendingPaymentAttempts,
  usePendingVerificationHealth,
  usePlatformAnalyticsSnapshots,
  usePlatformDriftChecks,
  usePlatformOperatorRoles,
  useRevokeEntitlementOverride,
  useRevenueMetrics,
  useRevokeActivePlatformSessions,
  useRiskQueue,
  useRiskQueueTriageActionsPage,
  useRiskQueueTriageActions,
  useSessionRevocationHistoryPage,
  useRemovePlatformOperatorRole,
  useRunPlatformPhase10,
  useSetEntitlementOverride,
  useSetPrincipalSuspension,
  useStartImpersonationSession,
  useStopImpersonationSession,
  useTriageRiskQueueItem,
  useUpdateGovernanceAlertStatus,
  useUserDirectory,
  useUsageSnapshots,
} from '@/hooks/useControlPlane';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useSearchParams } from 'react-router-dom';
import { downloadCsv, downloadJson, getTimeRangeStartIso, isInTimeRange, matchesSearch, rowsToCsv, type TimeRange } from '@/lib/controlPlane';
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
  type User360Row,
} from '@/lib/controlPlaneViews';
import { getControlPlaneExportRows } from '@/lib/controlPlaneExports';
import {
  buildCompanyRiskRows,
  buildModuleAdoptionRows,
  buildOpsSignals,
} from '@/lib/controlPlaneAnalytics';
import { buildSafetyTimelineRows } from '@/lib/controlPlaneSafety';
import { formatControlPlaneLabel, shortReference } from '@/lib/controlPlanePresentation';
import {
  buildCorrelationFilterOptions,
  matchesCompanyFilter,
  matchesUserFilter,
  type CompanyDirectoryEntry,
  type UserDirectoryEntry,
} from '@/lib/controlPlaneFilterHelpers';
import {
  getDisplayedRevocationHistoryPage,
  getNextRevocationHistoryPage,
  getPrevRevocationHistoryPage,
  getRevocationHistoryTotalPages,
  resetRevocationHistoryPage,
  shouldDisableRevocationNext,
  shouldDisableRevocationPrev,
} from '@/lib/controlPlaneRevocationHistory';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatQueryErrorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Unknown data loading error';
}

function formatMinor(amountMinor: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((amountMinor || 0) / 100);
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive">critical</Badge>;
  if (severity === 'warning') return <Badge variant="secondary">warning</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

function normalizeTab(value: string | null): ControlPlaneTab {
  return parseControlPlaneUiState(new URLSearchParams(value ? `cp_tab=${value}` : '')).tab;
}

const CONTROL_PLANE_TAB_GROUPS: Array<{
  title: string;
  tabs: Array<{ value: ControlPlaneTab; label: string }>;
}> = [
  {
    title: 'Monitor',
    tabs: [
      { value: 'overview', label: 'Overview' },
      { value: 'alerts', label: 'Alerts' },
      { value: 'incidents', label: 'Incidents' },
    ],
  },
  {
    title: 'Directory',
    tabs: [
      { value: 'directory', label: 'Directory' },
      { value: 'company360', label: 'Company 360' },
      { value: 'user360', label: 'User 360' },
    ],
  },
  {
    title: 'Governance',
    tabs: [
      { value: 'safety', label: 'Safety' },
      { value: 'events', label: 'Events' },
      { value: 'decisions', label: 'Entitlements' },
      { value: 'operators', label: 'Operators' },
    ],
  },
  {
    title: 'Business',
    tabs: [
      { value: 'monetization', label: 'Monetization' },
      { value: 'usage', label: 'Usage' },
      { value: 'analytics', label: 'Analytics/Ops' },
    ],
  },
];

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
  const billingCatalog = useBillingCatalog();
  const entitlementCatalog = useEntitlementKeyCatalog(600);
  const revenueMetrics = useRevenueMetrics('USD');
  const assignOperatorRole = useAssignPlatformOperatorRole();
  const removeOperatorRole = useRemovePlatformOperatorRole();
  const adminChangeCompanyPlan = useAdminChangeCompanyPlan();
  const adminSetCompanyAddonStatus = useAdminSetCompanyAddonStatus();
  const setEntitlementOverride = useSetEntitlementOverride();
  const revokeEntitlementOverride = useRevokeEntitlementOverride();
  const setPrincipalSuspension = useSetPrincipalSuspension();
  const startImpersonationSession = useStartImpersonationSession();
  const stopImpersonationSession = useStopImpersonationSession();
  const triageRiskQueueItem = useTriageRiskQueueItem();
  const revokeActiveSessions = useRevokeActivePlatformSessions();
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
  const [billingCompanyId, setBillingCompanyId] = useState('');
  const [billingProductCode, setBillingProductCode] = useState('');
  const [billingPlanCode, setBillingPlanCode] = useState('');
  const [billingReason, setBillingReason] = useState('');
  const [addonNotes, setAddonNotes] = useState('');
  const [safetyCompanyId, setSafetyCompanyId] = useState('');
  const [entitlementKey, setEntitlementKey] = useState('');
  const [overrideDecision, setOverrideDecision] = useState<'allow' | 'deny'>('allow');
  const [overrideReason, setOverrideReason] = useState('');
  const [suspendPrincipalType, setSuspendPrincipalType] = useState<'company' | 'user'>('company');
  const [suspendPrincipalId, setSuspendPrincipalId] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [impersonationTargetUserId, setImpersonationTargetUserId] = useState('');
  const [impersonationCompanyId, setImpersonationCompanyId] = useState('');
  const [impersonationReason, setImpersonationReason] = useState('');
  const [riskTriageNotes, setRiskTriageNotes] = useState('');
  const [triageStatusFilter, setTriageStatusFilter] = useState<'all' | 'acknowledged' | 'resolved' | 'escalated' | 'false_positive'>('all');
  const [revocationPrincipalType, setRevocationPrincipalType] = useState<'all' | 'company' | 'user'>('all');
  const [companyDirectoryPage, setCompanyDirectoryPage] = useState(1);
  const [userDirectoryPage, setUserDirectoryPage] = useState(1);
  const [triageActionsPage, setTriageActionsPage] = useState(1);
  const [revocationHistoryPageNumber, setRevocationHistoryPageNumber] = useState(1);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => void | Promise<void>;
  } | null>(null);
  const [companyDirectory, setCompanyDirectory] = useState<Map<string, CompanyDirectoryEntry>>(new Map());
  const [userDirectory, setUserDirectory] = useState<Map<string, UserDirectoryEntry>>(new Map());
  const pendingVerificationScopeCompanyId = isUuidLike(companyFilter) ? companyFilter : null;
  const effectiveBillingCompanyId = isUuidLike(billingCompanyId) ? billingCompanyId : null;
  const effectiveSafetyCompanyId = isUuidLike(safetyCompanyId) ? safetyCompanyId : null;
  const triageCompanyFilterId = isUuidLike(companyFilter) ? companyFilter : effectiveSafetyCompanyId;
  const triageActorFilterId = isUuidLike(userFilter) ? userFilter : null;
  const triageCreatedAfter = getTimeRangeStartIso(timeRange);
  const triageCreatedBefore = null;
  const revocationCompanyFilterId = isUuidLike(companyFilter) ? companyFilter : effectiveSafetyCompanyId;
  const revocationActorFilterId = isUuidLike(userFilter) ? userFilter : null;
  const revocationCreatedAfter = getTimeRangeStartIso(timeRange);
  const pendingAttempts = usePendingPaymentAttempts(150, pendingVerificationScopeCompanyId);
  const pendingHealth = usePendingVerificationHealth(150, pendingVerificationScopeCompanyId);
  const entitlementOverrides = useEntitlementOverrides(effectiveSafetyCompanyId, true, 200);
  const activeSuspensions = useActiveSuspensions('all', 200);
  const impersonationSessions = useImpersonationSessions(true, 100);
  const riskQueue = useRiskQueue(effectiveSafetyCompanyId, 250);
  const riskQueueTriageActions = useRiskQueueTriageActions(effectiveSafetyCompanyId, 250);
  const pagedRiskQueueTriageActions = useRiskQueueTriageActionsPage({
    companyId: triageCompanyFilterId,
    actorUserId: triageActorFilterId,
    triageStatus: triageStatusFilter,
    createdAfter: triageCreatedAfter,
    createdBefore: triageCreatedBefore,
    page: triageActionsPage,
    pageSize: 20,
  });
  const revocationHistoryPage = useSessionRevocationHistoryPage({
    companyId: revocationCompanyFilterId,
    actorUserId: revocationActorFilterId,
    principalType: revocationPrincipalType,
    createdAfter: revocationCreatedAfter,
    createdBefore: null,
    resultStatus: eventResultFilter,
    severity: severityFilter,
    correlationId: correlationFilter || null,
    page: revocationHistoryPageNumber,
    pageSize: 20,
  });
  const revocationTimelineSource = useSessionRevocationHistoryPage({
    companyId: revocationCompanyFilterId,
    actorUserId: revocationActorFilterId,
    principalType: revocationPrincipalType,
    createdAfter: revocationCreatedAfter,
    createdBefore: null,
    resultStatus: eventResultFilter,
    severity: severityFilter,
    correlationId: correlationFilter || null,
    page: 1,
    pageSize: 200,
  });
  const companyAdminSnapshot = useCompanyAdminSnapshot(effectiveBillingCompanyId);
  const companyBillingContext = useCompanyBillingContext(effectiveBillingCompanyId, 25);
  const pagedCompanies = useCompanyDirectory(companyDirectoryPage, 20, search);
  const pagedUsers = useUserDirectory(userDirectoryPage, 20, search);

  useEffect(() => {
    if (!billingCompanyId && isUuidLike(companyFilter)) {
      setBillingCompanyId(companyFilter);
    }
  }, [billingCompanyId, companyFilter]);

  useEffect(() => {
    if (!safetyCompanyId && isUuidLike(companyFilter)) {
      setSafetyCompanyId(companyFilter);
    }
  }, [companyFilter, safetyCompanyId]);

  useEffect(() => {
    if (!entitlementCatalog.data?.length || entitlementKey) return;
    setEntitlementKey(entitlementCatalog.data[0].key);
  }, [entitlementCatalog.data, entitlementKey]);

  useEffect(() => {
    if (!billingCatalog.data?.products?.length || billingProductCode) return;
    setBillingProductCode(billingCatalog.data.products[0].code);
  }, [billingCatalog.data?.products, billingProductCode]);

  useEffect(() => {
    if (!billingCatalog.data?.plans?.length) return;
    const plansForProduct = billingCatalog.data.plans.filter((item) => item.product_code === billingProductCode);
    if (!plansForProduct.length) {
      setBillingPlanCode('');
      return;
    }
    if (!billingPlanCode || !plansForProduct.some((item) => item.code === billingPlanCode)) {
      setBillingPlanCode(plansForProduct[0].code);
    }
  }, [billingCatalog.data?.plans, billingPlanCode, billingProductCode]);

  useEffect(() => {
    setCompanyDirectoryPage(1);
    setUserDirectoryPage(1);
    setTriageActionsPage(1);
    setRevocationHistoryPageNumber(resetRevocationHistoryPage());
  }, [search]);

  useEffect(() => {
    setTriageActionsPage(1);
    setRevocationHistoryPageNumber(resetRevocationHistoryPage());
  }, [effectiveSafetyCompanyId, companyFilter, userFilter, timeRange, triageStatusFilter, revocationPrincipalType]);

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

  const dataset = (
    label: string,
    query: { isLoading: boolean; error: unknown; refetch: () => unknown },
  ) => ({ label, ...query });
  const activeDatasets = (() => {
    switch (activeTab) {
      case 'overview':
        return [dataset('Audit events', events), dataset('Governance alerts', alerts)];
      case 'directory':
        return [dataset('Company directory', pagedCompanies), dataset('User directory', pagedUsers)];
      case 'monetization':
        return [
          dataset('Billing catalog', billingCatalog),
          dataset('Revenue metrics', revenueMetrics),
          dataset('Company billing summary', companyAdminSnapshot),
          dataset('Company billing history', companyBillingContext),
        ];
      case 'safety':
        return [
          dataset('Entitlement catalog', entitlementCatalog),
          dataset('Entitlement overrides', entitlementOverrides),
          dataset('Principal suspensions', activeSuspensions),
          dataset('Impersonation sessions', impersonationSessions),
          dataset('Risk queue', riskQueue),
          dataset('Risk triage history', riskQueueTriageActions),
          dataset('Filtered risk triage history', pagedRiskQueueTriageActions),
          dataset('Session revocation history', revocationHistoryPage),
          dataset('Session revocation timeline', revocationTimelineSource),
        ];
      case 'alerts':
        return [dataset('Governance alerts', alerts)];
      case 'events':
      case 'incidents':
        return [dataset('Audit events', events)];
      case 'decisions':
        return [dataset('Entitlement decisions', decisions)];
      case 'usage':
        return [dataset('Usage snapshots', usage)];
      case 'company360':
        return [
          dataset('Audit events', events),
          dataset('Governance alerts', alerts),
          dataset('Entitlement decisions', decisions),
          dataset('Usage snapshots', usage),
        ];
      case 'user360':
        return [dataset('Audit events', events), dataset('Entitlement decisions', decisions)];
      case 'analytics':
        return [
          dataset('Audit events', events),
          dataset('Governance alerts', alerts),
          dataset('Entitlement decisions', decisions),
          dataset('Usage snapshots', usage),
          dataset('Analytics snapshots', analyticsSnapshots),
          dataset('Drift checks', driftChecks),
          dataset('Pending payment attempts', pendingAttempts),
          dataset('Pending verification health', pendingHealth),
        ];
      case 'operators':
        return [dataset('Operator roles', operatorRoles)];
    }
  })();
  const isLoading = activeDatasets.some((item) => item.isLoading);
  const failedDatasets = activeDatasets.filter((item) => Boolean(item.error));
  const hasError = failedDatasets.length > 0;
  const retryActiveView = () => {
    failedDatasets.forEach((item) => void item.refetch());
  };

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
    void pendingAttempts.refetch();
    void pendingHealth.refetch();
    void operatorRoles.refetch();
    void pagedCompanies.refetch();
    void pagedUsers.refetch();
    void billingCatalog.refetch();
    void revenueMetrics.refetch();
    void entitlementCatalog.refetch();
    void entitlementOverrides.refetch();
    void activeSuspensions.refetch();
    void impersonationSessions.refetch();
    void riskQueue.refetch();
    void riskQueueTriageActions.refetch();
    void pagedRiskQueueTriageActions.refetch();
    void revocationHistoryPage.refetch();
    void revocationTimelineSource.refetch();
    if (effectiveBillingCompanyId) {
      void companyAdminSnapshot.refetch();
      void companyBillingContext.refetch();
    }
  };

  const filteredPendingAttempts = useMemo(() => {
    return (pendingAttempts.data || []).filter((item) => {
      const ts = item.last_pending_verification_at || item.updated_at;
      if (!isInTimeRange(ts, timeRange)) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (correlationFilter && !(item.last_pending_reference || '').includes(correlationFilter)) return false;
      return matchesSearch([
        item.company_id,
        item.gateway,
        item.payment_status,
        item.last_pending_provider_status,
        item.last_pending_reference,
        item.subscription_id,
      ], search);
    });
  }, [companyDirectory, companyFilter, correlationFilter, pendingAttempts.data, search, timeRange]);

  const filteredPendingHealth = useMemo(() => {
    return (pendingHealth.data || []).filter((item) => {
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      return matchesSearch([item.company_id], search);
    });
  }, [companyDirectory, companyFilter, pendingHealth.data, search]);

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

  const filteredRiskQueue = useMemo(() => {
    return (riskQueue.data || []).filter((item) => {
      if (!isInTimeRange(item.occurred_at, timeRange)) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter && !(severityFilter === 'error' && item.severity === 'critical')) {
        return false;
      }
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      return matchesSearch([
        item.row_type,
        item.company_id,
        item.status,
        item.title,
        item.detail,
      ], search);
    });
  }, [companyDirectory, companyFilter, riskQueue.data, search, severityFilter, timeRange]);

  const filteredRiskTriageActions = useMemo(() => {
    return (riskQueueTriageActions.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (!matchesCompanyFilter(item.company_id, companyFilter, companyDirectory)) return false;
      if (!matchesUserFilter(item.actor_user_id, userFilter, userDirectory)) return false;
      return matchesSearch([
        item.row_type,
        item.row_id,
        item.triage_status,
        item.company_id,
        item.actor_user_id,
        item.notes,
      ], search);
    });
  }, [companyDirectory, companyFilter, riskQueueTriageActions.data, search, timeRange, userDirectory, userFilter]);

  const filteredPagedRiskTriageActions = useMemo(() => {
    return (pagedRiskQueueTriageActions.data?.rows || []).filter((item) => {
      if (companyFilter === 'unscoped' && item.company_id) return false;
      if (userFilter === 'unknown' && item.actor_user_id) return false;
      return matchesSearch([
        item.row_type,
        item.row_id,
        item.triage_status,
        item.company_id,
        item.actor_user_id,
        item.notes,
      ], search);
    });
  }, [companyFilter, pagedRiskQueueTriageActions.data?.rows, search, userFilter]);

  const filteredSessionRevocations = useMemo(() => {
    return (revocationTimelineSource.data?.rows || []).filter((item) => {
      if (companyFilter === 'unscoped' && item.company_id) return false;
      if (userFilter === 'unknown' && item.actor_user_id) return false;

      return matchesSearch([
        item.principal_type,
        item.principal_id,
        item.reason,
        item.correlation_id,
        item.company_id,
        item.actor_user_id,
      ], search);
    });
  }, [companyFilter, revocationTimelineSource.data?.rows, search, userFilter]);

  const filteredPagedSessionRevocations = useMemo(() => {
    return (revocationHistoryPage.data?.rows || []).filter((item) => {
      if (companyFilter === 'unscoped' && item.company_id) return false;
      if (userFilter === 'unknown' && item.actor_user_id) return false;

      return matchesSearch([
        item.principal_type,
        item.principal_id,
        item.reason,
        item.correlation_id,
        item.company_id,
        item.actor_user_id,
      ], search);
    });
  }, [companyFilter, revocationHistoryPage.data?.rows, search, userFilter]);

  const pendingVerificationAlerts = useMemo(() => {
    return filteredAlerts.filter((item) => item.alert_type === 'billing_pending_verification_retry_depth');
  }, [filteredAlerts]);

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
        description: `Reference: ${shortReference(item.id)}`,
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
        description: `Reference: ${shortReference(item.user_id)}`,
      });
    });

    return options;
  }, [userOptions]);

  const entitlementKeyOptions = useMemo<SearchableSelectOption[]>(() => {
    return (entitlementCatalog.data || []).map((item) => ({
      value: item.key,
      label: `${item.module} · ${item.name}`,
      description: `${item.key}${item.description ? ` • ${item.description}` : ''}`,
    }));
  }, [entitlementCatalog.data]);

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
    const rows = buildUser360Rows(filteredEvents, filteredDecisions);
    if (rows.length > 0) return rows;

    if (!isUuidLike(userFilter)) return rows;

    const directoryMatch = (pagedUsers.data?.rows || []).find((item) => item.user_id === userFilter)
      || userDirectory.get(userFilter);

    if (!directoryMatch) return rows;

    const fallbackRow: User360Row = {
      user_id: directoryMatch.user_id,
      event_count: 0,
      decision_count: 0,
      high_risk_events: 0,
      blocked_events: 0,
      last_activity_at: '',
    };

    return [fallbackRow];
  }, [filteredDecisions, filteredEvents, pagedUsers.data?.rows, userDirectory, userFilter]);

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
      ...filteredPendingHealth.map((row) => ({
        row_type: 'pending_verification_health',
        company_id: row.company_id,
        pending_attempt_count: row.pending_attempt_count,
        max_pending_verification_count: row.max_pending_verification_count,
        oldest_pending_verification_at: row.oldest_pending_verification_at,
        latest_pending_verification_at: row.latest_pending_verification_at,
      })),
      ...filteredPendingAttempts.map((row) => ({
        row_type: 'pending_payment_attempt',
        attempt_id: row.attempt_id,
        company_id: row.company_id,
        subscription_id: row.subscription_id,
        gateway: row.gateway,
        payment_status: row.payment_status,
        pending_verification_count: row.pending_verification_count,
        last_pending_verification_at: row.last_pending_verification_at,
        last_pending_provider_status: row.last_pending_provider_status,
        last_pending_reference: row.last_pending_reference,
        updated_at: row.updated_at,
      })),
    ];
  }, [analyticsSnapshots.data, companyRiskRows, driftChecks.data, filteredPendingAttempts, filteredPendingHealth, moduleAdoptionRows, opsSignals]);

  const monetizationRows = useMemo(() => {
    const metrics = revenueMetrics.data;
    const context = companyBillingContext.data;
    const snapshot = companyAdminSnapshot.data;

    const rows: Record<string, unknown>[] = [];

    if (metrics) {
      rows.push({
        row_type: 'revenue_metrics',
        currency_code: metrics.currency_code,
        mrr_minor: metrics.mrr_minor,
        addon_mrr_minor: metrics.addon_mrr_minor,
        arr_minor: metrics.arr_minor,
        open_invoices_minor: metrics.open_invoices_minor,
        open_invoice_count: metrics.open_invoice_count,
        failed_attempt_count_30d: metrics.failed_attempt_count_30d,
        active_companies: metrics.active_companies,
        dunning_companies: metrics.dunning_companies,
        quota_pressure_companies_7d: metrics.quota_pressure_companies_7d,
      });

      metrics.plan_mix.forEach((plan) => {
        rows.push({
          row_type: 'plan_mix',
          ...plan,
        });
      });
    }

    if (snapshot) {
      rows.push({
        row_type: 'company_snapshot',
        company_id: snapshot.company.id,
        company_name: snapshot.company.name,
        property_count: snapshot.portfolio.property_count,
        unit_count: snapshot.portfolio.unit_count,
        tenant_count: snapshot.portfolio.tenant_count,
        active_member_count: snapshot.portfolio.active_member_count,
        open_alert_count: snapshot.operations.open_alert_count,
        abuse_signal_count: snapshot.operations.abuse_signal_count,
        risk_decision_count: snapshot.operations.risk_decision_count,
        active_subscription_count: snapshot.billing.active_subscription_count,
        active_addon_count: snapshot.billing.active_addon_count,
      });
    }

    if (context) {
      (context.subscriptions || []).forEach((item) => rows.push({ row_type: 'company_subscription', ...item }));
      (context.invoices || []).forEach((item) => rows.push({ row_type: 'company_invoice', ...item }));
      (context.payment_attempts || []).forEach((item) => rows.push({ row_type: 'company_payment_attempt', ...item }));
      (context.addons || []).forEach((item) => rows.push({ row_type: 'company_addon', ...item }));
    }

    return rows;
  }, [companyAdminSnapshot.data, companyBillingContext.data, revenueMetrics.data]);

  const safetyTimelineRows = useMemo(() => {
    return buildSafetyTimelineRows({
      riskQueue: filteredRiskQueue,
      triageActions: filteredRiskTriageActions,
      sessionRevocations: filteredSessionRevocations,
      events: filteredEvents,
    });
  }, [filteredEvents, filteredRiskQueue, filteredRiskTriageActions, filteredSessionRevocations]);

  const safetyRows = useMemo(() => {
    return [
      ...filteredRiskQueue.map((row) => ({
        row_type: 'risk_queue',
        ...row,
      })),
      ...(entitlementOverrides.data || []).map((row) => ({
        row_type: 'entitlement_override',
        ...row,
      })),
      ...(activeSuspensions.data || []).map((row) => ({
        row_type: 'active_suspension',
        ...row,
      })),
      ...(impersonationSessions.data || []).map((row) => ({
        row_type: 'impersonation_session',
        ...row,
      })),
      ...filteredRiskTriageActions.map((row) => ({
        row_type: 'risk_triage_action',
        ...row,
      })),
      ...safetyTimelineRows.map((row) => ({
        row_type: 'safety_timeline',
        ...row,
      })),
    ];
  }, [activeSuspensions.data, entitlementOverrides.data, filteredRiskQueue, filteredRiskTriageActions, impersonationSessions.data, safetyTimelineRows]);

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
      directoryCompanies: pagedCompanies.data?.rows || [],
      directoryUsers: pagedUsers.data?.rows || [],
      monetizationRows,
      safetyRows,
    });
  };

  const companyDirectoryTotalPages = Math.max(1, Math.ceil((pagedCompanies.data?.totalCount || 0) / (pagedCompanies.data?.pageSize || 20)));
  const userDirectoryTotalPages = Math.max(1, Math.ceil((pagedUsers.data?.totalCount || 0) / (pagedUsers.data?.pageSize || 20)));
  const triageActionsTotalPages = Math.max(1, Math.ceil((pagedRiskQueueTriageActions.data?.totalCount || 0) / (pagedRiskQueueTriageActions.data?.pageSize || 20)));
  const revocationHistoryTotalPages = getRevocationHistoryTotalPages(
    revocationHistoryPage.data?.totalCount,
    revocationHistoryPage.data?.pageSize,
  );
  const displayedRevocationHistoryPage = getDisplayedRevocationHistoryPage(
    revocationHistoryPage.data?.page,
    revocationHistoryPageNumber,
  );
  const plansForSelectedProduct = useMemo(() => {
    return (billingCatalog.data?.plans || []).filter((item) => item.product_code === billingProductCode);
  }, [billingCatalog.data?.plans, billingProductCode]);

  const revenue = revenueMetrics.data;
  const revenueCurrency = revenue?.currency_code || 'USD';
  const planMix = revenue?.plan_mix || [];
  const companySubscriptions = (companyBillingContext.data?.subscriptions || []) as Array<Record<string, unknown>>;
  const companyInvoices = (companyBillingContext.data?.invoices || []) as Array<Record<string, unknown>>;
  const companyAddons = (companyBillingContext.data?.addons || []) as Array<Record<string, unknown>>;
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
      p_metadata: { event_type: 'synthetic_governance_event', source: 'control_plane' },
    } as never);

    if (error) {
      toast({ title: 'Test event failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Test event created', description: 'A test governance event was added.' });
    refreshAll();
  };

  const handleAssignRole = async () => {
    const trimmed = operatorUserId.trim();
    if (!isUuidLike(trimmed)) {
      toast({ title: 'Invalid user reference', description: 'Enter a valid user reference ID.', variant: 'destructive' });
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

  const handleAdminPlanChange = async () => {
    if (!effectiveBillingCompanyId) {
      toast({ title: 'Company required', description: 'Enter a valid company reference ID first.', variant: 'destructive' });
      return;
    }
    if (!billingProductCode || !billingPlanCode) {
      toast({ title: 'Missing plan selection', description: 'Choose both product and plan.', variant: 'destructive' });
      return;
    }

    try {
      await adminChangeCompanyPlan.mutateAsync({
        companyId: effectiveBillingCompanyId,
        productCode: billingProductCode,
        newPlanCode: billingPlanCode,
        currencyCode: 'USD',
        reason: billingReason || 'control_plane_admin_plan_change',
        correlationId: `cp-plan-change-${Date.now()}`,
        metadata: {
          source: 'control_plane_ui',
        },
      });

      toast({ title: 'Plan changed', description: `Applied ${billingPlanCode} on ${billingProductCode}.` });
      void companyAdminSnapshot.refetch();
      void companyBillingContext.refetch();
      void revenueMetrics.refetch();
    } catch (error) {
      toast({
        title: 'Plan change failed',
        description: error instanceof Error ? error.message : 'Unable to change company plan.',
        variant: 'destructive',
      });
    }
  };

  const handleSetAddonStatus = async (addonCode: string, enabled: boolean) => {
    if (!effectiveBillingCompanyId) {
      toast({ title: 'Company required', description: 'Enter a valid company reference ID first.', variant: 'destructive' });
      return;
    }

    try {
      await adminSetCompanyAddonStatus.mutateAsync({
        companyId: effectiveBillingCompanyId,
        addonCode,
        enabled,
        notes: addonNotes || undefined,
        correlationId: `cp-addon-${addonCode}-${Date.now()}`,
        metadata: {
          source: 'control_plane_ui',
        },
      });

      toast({
        title: enabled ? 'Add-on enabled' : 'Add-on disabled',
        description: `${addonCode} was ${enabled ? 'enabled' : 'disabled'} for company.`,
      });
      void companyAdminSnapshot.refetch();
      void companyBillingContext.refetch();
      void revenueMetrics.refetch();
    } catch (error) {
      toast({
        title: 'Add-on update failed',
        description: error instanceof Error ? error.message : 'Unable to update add-on status.',
        variant: 'destructive',
      });
    }
  };

  const handleSetEntitlementOverride = async () => {
    if (!effectiveSafetyCompanyId) {
      toast({ title: 'Company required', description: 'Enter a valid company reference ID for the override.', variant: 'destructive' });
      return;
    }
    if (!entitlementKey.trim()) {
      toast({ title: 'Entitlement key required', description: 'Choose an entitlement key.', variant: 'destructive' });
      return;
    }
    if (!overrideReason.trim()) {
      toast({ title: 'Reason required', description: 'Provide a policy reason for the override.', variant: 'destructive' });
      return;
    }

    try {
      await setEntitlementOverride.mutateAsync({
        companyId: effectiveSafetyCompanyId,
        entitlementKey: entitlementKey.trim(),
        decision: overrideDecision,
        reason: overrideReason.trim(),
        metadata: {
          source: 'control_plane_ui',
        },
      });
      toast({ title: 'Override applied', description: `${overrideDecision.toUpperCase()} set for ${entitlementKey}.` });
      setOverrideReason('');
      void entitlementOverrides.refetch();
    } catch (error) {
      toast({
        title: 'Override failed',
        description: error instanceof Error ? error.message : 'Unable to set override.',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeEntitlementOverride = async (overrideId: string) => {
    try {
      await revokeEntitlementOverride.mutateAsync({
        overrideId,
        reason: 'control_plane_manual_revoke',
        metadata: { source: 'control_plane_ui' },
      });
      toast({ title: 'Override revoked', description: 'Manual entitlement override removed.' });
      void entitlementOverrides.refetch();
    } catch (error) {
      toast({
        title: 'Revoke failed',
        description: error instanceof Error ? error.message : 'Unable to revoke override.',
        variant: 'destructive',
      });
    }
  };

  const handleSetPrincipalSuspension = async (suspend: boolean) => {
    const principalId = suspendPrincipalId.trim();
    if (!isUuidLike(principalId)) {
      toast({ title: 'Target required', description: 'Enter a valid company or user reference ID.', variant: 'destructive' });
      return;
    }
    if (!suspensionReason.trim()) {
      toast({ title: 'Reason required', description: 'Provide a reason for suspend/unsuspend action.', variant: 'destructive' });
      return;
    }

    try {
      await setPrincipalSuspension.mutateAsync({
        principalType: suspendPrincipalType,
        principalId,
        suspend,
        reason: suspensionReason.trim(),
        metadata: {
          source: 'control_plane_ui',
        },
      });
      toast({
        title: suspend ? 'Suspension applied' : 'Suspension cleared',
        description: `${suspendPrincipalType} ${principalId.slice(0, 8)}... updated.`,
      });
      setSuspensionReason('');
      void activeSuspensions.refetch();
    } catch (error) {
      toast({
        title: 'Suspension update failed',
        description: error instanceof Error ? error.message : 'Unable to update suspension.',
        variant: 'destructive',
      });
    }
  };

  const handleStartImpersonation = async () => {
    const targetUser = impersonationTargetUserId.trim();
    const companyId = impersonationCompanyId.trim();
    if (!isUuidLike(targetUser)) {
      toast({ title: 'Target user required', description: 'Enter a valid user reference ID.', variant: 'destructive' });
      return;
    }
    if (companyId && !isUuidLike(companyId)) {
      toast({ title: 'Invalid company reference', description: 'Enter a valid company reference ID.', variant: 'destructive' });
      return;
    }
    if (!impersonationReason.trim()) {
      toast({ title: 'Reason required', description: 'Impersonation requires a support reason.', variant: 'destructive' });
      return;
    }

    try {
      await startImpersonationSession.mutateAsync({
        targetUserId: targetUser,
        companyId: companyId || null,
        reason: impersonationReason.trim(),
        metadata: {
          source: 'control_plane_ui',
        },
      });
      toast({ title: 'Impersonation started', description: `Support session started for ${targetUser.slice(0, 8)}...` });
      setImpersonationReason('');
      void impersonationSessions.refetch();
    } catch (error) {
      toast({
        title: 'Impersonation failed',
        description: error instanceof Error ? error.message : 'Unable to start impersonation.',
        variant: 'destructive',
      });
    }
  };

  const handleStopImpersonation = async (sessionId: string) => {
    try {
      await stopImpersonationSession.mutateAsync({
        impersonationSessionId: sessionId,
        metadata: { source: 'control_plane_ui' },
      });
      toast({ title: 'Impersonation stopped', description: 'Session closed and audited.' });
      void impersonationSessions.refetch();
    } catch (error) {
      toast({
        title: 'Stop impersonation failed',
        description: error instanceof Error ? error.message : 'Unable to stop impersonation session.',
        variant: 'destructive',
      });
    }
  };

  const handleTriageRiskRow = async (
    rowType: 'governance_alert' | 'abuse_signal' | 'risk_decision',
    rowId: string,
    triageStatus: 'acknowledged' | 'resolved' | 'escalated' | 'false_positive',
  ) => {
    try {
      await triageRiskQueueItem.mutateAsync({
        rowType,
        rowId,
        triageStatus,
        notes: riskTriageNotes || undefined,
        metadata: { source: 'control_plane_ui' },
      });
      toast({
        title: 'Risk item triaged',
        description: `${rowType} marked as ${triageStatus}.`,
      });
      setRiskTriageNotes('');
      void riskQueue.refetch();
      void riskQueueTriageActions.refetch();
      void pagedRiskQueueTriageActions.refetch();
      void revocationHistoryPage.refetch();
      void revocationTimelineSource.refetch();
      void alerts.refetch();
    } catch (error) {
      toast({
        title: 'Risk triage failed',
        description: error instanceof Error ? error.message : 'Unable to triage risk queue item.',
        variant: 'destructive',
      });
    }
  };

  const handleRevokePrincipalSessions = async () => {
    const principalId = suspendPrincipalId.trim();
    if (!isUuidLike(principalId)) {
      toast({ title: 'Target required', description: 'Enter a valid reference ID before revoking sessions.', variant: 'destructive' });
      return;
    }

    const reason = suspensionReason.trim() || 'control_plane_security_revocation';

    try {
      const result = await revokeActiveSessions.mutateAsync({
        principalType: suspendPrincipalType,
        principalId,
        reason,
        metadata: { source: 'control_plane_ui' },
      });

      toast({
        title: 'Sessions revoked',
        description: `${result.revoked_sessions} sessions and ${result.revoked_impersonation_sessions} impersonation sessions closed.`,
      });
      void impersonationSessions.refetch();
      void events.refetch();
      void revocationHistoryPage.refetch();
      void revocationTimelineSource.refetch();
    } catch (error) {
      toast({
        title: 'Session revocation failed',
        description: error instanceof Error ? error.message : 'Unable to revoke active sessions.',
        variant: 'destructive',
      });
    }
  };

  const handleUsageSnapshotRefresh = async () => {
    if (!isUuidLike(companyFilter)) {
      toast({ title: 'Company required', description: 'Select a company or enter a valid company reference ID first.', variant: 'destructive' });
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
        title: 'Analytics check complete',
        description: `Snapshot ${result.snapshot_id.slice(0, 8)}... captured with ${result.total_events} events.`,
      });
      refreshAll();
    } catch (error) {
      toast({
        title: 'Analytics check failed',
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

  const requestConfirmation = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => void | Promise<void>,
    destructive = false,
  ) => setConfirmation({ title, description, confirmLabel, action, destructive });

  const activeTabGroup = CONTROL_PLANE_TAB_GROUPS.find((group) =>
    group.tabs.some((tab) => tab.value === activeTab)
  ) || CONTROL_PLANE_TAB_GROUPS[0];
  const activeTabLabel = activeTabGroup.tabs.find((tab) => tab.value === activeTab)?.label || 'Overview';
  const resolveCompanyLabel = (companyId: string | null | undefined) => {
    if (!companyId) return 'Unscoped';
    return companyDirectory.get(companyId)?.name || `Company ${shortReference(companyId)}`;
  };
  const resolveUserLabel = (userId: string | null | undefined) => {
    if (!userId) return 'System';
    const userEntry = userDirectory.get(userId);
    return userEntry?.name || userEntry?.email || `User ${shortReference(userId)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Platform Administration</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Control Plane</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor platform risk, access decisions, usage, and billing across organizations.</p>
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
            placeholder="Filter by company"
            searchPlaceholder="Search by company name, email, or reference..."
            emptyMessage="No company options found"
          />
          <SearchableSelect
            options={userFilterOptions}
            value={userFilter}
            onValueChange={setUserFilter}
            placeholder="Filter by user"
            searchPlaceholder="Search by user name, email, or reference..."
            emptyMessage="No user options found"
          />
          <SearchableSelect
            options={correlationFilterOptions}
            value={correlationFilter}
            onValueChange={setCorrelationFilter}
            placeholder="Correlation filter"
            searchPlaceholder="Search event reference..."
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(normalizeTab(value))} className="w-full">
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <button type="button" onClick={() => setActiveTab('overview')}>Control Plane</button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span>{activeTabGroup.title}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activeTabLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-card p-2 sm:grid-cols-4" aria-label="Control Plane workspaces">
            {CONTROL_PLANE_TAB_GROUPS.map((group) => (
              <Button
                key={group.title}
                type="button"
                variant={activeTabGroup.title === group.title ? 'default' : 'ghost'}
                className="h-auto min-h-10 justify-start px-3"
                onClick={() => setActiveTab(group.tabs[0].value)}
              >
                {group.title}
              </Button>
            ))}
          </div>

          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 p-1">
            {activeTabGroup.tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="min-h-9 flex-1 px-3 text-xs sm:flex-none">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {isLoading && (
            <Card className="mb-4">
              <CardContent className="p-4 text-sm text-muted-foreground">Loading {activeTabLabel.toLowerCase()} data...</CardContent>
            </Card>
          )}

          {hasError && (
            <Card className="mb-4 border-destructive/40" role="alert">
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="text-sm font-medium text-destructive">Some {activeTabLabel.toLowerCase()} data is unavailable.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You can retry this view or continue to another Control Plane workspace.
                  </p>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {failedDatasets.map((item) => (
                    <li key={item.label}>
                      <span className="font-medium text-foreground">{item.label}:</span> {formatQueryErrorMessage(item.error)}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={retryActiveView}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry this view
                  </Button>
                  {activeTab !== 'overview' && (
                    <Button size="sm" variant="ghost" onClick={() => setActiveTab('overview')}>
                      Back to Overview
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <OverviewTab
            eventsCount={filteredEvents.length}
            alerts={filteredAlerts}
            correlations={correlationSummary}
            formatDate={formatDate}
            renderSeverity={(severity) => <SeverityBadge severity={severity} />}
          />

          <TabsContent value="directory">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Directory</CardTitle>
                </CardHeader>
                <CardContent>
                  {(pagedCompanies.data?.rows || []).length === 0 ? (
                    <EmptyState title="No companies found" description="Search by company name, email, or reference ID." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pagedCompanies.data?.rows || []).map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer"
                            onClick={() => {
                              setBillingCompanyId(row.id);
                              setCompanyFilter(row.id);
                              setActiveTab('monetization');
                            }}
                          >
                            <TableCell>{row.name || 'Unnamed company'}</TableCell>
                            <TableCell>{row.email || '-'}</TableCell>
                            <TableCell className="font-mono text-xs" title={row.id}>{shortReference(row.id)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page {pagedCompanies.data?.page || companyDirectoryPage} of {companyDirectoryTotalPages} · {(pagedCompanies.data?.totalCount || 0).toLocaleString()} total companies
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompanyDirectoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={(pagedCompanies.data?.page || companyDirectoryPage) <= 1 || pagedCompanies.isFetching}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompanyDirectoryPage((prev) => Math.min(companyDirectoryTotalPages, prev + 1))}
                        disabled={(pagedCompanies.data?.page || companyDirectoryPage) >= companyDirectoryTotalPages || pagedCompanies.isFetching}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> User Directory</CardTitle>
                </CardHeader>
                <CardContent>
                  {(pagedUsers.data?.rows || []).length === 0 ? (
                    <EmptyState title="No users found" description="Search by user name, email, or reference ID." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>User ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pagedUsers.data?.rows || []).map((row) => (
                          <TableRow
                            key={row.user_id}
                            className="cursor-pointer"
                            onClick={() => {
                              setUserFilter(row.user_id);
                              setActiveTab('user360');
                            }}
                          >
                            <TableCell>{row.name || 'Unknown user'}</TableCell>
                            <TableCell>{row.email || '-'}</TableCell>
                            <TableCell className="font-mono text-xs" title={row.user_id}>{shortReference(row.user_id)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page {pagedUsers.data?.page || userDirectoryPage} of {userDirectoryTotalPages} · {(pagedUsers.data?.totalCount || 0).toLocaleString()} total users
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserDirectoryPage((prev) => Math.max(1, prev - 1))}
                        disabled={(pagedUsers.data?.page || userDirectoryPage) <= 1 || pagedUsers.isFetching}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserDirectoryPage((prev) => Math.min(userDirectoryTotalPages, prev + 1))}
                        disabled={(pagedUsers.data?.page || userDirectoryPage) >= userDirectoryTotalPages || pagedUsers.isFetching}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monetization">
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">MRR</p>
                      <p className="text-lg font-semibold mt-1">{formatMinor(revenue?.mrr_minor || 0, revenueCurrency)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Addon MRR</p>
                      <p className="text-lg font-semibold mt-1">{formatMinor(revenue?.addon_mrr_minor || 0, revenueCurrency)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">ARR</p>
                      <p className="text-lg font-semibold mt-1">{formatMinor(revenue?.arr_minor || 0, revenueCurrency)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Open Invoices</p>
                      <p className="text-lg font-semibold mt-1">{revenue?.open_invoice_count || 0}</p>
                    </div>
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Dunning Companies</p>
                      <p className="text-lg font-semibold mt-1">{revenue?.dunning_companies || 0}</p>
                    </div>
                    <div className="rounded-md border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Quota Pressure (7d)</p>
                      <p className="text-lg font-semibold mt-1">{revenue?.quota_pressure_companies_7d || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Company Billing Operations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                      <Input
                        value={billingCompanyId}
                        onChange={(e) => setBillingCompanyId(e.target.value)}
                        placeholder="Company reference ID"
                        className="xl:col-span-2"
                      />
                      <Select value={billingProductCode} onValueChange={setBillingProductCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(billingCatalog.data?.products || []).length === 0
                            ? <SelectItem value="__no_products" disabled>No products available</SelectItem>
                            : (billingCatalog.data?.products || []).map((product) => (
                              <SelectItem key={product.code} value={product.code}>{product.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select value={billingPlanCode} onValueChange={setBillingPlanCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plansForSelectedProduct.length === 0
                            ? <SelectItem value="__no_plans" disabled>No plans available</SelectItem>
                            : plansForSelectedProduct.map((plan) => (
                              <SelectItem key={plan.code} value={plan.code}>
                                {plan.name} ({plan.tier})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => requestConfirmation(
                          'Confirm company plan change',
                          `Change ${resolveCompanyLabel(effectiveBillingCompanyId)} to plan ${billingPlanCode}. Reason: ${billingReason || 'No reason provided'}.`,
                          'Apply plan change',
                          handleAdminPlanChange,
                        )}
                        disabled={adminChangeCompanyPlan.isPending || !effectiveBillingCompanyId || !billingPlanCode}
                      >
                        {adminChangeCompanyPlan.isPending ? 'Applying...' : 'Apply Plan'}
                      </Button>
                    </div>

                    <Input
                      value={billingReason}
                      onChange={(e) => setBillingReason(e.target.value)}
                      placeholder="Reason for change (required)"
                    />

                    {companyAdminSnapshot.data ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                        <div className="rounded-md border border-border/60 p-3">
                          <p className="text-xs text-muted-foreground">Properties</p>
                          <p className="text-lg font-semibold mt-1">{companyAdminSnapshot.data.portfolio.property_count}</p>
                        </div>
                        <div className="rounded-md border border-border/60 p-3">
                          <p className="text-xs text-muted-foreground">Units</p>
                          <p className="text-lg font-semibold mt-1">{companyAdminSnapshot.data.portfolio.unit_count}</p>
                        </div>
                        <div className="rounded-md border border-border/60 p-3">
                          <p className="text-xs text-muted-foreground">Tenants</p>
                          <p className="text-lg font-semibold mt-1">{companyAdminSnapshot.data.portfolio.tenant_count}</p>
                        </div>
                        <div className="rounded-md border border-border/60 p-3">
                          <p className="text-xs text-muted-foreground">Open Alerts</p>
                          <p className="text-lg font-semibold mt-1">{companyAdminSnapshot.data.operations.open_alert_count}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Enter a valid company reference ID to load billing details.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Plan Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {planMix.length === 0 ? (
                      <EmptyState title="No plan mix data" description="Plan distribution appears once active subscriptions exist." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plan</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planMix.map((item) => (
                            <TableRow key={`${item.plan_code}-${item.plan_tier}`}>
                              <TableCell>{item.plan_name}</TableCell>
                              <TableCell>{item.plan_tier}</TableCell>
                              <TableCell className="text-right">{item.active_subscriptions}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Company Subscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {companySubscriptions.length === 0 ? (
                      <EmptyState title="No subscriptions" description="No subscription rows found for this company." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companySubscriptions.slice(0, 12).map((item, index) => (
                            <TableRow key={`${String(item.id || index)}`}>
                              <TableCell>{String(item.product_name || item.product_code || '-')}</TableCell>
                              <TableCell>{String(item.plan_name || item.plan_code || '-')}</TableCell>
                              <TableCell>{String(item.status || '-')}</TableCell>
                              <TableCell>{String(item.payment_state || '-')}</TableCell>
                              <TableCell>{formatMinor(Number(item.amount_minor || 0), String(item.price_currency || 'USD'))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add-on Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={addonNotes}
                      onChange={(e) => setAddonNotes(e.target.value)}
                      placeholder="Optional change note (recorded in audit metadata)"
                    />
                    {companyAddons.length === 0 ? (
                      <EmptyState title="No add-ons" description="No add-on catalog rows are available for this company." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Add-on</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyAddons.slice(0, 20).map((item, index) => {
                            const addonCode = String(item.addon_code || '');
                            const enabled = Boolean(item.enabled);

                            return (
                              <TableRow key={`${addonCode || 'addon'}-${index}`}>
                                <TableCell>{String(item.addon_name || addonCode || '-')}</TableCell>
                                <TableCell>{String(item.status || (enabled ? 'active' : 'inactive'))}</TableCell>
                                <TableCell>{formatMinor(Number(item.amount_minor || 0), String(item.currency_code || 'USD'))}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant={enabled ? 'outline' : 'default'}
                                    disabled={adminSetCompanyAddonStatus.isPending || !effectiveBillingCompanyId || !addonCode}
                                    onClick={() => requestConfirmation(
                                      `${enabled ? 'Disable' : 'Enable'} add-on`,
                                      `${enabled ? 'Disable' : 'Enable'} ${String(item.addon_name || addonCode)} for ${resolveCompanyLabel(effectiveBillingCompanyId)}.`,
                                      `${enabled ? 'Disable' : 'Enable'} add-on`,
                                      () => handleSetAddonStatus(addonCode, !enabled),
                                      enabled,
                                    )}
                                  >
                                    {enabled ? 'Disable' : 'Enable'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Company Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  {companyInvoices.length === 0 ? (
                    <EmptyState title="No invoices" description="No subscription invoices found for selected company." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Created</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyInvoices.slice(0, 12).map((item, index) => (
                          <TableRow key={`${String(item.id || index)}`}>
                            <TableCell>{item.created_at ? formatDate(String(item.created_at)) : '-'}</TableCell>
                            <TableCell>{String(item.invoice_kind || '-')}</TableCell>
                            <TableCell>{String(item.invoice_status || '-')}</TableCell>
                            <TableCell>{formatMinor(Number(item.amount_minor || 0), String(item.currency_code || 'USD'))}</TableCell>
                            <TableCell>{item.due_at ? formatDate(String(item.due_at)) : '-'}</TableCell>
                            <TableCell>{item.paid_at ? formatDate(String(item.paid_at)) : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="safety">
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Safety Scope</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={safetyCompanyId}
                      onChange={(e) => setSafetyCompanyId(e.target.value)}
                      placeholder="Company reference ID (optional)"
                    />
                    <Input
                      value={suspendPrincipalId}
                      onChange={(e) => setSuspendPrincipalId(e.target.value)}
                      placeholder="Company or user reference ID"
                    />
                    <Input
                      value={impersonationTargetUserId}
                      onChange={(e) => setImpersonationTargetUserId(e.target.value)}
                      placeholder="User reference ID"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Safety actions are audited with critical severity and should only be used for verified incidents and support operations.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Entitlement Override Console</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <SearchableSelect
                        options={entitlementKeyOptions}
                        value={entitlementKey}
                        onValueChange={setEntitlementKey}
                        placeholder="Entitlement key"
                        searchPlaceholder="Search entitlement key..."
                        emptyMessage="No entitlement keys found"
                      />
                      <Select value={overrideDecision} onValueChange={(value) => setOverrideDecision(value as 'allow' | 'deny')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Decision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allow">ALLOW</SelectItem>
                          <SelectItem value="deny">DENY</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => requestConfirmation(
                          'Confirm entitlement override',
                          `${formatControlPlaneLabel(overrideDecision)} ${entitlementKey} for ${resolveCompanyLabel(effectiveSafetyCompanyId)}. Reason: ${overrideReason || 'No reason provided'}.`,
                          'Apply override',
                          handleSetEntitlementOverride,
                          overrideDecision === 'deny',
                        )}
                        disabled={setEntitlementOverride.isPending || !effectiveSafetyCompanyId || !entitlementKey}
                      >
                        {setEntitlementOverride.isPending ? 'Applying...' : 'Apply Override'}
                      </Button>
                    </div>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Policy reason for override"
                    />
                    {(entitlementOverrides.data || []).length === 0 ? (
                      <EmptyState title="No active overrides" description="Apply a temporary allow/deny override to manage urgent access anomalies." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entitlement</TableHead>
                            <TableHead>Decision</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(entitlementOverrides.data || []).slice(0, 20).map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.entitlement_key}</TableCell>
                              <TableCell>
                                <Badge variant={row.decision === 'deny' ? 'destructive' : 'outline'}>{row.decision}</Badge>
                              </TableCell>
                              <TableCell>{row.reason}</TableCell>
                              <TableCell>{formatDate(row.created_at)}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={revokeEntitlementOverride.isPending}
                                  onClick={() => void handleRevokeEntitlementOverride(row.id)}
                                >
                                  Revoke
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Suspend / Unsuspend Principals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select value={suspendPrincipalType} onValueChange={(value) => setSuspendPrincipalType(value as 'company' | 'user')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Principal type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        placeholder="Suspension reason"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={setPrincipalSuspension.isPending}
                          onClick={() => requestConfirmation(
                            'Suspend principal',
                            `Suspend ${suspendPrincipalType === 'company' ? resolveCompanyLabel(suspendPrincipalId) : resolveUserLabel(suspendPrincipalId)}. Active access may be interrupted immediately.`,
                            'Suspend access',
                            () => handleSetPrincipalSuspension(true),
                            true,
                          )}
                        >
                          Suspend
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={setPrincipalSuspension.isPending}
                          onClick={() => requestConfirmation(
                            'Restore principal access',
                            `Remove the active suspension for ${suspendPrincipalType === 'company' ? resolveCompanyLabel(suspendPrincipalId) : resolveUserLabel(suspendPrincipalId)}.`,
                            'Restore access',
                            () => handleSetPrincipalSuspension(false),
                          )}
                        >
                          Unsuspend
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      disabled={revokeActiveSessions.isPending}
                      onClick={() => requestConfirmation(
                        'Revoke active sessions',
                        `Sign out all active sessions for ${suspendPrincipalType === 'company' ? resolveCompanyLabel(suspendPrincipalId) : resolveUserLabel(suspendPrincipalId)}. This cannot be undone.`,
                        'Revoke sessions',
                        handleRevokePrincipalSessions,
                        true,
                      )}
                    >
                      {revokeActiveSessions.isPending ? 'Revoking Sessions...' : 'Revoke Active Sessions'}
                    </Button>

                    {(activeSuspensions.data || []).length === 0 ? (
                      <EmptyState title="No active suspensions" description="Suspended principals appear here until cleared." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(activeSuspensions.data || []).slice(0, 20).map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{formatControlPlaneLabel(row.principal_type)}</TableCell>
                              <TableCell title={row.principal_id}>
                                <p className="font-medium text-foreground">
                                  {row.principal_type === 'company' ? resolveCompanyLabel(row.principal_id) : resolveUserLabel(row.principal_id)}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground">{shortReference(row.principal_id)}</p>
                              </TableCell>
                              <TableCell>{row.reason}</TableCell>
                              <TableCell>{formatDate(row.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impersonation Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        value={impersonationCompanyId}
                        onChange={(e) => setImpersonationCompanyId(e.target.value)}
                        placeholder="Company reference ID (optional)"
                      />
                      <Input
                        value={impersonationReason}
                        onChange={(e) => setImpersonationReason(e.target.value)}
                        placeholder="Support reason"
                      />
                      <Button
                        onClick={() => requestConfirmation(
                          'Start audited impersonation',
                          `Open a scoped support session as ${resolveUserLabel(impersonationTargetUserId)}. Every action remains attributed and audited.`,
                          'Start session',
                          handleStartImpersonation,
                        )}
                        disabled={startImpersonationSession.isPending}
                      >
                        {startImpersonationSession.isPending ? 'Starting...' : 'Start Session'}
                      </Button>
                    </div>

                    {(impersonationSessions.data || []).length === 0 ? (
                      <EmptyState title="No active impersonation" description="Start a support session to inspect tenant experience safely." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Actor</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(impersonationSessions.data || []).slice(0, 20).map((row) => (
                            <TableRow key={row.id}>
                              <TableCell title={row.actor_user_id}>
                                <p className="font-medium text-foreground">{resolveUserLabel(row.actor_user_id)}</p>
                                <p className="font-mono text-xs text-muted-foreground">{shortReference(row.actor_user_id)}</p>
                              </TableCell>
                              <TableCell title={row.target_user_id}>
                                <p className="font-medium text-foreground">{resolveUserLabel(row.target_user_id)}</p>
                                <p className="font-mono text-xs text-muted-foreground">{shortReference(row.target_user_id)}</p>
                              </TableCell>
                              <TableCell>{row.reason}</TableCell>
                              <TableCell>{formatDate(row.started_at)}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={stopImpersonationSession.isPending}
                                  onClick={() => void handleStopImpersonation(row.id)}
                                >
                                  Stop
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Risk Queue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={riskTriageNotes}
                      onChange={(e) => setRiskTriageNotes(e.target.value)}
                      placeholder="Optional triage notes (applies to action buttons)"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select value={triageStatusFilter} onValueChange={(value) => setTriageStatusFilter(value as 'all' | 'acknowledged' | 'resolved' | 'escalated' | 'false_positive')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Triage status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                          <SelectItem value="false_positive">False Positive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filteredRiskQueue.length === 0 ? (
                      <EmptyState title="No risk items" description="No governance alerts, abuse signals, or risk decisions matched current filters." />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Occurred</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRiskQueue.slice(0, 30).map((row) => (
                            <TableRow key={`${row.row_type}:${row.row_id}`}>
                              <TableCell>{formatDate(row.occurred_at)}</TableCell>
                              <TableCell><SeverityBadge severity={row.severity} /></TableCell>
                              <TableCell>{row.row_type}</TableCell>
                              <TableCell>{row.title}</TableCell>
                              <TableCell>{row.score}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={triageRiskQueueItem.isPending}
                                    onClick={() => requestConfirmation('Acknowledge risk item', `Mark “${row.title}” as acknowledged.`, 'Acknowledge', () => handleTriageRiskRow(row.row_type, row.row_id, 'acknowledged'))}
                                  >
                                    Ack
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={triageRiskQueueItem.isPending}
                                    onClick={() => requestConfirmation('Resolve risk item', `Mark “${row.title}” as resolved.`, 'Resolve item', () => handleTriageRiskRow(row.row_type, row.row_id, 'resolved'))}
                                  >
                                    Resolve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={triageRiskQueueItem.isPending}
                                    onClick={() => requestConfirmation('Escalate risk item', `Escalate “${row.title}” for further investigation.`, 'Escalate item', () => handleTriageRiskRow(row.row_type, row.row_id, 'escalated'), true)}
                                  >
                                    Escalate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={triageRiskQueueItem.isPending}
                                    onClick={() => requestConfirmation('Mark as false positive', `Close “${row.title}” as a false positive.`, 'Mark false positive', () => handleTriageRiskRow(row.row_type, row.row_id, 'false_positive'))}
                                  >
                                    False Positive
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    <div className="pt-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mb-2">Recent Triage Actions</p>
                      {filteredPagedRiskTriageActions.length === 0 ? (
                        <EmptyState title="No triage history" description="Triage actions appear here after Ack/Resolve/Escalate decisions." />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Created</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Row ID</TableHead>
                              <TableHead>Actor</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPagedRiskTriageActions.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{formatDate(item.created_at)}</TableCell>
                                <TableCell>{formatControlPlaneLabel(item.triage_status)}</TableCell>
                                <TableCell>{formatControlPlaneLabel(item.row_type)}</TableCell>
                                <TableCell className="font-mono text-xs" title={item.row_id}>{shortReference(item.row_id)}</TableCell>
                                <TableCell title={item.actor_user_id || ''}>{resolveUserLabel(item.actor_user_id)}</TableCell>
                                <TableCell>{item.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Page {pagedRiskQueueTriageActions.data?.page || triageActionsPage} of {triageActionsTotalPages} · {(pagedRiskQueueTriageActions.data?.totalCount || 0).toLocaleString()} total actions
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTriageActionsPage((prev) => Math.max(1, prev - 1))}
                            disabled={(pagedRiskQueueTriageActions.data?.page || triageActionsPage) <= 1 || pagedRiskQueueTriageActions.isFetching}
                          >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTriageActionsPage((prev) => Math.min(triageActionsTotalPages, prev + 1))}
                            disabled={(pagedRiskQueueTriageActions.data?.page || triageActionsPage) >= triageActionsTotalPages || pagedRiskQueueTriageActions.isFetching}
                          >
                            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Safety Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {safetyTimelineRows.length === 0 ? (
                    <EmptyState title="No safety timeline activity" description="Risk detections, triage actions, and session revocations will appear here." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Occurred</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Detail</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Actor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safetyTimelineRows.slice(0, 40).map((item, index) => (
                          <TableRow key={`${item.timeline_type}:${item.occurred_at}:${index}`}>
                            <TableCell>{formatDate(item.occurred_at)}</TableCell>
                            <TableCell>{formatControlPlaneLabel(item.timeline_type)}</TableCell>
                            <TableCell>{formatControlPlaneLabel(item.status)}</TableCell>
                            <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                            <TableCell>{item.title}</TableCell>
                            <TableCell className="max-w-[360px] truncate" title={item.detail}>{item.detail}</TableCell>
                            <TableCell title={item.company_id || ''}>{resolveCompanyLabel(item.company_id)}</TableCell>
                            <TableCell title={item.actor_user_id || ''}>{resolveUserLabel(item.actor_user_id)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Session Revocation History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Select value={revocationPrincipalType} onValueChange={(value) => setRevocationPrincipalType(value as 'all' | 'company' | 'user')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Principal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All principals</SelectItem>
                        <SelectItem value="company">Company principals</SelectItem>
                        <SelectItem value="user">User principals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredPagedSessionRevocations.length === 0 ? (
                    <EmptyState title="No session revocations" description="Session revocations matching current filters will appear here." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Created</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Impersonation</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Actor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPagedSessionRevocations.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                            <TableCell title={item.principal_id || ''}>
                              <p className="font-medium text-foreground">
                                {item.principal_type === 'company' ? resolveCompanyLabel(item.principal_id) : resolveUserLabel(item.principal_id)}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">{shortReference(item.principal_id)}</p>
                            </TableCell>
                            <TableCell>{formatControlPlaneLabel(item.result_status)}</TableCell>
                            <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                            <TableCell>{item.revoked_sessions}</TableCell>
                            <TableCell>{item.revoked_impersonation_sessions}</TableCell>
                            <TableCell className="max-w-[240px] truncate" title={item.reason || ''}>{item.reason || '-'}</TableCell>
                            <TableCell title={item.actor_user_id || ''}>{resolveUserLabel(item.actor_user_id)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Page {displayedRevocationHistoryPage} of {revocationHistoryTotalPages} · {(revocationHistoryPage.data?.totalCount || 0).toLocaleString()} total revocations
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevocationHistoryPageNumber((prev) => getPrevRevocationHistoryPage(prev))}
                        disabled={shouldDisableRevocationPrev(displayedRevocationHistoryPage, revocationHistoryPage.isFetching)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevocationHistoryPageNumber((prev) => getNextRevocationHistoryPage(prev, revocationHistoryTotalPages))}
                        disabled={shouldDisableRevocationNext(displayedRevocationHistoryPage, revocationHistoryTotalPages, revocationHistoryPage.isFetching)}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Governance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <EmptyState
                    title="No alerts matched your current filters"
                    description="Adjust the filters or create a test event."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Create Test Event</Button>}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Resolved</TableHead>
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
                          <TableCell>{formatDate(item.updated_at)}</TableCell>
                          <TableCell>{item.resolved_at ? formatDate(item.resolved_at) : '-'}</TableCell>
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
                    description="Adjust the filters or create a test event."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Create Test Event</Button>}
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
                          <TableCell>{formatControlPlaneLabel(item.result_status)}</TableCell>
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
                    description="Access decisions will appear here when permissions are evaluated."
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
                    description="Refresh usage for a selected company to create the latest record."
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
                  <EmptyState title="No incident activity found" description="Adjust the correlation filter or create a test event." />
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
                          <TableCell title={row.company_id}>
                            <p className="font-medium text-foreground">{resolveCompanyLabel(row.company_id)}</p>
                            <p className="font-mono text-xs text-muted-foreground">{shortReference(row.company_id)}</p>
                          </TableCell>
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
                  <EmptyState
                    title="No user activity in current filters"
                    description={isUuidLike(userFilter)
                      ? 'Selected user currently has no control-plane events or decisions in this time window.'
                      : 'Adjust the filters or create a test event.'}
                  />
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
                          <TableCell title={row.user_id}>
                            <p className="font-medium text-foreground">{resolveUserLabel(row.user_id)}</p>
                            <p className="font-mono text-xs text-muted-foreground">{shortReference(row.user_id)}</p>
                          </TableCell>
                          <TableCell>{row.event_count}</TableCell>
                          <TableCell>{row.decision_count}</TableCell>
                          <TableCell>{row.high_risk_events}</TableCell>
                          <TableCell>{row.blocked_events}</TableCell>
                          <TableCell>{row.last_activity_at ? formatDate(row.last_activity_at) : '-'}</TableCell>
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
            pendingAttempts={filteredPendingAttempts}
            pendingHealth={filteredPendingHealth}
            pendingVerificationAlerts={pendingVerificationAlerts}
            onRunPhase10={() => void handleRunPhase10()}
            onRefreshPhase10={refreshAll}
            onRefreshPendingVerification={refreshAll}
            onAcknowledgeAlert={(id) => void handleUpdateAlertStatus(id, 'acknowledged')}
            onResolveAlert={(id) => void handleUpdateAlertStatus(id, 'resolved')}
            isAlertActionPending={updateAlertStatus.isPending}
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
            resolveUserLabel={resolveUserLabel}
          />

          <AlertDialog open={Boolean(confirmation)} onOpenChange={(open) => !open && setConfirmation(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={confirmation?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
                  onClick={() => {
                    const action = confirmation?.action;
                    setConfirmation(null);
                    if (action) void action();
                  }}
                >
                  {confirmation?.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Tabs>
    </div>
  );
}
