import { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Star,
  FileText,
  TrendingUp,
  Activity,
  Users,
  DollarSign,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CRM_REPORT_GROUPS,
  getReportById,
  getRecentlyViewedReportIds,
  getFavoriteReportIds,
  toggleFavoriteReportId,
  type CrmReportItem,
} from '@/lib/crmReportsConfig';
import { cn } from '@/lib/utils';

interface ReportsHubProps {
  onSelectReport: (reportId: string) => void;
}

export function ReportsHub({ onSelectReport }: ReportsHubProps) {
  const [search, setSearch] = useState('');
  const [favoriteList, setFavoriteList] = useState<string[]>(getFavoriteReportIds);

  const recentlyViewedIds = getRecentlyViewedReportIds();
  const recentlyViewedReports = useMemo(() => {
    return recentlyViewedIds
      .map((id) => getReportById(id))
      .filter((r): r is CrmReportItem => r !== undefined);
  }, [recentlyViewedIds]);

  const query = search.trim().toLowerCase();

  const handleToggleFav = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    toggleFavoriteReportId(reportId);
    setFavoriteList(getFavoriteReportIds());
  };

  const operationalGroups = useMemo(() => {
    return CRM_REPORT_GROUPS.filter((g) => g.category === 'operational').map((group) => {
      if (!query) return group;
      const matched = group.reports.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query))
      );
      return { ...group, reports: matched };
    }).filter((g) => !query || g.reports.length > 0);
  }, [query]);

  const analyticalGroups = useMemo(() => {
    return CRM_REPORT_GROUPS.filter((g) => g.category === 'analytical').map((group) => {
      if (!query) return group;
      const matched = group.reports.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query))
      );
      return { ...group, reports: matched };
    }).filter((g) => !query || g.reports.length > 0);
  }, [query]);

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Banner & Search */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports Hub</h1>
            <p className="text-sm text-muted-foreground">
              Explore real-time CRM performance, pipeline velocity, revenue realization, and agent benchmarks.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectReport('preset-executive-360')}
              className="text-xs gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Executive 360
            </Button>
          </div>
        </div>

        {/* Global Reports Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by name, metric, pipeline stage, or tag..."
            className="pl-10 h-11 text-sm bg-card border-border/80 shadow-sm rounded-xl focus-visible:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Recently Viewed Quick Chips */}
        {!query && recentlyViewedReports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="font-medium flex items-center gap-1 text-foreground/80">
              <Clock className="h-3.5 w-3.5" /> Recently viewed:
            </span>
            {recentlyViewedReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => onSelectReport(report.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/70 bg-card hover:bg-accent hover:text-accent-foreground transition-colors shadow-2xs group"
              >
                <Clock className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>{report.shortName || report.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: Operational Reports */}
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Operational reports</h2>
            <p className="text-xs text-muted-foreground">
              Gain deep insights into lead handling, pipeline velocity, SLA adherence, and conversion health.
            </p>
          </div>
        </div>

        {operationalGroups.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border/60">
            <p className="text-sm text-muted-foreground">No operational reports match your search "{search}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
            {operationalGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <Card
                  key={group.id}
                  className="card-shadow-sm border-border/70 hover:border-border transition-all flex flex-col justify-between bg-card"
                >
                  <div>
                    <CardHeader className="pb-3 pt-4 px-4 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-muted text-foreground/80">
                          <GroupIcon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-semibold text-foreground truncate">
                          {group.title}
                        </CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="p-2 space-y-1">
                      {group.reports.map((report) => {
                        const isFav = favoriteList.includes(report.id);
                        return (
                          <div
                            key={report.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectReport(report.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                onSelectReport(report.id);
                              }
                            }}
                            className="group/item relative flex flex-col p-2.5 rounded-lg hover:bg-accent/70 transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-semibold text-foreground group-hover/item:text-primary transition-colors truncate">
                                {report.shortName || report.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleToggleFav(e, report.id)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-background/80"
                                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Star
                                  className={cn(
                                    'h-3 w-3',
                                    isFav ? 'text-amber-400 fill-amber-400 opacity-100' : 'text-muted-foreground'
                                  )}
                                />
                              </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {report.description}
                            </p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Analytical Reports & Presets */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Analytical reports & presets</h2>
            <p className="text-xs text-muted-foreground">
              Build executive-ready summaries, weekly momentum reports, and comprehensive portfolio health snapshots.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticalGroups.flatMap((g) => g.reports).map((report) => (
            <Card
              key={report.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectReport(report.id)}
              className="card-shadow-sm border-border/70 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group bg-card"
            >
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {report.name}
                    </h3>
                    {report.badge && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                        {report.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.description}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary text-muted-foreground transition-colors shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
