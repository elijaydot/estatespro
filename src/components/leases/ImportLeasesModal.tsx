// src/components/leases/ImportLeasesModal.tsx
// FishGate Design Constitution v1.0 - Batch Lease Agreement CSV Importer

import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
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
import { useCreateLease, generateLeaseNumber } from '@/hooks/useLeases';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface ImportLeasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedLeaseRow {
  lease_number: string;
  property_name: string;
  unit_number: string;
  tenant_email: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  lease_type: string;
  status: string;
  validationError?: string;
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
}

export function ImportLeasesModal({ open, onOpenChange, onSuccess }: ImportLeasesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeaseRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const createLease = useCreateLease();

  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'lease_number,property_name,unit_number,tenant_email,start_date,end_date,monthly_rent,security_deposit,lease_type\n' +
      'LS-2026-1001,Kigali Heights,Unit 101,resident1@email.com,2026-01-01,2026-12-31,450000,450000,residential\n' +
      'LS-2026-1002,Kigali Heights,Unit 102,resident2@email.com,2026-02-01,2027-01-31,500000,500000,residential\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'fishgate-lease-import-template.csv');
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
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      toast({ title: 'Invalid File', description: 'CSV file contains no data rows.', variant: 'destructive' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: ParsedLeaseRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 5) continue;

      const rowMap: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowMap[h] = cols[idx] || '';
      });

      const leaseNum = rowMap.lease_number || generateLeaseNumber();
      const propName = rowMap.property_name || '';
      const unitNum = rowMap.unit_number || '';
      const tenantEmail = rowMap.tenant_email || '';
      const startDate = rowMap.start_date || '';
      const endDate = rowMap.end_date || '';
      const monthlyRent = parseFloat(rowMap.monthly_rent) || 0;
      const securityDeposit = parseFloat(rowMap.security_deposit) || monthlyRent;
      const leaseType = rowMap.lease_type || 'residential';

      // Match property
      const matchedProp = properties.find(
        (p) => p.name.toLowerCase() === propName.toLowerCase()
      );

      // Match unit
      const matchedUnit = units.find(
        (u) =>
          u.unit_number.toLowerCase() === unitNum.toLowerCase() ||
          u.unit_number.toLowerCase() === `unit ${unitNum}`.toLowerCase()
      );

      // Match tenant
      const matchedTenant = tenants.find(
        (t) => t.email?.toLowerCase() === tenantEmail.toLowerCase()
      );

      let validationError: string | undefined;
      if (!startDate || !endDate) {
        validationError = 'Start and End dates are required';
      } else if (!monthlyRent || monthlyRent <= 0) {
        validationError = 'Valid monthly rent amount required';
      } else if (!matchedProp && propName) {
        validationError = `Property "${propName}" not found in system`;
      } else if (!matchedTenant && tenantEmail) {
        validationError = `Tenant "${tenantEmail}" not found in system`;
      }

      rows.push({
        lease_number: leaseNum,
        property_name: propName,
        unit_number: unitNum,
        tenant_email: tenantEmail,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: monthlyRent,
        security_deposit: securityDeposit,
        lease_type: leaseType,
        status: 'active',
        validationError,
        property_id: matchedProp?.id || properties[0]?.id || '',
        unit_id: matchedUnit?.id || units[0]?.id || '',
        tenant_id: matchedTenant?.id || tenants[0]?.id || '',
      });
    }

    setParsedRows(rows);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => !r.validationError);
    if (validRows.length === 0) {
      toast({ title: 'No valid rows', description: 'Fix row errors before importing.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createLease.mutateAsync({
          lease_number: row.lease_number,
          property_id: row.property_id || properties[0]?.id || '',
          unit_id: row.unit_id || units[0]?.id || '',
          tenant_id: row.tenant_id || tenants[0]?.id || '',
          start_date: row.start_date,
          end_date: row.end_date,
          monthly_rent: row.monthly_rent,
          security_deposit: row.security_deposit,
          lease_type: row.lease_type,
          status: 'active',
          renewal_status: 'not_started',
        });
        successCount++;
        setImportProgress({ current: i + 1, total: validRows.length });
      } catch (err) {
        console.error('Failed row import:', row.lease_number, err);
      }
    }

    setIsImporting(false);
    toast({
      title: 'Import Completed',
      description: `Successfully imported ${successCount} of ${validRows.length} lease agreements.`,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  const validCount = parsedRows.filter((r) => !r.validationError).length;
  const errorCount = parsedRows.filter((r) => r.validationError).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Batch Import Lease Agreements
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bulk onboard historical or existing agreements via CSV roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action Ribbon: Template & File Upload */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div className="text-xs">
                <span className="font-semibold block text-foreground">CSV Template</span>
                <span className="text-muted-foreground text-[11px]">Download formatted standard schema</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={handleDownloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Template
            </Button>
          </div>

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/20 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">Select Lease Roster CSV File</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">UTF-8 formatted CSV files only</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-3 text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>

          {/* Row Validation Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Parsed Records ({parsedRows.length} total)
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 text-[10px]">
                    {validCount} Ready
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {errorCount} Errors
                    </Badge>
                  )}
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs">
                {parsedRows.map((r, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.lease_number}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.property_name} • Unit {r.unit_number} • {r.tenant_email}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {r.validationError ? (
                        <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {r.validationError}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Validated
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Progress Bar */}
          {isImporting && (
            <div className="p-3 bg-muted/40 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Importing Leases...
                </span>
                <span className="font-mono text-muted-foreground">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-200"
                  style={{
                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={validCount === 0 || isImporting}
            onClick={handleExecuteImport}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import {validCount} Valid Agreements
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
