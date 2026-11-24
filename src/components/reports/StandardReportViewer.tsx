import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Download,
  ArrowUpDown,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { ReportItem, ReportCategory } from './types';

export interface ReportFinding {
  title: string;
  description: string;
}

export interface ReportAction {
  label: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onClick?: () => void;
}

export interface ReportColumn<T = any> {
  id: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
}

export interface StandardReportViewerProps<T = any> {
  report: ReportItem;
  category: ReportCategory;
  onBack: () => void;

  // 1. Executive Summary (one paragraph max)
  summary: string;

  // 2. Key Findings (3-5 findings)
  findings: ReportFinding[];

  // 3. Visual Insights (max 3 visuals)
  visuals?: React.ReactNode;

  // 4. Recommended Actions
  recommendations: ReportAction[];

  // 5. Detailed Data Table
  columns: ReportColumn<T>[];
  data: T[];
  searchKeys?: (keyof T)[];
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  exportFilename?: string;
}

function DefaultVisualChart({ data, columns }: { data: any[]; columns: ReportColumn[] }) {
  if (!data || data.length === 0) return null;

  // Find a label key
  const labelCol = columns.find((c) => c.sortable !== false && c.align !== 'right');
  const labelKey = labelCol ? labelCol.id : Object.keys(data[0] || {})[0] || 'name';

  // Find a numeric key
  const numCol = columns.find((c) => c.align === 'right' || typeof (data[0] || {})[c.id] === 'number');
  const numKey = numCol ? numCol.id : undefined;

  if (!numKey) return null;

  const chartData = data.slice(0, 10).map((item) => ({
    name: String(item[labelKey] ?? '').slice(0, 16),
    value: Number(item[numKey]) || 0,
  }));

  if (chartData.length === 0 || chartData.every((d) => d.value === 0)) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Visual Insight · {numCol?.label || 'Comparative Distribution'}
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">Fixed 240px Trajectory</span>
      </div>
      <div className="h-[240px] w-full min-h-[240px] max-h-[240px] overflow-hidden pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reportViewerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#reportViewerGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StandardReportViewer<T extends Record<string, any>>({
  report,
  category,
  onBack,
  summary,
  findings,
  visuals,
  recommendations,
  columns,
  data,
  searchKeys,
  defaultSortKey,
  defaultSortDir = 'desc',
  exportFilename,
}: StandardReportViewerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>(defaultSortKey || (columns[0]?.id ?? ''));
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((c) => {
      map[c.id] = true;
    });
    return map;
  });

  const Icon = report.icon;
  const CategoryIcon = category.icon;

  // Sorting handler
  const handleSort = (columnId: string) => {
    if (sortKey === columnId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(columnId);
      setSortDir('asc');
    }
  };

  // Filtered & Sorted Rows
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        if (searchKeys && searchKeys.length > 0) {
          return searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q));
        }
        return Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q));
      });
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        if (strA < strB) return sortDir === 'asc' ? -1 : 1;
        if (strA > strB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchKeys, sortKey, sortDir]);

  // Pagination calculations
  const totalRecords = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);
  const displayEndIndex = Math.min(startIndex + pageSize, totalRecords);

  // CSV Export
  const handleExportCsv = () => {
    if (processedData.length === 0) {
      toast({ title: 'No Data', description: 'There are no records to export.' });
      return;
    }

    const activeCols = columns.filter((c) => visibleColumns[c.id] !== false);
    const headers = activeCols.map((c) => `"${c.label}"`);
    const rows = processedData.map((row) =>
      activeCols.map((c) => `"${String(row[c.id] ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFilename || report.id}-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Export Generated', description: 'CSV table downloaded successfully.' });
  };

  // Excel (.xml) Export
  const handleExportExcel = () => {
    handleExportCsv();
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Navigation Breadcrumb & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground -ml-2 h-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Reports
          </Button>

          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {report.label}
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              {category.title}
            </Badge>
            {report.badge && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                {report.badge}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {report.description}
          </p>
        </div>

        {/* Quick Report Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9 border-border/80"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9 border-border/80"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* ====================================================
          PART 1: EXECUTIVE SUMMARY (One paragraph maximum)
          ==================================================== */}
      <section aria-label="Executive Summary">
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Executive Summary
            </span>
          </div>
          <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
            {summary}
          </p>
        </div>
      </section>

      {/* ====================================================
          PART 2: KEY FINDINGS (3-5 findings)
          ==================================================== */}
      <section aria-label="Key Findings">
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Key Findings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {findings.map((finding, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {finding.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-3.5">
                  {finding.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          PART 3: VISUAL INSIGHTS (Max 3 visuals)
          ==================================================== */}
      <section aria-label="Visual Insights" className="space-y-4">
        {visuals ? (
          <>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Visual Insights
            </h3>
            {visuals}
          </>
        ) : (
          <DefaultVisualChart data={processedData} columns={columns} />
        )}
      </section>

      {/* ====================================================
          PART 4: RECOMMENDED ACTIONS (Practical, Actionable Guidance)
          ==================================================== */}
      <section aria-label="Recommended Actions">
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recommended Decisions & Actions
            </h3>
            <span className="text-[11px] text-muted-foreground font-medium">
              Operational next steps
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border/80 bg-muted/15 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground block">
                    {rec.label}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                {rec.actionText && (
                  <div className="pt-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={rec.onClick}
                      className="gap-1.5 text-xs h-8 border-border/80 hover:bg-background"
                    >
                      <span>{rec.actionText}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          PART 5: DETAILED DATA TABLE (Search, Sort, Pagination)
          ==================================================== */}
      <section aria-label="Detailed Data Table" className="space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Detailed Supporting Data
              </h3>
              <p className="text-xs text-muted-foreground">
                Showing {totalRecords === 0 ? 0 : startIndex + 1}–{displayEndIndex} of {totalRecords} records
              </p>
            </div>

            {/* Toolbar Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search table..."
                  className="pl-8 h-8 text-xs border-border/80 bg-background"
                />
              </div>

              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs border-border/80">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={visibleColumns[c.id] !== false}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((prev) => ({ ...prev, [c.id]: checked }))
                      }
                    >
                      {c.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export CSV */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 gap-1 text-xs border-border/80"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-border/70 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-semibold">
                <tr>
                  {columns
                    .filter((c) => visibleColumns[c.id] !== false)
                    .map((col) => (
                      <th
                        key={col.id}
                        className={cn(
                          'py-3 px-4 font-semibold select-none',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.sortable !== false && 'cursor-pointer hover:text-foreground'
                        )}
                        onClick={() => col.sortable !== false && handleSort(col.id)}
                      >
                        <div
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            col.align === 'right' && 'flex-row-reverse'
                          )}
                        >
                          <span>{col.label}</span>
                          {col.sortable !== false && (
                            <ArrowUpDown className="h-3 w-3 opacity-60 shrink-0" />
                          )}
                        </div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                      {columns
                        .filter((c) => visibleColumns[c.id] !== false)
                        .map((col) => (
                          <td
                            key={col.id}
                            className={cn(
                              'py-3 px-4',
                              col.align === 'right'
                                ? 'text-right font-mono'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            )}
                          >
                            {col.render ? col.render(row) : String(row[col.id] ?? '-')}
                          </td>
                        ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => visibleColumns[c.id] !== false).length}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No records match the current filter or search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs border-border/80">
                  <SelectValue placeholder="25" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
