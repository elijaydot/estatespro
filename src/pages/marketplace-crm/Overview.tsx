import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, ListTodo, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard } from '@/components/marketplace-crm/CrmWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmLeads, useManagedMarketplaceListings } from '@/hooks/useMarketplace';
import { useCrmAutomationRuns, useCrmDealHandoffs, useCrmDeals, useCrmMarketplaceFunnelMetrics, useCrmMeetings, useCrmTasks, useCrmTrustFlags } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmOverviewPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const trustFlagsQuery = useCrmTrustFlags(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const funnelQuery = useCrmMarketplaceFunnelMetrics(activeCompanyId);
  const automationRunsQuery = useCrmAutomationRuns(activeCompanyId);

  const tasksQuery = useCrmTasks(activeCompanyId);

  const metrics = useMemo(() => {
    const leads = leadsQuery.data || [];
    const listings = listingsQuery.data || [];
    const meetings = meetingsQuery.data || [];
    const deals = dealsQuery.data || [];
    const tasks = tasksQuery.data || [];
    const trustFlags = trustFlagsQuery.data || [];
    const handoffs = handoffsQuery.data || [];
    const funnel = funnelQuery.data;
    const automationRuns = automationRunsQuery.data || [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      openTasks: tasks.filter((task) => task.status === 'open').length,
      overdueTasks: tasks.filter((task) => task.status === 'open' && new Date(task.due_at).getTime() < Date.now()).length,
      upcomingMeetings: meetings.filter((meeting) => new Date(meeting.starts_at).getTime() >= Date.now()).length,
      todaysLeads: leads.filter((lead) => {
        const day = new Date(lead.created_at);
        const today = new Date();
        return day.toDateString() === today.toDateString();
      }).length,
      dealsClosingThisMonth: deals.filter((deal) => {
        if (!deal.expected_close_date) return false;
        if (deal.stage === 'converted' || deal.stage === 'lost') return false;

        const closeDate = new Date(deal.expected_close_date);
        return closeDate.getMonth() === currentMonth && closeDate.getFullYear() === currentYear;
      }).length,
      activeListings: listings.filter((listing) => listing.status === 'live').length,
      totalLeads: leads.length,
      avgLeadScore: leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0,
      topLeadsByScore: [...leads]
        .sort((a, b) => b.score - a.score || Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 5),
      activeTrustFlags: trustFlags.filter((flag) => flag.state === 'active').length,
      handoffsReady: handoffs.filter((handoff) => handoff.status === 'ready').length,
      handoffsRequiresInput: handoffs.filter((handoff) => handoff.status === 'requires_input').length,
      inquiryToWonRate: funnel?.inquiry_to_won_rate_pct || 0,
      automationPending: automationRuns.filter((run) => run.status === 'pending').length,
      automationFailed: automationRuns.filter((run) => run.status === 'failed').length,
    };
  }, [
    leadsQuery.data,
    listingsQuery.data,
    meetingsQuery.data,
    dealsQuery.data,
    tasksQuery.data,
    trustFlagsQuery.data,
    handoffsQuery.data,
    funnelQuery.data,
    automationRunsQuery.data,
  ]);

  return (
    <CrmWorkspace
      title="Overview"
      subtitle="Lead, pipeline, and marketplace performance at a glance."
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Open work', value: metrics.openTasks, helper: `${metrics.overdueTasks} overdue`, icon: ListTodo, tone: metrics.overdueTasks ? 'text-amber-600' : 'text-primary' },
          { label: 'Upcoming meetings', value: metrics.upcomingMeetings, helper: 'Scheduled from now', icon: CalendarClock, tone: 'text-sky-600' },
          { label: 'Pipeline leads', value: metrics.totalLeads, helper: `${metrics.todaysLeads} added today`, icon: Target, tone: 'text-emerald-600' },
          { label: 'Conversion', value: `${metrics.inquiryToWonRate}%`, helper: 'Inquiry to won · 30 days', icon: Sparkles, tone: 'text-violet-600' },
        ].map((item) => (
          <div key={item.label} className="border-b border-border/70 px-1 py-3 lg:border-b-0 lg:border-r lg:px-5 lg:last:border-r-0">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{item.label}</p><item.icon className={`h-4 w-4 ${item.tone}`} /></div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
      <CrmDataCard title="Priority leads" description="Best opportunities to action next." action={<Button asChild variant="ghost" size="sm"><Link to="/marketplace/crm/leads">View all<ArrowRight className="h-4 w-4" /></Link></Button>}>
        <div className="space-y-2">
          {metrics.topLeadsByScore.length === 0 ? (
            <p className="text-sm text-muted-foreground">No priority leads found.</p>
          ) : (
            metrics.topLeadsByScore.map((lead) => (
              <Link key={lead.id} to={`/marketplace/crm/leads?lead=${lead.id}`} className="flex items-center justify-between border-b border-border/60 px-1 py-3 transition-colors last:border-b-0 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{lead.contact_name || 'Lead'}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead.stage.replace(/_/g, ' ')} · {lead.contact_email || lead.contact_phone || 'No contact detail'}</p>
                </div>
                <div className="ml-3 flex items-center gap-3"><Badge variant="outline">Score {lead.score}</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
              </Link>
            ))
          )}
        </div>
      </CrmDataCard>

      <CrmDataCard title="Attention queue" description="Exceptions and handoffs that may block progress.">
        <div className="divide-y divide-border/60">
          {[
            { label: 'Handoffs ready', value: metrics.handoffsReady, icon: CheckCircle2, href: '/marketplace/crm/deals', tone: 'text-emerald-600' },
            { label: 'Handoffs need input', value: metrics.handoffsRequiresInput, icon: BriefcaseBusiness, href: '/marketplace/crm/deals', tone: 'text-amber-600' },
            { label: 'Active trust flags', value: metrics.activeTrustFlags, icon: ShieldAlert, href: '/marketplace/crm/leads', tone: 'text-rose-600' },
            { label: 'Automation failures', value: metrics.automationFailed, icon: AlertTriangle, href: '/marketplace/crm/automation', tone: 'text-rose-600' },
          ].map((item) => (
            <Link key={item.label} to={item.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <item.icon className={`h-4 w-4 ${item.tone}`} /><span className="flex-1 text-sm">{item.label}</span><span className="text-sm font-semibold">{item.value}</span><ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CrmDataCard>
      </div>

      <section className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Deals closing this month</p><p className="mt-1 text-lg font-semibold">{metrics.dealsClosingThisMonth}</p></div>
        <div><p className="text-xs text-muted-foreground">Active listings</p><p className="mt-1 text-lg font-semibold">{metrics.activeListings}</p></div>
        <div><p className="text-xs text-muted-foreground">Average lead score</p><p className="mt-1 text-lg font-semibold">{metrics.avgLeadScore}</p></div>
        <div><p className="text-xs text-muted-foreground">Automation processing</p><p className="mt-1 text-lg font-semibold">{metrics.automationPending}</p></div>
      </section>
    </CrmWorkspace>
  );
}
