import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Users,
  Building2,
  DollarSign,
  Briefcase,
  Layers,
  FileSpreadsheet,
  PieChart,
  UserCheck,
  Calendar,
  AlertTriangle,
  Smile,
  Frown,
  Star,
  FolderLock,
  Share2,
  Sparkles,
  MapPin,
  PhoneCall,
  Flame,
  LineChart,
} from 'lucide-react';

export type ReportCategoryKey = 'operational' | 'analytical';

export type ReportGroupKey =
  | 'general'
  | 'monitoring'
  | 'team'
  | 'profitability'
  | 'satisfaction'
  | 'presets'
  | 'custom';

export interface CrmReportItem {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  group: ReportGroupKey;
  category: ReportCategoryKey;
  icon: LucideIcon;
  badge?: string;
  defaultPeriod: '7d' | '30d' | '90d' | 'year' | 'all';
  tags: string[];
  kpiMetrics: {
    primaryLabel: string;
    secondaryLabel?: string;
  };
}

export interface CrmReportGroup {
  id: ReportGroupKey;
  category: ReportCategoryKey;
  title: string;
  icon: LucideIcon;
  description: string;
  reports: CrmReportItem[];
}

export const CRM_REPORT_GROUPS: CrmReportGroup[] = [
  // OPERATIONAL REPORTS
  {
    id: 'general',
    category: 'operational',
    title: 'General',
    icon: BarChart3,
    description: 'Core CRM pipeline metrics, conversion velocity, and SLA adherence.',
    reports: [
      {
        id: 'general-overview',
        name: 'General CRM & Pipeline Report',
        shortName: 'General',
        description: 'Comprehensive snapshot of all opened leads, backlog, pending follow-ups, and won deals.',
        group: 'general',
        category: 'operational',
        icon: BarChart3,
        defaultPeriod: '30d',
        tags: ['pipeline', 'tickets', 'deals', 'overview', 'general'],
        kpiMetrics: { primaryLabel: 'Active Pipeline', secondaryLabel: 'Win Rate' },
      },
      {
        id: 'deal-velocity',
        name: 'Lead & Deal Velocity',
        shortName: 'Deal Velocity',
        description: 'Stage duration analysis, lead progression speed, and conversion bottlenecks.',
        group: 'general',
        category: 'operational',
        icon: TrendingUp,
        defaultPeriod: '30d',
        tags: ['velocity', 'speed', 'aging', 'stages', 'funnel'],
        kpiMetrics: { primaryLabel: 'Avg Days in Stage', secondaryLabel: 'Stalled Deals' },
      },
      {
        id: 'lead-sla',
        name: 'First Response & SLA Compliance',
        shortName: 'SLA & Response',
        description: 'Team response speed to incoming marketplace inquiries and task deadlines.',
        group: 'general',
        category: 'operational',
        icon: Clock,
        defaultPeriod: '30d',
        tags: ['sla', 'response time', 'compliance', 'deadlines'],
        kpiMetrics: { primaryLabel: 'SLA Adherence', secondaryLabel: 'Avg Response Time' },
      },
      {
        id: 'recent-handoffs',
        name: 'Recent Deal-to-Tenant Handoffs',
        shortName: 'Recent Processes',
        description: 'Closed-won deals converted to active tenant leases and onboarding workflows.',
        group: 'general',
        category: 'operational',
        icon: CheckCircle2,
        defaultPeriod: '30d',
        tags: ['handoffs', 'leases', 'tenants', 'closing', 'conversion'],
        kpiMetrics: { primaryLabel: 'Completed Handoffs', secondaryLabel: 'Pending Leases' },
      },
    ],
  },
  {
    id: 'monitoring',
    category: 'operational',
    title: 'Monitoring & Pipeline',
    icon: Activity,
    description: 'System health, lead intent scoring, and verification risk monitoring.',
    reports: [
      {
        id: 'system-at-a-glance',
        name: 'Pipeline Health At-a-Glance',
        shortName: 'System at-a-glance',
        description: 'High-level operational health across inquiries, live listings, and deal momentum.',
        group: 'monitoring',
        category: 'operational',
        icon: Activity,
        defaultPeriod: '30d',
        tags: ['monitoring', 'system', 'inquiries', 'listings'],
        kpiMetrics: { primaryLabel: 'Daily Inquiries', secondaryLabel: 'Conversion Rate' },
      },
      {
        id: 'lead-health',
        name: 'Lead Scoring & Intent Health',
        shortName: 'Lead Health',
        description: 'Lead engagement scoring breakdown (High, Medium, Low intent) and qualification status.',
        group: 'monitoring',
        category: 'operational',
        icon: Flame,
        defaultPeriod: '30d',
        tags: ['scoring', 'intent', 'qualification', 'hot leads'],
        kpiMetrics: { primaryLabel: 'High-Intent Leads', secondaryLabel: 'Qualified Rate' },
      },
      {
        id: 'verification-aging',
        name: 'Verification & Publisher Aging',
        shortName: 'Verification Aging',
        description: 'Tracking publisher verification queues and document approval times.',
        group: 'monitoring',
        category: 'operational',
        icon: ShieldAlert,
        defaultPeriod: '30d',
        tags: ['trust', 'verification', 'publisher', 'queue'],
        kpiMetrics: { primaryLabel: 'Pending Reviews', secondaryLabel: 'Avg Audit Time' },
      },
      {
        id: 'trust-flag-load',
        name: 'Active Trust Flags & Risk Load',
        shortName: 'Trust Flags',
        description: 'Count, status, and severity of moderation flags and publisher risk alerts.',
        group: 'monitoring',
        category: 'operational',
        icon: AlertTriangle,
        defaultPeriod: '30d',
        tags: ['risk', 'moderation', 'security', 'flags'],
        kpiMetrics: { primaryLabel: 'Active Flags', secondaryLabel: 'High Severity' },
      },
    ],
  },
  {
    id: 'team',
    category: 'operational',
    title: 'Agents & Technicians',
    icon: Users,
    description: 'Agent performance, activity benchmarks, and on-site visit execution.',
    reports: [
      {
        id: 'agent-comparison',
        name: 'Salesperson & Agent Comparison',
        shortName: 'Agent Comparison',
        description: 'Head-to-head comparison of lead volume, closed deals, and win rates by agent.',
        group: 'team',
        category: 'operational',
        icon: Users,
        defaultPeriod: '30d',
        tags: ['agents', 'salesperson', 'comparison', 'leaderboard'],
        kpiMetrics: { primaryLabel: 'Top Performer', secondaryLabel: 'Avg Close Rate' },
      },
      {
        id: 'agent-performance',
        name: 'Team Activity & Execution',
        shortName: 'Agent Performance',
        description: 'Calls logged, tasks completed, and meetings held across property managers and agents.',
        group: 'team',
        category: 'operational',
        icon: UserCheck,
        defaultPeriod: '30d',
        tags: ['activity', 'tasks', 'calls', 'meetings', 'productivity'],
        kpiMetrics: { primaryLabel: 'Tasks Completed', secondaryLabel: 'Calls Logged' },
      },
      {
        id: 'checkins-salesperson',
        name: 'Planned vs Realized Check-Ins',
        shortName: 'Check-Ins by Agent',
        description: 'Property visits and client check-in meetings scheduled versus completed.',
        group: 'team',
        category: 'operational',
        icon: Calendar,
        defaultPeriod: '30d',
        tags: ['visits', 'check-ins', 'calendar', 'appointments'],
        kpiMetrics: { primaryLabel: 'Scheduled Meetings', secondaryLabel: 'Completion %' },
      },
      {
        id: 'checkins-locality',
        name: 'Check-Ins & Visits by Locality',
        shortName: 'Visits by Locality',
        description: 'Geographic distribution of property visits and localized lead demand.',
        group: 'team',
        category: 'operational',
        icon: MapPin,
        defaultPeriod: '30d',
        tags: ['geography', 'locality', 'regions', 'visits'],
        kpiMetrics: { primaryLabel: 'Top Region', secondaryLabel: 'Regional Volume' },
      },
    ],
  },
  {
    id: 'profitability',
    category: 'operational',
    title: 'Profitability & Revenue',
    icon: DollarSign,
    description: 'Deal pipeline value, weighted forecasts, retainer contracts, and collections.',
    reports: [
      {
        id: 'deal-profitability',
        name: 'Deal Revenue & Profitability',
        shortName: 'Deal Profitability',
        description: 'Total revenue realized from converted leases, broker commissions, and fees.',
        group: 'profitability',
        category: 'operational',
        icon: DollarSign,
        defaultPeriod: '30d',
        tags: ['revenue', 'profit', 'commissions', 'deals', 'financials'],
        kpiMetrics: { primaryLabel: 'Realized Revenue', secondaryLabel: 'Pipeline Value' },
      },
      {
        id: 'deals-closing-month',
        name: 'Deals Closing This Month',
        shortName: 'Deals Closing',
        description: 'High-probability deals scheduled to close this month with weighted revenue forecasts.',
        group: 'profitability',
        category: 'operational',
        icon: Briefcase,
        defaultPeriod: '30d',
        tags: ['forecast', 'closing', 'month', 'weighted value'],
        kpiMetrics: { primaryLabel: 'Closing Value', secondaryLabel: 'Expected Deals' },
      },
      {
        id: 'inquiry-to-won-30d',
        name: 'Inquiry-to-Won Conversion Rate',
        shortName: 'Inquiry to Won',
        description: '30-day conversion efficiency from initial marketplace inquiry to signed deal.',
        group: 'profitability',
        category: 'operational',
        icon: TrendingUp,
        defaultPeriod: '30d',
        tags: ['conversion', 'roi', 'win rate', 'inquiries'],
        kpiMetrics: { primaryLabel: 'Conversion Rate', secondaryLabel: 'Avg Cycle Days' },
      },
      {
        id: 'contact-mailing-list',
        name: 'Account & Contact Directory',
        shortName: 'Contact Roster',
        description: 'Structured roster of active client contacts, preferred channels, and accounts.',
        group: 'profitability',
        category: 'operational',
        icon: FileSpreadsheet,
        defaultPeriod: 'all',
        tags: ['contacts', 'accounts', 'mailing', 'crm'],
        kpiMetrics: { primaryLabel: 'Total Contacts', secondaryLabel: 'Active Accounts' },
      },
    ],
  },
  {
    id: 'satisfaction',
    category: 'operational',
    title: 'Satisfaction & Retention',
    icon: Smile,
    description: 'Customer conversion feedback, won/lost win-loss reasons, and client retention.',
    reports: [
      {
        id: 'won-analysis',
        name: 'Satisfied Conversions & Win Factors',
        shortName: 'Satisfied Customers',
        description: 'Analysis of won deals by lead source, fast response factors, and customer satisfaction.',
        group: 'satisfaction',
        category: 'operational',
        icon: Smile,
        defaultPeriod: '30d',
        tags: ['satisfaction', 'wins', 'nps', 'feedback'],
        kpiMetrics: { primaryLabel: 'Customer Win Rate', secondaryLabel: 'Top Source' },
      },
      {
        id: 'lost-deal-analysis',
        name: 'Lost Deals & Churn Analysis',
        shortName: 'Lost Deal Analysis',
        description: 'Detailed analysis of lost opportunities, pricing friction, and drop-off stages.',
        group: 'satisfaction',
        category: 'operational',
        icon: Frown,
        defaultPeriod: '30d',
        tags: ['lost', 'churn', 'drop-off', 'reasons'],
        kpiMetrics: { primaryLabel: 'Lost Deals', secondaryLabel: 'Top Loss Reason' },
      },
    ],
  },

  // ANALYTICAL REPORTS
  {
    id: 'presets',
    category: 'analytical',
    title: 'Presets & Executive',
    icon: Layers,
    description: 'Pre-configured executive dashboards and board-ready reporting packages.',
    reports: [
      {
        id: 'preset-executive-360',
        name: 'Executive Portfolio & CRM 360',
        shortName: 'Executive 360',
        description: 'Holistic company-level report covering occupancy, leads, revenue, and arrears.',
        group: 'presets',
        category: 'analytical',
        icon: Sparkles,
        badge: 'Popular',
        defaultPeriod: '30d',
        tags: ['executive', '360', 'c-level', 'summary'],
        kpiMetrics: { primaryLabel: 'Portfolio Health', secondaryLabel: 'Monthly Revenue' },
      },
      {
        id: 'preset-weekly-pulse',
        name: 'Weekly Pipeline & Activity Pulse',
        shortName: 'Weekly Pulse',
        description: '7-day momentum dashboard highlighting hot leads, meetings booked, and upcoming closures.',
        group: 'presets',
        category: 'analytical',
        icon: LineChart,
        defaultPeriod: '7d',
        tags: ['weekly', 'pulse', 'sprint', 'momentum'],
        kpiMetrics: { primaryLabel: 'Weekly Leads', secondaryLabel: 'Meetings' },
      },
    ],
  },
];

