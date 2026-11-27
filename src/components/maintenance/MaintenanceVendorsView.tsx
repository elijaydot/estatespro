// src/components/maintenance/MaintenanceVendorsView.tsx
// FishGate Design Constitution v1.0 - Section 4.4: Contractor & Vendor Operational Performance

import { useState, useMemo } from 'react';
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
  Building,
  ShieldCheck,
  Star,
  Clock,
  Phone,
  Mail,
  Flame,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { VendorOperationalProfile } from './types';

interface MaintenanceVendorsViewProps {
  vendors: VendorOperationalProfile[];
  currency?: string;
  onSelectVendor: (vendor: VendorOperationalProfile) => void;
  onDispatchWorkOrder: (vendor: VendorOperationalProfile) => void;
}

export function MaintenanceVendorsView({
  vendors,
  currency = 'RWF',
  onSelectVendor,
  onDispatchWorkOrder,
}: MaintenanceVendorsViewProps) {
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const trades = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.tradeCategory));
    return Array.from(set);
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (tradeFilter !== 'all' && v.tradeCategory !== tradeFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = v.name.toLowerCase().includes(q);
        const contactMatch = v.contactPerson.toLowerCase().includes(q);
        const tradeMatch = v.tradeCategory.toLowerCase().includes(q);

        if (!nameMatch && !contactMatch && !tradeMatch) return false;
      }

      return true;
    });
  }, [vendors, tradeFilter, search]);

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search contractors by company name, contact, trade..."
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
            value={tradeFilter}
            onChange={(e) => {
              setTradeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <option value="all">All Trade Specializations</option>
            {trades.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {search || tradeFilter !== 'all' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSearch('');
                setTradeFilter('all');
                setPage(1);
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Contractor Partner</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Trade Category</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Contact Person</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-center">Active Work Orders</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Avg Response</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Completion Rate</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">YTD Invoiced</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Rating & SLA</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400">
                  <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No vendor partners found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedVendors.map((v) => (
                <TableRow
                  key={v.id}
                  className="text-xs hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectVendor(v)}
                >
                  <TableCell className="max-w-[200px]">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {v.emergencyService && (
                        <Badge variant="outline" className="text-[9px] bg-red-50 text-red-700 border-red-200 gap-0.5 px-1 py-0 font-bold">
                          <Flame className="w-2.5 h-2.5" /> 24/7 Emergency
                        </Badge>
                      )}
                      {v.insuranceValid && (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Insured
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="font-medium text-slate-800">{v.tradeCategory}</TableCell>

                  <TableCell>
                    <div className="font-semibold text-slate-900">{v.contactPerson}</div>
                    <div className="text-[10px] text-slate-500">{v.phone}</div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50 text-slate-900">
                      {v.activeWorkOrders} active
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-700 font-medium whitespace-nowrap">
                    {v.responseTimeHours}h target SLA
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>{v.completionRate}%</span>
                      {v.completionRate >= 95 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {currency} {v.costYtd.toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-900">{v.rating.toFixed(1)}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                        onClick={() => onDispatchWorkOrder(v)}
                      >
                        <Wrench className="w-3 h-3" /> Dispatch
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem onClick={() => onSelectVendor(v)}>
                            View Vendor Profile
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
          total={filteredVendors.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
