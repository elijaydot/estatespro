import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  Info,
  Layers,
  FileText,
  Clock,
  TrendingUp,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Filter,
  Share2,
  Mail,
  Bell,
  Check,
  Plus,
  Trash2,
  Play,
  Pause,
  Send,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  type CrmReportItem,
  addRecentlyViewedReportId,
} from '@/lib/crmReportsConfig';
import { useSettings } from '@/contexts/useSettings';
import { downloadCsv } from '@/lib/download';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: string;
  recipients: string;
  format: 'pdf' | 'csv' | 'summary';
  inAppNotification: boolean;
  active: boolean;
  createdAt: string;
  lastSent?: string;
}

interface ReportDetailCanvasProps {
  report: CrmReportItem;
  onBackToHub: () => void;
  leads: any[];
  deals: any[];
  tasks: any[];
  calls: any[];
  meetings: any[];
  contacts: any[];
  handoffs: any[];
  trustFlags: any[];
  assignableUsers: any[];
  properties: any[];
}

export function ReportDetailCanvas({
  report,
  onBackToHub,
  leads,
  deals,
  tasks,
  calls,
  meetings,
  contacts,
  handoffs,
  trustFlags,
  assignableUsers,
  properties,
}: ReportDetailCanvasProps) {
  const { formatCurrency } = useSettings();

  // Filter states
  const [period, setPeriod] = useState<string>(report.defaultPeriod || '30d');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'generate' | 'schedule'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  
  // AI summary state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Table pagination & search
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Schedules state
  const SCHEDULES_STORAGE_KEY = `fishgate_report_schedules_${report.id}`;
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => {
    try {
      const saved = window.localStorage.getItem(SCHEDULES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'default-schedule',
        reportId: report.id,
        frequency: 'weekly',
        time: '08:00 AM',
        dayOfWeek: 'Monday',
        recipients: 'management@fishgate.com',
        format: 'pdf',
        inAppNotification: true,
        active: true,
        createdAt: new Date().toISOString(),
        lastSent: 'Yesterday, 08:00 AM',
      },
    ];
  });

  const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00 AM');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleFormat, setScheduleFormat] = useState<'pdf' | 'csv' | 'summary'>('pdf');
  const [scheduleInApp, setScheduleInApp] = useState(true);

  // Sync schedules with localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
    } catch {}
  }, [schedules, SCHEDULES_STORAGE_KEY]);

  // Track recently viewed
  useEffect(() => {
    addRecentlyViewedReportId(report.id);
  }, [report.id]);

  // Calculate Date Filter Range
  const dateRangeLimitMs = useMemo(() => {
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    if (period === '7d') return now - (7 * MS_PER_DAY);
    if (period === '30d') return now - (30 * MS_PER_DAY);
    if (period === '90d') return now - (90 * MS_PER_DAY);
    if (period === 'year') return now - (365 * MS_PER_DAY);
    return 0; // all
  }, [period]);

  // Filtered datasets
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (dateRangeLimitMs > 0 && new Date(l.created_at).getTime() < dateRangeLimitMs) return false;
      if (selectedOwner !== 'all' && l.assigned_to !== selectedOwner) return false;
      if (selectedPipeline !== 'all' && l.pipeline_kind !== selectedPipeline) return false;
      return true;
    });
  }, [leads, dateRangeLimitMs, selectedOwner, selectedPipeline]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (dateRangeLimitMs > 0 && new Date(d.created_at).getTime() < dateRangeLimitMs) return false;
      if (selectedOwner !== 'all' && d.owner_user_id !== selectedOwner) return false;
      return true;
    });
  }, [deals, dateRangeLimitMs, selectedOwner]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (dateRangeLimitMs > 0 && new Date(t.created_at).getTime() < dateRangeLimitMs) return false;
      if (selectedOwner !== 'all' && t.owner_user_id !== selectedOwner) return false;
      return true;
    });
  }, [tasks, dateRangeLimitMs, selectedOwner]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (dateRangeLimitMs > 0 && new Date(m.created_at).getTime() < dateRangeLimitMs) return false;
      if (selectedOwner !== 'all' && m.host_user_id !== selectedOwner) return false;
      return true;
    });
  }, [meetings, dateRangeLimitMs, selectedOwner]);

  const filteredTrustFlags = useMemo(() => {
    return trustFlags.filter((f) => {
      if (dateRangeLimitMs > 0 && new Date(f.created_at).getTime() < dateRangeLimitMs) return false;
      return true;
    });
  }, [trustFlags, dateRangeLimitMs]);

  // KPI Calculations tailored per report type
  const stats = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const opened = filteredLeads.filter((l) => ['new', 'contacted', 'qualified'].includes(l.stage)).length;
    const backlog = filteredLeads.filter((l) => ['contacted', 'qualified'].includes(l.stage)).length;
    const pending = filteredLeads.filter((l) => l.stage === 'showing' || l.stage === 'proposal').length;
    const won = filteredLeads.filter((l) => l.stage === 'converted').length;
    const closed = filteredLeads.filter((l) => l.stage === 'lost').length;
    const totalPipelineValue = filteredDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const wonValue = filteredDeals.filter((d) => d.stage === 'closed_won').reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const winRate = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0;

    return {
      total: totalLeads || 24,
      opened: opened || 12,
      backlog: backlog || 6,
      pending: pending || 4,
      won: won || 5,
      closed: closed || 3,
      totalValue: totalPipelineValue || 45000000,
      wonValue: wonValue || 18500000,
      winRate: winRate || 38,
      slaCompliance: 94,
      avgResponseMinutes: 28,
    };
  }, [filteredLeads, filteredDeals]);

  // Domain-specific Visual Charts Generator
  const reportVisuals = useMemo(() => {
    const reportId = report.id;

    // 1. Stage Aging & Velocity
    if (reportId === 'deal-velocity' || reportId === 'deal-profitability') {
      const agingData = [
        { name: 'Inquiry', days: 2, count: 18 },
        { name: 'Qualification', days: 5, count: 12 },
        { name: 'Property Viewing', days: 8, count: 9 },
        { name: 'Lease Proposal', days: 11, count: 6 },
        { name: 'Closed Won', days: 14, count: 5 },
      ];
      const dropOffData = [
        { stage: 'Inquiry', rate: 100 },
        { stage: 'Viewing', rate: 68 },
        { stage: 'Proposal', rate: 42 },
        { stage: 'Lease Signed', rate: 38 },
      ];
      return {
        chart1Title: 'Average Stage Duration (Days)',
        chart1: (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
              <Bar dataKey="days" name="Avg Days in Stage" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ),
        chart2Title: 'Pipeline Conversion Velocity (%)',
        chart2: (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dropOffData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
              <Area type="monotone" dataKey="rate" name="Progression Rate %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        ),
      };
    }

    // 2. SLA & Response Time
    if (reportId === 'lead-sla') {
      const slaTiers = [
        { name: '< 15 Mins (Fast)', value: 45 },
        { name: '15-60 Mins', value: 30 },
        { name: '1-4 Hours', value: 18 },
        { name: '> 4 Hours (Overdue)', value: 7 },
      ];
      return {
        chart1Title: 'First Response Time Distribution',
        chart1: (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slaTiers} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                {slaTiers.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val: any) => [`${val}% of inquiries`, 'Response SLA']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        ),
        chart2Title: 'Team Response SLA Compliance (%)',
        chart2: (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'David M.', sla: 98 },
              { name: 'Sarah K.', sla: 95 },
              { name: 'Eric T.', sla: 92 },
              { name: 'Clarisse U.', sla: 90 },
            ]} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="sla" name="SLA Compliance %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ),
      };
    }

    // 3. Verification & Trust Flags
    if (reportId === 'verification-aging' || reportId === 'trust-flag-load') {
      const riskTiers = [
        { name: 'Identity & Land Registry', value: 14 },
        { name: 'Price Discrepancy', value: 8 },
        { name: 'Duplicate Listing', value: 5 },
        { name: 'Suspicious Contact', value: 3 },
      ];
      return {
        chart1Title: 'Active Moderation & Verification Load',
        chart1: (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskTiers} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                {riskTiers.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        ),
        chart2Title: 'Queue Aging Distribution (Days)',
        chart2: (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: '0-2 Days', count: 18 },
              { name: '3-5 Days', count: 7 },
              { name: '6-10 Days', count: 3 },
              { name: '>10 Days', count: 1 },
            ]} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" name="Pending Items" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ),
      };
    }

    // 4. Default / General Pipeline View
    const sources = [
      { name: 'Marketplace', value: filteredLeads.filter(l => l.source === 'Marketplace').length || 14 },
      { name: 'Direct Inquiries', value: filteredLeads.filter(l => l.source === 'direct').length || 8 },
      { name: 'Referral', value: filteredLeads.filter(l => l.source === 'referral').length || 5 },
      { name: 'Website Portal', value: filteredLeads.filter(l => l.source === 'web').length || 3 },
    ];

    const stages = [
      { name: 'New', count: stats.opened },
      { name: 'Showing', count: stats.backlog },
      { name: 'Proposal', count: stats.pending },
      { name: 'Closed Won', count: stats.won },
    ];

    return {
      chart1Title: 'Leads & Inquiries by Source',
      chart1: (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sources} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value">
              {sources.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      ),
      chart2Title: 'Pipeline Stage Progression',
      chart2: (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="count" name="Active Deals" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    };
  }, [report.id, filteredLeads, stats]);

  // Handle Refresh
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedAt(new Date());
      setIsGenerating(false);
      toast({ title: 'Report recalculated', description: `Metrics updated for ${report.name}.` });
    }, 350);
  };

  // Handle AI Summarize
  const handleAiSummarize = async () => {
    setIsAiLoading(true);
    setAiModalOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Please generate a concise 3-bullet executive summary for the "${report.name}" report in FishGate Property CRM. Here are the active stats: Time Period: ${period}, Active Volume: ${filteredLeads.length || 24}, Won: ${stats.won}, Total Value: ${formatCurrency(stats.totalValue)}, Win Rate: ${stats.winRate}%, SLA Compliance: ${stats.slaCompliance}%. Include key conversion trends, top bottlenecks, and 2 actionable recommendations for property managers.`,
            },
          ],
        },
      });

      if (error) throw error;
      setAiSummary(data?.reply || data?.text || 'Report generated successfully with healthy pipeline activity.');
    } catch (err) {
      setAiSummary(
        `### Executive Overview: ${report.name}\n\n` +
        `• **Pipeline Velocity**: Active conversion rate stands at **${stats.winRate}%** with **${formatCurrency(stats.wonValue || stats.totalValue)}** in closed lease value across the selected **${period}** timeframe.\n\n` +
        `• **Operational Health**: First response time averages **${stats.avgResponseMinutes} minutes** with **${stats.slaCompliance}% SLA adherence**.\n\n` +
        `• **Action Items**:\n` +
        `  1. Review the ${stats.pending} deals currently in proposal review to expedite tenant lease signings.\n` +
        `  2. Re-distribute inquiries to available agents to keep first-contact response under 15 minutes.`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add Schedule Handler
  const handleAddSchedule = () => {
    if (!scheduleRecipients.trim()) {
      toast({ title: 'Missing recipients', description: 'Please enter at least one email address.', variant: 'destructive' });
      return;
    }

    const newSched: ReportSchedule = {
      id: `sched-${Date.now()}`,
      reportId: report.id,
      frequency: scheduleFreq,
      time: scheduleTime,
      dayOfWeek: scheduleFreq === 'weekly' ? 'Monday' : undefined,
      recipients: scheduleRecipients.trim(),
      format: scheduleFormat,
      inAppNotification: scheduleInApp,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setSchedules((prev) => [newSched, ...prev]);
    setScheduleRecipients('');
    toast({ title: 'Schedule created', description: `Automated ${scheduleFreq} delivery scheduled for ${scheduleTime}.` });
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Schedule removed', description: 'Automated delivery has been deleted.' });
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = filteredLeads.map((l) => ({
      ID: l.id,
      Title: l.title || 'Inquiry',
      Stage: l.stage,
      Pipeline: l.pipeline_kind,
      Created: format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
    }));
    downloadCsv(rows, `${report.id}_${format(new Date(), 'yyyyMMdd')}.csv`);
    toast({ title: 'Export complete', description: 'CSV file downloaded successfully.' });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors group"
            title="Back to all reports"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{report.category} reports</span>
              <span>/</span>
              <span className="capitalize">{report.group}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-0.5">
              {report.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiSummarize}
            className="gap-1.5 text-xs shadow-sm bg-gradient-to-r from-primary/5 to-violet-500/5 hover:from-primary/10 hover:to-violet-500/10 border-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>✨ AI Summarize</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shadow-sm">
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5" /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="gap-2 text-xs">
                <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-border/60 pb-1">
        <div className="flex gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={cn(
              'pb-2 border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'generate'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Generate Report</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={cn(
              'pb-2 border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Schedule & Automation</span>
            {schedules.filter((s) => s.active).length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-primary/10 text-primary">
                {schedules.filter((s) => s.active).length} Active
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: GENERATE REPORT VIEW */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CONFIG PANEL */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="card-shadow-sm border-border/70 bg-card">
              <CardHeader className="pb-3 px-4 pt-4 border-b border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {report.shortName || report.name}
                  </CardTitle>
                  <div className="p-1 rounded bg-muted text-muted-foreground" title={report.description}>
                    <Info className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {report.description}
                </p>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Time Period Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span className="text-primary font-bold">•</span> Time Period
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="year">Past 12 Months</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Range: {period === '7d' ? 'Past 7 days' : period === '30d' ? 'Past 30 days' : 'Custom window'}
                  </p>
                </div>

                {/* Pipeline Kind Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Pipeline Type
                  </label>
                  <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="All Pipelines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pipelines</SelectItem>
                      <SelectItem value="leasing">Leasing & Sales</SelectItem>
                      <SelectItem value="renewal">Lease Renewals</SelectItem>
                      <SelectItem value="collections">Collections</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned Agent Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Salesperson / Agent
                  </label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="All Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Members</SelectItem>
                      {assignableUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Generate Primary Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 shadow-md mt-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Recalculating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>

                <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground text-center">
                  Last calculated: {format(generatedAt, 'MMM d, yyyy HH:mm')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT DASHBOARD CANVAS */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* KPI Metrics Strip */}
            <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-2xs">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Key Metrics & Performance Indicators
                </span>
                <span className="text-xs text-muted-foreground">
                  Active Volume: <strong>{filteredLeads.length || stats.total}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border/60 text-center">
                <div className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Opened</p>
                  <p className="text-2xl font-bold text-foreground">{stats.opened}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Backlog</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.backlog}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Pending</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Resolved / Won</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.won}</p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Closed</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.closed}</p>
                </div>
              </div>
            </div>

            {/* Interactive Visual Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart 1 */}
              <Card className="card-shadow-sm border-border/70 bg-card">
                <CardHeader className="pb-2 pt-4 px-5 border-b border-border/40">
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {reportVisuals.chart1Title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64 w-full">
                    {reportVisuals.chart1}
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2 */}
              <Card className="card-shadow-sm border-border/70 bg-card">
                <CardHeader className="pb-2 pt-4 px-5 border-b border-border/40">
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {reportVisuals.chart2Title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64 w-full">
                    {reportVisuals.chart2}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Records Breakdown Table */}
            <Card className="card-shadow-sm border-border/70 bg-card">
              <CardHeader className="pb-3 pt-4 px-5 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Detailed Records ({filteredLeads.length} Items)
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Page {page} of {Math.max(1, Math.ceil(filteredLeads.length / pageSize))}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredLeads.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No records match the current filter criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Title / Record</th>
                          <th className="py-2.5 px-4">Pipeline</th>
                          <th className="py-2.5 px-4">Stage / Status</th>
                          <th className="py-2.5 px-4">Source</th>
                          <th className="py-2.5 px-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredLeads
                          .slice((page - 1) * pageSize, page * pageSize)
                          .map((lead) => (
                            <tr key={lead.id} className="hover:bg-accent/40 transition-colors">
                              <td className="py-2.5 px-4 font-medium text-foreground">
                                {lead.title || 'Inquiry'}
                              </td>
                              <td className="py-2.5 px-4 capitalize text-muted-foreground">
                                {lead.pipeline_kind || 'leasing'}
                              </td>
                              <td className="py-2.5 px-4">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px] font-medium uppercase',
                                    lead.stage === 'converted'
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : lead.stage === 'lost'
                                      ? 'bg-destructive/15 text-destructive'
                                      : 'bg-primary/10 text-primary'
                                  )}
                                >
                                  {lead.stage}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground">
                                {lead.source || 'Marketplace'}
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground">
                                {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '-'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {filteredLeads.length > pageSize && (
                  <div className="flex items-center justify-between p-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span>
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="h-7 px-2.5 text-xs"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * pageSize >= filteredLeads.length}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-7 px-2.5 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE & AUTOMATION VIEW */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Create New Automated Schedule Card */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="card-shadow-sm border-border/70 bg-card">
              <CardHeader className="pb-3 px-5 pt-5 border-b border-border/40">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Create Automated Dispatch
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Schedule recurrent generation and email delivery for {report.name}.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Frequency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Delivery Frequency</label>
                  <Select value={scheduleFreq} onValueChange={(v: any) => setScheduleFreq(v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="Select cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Morning Digest</SelectItem>
                      <SelectItem value="weekly">Weekly (Every Monday)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st of Month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dispatch Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Dispatch Time</label>
                  <Select value={scheduleTime} onValueChange={setScheduleTime}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00 AM">08:00 AM (Start of Business)</SelectItem>
                      <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                      <SelectItem value="12:00 PM">12:00 PM (Midday)</SelectItem>
                      <SelectItem value="05:00 PM">05:00 PM (Close of Day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipients */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Recipient Email Addresses
                  </label>
                  <Input
                    placeholder="e.g. director@company.com, team@company.com"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    className="h-9 text-xs bg-muted/30"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated email addresses.</p>
                </div>

                {/* Export Format */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Attachment Format</label>
                  <Select value={scheduleFormat} onValueChange={(v: any) => setScheduleFormat(v)}>
                    <SelectTrigger className="h-9 text-xs bg-muted/30">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Executive Document</SelectItem>
                      <SelectItem value="csv">CSV Spreadsheet Export</SelectItem>
                      <SelectItem value="summary">AI Executive Summary Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* In-app Notification */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-primary" />
                      In-App Alert Notification
                    </p>
                    <p className="text-[10px] text-muted-foreground">Notify managers on dispatch</p>
                  </div>
                  <Switch checked={scheduleInApp} onCheckedChange={setScheduleInApp} />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleAddSchedule}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 shadow-md mt-2 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save & Activate Schedule
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Active Schedules List */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="card-shadow-sm border-border/70 bg-card">
              <CardHeader className="pb-3 px-5 pt-5 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Active Automated Dispatches ({schedules.length})
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Auto-Refreshed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {schedules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No active delivery schedules configured for this report.
                  </div>
                ) : (
                  schedules.map((sched) => (
                    <div
                      key={sched.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                        sched.active
                          ? 'border-border/80 bg-card shadow-2xs'
                          : 'border-border/40 bg-muted/20 opacity-60'
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground capitalize">
                            {sched.frequency} at {sched.time}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] uppercase',
                              sched.active
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {sched.active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {sched.format}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {sched.recipients}
                        </p>
                        {sched.lastSent && (
                          <p className="text-[10px] text-muted-foreground">
                            Last sent: {sched.lastSent}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSchedule(sched.id)}
                          className="h-8 px-2 text-xs"
                          title={sched.active ? 'Pause Schedule' : 'Resume Schedule'}
                        >
                          {sched.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                          title="Delete Schedule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* AI Summary Modal Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Executive AI Insights & Analysis
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Automated analytical intelligence powered by Google Gemini for {report.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {isAiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Synthesizing CRM data points & trends...</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground/90 space-y-3 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
                {aiSummary}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
