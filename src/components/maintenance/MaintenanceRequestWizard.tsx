// src/components/maintenance/MaintenanceRequestWizard.tsx
// FishGate Design Constitution v1.0 - 7-Step Operational Maintenance Request Creation Wizard

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Wrench,
  Flame,
  ShieldAlert,
  Paperclip,
  Trash2,
  DollarSign,
  Plus,
} from 'lucide-react';
import {
  MaintenanceRequestRecord,
  MaintenancePriority,
  MaintenanceMedia,
} from './types';
import { Property } from '@/hooks/useProperties';
import { Tenant } from '@/hooks/useTenants';
import { Vendor } from '@/hooks/useVendors';

interface MaintenanceRequestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  tenants: Tenant[];
  vendors: Vendor[];
  onCreateRequest: (request: MaintenanceRequestRecord) => void;
  currency?: string;
}

export function MaintenanceRequestWizard({
  open,
  onOpenChange,
  properties,
  tenants,
  vendors,
  onCreateRequest,
  currency = 'RWF',
}: MaintenanceRequestWizardProps) {
  const [step, setStep] = useState(1);

  // STEP 1: Issue Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [subcategory, setSubcategory] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [areaAffected, setAreaAffected] = useState('Bathroom');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [issueSource, setIssueSource] = useState<'resident' | 'staff' | 'inspection' | 'vendor' | 'sensor'>('resident');

  // STEP 2: Reporter Information
  const [reporterRole, setReporterRole] = useState<'resident' | 'staff' | 'vendor' | 'anonymous'>('resident');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email' | 'in_app'>('phone');

  // STEP 3: Impact Assessment
  const [occupancyImpact, setOccupancyImpact] = useState(false);
  const [revenueImpact, setRevenueImpact] = useState(false);
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [residentImpact, setResidentImpact] = useState<'single' | 'multiple' | 'building'>('single');
  const [urgency, setUrgency] = useState<'immediate' | 'within_24h' | 'scheduled'>('within_24h');
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor'>('minor');

  // STEP 4: Media & Attachments
  const [mediaName, setMediaName] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document'>('photo');
  const [mediaItems, setMediaItems] = useState<MaintenanceMedia[]>([]);

  // STEP 5: Assignment
  const [assignedTeam, setAssignedTeam] = useState('Plumbing & HVAC Team');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10));
  const [slaHours, setSlaHours] = useState(24);

  // STEP 6: Financial Information
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [budgetCategory, setBudgetCategory] = useState('Operational Maintenance');
  const [costCenter, setCostCenter] = useState('Facility Operations');
  const [approvalRequired, setApprovalRequired] = useState(false);

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setCategory('Plumbing');
    setSubcategory('');
    setPropertyId(properties[0]?.id || '');
    setBuilding('');
    setFloor('');
    setUnitNumber('');
    setPriority('medium');
    setMediaItems([]);
    setEstimatedCost(0);
  };

  const handleAddMedia = () => {
    if (!mediaName.trim()) {
      toast({ title: 'Label Required', description: 'Please name the photo or document.', variant: 'destructive' });
      return;
    }
    const item: MaintenanceMedia = {
      id: `media-${Date.now()}`,
      name: mediaName.trim(),
      type: mediaType,
      url: '',
      size: '1.8 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setMediaItems((prev) => [...prev, item]);
    setMediaName('');
  };

  const validateStep = (s: number) => {
    if (s === 1) {
      if (!title.trim()) {
        toast({ title: 'Title Required', description: 'Please provide a title for the issue.', variant: 'destructive' });
        return false;
      }
      if (!description.trim()) {
        toast({ title: 'Description Required', description: 'Please describe the problem.', variant: 'destructive' });
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!reporterName.trim() && !selectedTenantId) {
        toast({ title: 'Reporter Required', description: 'Please specify who reported the problem.', variant: 'destructive' });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((p) => p + 1);
    }
  };

  const handleBack = () => {
    setStep((p) => Math.max(1, p - 1));
  };

  const handleFinalSubmit = () => {
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    const ten = tenants.find((t) => t.id === selectedTenantId);
    const ven = vendors.find((v) => v.id === selectedVendorId);

    const ref = `REQ-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newReq: MaintenanceRequestRecord = {
      id: `req-${Date.now()}`,
      reference: ref,
      title: title.trim(),
      description: description.trim(),
      category,
      subcategory: subcategory.trim() || undefined,
      propertyId: prop?.id || 'prop-1',
      propertyName: prop?.name || 'Vision City Commercial & Residential Hub',
      building: building.trim() || undefined,
      floor: floor.trim() || undefined,
      unitNumber: unitNumber.trim() || null,
      areaAffected: areaAffected || undefined,
      priority,
      issueSource,
      status: 'reported',
      reportedBy: {
        name: ten ? ten.name : reporterName.trim() || 'Resident',
        email: ten ? ten.email : reporterEmail.trim() || undefined,
        phone: ten ? ten.phone : reporterPhone.trim() || undefined,
        role: reporterRole,
        preferredContact,
      },
      impact: {
        occupancyImpact,
        revenueImpact,
        safetyRisk,
        residentImpact,
        urgency,
        severity,
      },
      media: mediaItems,
      assignment: {
        assignedTo: assignedTechnician || undefined,
        assignedTeam,
        vendorId: ven?.id || undefined,
        vendorName: ven?.name || undefined,
        dueDate,
        slaHours,
      },
      financials: {
        estimatedCost,
        budgetCategory,
        costCenter,
        approvalRequired,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateRequest(newReq);
    onOpenChange(false);
    resetForm();
    toast({
      title: 'Maintenance Request Lodged',
      description: `${ref} booked into physical operations pipeline with ${priority} priority.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono text-blue-700 bg-blue-50">
              Step {step} of 7
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Physical Operations Intake</span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1">
            {step === 1 && 'Step 1: Issue Details & Premises Location'}
            {step === 2 && 'Step 2: Reporter & Contact Information'}
            {step === 3 && 'Step 3: Operational Impact & Risk Assessment'}
            {step === 4 && 'Step 4: Photos, Videos & Visual Evidence'}
            {step === 5 && 'Step 5: Resource Assignment & SLA Target'}
            {step === 6 && 'Step 6: Financial Estimation & Cost Center'}
            {step === 7 && 'Step 7: Final Review & Submission'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === 1 && 'Define the nature of the physical fault and exact unit/area affected.'}
            {step === 2 && 'Record who reported the problem and preferred contact mechanism.'}
            {step === 3 && 'Evaluate risks to tenant life-safety, occupancy and statutory compliance.'}
            {step === 4 && 'Attach photos, diagnostic videos or technician notes.'}
            {step === 5 && 'Assign to in-house technicians or external vendor partner.'}
            {step === 6 && 'Set financial budgets, material quotes and approval gates.'}
            {step === 7 && 'Review all details before committing to the live maintenance queue.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden my-1">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Issue Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master bathroom water heater leaking onto parquet floor"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Trade Category *</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="Plumbing">Plumbing & Water Systems</option>
                  <option value="Electrical">Electrical & Power</option>
                  <option value="HVAC">HVAC & Climate Control</option>
                  <option value="Elevator">Elevator & Lift Systems</option>
                  <option value="Structural">Structural & Masonry</option>
                  <option value="Security">Security, CCTV & Access</option>
                  <option value="Appliances">Kitchen Appliances</option>
                  <option value="Cleaning">Sanitation & Waste</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Priority Level *</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="emergency">Emergency (4-hour SLA)</option>
                  <option value="high">High Priority (12-hour SLA)</option>
                  <option value="medium">Medium (24-hour SLA)</option>
                  <option value="low">Low / Scheduled (72-hour SLA)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Property *</Label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Unit Number</Label>
                <Input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. Unit C-301"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Specific Area</Label>
                <Input
                  value={areaAffected}
                  onChange={(e) => setAreaAffected(e.target.value)}
                  placeholder="e.g. Master Bathroom, Kitchen"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Detailed Description & Symptoms *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what is broken, visible water or sparks, when it started..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Who is reporting the fault?</Label>
              <div className="flex items-center gap-4">
                {(['resident', 'staff', 'vendor', 'anonymous'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-1.5 cursor-pointer capitalize font-medium text-slate-700">
                    <input
                      type="radio"
                      name="reporterRole"
                      checked={reporterRole === r}
                      onChange={() => setReporterRole(r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {reporterRole === 'resident' && (
              <div>
                <Label className="text-xs font-semibold">Select Resident / Tenant</Label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setSelectedTenantId(tId);
                    const ten = tenants.find((t) => t.id === tId);
                    if (ten) {
                      setReporterName(ten.name);
                      setReporterEmail(ten.email || '');
                      setReporterPhone(ten.phone || '');
                    }
                  }}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="">Select Resident</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Reporter Name</Label>
                <Input
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Full name"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="+250 788 ..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Preferred Communication Method</Label>
              <select
                value={preferredContact}
                onChange={(e) => setPreferredContact(e.target.value as any)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="phone">Direct Phone Call / WhatsApp</option>
                <option value="email">Email Notification</option>
                <option value="in_app">Resident Portal Message</option>
              </select>
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-semibold">Operational Risk & Impact Matrix</Label>
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/60">
              <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Occupancy Threat</span>
                  <span className="text-[11px] text-slate-500">Could cause tenant to vacate or delay move-in</span>
                </div>
                <input
                  type="checkbox"
                  checked={occupancyImpact}
                  onChange={(e) => setOccupancyImpact(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Revenue / Financial Risk</span>
                  <span className="text-[11px] text-slate-500">Directly impacts rent realization or incurs statutory penalties</span>
                </div>
                <input
                  type="checkbox"
                  checked={revenueImpact}
                  onChange={(e) => setRevenueImpact(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Life-Safety Hazard</span>
                  <span className="text-[11px] text-slate-500">Exposed electrical wiring, gas leak, or fire hazard</span>
                </div>
                <input
                  type="checkbox"
                  checked={safetyRisk}
                  onChange={(e) => setSafetyRisk(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Resident Impact Scope</Label>
                <select
                  value={residentImpact}
                  onChange={(e) => setResidentImpact(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="single">Single Unit Resident</option>
                  <option value="multiple">Multiple Units Affected</option>
                  <option value="building">Entire Building / Community</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Fault Severity</Label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="minor">Minor Wear & Tear</option>
                  <option value="major">Major Asset Degradation</option>
                  <option value="critical">Critical System Failure</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-semibold">Visual Evidence & Documents</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Attachment title (e.g. Leak photo)..."
                value={mediaName}
                onChange={(e) => setMediaName(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
              >
                <option value="photo">Damage Photo</option>
                <option value="video">Diagnostic Video</option>
                <option value="document">Contractor Report / Quote</option>
              </select>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAddMedia}>
                <Plus className="w-3.5 h-3.5" /> Attach
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {mediaItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No visual evidence attached. You can continue or attach photos above.
                </div>
              ) : (
                mediaItems.map((m) => (
                  <div key={m.id} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{m.name}</span>
                      <span className="text-[10px] text-slate-400">({m.type} • {m.size})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:bg-red-50"
                      onClick={() => setMediaItems((prev) => prev.filter((i) => i.id !== m.id))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 5 ================= */}
        {step === 5 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Assign Contractor / Vendor Partner</Label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="">In-House Operations Crew</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Assigned Technician</Label>
                <Input
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  placeholder="e.g. Eric Habimana (Lead Plumber)"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">SLA Target Turnaround</Label>
                <select
                  value={slaHours}
                  onChange={(e) => setSlaHours(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value={4}>4 Hours (Emergency Critical)</option>
                  <option value={12}>12 Hours (High Priority)</option>
                  <option value={24}>24 Hours (Standard Operational)</option>
                  <option value={72}>72 Hours (Routine Minor)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Target Completion Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 6 ================= */}
        {step === 6 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Estimated Cost ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  value={estimatedCost || ''}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  placeholder="e.g. 180000"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Cost Center Allocation</Label>
                <Input
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  placeholder="Facility Operations"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Require Managing Director Expense Sign-Off</span>
                <span className="text-[11px] text-slate-500">Flags outlay for approval before vendor purchase order release</span>
              </div>
            </label>
          </div>
        )}

        {/* ================= STEP 7 ================= */}
        {step === 7 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Issue</span>
                <span className="font-bold text-slate-900">{title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Premises & Unit</span>
                <span className="font-semibold text-slate-900">
                  {properties.find((p) => p.id === propertyId)?.name || 'Vision City Hub'}
                  {unitNumber ? ` (Unit ${unitNumber})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Priority & SLA</span>
                <span className="font-bold uppercase text-red-600">{priority} • {slaHours}h SLA</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Estimated Outlay</span>
                <span className="font-mono font-bold text-slate-900">
                  {currency} {estimatedCost.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Evidence Attached</span>
                <span className="font-semibold text-slate-900">{mediaItems.length} File(s)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Booking will assign an auditable request ID and notify the operations dispatch desk immediately.
              </span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
            {step < 7 ? (
              <Button type="button" size="sm" onClick={handleNext} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleFinalSubmit}
                className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Lodge Request
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
