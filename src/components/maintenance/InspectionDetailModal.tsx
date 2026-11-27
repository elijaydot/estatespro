// src/components/maintenance/InspectionDetailModal.tsx
// FishGate Design Constitution v1.0 - Section 4.3: Comprehensive Inspection Audit & Findings Modal

import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Building,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  Printer,
  ShieldCheck,
  Camera,
  FileText,
} from 'lucide-react';
import { InspectionRecord, InspectionOutcome, ConditionRating } from './types';
import { openPrintHtml } from '@/lib/pdfService';

interface InspectionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: InspectionRecord | null;
  onGenerateWorkOrderFromIssue?: (inspection: InspectionRecord) => void;
}

export function InspectionDetailModal({
  open,
  onOpenChange,
  inspection,
  onGenerateWorkOrderFromIssue,
}: InspectionDetailModalProps) {
  if (!inspection) return null;

  const getOutcomeBadge = (outcome: InspectionOutcome) => {
    switch (outcome) {
      case 'passed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Passed Cleanly
          </Badge>
        );
      case 'passed_with_recommendations':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Passed (Recommendations)
          </Badge>
        );
      case 'follow_up_required':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Follow-Up Required
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="text-xs font-semibold gap-1">
            <XCircle className="w-3.5 h-3.5" /> Inspection Failed
          </Badge>
        );
    }
  };

  const getConditionBadge = (rating: ConditionRating) => {
    switch (rating) {
      case 'excellent':
        return <Badge className="bg-emerald-600 text-white text-xs">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-emerald-100 text-emerald-800 text-xs">Good</Badge>;
      case 'fair':
        return <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">Fair</Badge>;
      case 'poor':
        return <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs">Poor</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
    }
  };

  const handlePrintInspection = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Inspection Audit Report - ${inspection.reference}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 36px; color: #0f172a; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .ref { font-size: 14px; font-family: monospace; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; font-size: 12px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .box-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .box-val { font-weight: 600; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 700; color: #475569; border-bottom: 1.5px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .notes-box { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; padding-top: 18px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">PROPERTY INSPECTION AUDIT REPORT</h1>
      <div class="ref">${inspection.reference}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Type: ${inspection.type.toUpperCase().replace('_', ' ')} INSPECTION</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      <div><strong>Audit Date:</strong> ${inspection.inspectionDate}</div>
      <div><strong>Inspector:</strong> ${inspection.inspector}</div>
      <div><strong>Score:</strong> ${inspection.conditionScore}% (${inspection.conditionRating.toUpperCase()})</div>
      <div><strong>Outcome:</strong> ${inspection.outcome.toUpperCase().replace(/_/g, ' ')}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-label">Premises & Space Inspected</div>
      <div class="box-val">${inspection.propertyName}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        ${inspection.unitNumber ? `Unit: ${inspection.unitNumber}` : 'Full Facility / Common Grounds'}
      </div>
    </div>
    <div class="box">
      <div class="box-label">Audit Result & Rating</div>
      <div class="box-val">${inspection.conditionScore}% - Condition: ${inspection.conditionRating.toUpperCase()}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Outcome: ${inspection.outcome.replace(/_/g, ' ')}</div>
    </div>
  </div>

  <div class="section-title">Inspection Findings & Deficiencies (${inspection.issuesFound.length} recorded)</div>
  ${
    inspection.issuesFound.length === 0
      ? '<div style="font-size: 12px; color: #16a34a; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">All inspected elements met operational compliance standards. Zero deficiencies identified.</div>'
      : `<table>
          <thead>
            <tr>
              <th>Area / Zone</th>
              <th>Component</th>
              <th>Severity</th>
              <th>Deficiency Description</th>
              <th>Action Required</th>
            </tr>
          </thead>
          <tbody>
            ${inspection.issuesFound
              .map(
                (iss) => `
              <tr>
                <td style="font-weight: 600;">${iss.area}</td>
                <td>${iss.item}</td>
                <td style="font-weight: bold; color: ${iss.severity === 'critical' ? '#dc2626' : iss.severity === 'major' ? '#ea580c' : '#475569'};">${iss.severity.toUpperCase()}</td>
                <td>${iss.description}</td>
                <td>${iss.requiresWorkOrder ? 'Remediation Work Order' : 'Routine Monitoring'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>`
  }

  <div class="section-title">Inspector Remarks & Compliance Notes</div>
  <div class="notes-box">
    ${inspection.notes || inspection.recommendations || 'Inspection completed according to FishGate physical asset verification protocol. All observed variances have been logged in the digital operational registry.'}
  </div>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Inspector: ${inspection.inspector}</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Property Manager / Facility Directorate</div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `Inspection-${inspection.reference}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50">
                {inspection.reference}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {inspection.type.replace('_', ' ')}
              </Badge>
              {getOutcomeBadge(inspection.outcome)}
            </div>
            <span className="text-[10px] text-slate-400">
              {format(new Date(inspection.inspectionDate), 'MMM d, yyyy')}
            </span>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">
            Inspection Audit Report
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {inspection.propertyName} {inspection.unitNumber ? `• Unit ${inspection.unitNumber}` : '• Common Area / Facility'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Key KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Condition Score</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-slate-900">{inspection.conditionScore}%</span>
                {getConditionBadge(inspection.conditionRating)}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Lead Auditor</span>
              <div className="font-bold text-slate-900 text-sm mt-1 truncate">
                {inspection.inspector}
              </div>
              <span className="text-[10px] text-slate-500">Quality & Safety Authority</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Actionable Findings</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-slate-900">{inspection.issuesFound.length}</span>
                <span className="text-slate-500 text-[11px]">logged issues</span>
              </div>
            </div>
          </div>

          {/* Findings & Deficiencies Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Itemized Findings & Observations</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {inspection.issuesFound.length} item(s) inspected
              </span>
            </div>

            {inspection.issuesFound.length === 0 ? (
              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All physical systems and spaces in this inspection met standards without recorded defects.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {inspection.issuesFound.map((iss, idx) => (
                  <div
                    key={iss.id || idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{iss.area}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-medium text-slate-700">{iss.item}</span>
                      </div>
                      <Badge
                        variant={iss.severity === 'critical' ? 'destructive' : 'outline'}
                        className={`text-[9px] uppercase font-bold ${
                          iss.severity === 'critical'
                            ? ''
                            : iss.severity === 'major'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {iss.severity}
                      </Badge>
                    </div>

                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">{iss.description}</p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-500">
                        {iss.requiresWorkOrder ? 'Remediation Required' : 'Informational observation'}
                      </span>
                      {iss.requiresWorkOrder && onGenerateWorkOrderFromIssue && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                          onClick={() => {
                            onGenerateWorkOrderFromIssue(inspection);
                            onOpenChange(false);
                          }}
                        >
                          <Wrench className="w-2.5 h-2.5" /> Convert to Work Order
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspector Remarks Box */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
            <span className="font-bold text-slate-900 block text-xs">Inspector Notes & Recommendations</span>
            <p className="text-slate-600 leading-relaxed">
              {inspection.notes ||
                inspection.recommendations ||
                'Inspection completed according to FishGate physical asset verification protocol. All observed variances have been logged in the digital operational registry.'}
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 text-slate-700"
            onClick={handlePrintInspection}
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Audit Sheet
          </Button>

          <div className="flex items-center gap-2 justify-end">
            {inspection.issuesFound.some((iss) => iss.requiresWorkOrder) && onGenerateWorkOrderFromIssue && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
                onClick={() => {
                  onGenerateWorkOrderFromIssue(inspection);
                  onOpenChange(false);
                }}
              >
                <Wrench className="w-3.5 h-3.5" /> Create Remediation Work Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
