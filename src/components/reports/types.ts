import { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  Building2,
  TrendingUp,
  Sparkles,
  LineChart,
  PieChart,
  FileText,
  Clock,
  CreditCard,
  Receipt,
  BarChart3,
  ClipboardCheck,
  CheckSquare,
  Building,
  ShieldCheck,
  BarChart2,
  AlertTriangle,
  BrainCircuit,
  Lightbulb,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export type ReportDomainId = 'overview' | 'financial' | 'operations' | 'portfolio' | 'forecasting' | 'ai';

export interface ReportItem {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export interface ReportDomain {
  id: ReportDomainId;
  label: string;
  question: string;
  description: string;
  icon: LucideIcon;
  defaultReportId?: string;
  reports: ReportItem[];
}

export const REPORT_DOMAINS: ReportDomain[] = [
  {
    id: 'overview',
    label: 'Overview',
    question: 'Where does my business stand today?',
    description: 'Executive summary, active attention center, and cross-portfolio KPIs',
    icon: LayoutDashboard,
    reports: [],
  },
  {
    id: 'financial',
    label: 'Financial',
    question: 'How much money am I making?',
    description: 'Revenue realization, collection rate, aging receivables, and statutory tax',
    icon: DollarSign,
    defaultReportId: 'revenue',
    reports: [
      {
        id: 'revenue',
        label: 'Revenue Overview',
        shortLabel: 'Revenue',
        description: 'Monthly collected vs invoiced revenue realization',
        icon: LineChart,
      },
      {
        id: 'collections',
        label: 'Collections & Payments',
        shortLabel: 'Collections',
        description: 'Payment distribution and invoice settlement rates',
        icon: PieChart,
      },
      {
        id: 'rent-roll',
        label: 'Audited Rent Roll',
        shortLabel: 'Rent Roll',
        description: 'Active lease schedule, monthly rents, and tenant obligations',
        icon: FileText,
      },
      {
        id: 'aging',
        label: 'Aging & Collections',
        shortLabel: 'Aging',
        description: 'Accounts receivable overdue buckets and debtor ledger',
        icon: Clock,
      },
      {
        id: 'vendor-payments',
        label: 'Vendor Disbursements',
        shortLabel: 'Vendors',
        description: 'Contractor and vendor payouts linked to work orders',
        icon: CreditCard,
      },
      {
        id: 'rra-tax',
        label: '🇷🇼 RRA Rental Income Tax',
        shortLabel: 'RRA Tax',
        description: 'Official Rwanda Revenue Authority Art. 49 statutory schedule',
        icon: Receipt,
        badge: 'Statutory',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    question: 'What needs my attention?',
    description: 'Maintenance triage, cost variances, inspections, and work orders',
    icon: Wrench,
    defaultReportId: 'maintenance',
    reports: [
      {
        id: 'maintenance',
        label: 'Maintenance Triage',
        shortLabel: 'Maintenance',
        description: 'Request status, severity breakdown, and open ticket velocity',
        icon: Wrench,
      },
      {
        id: 'maintenance-cost',
        label: 'Maintenance Cost & Variances',
        shortLabel: 'Costs',
        description: 'Estimated vs actual expenses and property budget variances',
        icon: BarChart3,
      },
      {
        id: 'inspections',
        label: 'Inspections & Turnover',
        shortLabel: 'Inspections',
        description: 'Move-in / move-out checklists and unit turnover readiness',
        icon: ClipboardCheck,
      },
      {
        id: 'work-orders',
        label: 'Work Orders & Field Tasks',
        shortLabel: 'Work Orders',
        description: 'Contractor dispatch status and operational task backlog',
        icon: CheckSquare,
      },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    question: 'How are my properties performing?',
    description: 'Occupancy capacity, property yield efficiency, and enterprise benchmarking',
    icon: Building2,
    defaultReportId: 'occupancy',
    reports: [
      {
        id: 'occupancy',
        label: 'Occupancy by Property',
        shortLabel: 'Occupancy',
        description: 'Capacity and occupied vs vacant units across every estate',
        icon: BarChart3,
      },
      {
        id: 'occupancy-trend',
        label: 'Occupancy Trajectory',
        shortLabel: 'Trajectory',
        description: 'Historical occupancy trend lines over time',
        icon: TrendingUp,
      },
      {
        id: 'property-performance',
        label: 'Asset Yield & Utilization',
        shortLabel: 'Performance',
        description: 'Average unit realization, annual potential, and yield tiers',
        icon: Building,
      },
      {
        id: 'executive',
        label: 'All Companies Benchmark',
        shortLabel: 'Enterprise',
        description: 'Multi-organization executive scorecard and printable PDF',
        icon: ShieldCheck,
        badge: 'Enterprise',
      },
    ],
  },
  {
    id: 'forecasting',
    label: 'Forecasting',
    question: 'What is likely to happen next?',
    description: 'Forward cashflow modeling, vacancy exposure, and renewal likelihood',
    icon: TrendingUp,
    defaultReportId: 'revenue-forecast',
    reports: [
      {
        id: 'revenue-forecast',
        label: 'Forward Cashflow Trajectory',
        shortLabel: 'Cashflow',
        description: '30-day inflow projection and 90-day multi-scenario revenue model',
        icon: TrendingUp,
      },
      {
        id: 'occupancy-forecast',
        label: 'Occupancy & Vacancy Risk',
        shortLabel: 'Occupancy',
        description: 'Projected occupancy rates and vacant unit revenue exposure',
        icon: BarChart2,
      },
      {
        id: 'maintenance-forecast',
        label: 'Predictive Maintenance Spend',
        shortLabel: 'Maintenance',
        description: 'Predicted component wear, plumbing risks, and budget allocation',
        icon: Wrench,
      },
      {
        id: 'risk-forecast',
        label: 'Lease Renewal & Default Risk',
        shortLabel: 'Renewals',
        description: 'Resident renewal scoring and proactive retention insights',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'ai',
    label: 'AI Insights',
    question: 'What recommendations do you have?',
    description: 'Executive Copilot summary, prioritized recommendations, and risk alerts',
    icon: Sparkles,
    defaultReportId: 'copilot-summary',
    reports: [
      {
        id: 'copilot-summary',
        label: 'Copilot Strategic Brief',
        shortLabel: 'Strategic Brief',
        description: 'Comprehensive financial, lease, and operational intelligence synthesis',
        icon: BrainCircuit,
      },
      {
        id: 'recommendations',
        label: 'Actionable Recommendations',
        shortLabel: 'Recommendations',
        description: 'High-impact operational and collection improvement opportunities',
        icon: Lightbulb,
      },
      {
        id: 'risk-detection',
        label: 'Risk & Exposure Detection',
        shortLabel: 'Risks',
        description: 'At-risk tenants, default probability, and uncollected rent aging',
        icon: ShieldAlert,
      },
      {
        id: 'optimization',
        label: 'Revenue & Yield Optimization',
        shortLabel: 'Optimization',
        description: 'Unit pricing optimization, shortlet conversion, and turnover speed',
        icon: Zap,
      },
    ],
  },
];

export function resolveDomainAndReport(
  requestedDomain?: string | null,
  requestedReport?: string | null,
  legacyTab?: string | null
): { domainId: ReportDomainId; reportId: string } {
  // Legacy tab mapping
  if (legacyTab && !requestedDomain && !requestedReport) {
    switch (legacyTab) {
      case 'overview':
        return { domainId: 'overview', reportId: '' };
      case 'revenue':
        return { domainId: 'financial', reportId: 'revenue' };
      case 'payments':
        return { domainId: 'financial', reportId: 'collections' };
      case 'rent-roll':
        return { domainId: 'financial', reportId: 'rent-roll' };
      case 'aging':
        return { domainId: 'financial', reportId: 'aging' };
      case 'vendor-payments':
        return { domainId: 'financial', reportId: 'vendor-payments' };
      case 'rra-tax':
        return { domainId: 'financial', reportId: 'rra-tax' };
      case 'maintenance':
        return { domainId: 'operations', reportId: 'maintenance' };
      case 'maintenance-cost':
        return { domainId: 'operations', reportId: 'maintenance-cost' };
      case 'occupancy':
        return { domainId: 'portfolio', reportId: 'occupancy' };
      case 'occupancy-trend':
        return { domainId: 'portfolio', reportId: 'occupancy-trend' };
      case 'executive':
        return { domainId: 'portfolio', reportId: 'executive' };
      case 'forecasts':
      case 'forecasting':
        return { domainId: 'forecasting', reportId: 'revenue-forecast' };
      case 'portfolio':
        return { domainId: 'portfolio', reportId: 'property-performance' };
      case 'ai':
      case 'ai-insights':
        return { domainId: 'ai', reportId: 'copilot-summary' };
      default:
        break;
    }
  }

  const validDomain = REPORT_DOMAINS.find((d) => d.id === requestedDomain);
  const domainId = validDomain ? validDomain.id : 'overview';

  if (domainId === 'overview') {
    return { domainId: 'overview', reportId: '' };
  }

  const domain = REPORT_DOMAINS.find((d) => d.id === domainId)!;
  const validReport = domain.reports.find((r) => r.id === requestedReport);
  const reportId = validReport ? validReport.id : domain.defaultReportId || domain.reports[0]?.id || '';

  return { domainId, reportId };
}
