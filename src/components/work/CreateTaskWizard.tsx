// src/components/work/CreateTaskWizard.tsx
// FishGate Design Constitution v1.0 - 5-Step Structured Task Creation Experience

import { useState } from 'react';
import { format, addDays } from 'date-fns';
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
  CheckSquare,
  User,
  Building,
  Paperclip,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Flame,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Wrench,
  Receipt,
  Users,
} from 'lucide-react';
import { TaskRecord, TaskPriority, TaskStatus, TaskSource, TaskOwner } from './types';

interface CreateTaskWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: any[];
  tenants: any[];
  teamMembers: TaskOwner[];
  onCreateTask: (newTask: TaskRecord) => void;
}

const DEPARTMENTS = [
  'Facilities & Maintenance',
  'Leasing & Residents',
  'Finance & Accounts',
  'Property Operations',
  'Executive & Legal',
];

export function CreateTaskWizard({
  open,
  onOpenChange,
  properties,
  tenants,
  teamMembers,
  onCreateTask,
}: CreateTaskWizardProps) {
  // Unconditionally declare all hooks at the very top
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [source, setSource] = useState<TaskSource>('manual');
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TaskStatus>('not_started');

  // Step 2: Assignment
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(teamMembers[0]?.id || '');
  const [department, setDepartment] = useState(DEPARTMENTS[3]);
  const [collaboratorName, setCollaboratorName] = useState('');

  // Step 3: Relationships
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [sourceEntityRef, setSourceEntityRef] = useState('');

  // Step 4: Files & Checklist
  const [checklistInput, setChecklistInput] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [internalNotes, setInternalNotes] = useState('');

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const selectedOwner = teamMembers.find((m) => m.id === selectedOwnerId) || {
    id: 'owner-default',
    name: 'Aimable Nkurunziza',
    role: 'Property Operations Lead',
  };

  const handleAddChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setChecklist((prev) => [
      ...prev,
      { id: `chk-${Date.now()}`, text: checklistInput.trim(), completed: false },
    ]);
    setChecklistInput('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNext = () => {
    if (currentStep === 1 && !title.trim()) {
      toast({ title: 'Validation Error', description: 'Task title is required.', variant: 'destructive' });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleFinish = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newTask: TaskRecord = {
      id: `task-${Date.now()}`,
      taskNumber: `TSK-2026-${randomNum}`,
      title: title.trim(),
      description: description.trim() || 'Operational follow-up item.',
      priority,
      status,
      source,
      sourceEntityRef: sourceEntityRef.trim() || undefined,
      propertyId: selectedProperty?.id,
      propertyName: selectedProperty?.name || 'Vision City Commercial & Residential Hub',
      unitNumber: unitNumber.trim() || null,
      tenantName: tenantName.trim() || null,
      owner: selectedOwner,
      department,
      dueDate,
      startDate,
      checklist,
      comments: internalNotes.trim()
        ? [
            {
              id: `comm-${Date.now()}`,
              authorName: selectedOwner.name,
              text: internalNotes.trim(),
              createdAt: new Date().toISOString(),
              emoji: '📝',
            },
          ]
        : [],
      attachments: [],
      tags: [department, priority],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateTask(newTask);
    onOpenChange(false);

    // Reset wizard
    setCurrentStep(1);
    setTitle('');
    setDescription('');
    setChecklist([]);
    setInternalNotes('');
    setUnitNumber('');
    setTenantName('');
    setSourceEntityRef('');

    toast({
      title: 'Task Created & Assigned',
      description: `${newTask.taskNumber} has been recorded in the Work execution hub.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-blue-700 bg-blue-50 border-blue-200">
              Step {currentStep} of 5
            </Badge>
            <span className="text-[10px] text-slate-400 font-medium">
              Structured Task Framework
            </span>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span>
              {currentStep === 1 && 'Step 1: Task Basics & Scope'}
              {currentStep === 2 && 'Step 2: Team Assignment & Department'}
              {currentStep === 3 && 'Step 3: Asset & Resident Relationships'}
              {currentStep === 4 && 'Step 4: Checklist & Internal Notes'}
              {currentStep === 5 && 'Step 5: Review & Authorize Work'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Define actionable work with clear ownership, context, and operational deadlines.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Step Body */}
        <div className="py-2 text-xs">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Task Title *</Label>
                <Input
                  placeholder="e.g. Conduct Pre-Lease HVAC Pressure Verification"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Task Scope & Instructions</Label>
                <Textarea
                  placeholder="Describe actionable requirements, statutory checklist items, or deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Priority Level *</Label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                  >
                    <option value="critical">Critical (Immediate SLA)</option>
                    <option value="high">High (Within 24h)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Routine)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Operational Category</Label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as TaskSource)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                  >
                    <option value="manual">General Operational Task</option>
                    <option value="leases">Lease Renewal & Exit</option>
                    <option value="collections">Rent Collection & Arrears</option>
                    <option value="maintenance">Maintenance & Physical Repair</option>
                    <option value="approvals">Financial Outlay Approval</option>
                    <option value="occupancy">Occupancy & Turnover</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Target Due Date *</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Initial State</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting for Third Party</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ASSIGNMENT */}
          {currentStep === 2 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Primary Task Owner / Assignee *</Label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role || 'Operational Team'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Department / Operational Team *</Label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-slate-600">
                <span className="font-semibold text-slate-900 block text-xs">Accountability Standard</span>
                <p className="text-[11px] leading-relaxed">
                  Assigning this item directly notifies {selectedOwner.name} and places this deliverable in their Personal Work Hub with deadline tracking.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: RELATIONSHIPS */}
          {currentStep === 3 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Target Property *</Label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Unit / Space</Label>
                  <Input
                    placeholder="e.g. Unit C-301 or Common Area"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Associated Resident</Label>
                  <Input
                    placeholder="e.g. Aline Mukagasana"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Related Case / Entity Reference</Label>
                <Input
                  placeholder="e.g. LEAS-2026-084, WO-2026-081, or EXP-2026-083"
                  value={sourceEntityRef}
                  onChange={(e) => setSourceEntityRef(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 4: FILES & CHECKLIST */}
          {currentStep === 4 && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Action Checklist</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add step (e.g. Check circuit breaker, take photos)..."
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    className="text-xs h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 text-xs bg-slate-900 text-white shrink-0"
                    onClick={handleAddChecklistItem}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>

                {checklist.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded border border-slate-200 bg-slate-50 text-xs text-slate-800"
                      >
                        <span>{item.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Internal Operational Notes</Label>
                <Textarea
                  placeholder="Private notes for team collaborators, security codes, or background history..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">{title || 'Untitled Task'}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border-blue-200">
                  {priority}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">ASSIGNEE</span>
                  <span className="font-bold text-slate-900">{selectedOwner.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DUE DATE</span>
                  <span className="font-bold font-mono text-slate-900">{dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PROPERTY</span>
                  <span className="font-bold text-slate-900">{selectedProperty?.name || 'Vision City'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">DEPARTMENT</span>
                  <span className="font-bold text-slate-900">{department}</span>
                </div>
              </div>

              {checklist.length > 0 && (
                <div className="pt-2 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-400 block text-[10px] mb-1">CHECKLIST ({checklist.length} items)</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                    {checklist.map((c) => (
                      <li key={c.id}>{c.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1"
              onClick={handleBack}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1"
                onClick={handleNext}
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1"
                onClick={handleFinish}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Authorize & Create Task
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
