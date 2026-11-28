// src/components/analytics/AnalyticsDetailedAnalysis.tsx
// FishGate Design Constitution v1.0 - Section 6: Detailed Analysis (Interactive Exploration)
// Support: Filters, Comparison Views, Date Ranges, Property Selection, Saved Views, Export, Pagination

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building,
  Filter,
  Calendar,
  Download,
  Bookmark,
  GitCompare,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { PropertyComparisonRow } from './types';
import { AnalyticsComparisonModal } from './AnalyticsComparisonModal';

interface AnalyticsDetailedAnalysisProps {
  onOpenComparisonModal?: () => void;
}

export function AnalyticsDetailedAnalysis({
  onOpenComparisonModal,
}: AnalyticsDetailedAnalysisProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [savedView, setSavedView] = useState<string>('default');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const propertyData: PropertyComparisonRow[] = [
    {
      propertyId: 'prop-1',
      propertyName: 'Riverside Luxury Suites',
      unitCount: 14,
      occupancyRate: 100,
      monthlyRevenue: 14800000,
      collectionRate: 100,
      opexRatio: 12.5,
      avgSlaDays: 1.4,
      healthScore: 96,
    },
    {
      propertyId: 'prop-2',
      propertyName: 'Kigali Heights Residences',
      unitCount: 20,
      occupancyRate: 95,
      monthlyRevenue: 11200000,
      collectionRate: 99.1,
      opexRatio: 19.6,
      avgSlaDays: 1.8,
      healthScore: 92,
    },
    {
      propertyId: 'prop-3',
      propertyName: 'Vision City Commercial & Residential',
      unitCount: 14,
      occupancyRate: 85.7,
      monthlyRevenue: 5500000,
      collectionRate: 99.1,
      opexRatio: 17.3,
      avgSlaDays: 2.1,
      healthScore: 88,
    },
  ];

  const filteredProperties = propertyData.filter((p) => {
    const matchesProp = selectedProperty === 'all' || p.propertyId === selectedProperty;
    const matchesSearch = searchQuery === '' || p.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProp && matchesSearch;
  });

  const handleExport = () => {
    const exportData = filteredProperties.map((p) => ({
      Property: p.propertyName,
      Units: p.unitCount,
      'Occupancy Rate (%)': p.occupancyRate,
      'Monthly Revenue (RWF)': p.monthlyRevenue,
      'Collection Rate (%)': p.collectionRate,
      'OPEX Ratio (%)': p.opexRatio,
      'Avg SLA Days': p.avgSlaDays,
      'Health Score': p.healthScore,
    }));
    downloadCsv(exportData, `FishGate_Analytics_Detailed_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Detailed Analysis Exported',
      description: 'Downloaded comprehensive property comparison matrix CSV.',
    });
  };

  const handleOpenComparison = () => {
    if (onOpenComparisonModal) {
      onOpenComparisonModal();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Detailed Analysis (Interactive Exploration)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Multivariate drilldown, asset benchmarking matrix, and performance filters.
          </p>
        </div>

        {/* View mode toggle & comparison launch */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
            onClick={handleOpenComparison}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Side-by-Side View</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1 text-slate-600 border-slate-200"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-3 border-slate-200 bg-slate-50/70 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Property Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Property Asset
            </label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties (3 Assets)</SelectItem>
                <SelectItem value="prop-1">Riverside Luxury Suites</SelectItem>
                <SelectItem value="prop-2">Kigali Heights Residences</SelectItem>
                <SelectItem value="prop-3">Vision City Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Date Horizon
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 Days (November 2026)</SelectItem>
                <SelectItem value="q4">Q4 2026 Quarter-to-Date</SelectItem>
                <SelectItem value="ytd">Year-to-Date (2026)</SelectItem>
                <SelectItem value="12m">Rolling 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Saved Views */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Saved Perspective View
            </label>
            <Select value={savedView} onValueChange={setSavedView}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Saved Views" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Comparison Matrix</SelectItem>
                <SelectItem value="financial">Financial Yield & OPEX Focus</SelectItem>
                <SelectItem value="operational">Operational SLA & Turnaround</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Search Matrix
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Filter by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-white border-slate-200"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* MATRIX TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Property Asset</th>
                <th className="py-2.5 px-3 font-mono">Units</th>
                <th className="py-2.5 px-3">Occupancy Rate</th>
                <th className="py-2.5 px-3">Monthly Revenue</th>
                <th className="py-2.5 px-3">Collection %</th>
                <th className="py-2.5 px-3">OPEX Ratio</th>
                <th className="py-2.5 px-3">Avg SLA</th>
                <th className="py-2.5 px-3 text-right">Health Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProperties.map((p) => (
                <tr key={p.propertyId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{p.propertyName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{p.unitCount}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{p.occupancyRate}%</span>
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${p.occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    RWF {(p.monthlyRevenue / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                    {p.collectionRate}%
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {p.opexRatio}%
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-800">
                    {p.avgSlaDays} days
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className={`font-mono text-[10px] font-bold ${
                      p.healthScore >= 95
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {p.healthScore}/100
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
          <span>Showing 1 to {filteredProperties.length} of {filteredProperties.length} records</span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Page 1 of 1</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Comparison Modal */}
      <AnalyticsComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        properties={propertyData}
      />
    </div>
  );
}
