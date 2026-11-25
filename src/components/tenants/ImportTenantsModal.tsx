// src/components/tenants/ImportTenantsModal.tsx
// FishGate Design Constitution v1.0 - Batch Resident CSV Importer

import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCreateTenant, type Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ImportTenantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedTenantRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  property_name: string;
  unit_number: string;
  monthly_rent: number;
  move_in_date: string;
  lease_end_date: string;
  national_id: string;
  status: 'valid' | 'warning' | 'invalid';
  validationMessage?: string;
}

export function ImportTenantsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportTenantsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedTenantRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const createTenant = useCreateTenant();
  const { data: properties = [] } = useProperties();
  const { data: allUnits = [] } = useUnits();

  const handleDownloadTemplate = () => {
    const csvHeader = 'First Name,Last Name,Email,Phone,Property Name,Unit Number,Monthly Rent,Move-In Date,Lease End Date,National ID\n';
    const sampleRow = 'Jean,Mugabo,jean.m@example.com,+250788123456,Kigali Heights,A-101,450000,2025-01-01,2025-12-31,1199080012345012\n';
    const blob = new Blob([csvHeader + sampleRow], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'FishGate_Resident_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toast({ title: 'Empty file', description: 'No data rows found in CSV', variant: 'destructive' });
        return;
      }

      // Parse data rows
      const rows: ParsedTenantRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 4) continue;

        const firstName = parts[0] || '';
        const lastName = parts[1] || '';
        const email = parts[2] || '';
        const phone = parts[3] || '';
        const propName = parts[4] || '';
        const unitNum = parts[5] || '';
        const rent = Number(parts[6]) || 0;
        const moveIn = parts[7] || '';
        const leaseEnd = parts[8] || '';
        const nationalId = parts[9] || '';

        let status: 'valid' | 'warning' | 'invalid' = 'valid';
        let validationMessage = 'Ready for import';

        if (!firstName && !lastName) {
          status = 'invalid';
          validationMessage = 'Missing name';
        } else if (!phone && !email) {
          status = 'warning';
          validationMessage = 'Missing contact info';
        }

        rows.push({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          property_name: propName,
          unit_number: unitNum,
          monthly_rent: rent,
          move_in_date: moveIn,
          lease_end_date: leaseEnd,
          national_id: nationalId,
          status,
          validationMessage,
        });
      }

      setParsedRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleRunImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== 'invalid');
    if (validRows.length === 0) {
      toast({ title: 'No valid rows', description: 'Fix row errors before importing', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    for (const row of validRows) {
      try {
        // Resolve property and unit if matching by name/number
        const matchedProp = properties.find(
          (p) => p.name.toLowerCase() === row.property_name.toLowerCase()
        );
        const matchedUnit = allUnits.find(
          (u) =>
            u.unit_number.toLowerCase() === row.unit_number.toLowerCase() &&
            (!matchedProp || u.property_id === matchedProp.id)
        );

        await createTenant.mutateAsync({
          first_name: row.first_name,
          last_name: row.last_name,
          name: `${row.first_name} ${row.last_name}`.trim(),
          email: row.email,
          phone: row.phone,
          national_id: row.national_id,
          property_id: matchedProp?.id || null,
          unit_id: matchedUnit?.id || null,
          monthly_rent: row.monthly_rent || matchedUnit?.rent_amount || 0,
          move_in_date: row.move_in_date || null,
          lease_end_date: row.lease_end_date || null,
          status: 'active',
        });
        successCount++;
      } catch (err) {
        console.error('Import row failure:', err);
      }
    }

    setIsImporting(false);
    toast({
      title: 'Import completed',
      description: `Successfully onboarded ${successCount} of ${validRows.length} residents.`,
    });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <span>Batch Import Residents</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Import existing residents from CSV template. Unassigned residents can be linked to units later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template helper banner */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Need the standard CSV template format?</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="gap-1.5 h-8 text-xs border-blue-500/30"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </Button>
          </div>

          {/* File input */}
          <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
            <div className="text-xs">
              <label htmlFor="tenant-csv-upload" className="font-bold text-primary cursor-pointer hover:underline">
                Click to upload CSV
              </label>
              <span className="text-muted-foreground"> or drag and drop</span>
            </div>
            <input
              id="tenant-csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {file && (
              <p className="text-xs text-foreground font-semibold">
                Selected: {file.name} ({parsedRows.length} records parsed)
              </p>
            )}
          </div>

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Previewing {parsedRows.length} records:</span>
                <span>
                  {parsedRows.filter((r) => r.status === 'valid').length} valid,{' '}
                  {parsedRows.filter((r) => r.status !== 'valid').length} flagged
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border/80 divide-y divide-border/60 text-xs">
                {parsedRows.slice(0, 10).map((r, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-muted/15">
                    <div>
                      <span className="font-bold text-foreground">
                        {r.first_name} {r.last_name}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        • {r.phone || r.email || 'No contact'}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        • Unit {r.unit_number || 'Unassigned'}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        'text-[10px] px-1.5 py-0.5',
                        r.status === 'valid'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : r.status === 'warning'
                          ? 'bg-amber-500/15 text-amber-600'
                          : 'bg-rose-500/15 text-rose-600'
                      )}
                    >
                      {r.validationMessage}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRunImport}
              disabled={isImporting || parsedRows.length === 0}
              className="text-xs h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import {parsedRows.length} Residents</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