// Flat list of all reports
export const ALL_CRM_REPORTS: CrmReportItem[] = CRM_REPORT_GROUPS.flatMap((g) => g.reports);

// Helper to look up a report by ID
export function getReportById(reportId: string | null | undefined): CrmReportItem | undefined {
  if (!reportId) return undefined;
  return ALL_CRM_REPORTS.find((r) => r.id === reportId);
}

// LocalStorage helpers for Recently Viewed and Favorites
const RECENT_REPORTS_KEY = 'fishgate_recent_reports';
const FAVORITE_REPORTS_KEY = 'fishgate_favorite_reports';

export function getRecentlyViewedReportIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return ['general-overview', 'deal-velocity', 'agent-comparison', 'deal-profitability'];
}

export function addRecentlyViewedReportId(reportId: string): void {
  try {
    const existing = getRecentlyViewedReportIds().filter((id) => id !== reportId);
    const updated = [reportId, ...existing].slice(0, 6);
    window.localStorage.setItem(RECENT_REPORTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getFavoriteReportIds(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITE_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return ['general-overview', 'deal-profitability'];
}

export function toggleFavoriteReportId(reportId: string): boolean {
  try {
    const favorites = getFavoriteReportIds();
    let updated: string[];
    let isFav = false;
    if (favorites.includes(reportId)) {
      updated = favorites.filter((id) => id !== reportId);
      isFav = false;
    } else {
      updated = [...favorites, reportId];
      isFav = true;
    }
    window.localStorage.setItem(FAVORITE_REPORTS_KEY, JSON.stringify(updated));
    return isFav;
  } catch {
    return false;
  }
}
