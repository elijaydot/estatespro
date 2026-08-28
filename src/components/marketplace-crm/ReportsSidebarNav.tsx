import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  FolderLock,
  Share2,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CRM_REPORT_GROUPS,
  type CrmReportItem,
  type CrmReportGroup,
  getFavoriteReportIds,
} from '@/lib/crmReportsConfig';

interface ReportsSidebarNavProps {
  onBackToMainMenu: () => void;
  onNavigateReport?: (reportId: string) => void;
  collapsed?: boolean;
}

export function ReportsSidebarNav({
  onBackToMainMenu,
  onNavigateReport,
  collapsed = false,
}: ReportsSidebarNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentReportId = searchParams.get('report') || '';
  const [searchQuery, setSearchQuery] = useState('');
  
  // Keep track of expanded group accordions (defaults to all operational expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['general', 'monitoring', 'team', 'profitability', 'satisfaction', 'presets'])
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectReport = (reportId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('report', reportId);
    setSearchParams(next);
    onNavigateReport?.(reportId);
  };

  const handleClearReport = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next);
  };

  // Filter groups based on search query
  const query = searchQuery.trim().toLowerCase();
  
  const operationalGroups = useMemo(() => {
    return CRM_REPORT_GROUPS.filter((g) => g.category === 'operational').map((group) => {
      if (!query) return group;
      const matchedReports = group.reports.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query))
      );
      return {
        ...group,
        reports: matchedReports,
      };
    }).filter((group) => !query || group.reports.length > 0);
  }, [query]);

  const analyticalGroups = useMemo(() => {
    return CRM_REPORT_GROUPS.filter((g) => g.category === 'analytical').map((group) => {
      if (!query) return group;
      const matchedReports = group.reports.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query))
      );
      return {
        ...group,
        reports: matchedReports,
      };
    }).filter((group) => !query || group.reports.length > 0);
  }, [query]);

  const favoriteIds = getFavoriteReportIds();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Header with Back Arrow */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border/70">
        <button
          type="button"
          onClick={onBackToMainMenu}
          className="flex items-center gap-2 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 px-2 py-1.5 rounded-lg transition-colors group"
          title="Back to full menu"
        >
          <ArrowLeft className="h-4 w-4 text-sidebar-foreground/70 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-semibold text-base">Reports</span>
        </button>
      </div>

      {/* Real-time Search Input */}
      <div className="p-3 border-b border-sidebar-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="h-8 pl-8 text-xs bg-sidebar-accent/30 border-sidebar-border/60 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground bg-sidebar-border/40 rounded px-1"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Reports Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-sm scrollbar-thin scrollbar-thumb-sidebar-border">
        
        {/* All Reports Hub Landing Link */}
        <button
          type="button"
          onClick={handleClearReport}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            !currentReportId
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>All Reports Hub</span>
          </div>
          {!currentReportId && <Check className="h-3 w-3" />}
        </button>

        {/* SECTION 1: Operational Reports */}
        <div className="space-y-1">
          <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Operational reports
          </p>

          {operationalGroups.length === 0 && (
            <p className="px-3 py-2 text-xs text-sidebar-foreground/40 italic">
              No matching operational reports
            </p>
          )}

          {operationalGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id) || !!query;
            const GroupIcon = group.icon;
            const hasActiveReport = group.reports.some((r) => r.id === currentReportId);

            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group Accordion Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    hasActiveReport && !isExpanded
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                    <span>{group.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  )}
                </button>

                {/* Sub-Reports List */}
                {isExpanded && (
                  <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border/40 ml-4">
                    {group.reports.map((report) => {
                      const isActive = report.id === currentReportId;
                      const isFav = favoriteIds.includes(report.id);

                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => handleSelectReport(report.id)}
                          className={cn(
                            'w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-all group',
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                          )}
                        >
                          <span className="truncate pr-2">{report.shortName || report.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isFav && (
                              <Star className={cn('h-2.5 w-2.5', isActive ? 'text-amber-300 fill-amber-300' : 'text-amber-400 fill-amber-400')} />
                            )}
                            {report.badge && (
                              <span className="text-[9px] px-1 py-0.2 bg-primary/20 text-primary rounded">
                                {report.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SECTION 2: Analytical Reports */}
        <div className="space-y-1 pt-2 border-t border-sidebar-border/30">
          <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Analytical reports
          </p>

          {analyticalGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id) || !!query;
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                    <span>{group.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border/40 ml-4">
                    {group.reports.map((report) => {
                      const isActive = report.id === currentReportId;
                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => handleSelectReport(report.id)}
                          className={cn(
                            'w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                          )}
                        >
                          <span className="truncate">{report.shortName || report.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Filter Categories */}
          <div className="space-y-0.5 pt-1">
            <button
              type="button"
              onClick={() => handleSelectReport('preset-executive-360')}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors',
                currentReportId === 'preset-executive-360'
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <FolderLock className="h-3.5 w-3.5 text-sidebar-foreground/60" />
              <span>My Reports</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectReport('general-overview')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-sidebar-foreground/60" />
              <span>Shared Reports</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectReport(favoriteIds[0] || 'deal-profitability')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Favorites</span>
              </div>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-sidebar-accent text-sidebar-foreground/70">
                {favoriteIds.length}
              </Badge>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
