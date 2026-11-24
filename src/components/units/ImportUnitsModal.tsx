// src/components/units/ImportUnitsModal.tsx
// Batch Unit Importer with CSV Template support

import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useCreateUnit } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';

interface ImportUnitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportUnitsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportUnitsModalProps) {
  const { data: properties = [] } = useProperties();
  const createUnit = useCreateUnit();

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Download Sample CSV template
  const handleDownloadTemplate = () => {
    const defaultProp = properties[0]?.id || 'PROPERTY_UUID_HERE';
    const csvContent =
      'property_id,unit_number,floor,bedrooms,bathrooms,rent_amount,status,unit_type,floor_area_sqm\n' +
      `${defaultProp},Unit 101,1,2,2,650000,available,2 Bedroom Apartment,85\n` +
      `${defaultProp},Unit 102,1,1,1,450000,available,1 Bedroom Apartment,55\n` +
      `${defaultProp},Unit 201,2,3,2,950000,occupied,3 Bedroom Apartment,120\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fishgate_units_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Template Downloaded', description: 'Sample CSV template downloaded.' });
  };

  // Parse CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast({ title: 'Empty CSV', description: 'The CSV must contain headers and at least 1 record.', variant: 'destructive' });
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        parsed.push(row);
      }

      setPreviewRows(parsed);
    };
    reader.readAsText(selected);
  };

  // Execute Import
  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setIsProcessing(true);

    let successCount = 0;
    let failCount = 0;

    for (const row of previewRows) {
      try {
        const propId = row.property_id || properties[0]?.id;
        if (!propId || !row.unit_number) {
          failCount++;
          continue;
        }

        await createUnit.mutateAsync({
          property_id: propId,
          unit_number: row.unit_number,
          floor: parseInt(row.floor) || 1,
          bedrooms: parseInt(row.bedrooms) || 1,
          bathrooms: parseInt(row.bathrooms) || 1,
          rent_amount: parseFloat(row.rent_amount) || 0,
          status: row.status || 'available',
          sqft: row.floor_area_sqm ? Math.round(parseFloat(row.floor_area_sqm) * 10.764) : 0,
          unit_type: row.unit_type || '2 Bedroom Apartment',
          floor_area_sqm: parseFloat(row.floor_area_sqm) || 0,
          description: null,
          image_url: null,
          image_urls: [],
          amenities: [],
        } as any);

        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setIsProcessing(false);
    toast({
      title: 'Import Complete',
      description: `Successfully imported ${successCount} unit(s). ${failCount > 0 ? `${failCount} failed.` : ''}`,
    });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Import Units via CSV</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Bulk upload unit records, rental prices, and operational attributes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Template Banner */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-foreground">Need standard formatting?</p>
              <p className="text-[11px] text-muted-foreground">Download the pre-formatted CSV template with sample units.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs h-8 shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </Button>
          </div>

          {/* Upload Area */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select CSV File</Label>
            <div className="border border-dashed border-border/80 rounded-xl p-6 text-center hover:bg-muted/20 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="units-csv-file"
              />
              <label
                htmlFor="units-csv-file"
                className="cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                Click to browse CSV file
              </label>
              <p className="text-[11px] text-muted-foreground mt-1">UTF-8 comma-delimited (.csv) files up to 5MB</p>
              {file && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{file.name} ({previewRows.length} rows parsed)</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">Preview ({previewRows.length} units to import)</span>
              <div className="max-h-40 overflow-y-auto divide-y rounded-lg border border-border/70 text-xs bg-card">
                {previewRows.slice(0, 5).map((row, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold">{row.unit_number}</span>
                      <span className="text-muted-foreground ml-2">({row.unit_type || '2 Bed'}, Floor {row.floor || 1})</span>
                    </div>
                    <span className="font-semibold text-primary">{row.rent_amount} RWF</span>
                  </div>
                ))}
                {previewRows.length > 5 && (
                  <div className="p-2 text-center text-[11px] text-muted-foreground bg-muted/20">
                    + {previewRows.length - 5} more records ready for import
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={previewRows.length === 0 || isProcessing}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing Units...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Import {previewRows.length} Units</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
