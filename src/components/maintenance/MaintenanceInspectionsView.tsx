// src/components/maintenance/MaintenanceInspectionsView.tsx
// FishGate Design Constitution v1.0 - Section 4.3: Inspections & Audits Workspace

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/shared/Pagination';
import {
  Search,
  MoreHorizontal,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Eye,
  Plus,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { InspectionRecord, InspectionOutcome, ConditionRating } from './types';

interface MaintenanceInspectionsViewProps {
  inspections: InspectionRecord[];
  onSelectInspection: (inspection: InspectionRecord) => void;
  onScheduleInspection: () => void;
  onGenerateWorkOrderFromIssue: (inspection: InspectionRecord) => void;
}

export function MaintenanceInspectionsView({
  inspections,
  onSelectInspection,
  onScheduleInspection,
  onGenerateWorkOrderFromIssue,
}: MaintenanceInspectionsViewProps) {
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      if (outcomeFilter !== 'all' && i.outcome !== outcomeFilter) return false;
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const refMatch = i.reference.toLowerCase().includes(q);
        const propMatch = i.propertyName.toLowerCase().includes(q);
        const unitMatch = (i.unitNumber || '').toLowerCase().includes(q);
        const inspectorMatch = i.inspector.toLowerCase().includes(q);
        const notesMatch = (i.notes || '').toLowerCase().includes(q);

        if (!refMatch && !propMatch && !unitMatch && !inspectorMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, outcomeFilter, typeFilter, search]);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedInspections = filteredInspections.slice(startIndex, startIndex + pageSize);

  const getOutcomeBadge = (outcome: InspectionOutcome) => {
    switch (outcome) {
      case 'passed':
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1"><CheckCircle2 className="w-3 h-3" /> Passed</Badge>;
      case 'passed_with_recommendations':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">Passed (Notes)</Badge>;
      case 'follow_up_required':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1"><AlertTriangle className="w-3 h-3" /> Follow-Up</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[10px] font-semibold gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
    }
  };

  const getConditionBadge = (rating: ConditionRating) => {
    switch (rating) {
      case 'excellent':
        return <Badge className="bg-emerald-600 text-white text-[10px]">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Good</Badge>;
      case 'fair':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">Fair</Badge>;
      case 'poor':
        return <Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">Poor</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="text-[10px]">Critical</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Schedule Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search inspections by reference, premises, inspector..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={outcomeFilter}
            onChange={(e) => {
              setOutcomeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Outcomes</option>
            <option value="passed">Passed</option>
            <option value="passed_with_recommendations">Passed with Recs</option>
            <option value="follow_up_required">Follow-Up Required</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Inspection Types</option>
            <option value="move_in">Move-In</option>
            <option value="move_out">Move-Out</option>
            <option value="routine">Routine</option>
            <option value="safety">Safety & Fire</option>
            <option value="preventive">Preventive</option>
            <option value="compliance">Statutory Compliance</option>
          </select>

          <Button
            size="sm"
            className="h-9 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onScheduleInspection}
          >
            <Calendar className="w-3.5 h-3.5" /> Schedule Inspection
          </Button>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Reference</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Premises & Space</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Type</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Inspector</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Condition Score</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Outcome</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Actionable Issues</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No inspection audits found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedInspections.map((i) => (
                <TableRow
                  key={i.id}
                  className="text-xs hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectInspection(i)}
                >
                  <TableCell className="font-mono font-bold text-blue-700">
                    {i.reference}
                  </TableCell>

                  <TableCell className="max-w-[170px]">
                    <div className="font-semibold text-slate-900 truncate">{i.propertyName}</div>
                    {i.unitNumber ? (
                      <span className="text-[10px] text-slate-500">Unit {i.unitNumber}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Entire Facility</span>
                    )}
                  </TableCell>

                  <TableCell className="capitalize text-slate-800 font-medium">
                    {i.type.replace('_', ' ')}
                  </TableCell>

                  <TableCell className="text-slate-700 font-medium">{i.inspector}</TableCell>

                  <TableCell className="text-slate-600 whitespace-nowrap">
                    {format(new Date(i.inspectionDate), 'MMM d, yyyy')}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">{i.conditionScore}%</span>
                      {getConditionBadge(i.conditionRating)}
                    </div>
                  </TableCell>

                  <TableCell>{getOutcomeBadge(i.outcome)}</TableCell>

                  <TableCell>
                    {i.issuesFound.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{i.issuesFound.length} issue(s)</span>
                      </div>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clean audit
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {i.issuesFound.some((iss) => iss.requiresWorkOrder && !iss.generatedWorkOrderId) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-semibold text-red-700 border-red-200 hover:bg-red-50 gap-1"
                          onClick={() => onGenerateWorkOrderFromIssue(i)}
                        >
                          <Wrench className="w-3 h-3" /> Auto-Create WO
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => onSelectInspection(i)} className="gap-2">
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> View Inspection Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="pt-2 flex justify-end">
        <Pagination
          page={safePage}
          total={filteredInspections.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
