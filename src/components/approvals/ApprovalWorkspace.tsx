// src/components/approvals/ApprovalWorkspace.tsx
// FishGate Design Constitution v1.0 - Section 4: Approval Workspace (Views: Pending, Awaiting Me, Approved, Rejected, Escalated, All Requests)

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Building,
  User,
  MoreHorizontal,
  Flame,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  ApprovalRecord,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
} from './types';
import {
  APPROVAL_TYPE_REGISTRY,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from './ApprovalVisualRegistry';

interface ApprovalWorkspaceProps {
  approvals: ApprovalRecord[];
  properties: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role: string; department?: string }>;
  currentUserName?: string;
  onSelectApproval: (approval: ApprovalRecord) => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onRequestChanges: (approvalId: string) => void;
}

export function ApprovalWorkspace({
  approvals,
  properties,
  teamMembers,
  currentUserName = 'Operator',
  onSelectApproval,
  onApprove,
  onReject,
  onRequestChanges,
}: ApprovalWorkspaceProps) {
  // Active Tab View: pending | awaiting_me | approved | rejected | escalated | all
  const [activeTab, setActiveTab] = useState<string>('pending');

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [savedView, setSavedView] = useState<string>('none');

  // Tab Filtering
  const tabFilteredApprovals = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return approvals.filter((a) => a.status === 'pending' || a.status === 'changes_requested');
      case 'awaiting_me':
        return approvals.filter(
          (a) =>
            a.status === 'pending' &&
            (a.currentApprover.name.toLowerCase().includes(currentUserName.toLowerCase()) ||
              a.delegatedTo?.name.toLowerCase().includes(currentUserName.toLowerCase()))
        );
      case 'approved':
        return approvals.filter((a) => a.status === 'approved');
      case 'rejected':
        return approvals.filter((a) => a.status === 'rejected');
      case 'escalated':
        return approvals.filter((a) => a.status === 'escalated' || a.isEscalated);
      case 'all':
      default:
        return approvals;
    }
  }, [approvals, activeTab, currentUserName]);

  // Secondary Filters (Search, Type, Property, Priority, Saved Views)
  const filteredApprovals = useMemo(() => {
    return tabFilteredApprovals.filter((a) => {
      // Type filter
      if (selectedType !== 'all' && a.type !== selectedType) return false;

      // Property filter
      if (selectedPropertyId !== 'all') {
        const p = properties.find((prop) => prop.id === selectedPropertyId);
        if (a.propertyName !== p?.name && a.propertyId !== selectedPropertyId) return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && a.priority !== selectedPriority) return false;

      // Saved view filter
      if (savedView === 'high_value') {
        if (!a.amount || a.amount < 1000000) return false;
      } else if (savedView === 'sla_critical') {
        if (a.slaHoursRemaining > 24 || a.status !== 'pending') return false;
      } else if (savedView === 'commercial_leases') {
        if (a.type !== 'lease') return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = a.title.toLowerCase().includes(q);
        const numMatch = a.approvalNumber.toLowerCase().includes(q);
        const reqMatch = a.requester.name.toLowerCase().includes(q);
        const appMatch = a.currentApprover.name.toLowerCase().includes(q);
        const propMatch = a.propertyName.toLowerCase().includes(q);
        const unitMatch = a.unitNumber?.toLowerCase().includes(q) || false;
        const tenantMatch = a.tenantName?.toLowerCase().includes(q) || false;
        const vendorMatch = a.vendorName?.toLowerCase().includes(q) || false;
        if (!titleMatch && !numMatch && !reqMatch && !appMatch && !propMatch && !unitMatch && !tenantMatch && !vendorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tabFilteredApprovals, selectedType, selectedPropertyId, selectedPriority, savedView, search, properties]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedType !== 'all' ||
    selectedPropertyId !== 'all' ||
    selectedPriority !== 'all' ||
    savedView !== 'none';

  const resetFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedPropertyId('all');
    setSelectedPriority('all');
    setSavedView('none');
  };

  const typeEntries = Object.entries(APPROVAL_TYPE_REGISTRY) as [ApprovalType, (typeof APPROVAL_TYPE_REGISTRY)[ApprovalType]][];

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden bg-white">
      {/* 1. View Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-200/60 p-1 h-auto flex flex-wrap gap-1">
            <TabsTrigger
              value="pending"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <Clock className="w-3.5 h-3.5" /> Pending ({approvals.filter((a) => a.status === 'pending' || a.status === 'changes_requested').length})
            </TabsTrigger>
            <TabsTrigger
              value="awaiting_me"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" /> Awaiting Me ({approvals.filter((a) => a.status === 'pending' && a.currentApprover.name.toLowerCase().includes(currentUserName.toLowerCase())).length})
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved ({approvals.filter((a) => a.status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected ({approvals.filter((a) => a.status === 'rejected').length})
            </TabsTrigger>
            <TabsTrigger
              value="escalated"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Escalated ({approvals.filter((a) => a.isEscalated || a.status === 'escalated').length})
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs"
            >
              All Requests ({approvals.length})
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-slate-500 font-medium hidden md:inline">
            FishGate Decision Workspace
          </span>
        </div>

        {/* 2. Filters & Search Toolbar */}
        <div className="p-3.5 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search request, requester, space, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50/50"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Approval Types</option>
              {typeEntries.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Property Filter */}
          <div>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical SLA</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Saved Views / Reset */}
          <div className="flex items-center gap-1.5">
            <select
              value={savedView}
              onChange={(e) => setSavedView(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800"
            >
              <option value="none">Saved Views: None</option>
              <option value="high_value">High Value (&gt; 1M RWF)</option>
              <option value="sla_critical">Expiring &lt; 24h SLA</option>
              <option value="commercial_leases">Commercial Leases</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500 hover:text-slate-900 shrink-0 px-2"
                onClick={resetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* 3. Requests List */}
        <div className="p-4">
          {filteredApprovals.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/30">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No approval requests in this view</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No decisions match your active view criteria or search filter.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredApprovals.map((req) => {
                const typeCfg = APPROVAL_TYPE_REGISTRY[req.type] || APPROVAL_TYPE_REGISTRY.custom;
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const priorityCfg = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.medium;
                const TypeIcon = typeCfg.icon;
                const StatusIcon = statusCfg.icon;

                const isPending = req.status === 'pending' || req.status === 'changes_requested';

                return (
                  <Card
                    key={req.id}
                    onClick={() => onSelectApproval(req)}
                    className={`p-3.5 border border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group ${
                      typeCfg.pillClass
                    }`}
                  >
                    {/* Left: Metadata and Request description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded border bg-white ${typeCfg.badgeClass} shrink-0 mt-0.5`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {req.approvalNumber}
                          </span>
                          <Badge className={`text-[9px] uppercase font-bold ${typeCfg.badgeClass}`}>
                            {typeCfg.label}
                          </Badge>
                          <Badge className={`text-[9px] font-semibold ${statusCfg.badgeClass}`}>
                            <StatusIcon className="w-2.5 h-2.5 mr-1" />
                            {statusCfg.label}
                          </Badge>
                          {req.priority === 'critical' && (
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] font-bold">
                              CRITICAL
                            </Badge>
                          )}
                          {isPending && (
                            <span className="font-mono text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {req.slaHoursRemaining}h SLA
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {req.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {req.propertyName} {req.unitNumber ? `• Unit ${req.unitNumber}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Requester: <strong className="text-slate-700 font-medium">{req.requester.name}</strong>
                          </span>
                          <span className="text-slate-400">
                            Approver: <strong className="text-slate-700 font-medium">{req.currentApprover.name}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Financial Amount & Inline Quick Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Impact Outlay
                        </span>
                        <span className="font-mono font-black text-sm text-slate-900 block">
                          {req.amount !== undefined ? `${req.currency} ${req.amount.toLocaleString()}` : 'Policy Review'}
                        </span>
                      </div>

                      {isPending ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove(req.id);
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReject(req.id);
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-600 hover:text-blue-600 gap-1"
                        >
                          Audit Record <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>
    </Card>
  );
}
