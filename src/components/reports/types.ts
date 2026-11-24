import { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  Building2,
  TrendingUp,
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
  Home,
  Users,
  Calendar,
  Layers,
  Target,
  ArrowUpRight,
  Sliders,
} from 'lucide-react';

export type ReportCategoryId =
  | 'overview'
  | 'revenue'
  | 'occupancy'
  | 'operations'
  | 'properties'
  | 'planning';

// Backward compatibility alias
export type ReportDomainId = ReportCategoryId;

export interface ReportItem {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export interface ReportCategory {
  id: ReportCategoryId;
  title: string;
  label: string;
  purpose: string;
  question: string;
  description: string;
  icon: LucideIcon;
  defaultReportId: string;
  reports: ReportItem[];
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'revenue',
    title: 'Revenue & Collections',
    label: 'Revenue & Collections',
    purpose: 'Understand income performance',
    question: 'How is income performing?',
    description: 'Realized rental income, collection turnaround, overdue aging receivables, and statutory tax compliance.',
    icon: DollarSign,
    defaultReportId: 'revenue-summary',
    reports: [
      {
        id: 'revenue-summary',
        label: 'Revenue Summary',
        shortLabel: 'Revenue',
        description: 'Monthly collected vs invoiced revenue realization and growth',
        icon: LineChart,
      },
      {
        id: 'rent-collections',
        label: 'Rent Collections',
        shortLabel: 'Collections',
        description: 'Payment distribution and invoice settlement rates across payment rails',
        icon: CreditCard,
      },
      {
        id: 'outstanding-balances',
        label: 'Outstanding Balances',
        shortLabel: 'Balances',
        description: 'Unsettled invoices, payment aging buckets, and debtor ledger',
        icon: Clock,
      },
      {
        id: 'payment-trends',
        label: 'Payment Trends',
        shortLabel: 'Trends',
        description: 'Historical payment velocity and weekly collection momentum',
        icon: TrendingUp,
      },
      {
        id: 'property-revenue',
        label: 'Property Revenue Comparison',
        shortLabel: 'Property Revenue',
        description: 'Realized revenue benchmarked across every managed estate',
        icon: BarChart3,
      },
      {
        id: 'rra-tax',
        label: '🇷🇼 RRA Rental Income Tax',
        shortLabel: 'RRA Tax',
        description: 'Official Rwanda Revenue Authority Art. 49 statutory tax schedule',
        icon: Receipt,
        badge: 'Statutory',
      },
    ],
  },
  {
    id: 'occupancy',
    title: 'Occupancy & Leasing',
    label: 'Occupancy & Leasing',
    purpose: 'Understand portfolio utilization',
    question: 'What is our portfolio utilization?',
    description: 'Physical occupancy trends, vacancy durations, lease expiries, and resident turnover.',
    icon: Home,
    defaultReportId: 'occupancy-summary',
    reports: [
      {
        id: 'occupancy-summary',
        label: 'Occupancy Summary',
        shortLabel: 'Occupancy',
        description: 'Capacity and occupied vs vacant units across every estate',
        icon: Home,
      },
      {
        id: 'vacancy-analysis',
        label: 'Vacancy Analysis',
        shortLabel: 'Vacancies',
        description: 'Unoccupied unit durations and unrealized monthly rent exposure',
        icon: BarChart3,
      },
      {
        id: 'lease-expiration',
        label: 'Lease Expiration Forecast',
        shortLabel: 'Expirations',
        description: 'Upcoming lease milestones in 30, 60, 90, and 180-day buckets',
        icon: Calendar,
      },
      {
        id: 'lease-renewals',
        label: 'Lease Renewals',
        shortLabel: 'Renewals',
        description: 'Active lease agreements, renewal terms, and retention rates',
        icon: FileText,
      },
      {
        id: 'tenant-turnover',
        label: 'Tenant Turnover',
        shortLabel: 'Turnover',
        description: 'Resident move-in and exit trends with tenure analysis',
        icon: Users,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & Maintenance',
    label: 'Operations & Maintenance',
    purpose: 'Understand operational performance',
    question: 'How efficiently are issues resolved?',
    description: 'Maintenance request turnaround, contractor orders, inspection checklists, and cost variances.',
    icon: Wrench,
    defaultReportId: 'maintenance-performance',
    reports: [
      {
        id: 'maintenance-performance',
        label: 'Maintenance Performance',
        shortLabel: 'Performance',
        description: 'Ticket volume, resolution rates, and operational turnaround speed',
        icon: Wrench,
      },
      {
        id: 'work-orders',
        label: 'Work Orders',
        shortLabel: 'Work Orders',
        description: 'Contractor and vendor dispatch backlog and job statuses',
        icon: CheckSquare,
      },
      {
        id: 'inspections',
        label: 'Inspection Results',
        shortLabel: 'Inspections',
        description: 'Move-in / move-out room condition checklists and asset audits',
        icon: ClipboardCheck,
      },
      {
        id: 'maintenance-costs',
        label: 'Maintenance Cost Analysis',
        shortLabel: 'Cost Analysis',
        description: 'Estimated vs actual repair expenditures and property budget variances',
        icon: DollarSign,
      },
      {
        id: 'resolution-time',
        label: 'Resolution Time Analysis',
        shortLabel: 'Resolution Time',
        description: 'Average days to complete maintenance requests by priority',
        icon: Clock,
      },
    ],
  },
  {
    id: 'properties',
    title: 'Property Performance',
    label: 'Property Performance',
    purpose: 'Compare assets',
    question: 'Which properties yield highest return?',
    description: 'Asset yield ranking, revenue per estate, occupancy benchmarks, and operational issues.',
    icon: Building2,
    defaultReportId: 'property-ranking',
    reports: [
      {
        id: 'property-ranking',
        label: 'Property Ranking',
        shortLabel: 'Ranking',
        description: 'Estates ordered by total monthly revenue and yield efficiency',
        icon: Building2,
      },
      {
        id: 'revenue-per-property',
        label: 'Revenue per Property',
        shortLabel: 'Revenue',
        description: 'Detailed monthly revenue collection breakdown per property',
        icon: LineChart,
      },
      {
        id: 'occupancy-by-property',
        label: 'Occupancy by Property',
        shortLabel: 'Occupancy',
        description: 'Capacity and occupied unit ratios across managed locations',
        icon: Home,
      },
      {
        id: 'issue-tracking',
        label: 'Issue Tracking',
        shortLabel: 'Issues',
        description: 'Open maintenance and overdue invoices grouped by estate',
        icon: Clock,
      },
      {
        id: 'benchmarking',
        label: 'Performance Benchmarking',
        shortLabel: 'Benchmark',
        description: 'Cross-property yield and multi-company operational scorecard',
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'planning',
    title: 'Portfolio Planning',
    label: 'Portfolio Planning',
    purpose: 'Support future decisions',
    question: 'What is our forward cashflow trajectory?',
    description: 'Forward cashflow modeling, occupancy projections, budget planning, and capacity growth.',
    icon: TrendingUp,
    defaultReportId: 'revenue-projection',
    reports: [
      {
        id: 'revenue-projection',
        label: 'Revenue Projection',
        shortLabel: 'Projection',
        description: '30-day and 90-day forward cashflow projections based on active leases',
        icon: TrendingUp,
      },
      {
        id: 'occupancy-outlook',
        label: 'Occupancy Outlook',
        shortLabel: 'Outlook',
        description: 'Forward occupancy trajectory considering upcoming lease expirations',
        icon: LineChart,
      },
      {
        id: 'budget-planning',
        label: 'Budget Planning',
        shortLabel: 'Budget',
        description: 'Annualized revenue run-rate and operating expense budget envelope',
        icon: Target,
      },
      {
        id: 'growth-forecast',
        label: 'Growth Forecast',
        shortLabel: 'Growth',
        description: 'Portfolio expansion capacity, yield potential, and unit trajectory',
        icon: ArrowUpRight,
      },
      {
        id: 'capacity-analysis',
        label: 'Capacity Analysis',
        shortLabel: 'Capacity',
        description: 'Maximum rentable unit capacity and physical portfolio density',
        icon: Layers,
      },
    ],
  },
];

// For backward compatibility with existing code
export const REPORT_DOMAINS = REPORT_CATEGORIES;

export function resolveCategoryAndReport(
  requestedCategory?: string | null,
  requestedReport?: string | null,
  legacyTab?: string | null
): { categoryId: ReportCategoryId; reportId: string } {
  // Legacy alias mapping
  let categoryKey = requestedCategory || '';
  if (categoryKey === 'financial') categoryKey = 'revenue';
  if (categoryKey === 'portfolio') categoryKey = 'properties';
  if (categoryKey === 'forecasting') categoryKey = 'planning';
  if (categoryKey === 'ai' || categoryKey === 'ai-insights') categoryKey = 'planning';

  // Legacy tab mapping
  if (legacyTab && !requestedCategory && !requestedReport) {
    switch (legacyTab) {
      case 'overview':
        return { categoryId: 'overview', reportId: '' };
      case 'revenue':
      case 'payments':
      case 'rent-roll':
      case 'aging':
      case 'vendor-payments':
      case 'rra-tax':
        return { categoryId: 'revenue', reportId: legacyTab === 'revenue' ? 'revenue-summary' : legacyTab };
      case 'maintenance':
      case 'maintenance-cost':
      case 'work-orders':
      case 'inspections':
        return { categoryId: 'operations', reportId: legacyTab === 'maintenance' ? 'maintenance-performance' : legacyTab };
      case 'occupancy':
      case 'occupancy-trend':
        return { categoryId: 'occupancy', reportId: 'occupancy-summary' };
      case 'forecasts':
      case 'forecasting':
        return { categoryId: 'planning', reportId: 'revenue-projection' };
      default:
        break;
    }
  }

  if (categoryKey === 'overview' || (!categoryKey && !requestedReport)) {
    return { categoryId: 'overview', reportId: '' };
  }

  const category = REPORT_CATEGORIES.find((c) => c.id === categoryKey);
  if (!category) {
    return { categoryId: 'overview', reportId: '' };
  }

  const validReport = category.reports.find((r) => r.id === requestedReport);
  const reportId = validReport ? validReport.id : category.defaultReportId;

  return { categoryId: category.id, reportId };
}

// Backward compatibility function
export const resolveDomainAndReport = resolveCategoryAndReport;
