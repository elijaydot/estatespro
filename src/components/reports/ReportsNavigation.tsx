import { useState } from 'react';
import {
  REPORT_DOMAINS,
  ReportDomainId,
  ReportItem,
} from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportsNavigationProps {
  currentDomainId: ReportDomainId;
  currentReportId: string;
  onSelectDomain: (domainId: ReportDomainId) => void;
  onSelectReport: (reportId: string) => void;
}

export function Level1DomainTabs({
  currentDomainId,
  onSelectDomain,
}: {
  currentDomainId: ReportDomainId;
  onSelectDomain: (domainId: ReportDomainId) => void;
}) {
  return (
    <div className="w-full border-b border-border/60 bg-card/60 backdrop-blur-sm px-2 pt-2 pb-0">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {REPORT_DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isActive = currentDomainId === domain.id;

          return (
            <button
              key={domain.id}
              onClick={() => onSelectDomain(domain.id)}
              className={cn(
                'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 shrink-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-105',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span>{domain.title || domain.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Level2ContextSidebar({
  currentDomainId,
  currentReportId,
  onSelectReport,
}: {
  currentDomainId: ReportDomainId;
  currentReportId: string;
  onSelectReport: (reportId: string) => void;
}) {
  const domain = REPORT_DOMAINS.find((d) => d.id === currentDomainId);
  if (!domain || domain.reports.length === 0) return null;

  return (
    <aside className="w-60 shrink-0 hidden lg:block border-r border-border/60 pr-4 space-y-4">
      <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Business Focus
        </p>
        <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
          {domain.question}
        </p>
      </div>

      <nav className="space-y-1">
        <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {domain.label} Reports
        </p>
        {domain.reports.map((report) => {
          const Icon = report.icon;
          const isActive = currentReportId === report.id;

          return (
            <button
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border-l-2 border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 mt-0.5 shrink-0 transition-transform group-hover:scale-105',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-sm truncate">
                    {report.shortLabel || report.label}
                  </span>
                  {report.badge && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 uppercase font-bold shrink-0 bg-background/80"
                    >
                      {report.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  {report.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileReportSelector({
  currentDomainId,
  currentReportId,
  onSelectDomain,
  onSelectReport,
}: ReportsNavigationProps) {
  const [open, setOpen] = useState(false);
  const activeDomain = REPORT_DOMAINS.find((d) => d.id === currentDomainId) || REPORT_DOMAINS[0];
  const activeReport = activeDomain.reports.find((r) => r.id === currentReportId);

  return (
    <div className="lg:hidden w-full pb-3">
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between h-11 px-4 bg-card border-border/80 text-foreground font-medium shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <activeDomain.icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">
            {activeDomain.label}
            {activeReport && (
              <span className="text-muted-foreground font-normal">
                {' '}
                / {activeReport.shortLabel || activeReport.label}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Switch</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-6">
          <SheetHeader className="text-left pb-4 border-b border-border/60">
            <SheetTitle className="text-base font-bold">Executive Reports Directory</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Select a domain and specific report to inspect portfolio intelligence.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 pt-4">
            {REPORT_DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isSelectedDomain = domain.id === currentDomainId;

              return (
                <div key={domain.id} className="space-y-2">
                  <button
                    onClick={() => {
                      onSelectDomain(domain.id);
                      if (domain.reports.length === 0) {
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left text-sm font-semibold transition-colors',
                      isSelectedDomain
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/40 hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{domain.label}</span>
                    </div>
                    <span className="text-[11px] opacity-80">{domain.reports.length > 0 ? `${domain.reports.length} reports` : 'Landing'}</span>
                  </button>

                  {domain.reports.length > 0 && (
                    <div className="pl-4 pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {domain.reports.map((report) => {
                        const ReportIcon = report.icon;
                        const isCurrentReport = isSelectedDomain && currentReportId === report.id;

                        return (
                          <button
                            key={report.id}
                            onClick={() => {
                              onSelectDomain(domain.id);
                              onSelectReport(report.id);
                              setOpen(false);
                            }}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-left transition-colors',
                              isCurrentReport
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                            )}
                          >
                            <ReportIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{report.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
