import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, DollarSign, CheckCircle2, Send,
  AlertTriangle, Camera, Loader2, XCircle, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useTenantExit,
  useUpdateTenantExit,
  useExitInspectionItems,
  useCreateInspectionItems,
  useUpdateInspectionItem,
  useDefaultChecklist,
} from '@/hooks/useTenantExits';
import { supabase } from '@/integrations/supabase/client';

const CONDITION_OPTIONS = [
  { value: 'good', label: 'Good', color: 'bg-success/10 text-success border-success/20' },
  { value: 'fair', label: 'Fair', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'damaged', label: 'Damaged', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'not_checked', label: 'Not Checked', color: 'bg-muted text-muted-foreground' },
];

const CATEGORY_LABELS: Record<string, string> = {
  structure: '🏗️ Structure',
  electrical: '⚡ Electrical',
  plumbing: '🔧 Plumbing',
  appliances: '🏠 Appliances',
  general: '📋 General',
};

const REFUND_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'cheque', label: 'Cheque' },
];

type ChecklistItemRow = {
  item_name: string;
  item_category: string;
};

export default function TenantExitWorkflow() {
  const { exitId } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const { isLandlord } = useUserRole();

  const { data: exitData, isLoading } = useTenantExit(exitId || '');
  const { data: inspectionItems = [], isLoading: loadingItems } = useExitInspectionItems(exitId || '');
  const { data: defaultChecklist = [] } = useDefaultChecklist(exitData?.property_id);
  const updateExit = useUpdateTenantExit();
  const createItems = useCreateInspectionItems();
  const updateItem = useUpdateInspectionItem();

  const [activeStep, setActiveStep] = useState('inspection');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [refundReference, setRefundReference] = useState('');

  // Initialize step based on exit status
  useEffect(() => {
    if (exitData) {
      setInspectionNotes(exitData.inspection_notes || '');
      setDeductionAmount(exitData.deduction_amount || 0);
      setDeductionReason(exitData.deduction_reason || '');
      setRefundMethod(exitData.refund_method || '');
      setRefundReference(exitData.refund_reference || '');

      switch (exitData.status) {
        case 'inspection_pending': setActiveStep('inspection'); break;
        case 'inspection_complete': setActiveStep('deposit'); break;
        case 'deposit_decided': setActiveStep('approval'); break;
        case 'approved': setActiveStep('refund'); break;
        case 'completed': setActiveStep('complete'); break;
        case 'cancelled': setActiveStep('complete'); break;
        default: setActiveStep('inspection');
      }
    }
  }, [exitData]);

  // Load default checklist items when first loading inspection
  useEffect(() => {
    if (exitId && inspectionItems.length === 0 && defaultChecklist.length > 0 && exitData?.status === 'inspection_pending' && !loadingItems) {
      createItems.mutate({
        exitId,
        items: (defaultChecklist as ChecklistItemRow[]).map((c) => ({ item_name: c.item_name, item_category: c.item_category })),
      });
    }
  }, [exitId, inspectionItems.length, defaultChecklist.length, exitData?.status, loadingItems, createItems, defaultChecklist]);

  const handleUpdateItemCondition = (itemId: string, condition: string) => {
    updateItem.mutate({ itemId, exitId: exitId!, data: { condition } });
  };

  const handleUpdateItemDamageCost = (itemId: string, cost: number) => {
    updateItem.mutate({ itemId, exitId: exitId!, data: { damage_cost: cost } });
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    updateItem.mutate({ itemId, exitId: exitId!, data: { notes } });
  };

  const totalDamageCost = inspectionItems.reduce((sum, item) => sum + Number(item.damage_cost), 0);
  const allItemsChecked = inspectionItems.length > 0 && inspectionItems.every(i => i.condition !== 'not_checked');

  const handleCompleteInspection = async () => {
    await updateExit.mutateAsync({
      exitId: exitId!,
      data: {
        status: 'inspection_complete',
        inspection_date: new Date().toISOString(),
        inspection_notes: inspectionNotes,
        inspection_completed_by: user?.id,
        deduction_amount: totalDamageCost,
        refund_amount: Math.max(0, (exitData?.deposit_amount || 0) - totalDamageCost),
      },
    });
    toast({ title: 'Inspection Complete', description: 'Moving to deposit decision phase.' });
    setActiveStep('deposit');
  };

  const handleDepositDecision = async () => {
    const refund = Math.max(0, (exitData?.deposit_amount || 0) - deductionAmount);
    await updateExit.mutateAsync({
      exitId: exitId!,
      data: {
        status: 'deposit_decided',
        deposit_decision: deductionAmount > 0 ? 'partial_refund' : 'full_refund',
        deduction_amount: deductionAmount,
        refund_amount: refund,
        deduction_reason: deductionReason,
      },
    });
    toast({ title: 'Deposit Decision Made', description: `Refund of ${formatCurrency(refund)} pending landlord approval.` });
    setActiveStep('approval');
  };

  const handleLandlordApproval = async () => {
    await updateExit.mutateAsync({
      exitId: exitId!,
      data: {
        status: 'approved',
        landlord_approved_by: user?.id,
        landlord_approved_at: new Date().toISOString(),
      },
    });
    toast({ title: 'Approved', description: 'Refund approved. Proceed to process payment.' });
    setActiveStep('refund');
  };

  const handleProcessRefund = async () => {
    if (!refundMethod) {
      toast({ title: 'Error', description: 'Please select a refund method', variant: 'destructive' });
      return;
    }

    // Set portal access grace period (7 days)
    const portalAccessUntil = new Date();
    portalAccessUntil.setDate(portalAccessUntil.getDate() + 7);

    await updateExit.mutateAsync({
      exitId: exitId!,
      data: {
        status: 'completed',
        refund_method: refundMethod,
        refund_reference: refundReference,
        refund_processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        exit_date: new Date().toISOString().split('T')[0],
        portal_access_until: portalAccessUntil.toISOString(),
      },
    });

    // Update tenant status and unit status
    if (exitData) {
      await Promise.all([
        supabase.from('tenants').update({ status: 'exited' }).eq('id', exitData.tenant_id),
        supabase.from('units').update({ status: 'vacant' }).eq('id', exitData.unit_id),
      ]);
    }

    // Send exit summary email
    try {
      await supabase.functions.invoke('send-exit-summary', {
        body: { exitId: exitId },
      });
    } catch (e) {
      console.error('Failed to send exit email:', e);
    }

    toast({ title: 'Exit Complete! 🎉', description: 'Tenant exit finalized and summary email sent.' });
    setActiveStep('complete');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!exitData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Exit process not found</h2>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const tenant = exitData.tenants;
  const unit = exitData.units;
  const property = exitData.properties;

  const steps = [
    { id: 'inspection', label: 'Inspection', icon: ClipboardCheck },
    { id: 'deposit', label: 'Deposit Decision', icon: DollarSign },
    { id: 'approval', label: 'Landlord Approval', icon: CheckCircle2 },
    { id: 'refund', label: 'Process Refund', icon: DollarSign },
    { id: 'complete', label: 'Completed', icon: Send },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === activeStep);

  // Group inspection items by category
  const itemsByCategory: Record<string, typeof inspectionItems> = {};
  inspectionItems.forEach(item => {
    const cat = item.item_category;
    if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
    itemsByCategory[cat].push(item);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Exit Process</h1>
          <p className="text-muted-foreground">
            {tenant?.name} • {unit?.unit_number} • {property?.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">
            {exitData.exit_reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
          {exitData.status !== 'completed' && exitData.status !== 'cancelled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" />
                  Cancel Exit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Tenant Exit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the exit process for {tenant?.name}. The tenant will remain in their unit and no deposit changes will be made. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Exit</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      await updateExit.mutateAsync({
                        exitId: exitId!,
                        data: {
                          status: 'cancelled',
                          completed_at: new Date().toISOString(),
                        },
                      });
                      toast({ title: 'Exit Cancelled', description: 'The tenant exit process has been cancelled.' });
                      navigate(-1);
                    }}
                  >
                    Cancel Exit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === activeStep;
              const isDone = index < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`p-2 rounded-full ${isDone ? 'bg-success text-success-foreground' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${index < currentStepIndex ? 'bg-success' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Security Deposit</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(exitData.deposit_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deductions</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(exitData.deduction_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Refund Amount</p>
              <p className="text-lg font-bold text-success">{formatCurrency(exitData.refund_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={exitData.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}>
                {exitData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Content */}
      {activeStep === 'inspection' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Property Inspection Checklist
            </CardTitle>
            <CardDescription>
              Inspect each item and record its condition. Items marked as "Damaged" will contribute to deduction calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-foreground mb-3">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="p-4 rounded-lg border bg-card hover:bg-secondary/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.item_name}</p>
                          <div className="flex gap-2 mt-2">
                            {CONDITION_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => handleUpdateItemCondition(item.id, opt.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                  item.condition === opt.value
                                    ? opt.color + ' ring-2 ring-offset-1 ring-current'
                                    : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {item.condition === 'damaged' && (
                          <div className="w-32">
                            <Label className="text-xs">Damage Cost</Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.damage_cost || ''}
                              onChange={(e) => handleUpdateItemDamageCost(item.id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                      {(item.condition === 'damaged' || item.condition === 'fair') && (
                        <div className="mt-2">
                          <Input
                            placeholder="Add notes about the condition..."
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateItemNotes(item.id, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <Label>Overall Inspection Notes</Label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Add any additional notes about the overall property condition..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="font-medium">Total Damage Costs</p>
                <p className="text-sm text-muted-foreground">Sum of all damaged items</p>
              </div>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totalDamageCost)}</p>
            </div>

            <Button
              onClick={handleCompleteInspection}
              disabled={!allItemsChecked || updateExit.isPending}
              className="w-full gap-2"
              size="lg"
            >
              {updateExit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Complete Inspection & Proceed to Deposit Decision
            </Button>
            {!allItemsChecked && (
              <p className="text-sm text-warning text-center">Please check all items before proceeding</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === 'deposit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Security Deposit Decision
            </CardTitle>
            <CardDescription>
              Review the inspection results and decide on the deposit refund amount.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Original Deposit</p>
                  <p className="text-2xl font-bold">{formatCurrency(exitData.deposit_amount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Deductions</p>
                  <Input
                    type="number"
                    min={0}
                    max={exitData.deposit_amount}
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(Math.min(parseFloat(e.target.value) || 0, exitData.deposit_amount))}
                    className="text-center text-xl font-bold mt-1"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Refund Amount</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(Math.max(0, exitData.deposit_amount - deductionAmount))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {deductionAmount > 0 && (
              <div className="space-y-2">
                <Label>Reason for Deductions</Label>
                <Textarea
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="Describe the reason for deducting from the security deposit..."
                  rows={3}
                />
              </div>
            )}

            <div className="p-4 rounded-lg bg-info/10 border border-info/20">
              <p className="text-sm text-info">
                <strong>Inspection Summary:</strong> {inspectionItems.filter(i => i.condition === 'damaged').length} items damaged,{' '}
                {inspectionItems.filter(i => i.condition === 'fair').length} fair,{' '}
                {inspectionItems.filter(i => i.condition === 'good').length} good.
                Total damage costs from inspection: {formatCurrency(totalDamageCost)}
              </p>
            </div>

            <Button
              onClick={handleDepositDecision}
              disabled={updateExit.isPending || (deductionAmount > 0 && !deductionReason)}
              className="w-full gap-2"
              size="lg"
            >
              {updateExit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Submit Deposit Decision for Approval
            </Button>
          </CardContent>
        </Card>
      )}

      {activeStep === 'approval' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Landlord Approval
            </CardTitle>
            <CardDescription>
              Final approval is required from the landlord before processing the refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-lg bg-secondary/50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tenant</p>
                  <p className="font-medium">{tenant?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{unit?.unit_number} • {property?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Security Deposit</p>
                  <p className="font-medium">{formatCurrency(exitData.deposit_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deductions</p>
                  <p className="font-medium text-destructive">{formatCurrency(exitData.deduction_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refund Amount</p>
                  <p className="font-medium text-success text-lg">{formatCurrency(exitData.refund_amount)}</p>
                </div>
                {exitData.deduction_reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Deduction Reason</p>
                    <p className="font-medium">{exitData.deduction_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {isLandlord ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleLandlordApproval}
                  disabled={updateExit.isPending}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {updateExit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve Refund
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await updateExit.mutateAsync({
                      exitId: exitId!,
                      data: { status: 'inspection_complete', deposit_decision: 'pending' },
                    });
                    toast({ title: 'Sent Back', description: 'Deposit decision sent back for review.' });
                    setActiveStep('deposit');
                  }}
                  disabled={updateExit.isPending}
                  className="gap-2"
                  size="lg"
                >
                  <XCircle className="h-4 w-4" /> Send Back for Review
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                <p className="font-medium text-foreground">Awaiting Landlord Approval</p>
                <p className="text-sm text-muted-foreground">Only the landlord can approve the refund at this stage.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeStep === 'refund' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Process Security Deposit Refund
            </CardTitle>
            <CardDescription>
              Refund of {formatCurrency(exitData.refund_amount)} has been approved. Record the payment details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference / Transaction ID</Label>
                <Input
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="Payment reference number..."
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
              <p className="text-sm text-muted-foreground">Approved Refund Amount</p>
              <p className="text-3xl font-bold text-success">{formatCurrency(exitData.refund_amount)}</p>
            </div>

            <Button
              onClick={handleProcessRefund}
              disabled={!refundMethod || updateExit.isPending}
              className="w-full gap-2"
              size="lg"
            >
              {updateExit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm Refund & Complete Exit
            </Button>
          </CardContent>
        </Card>
      )}

      {activeStep === 'complete' && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <div className="p-4 rounded-full bg-success/10 inline-block mx-auto">
              <CheckCircle2 className="h-16 w-16 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Exit Process Complete</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The tenant exit for <strong>{tenant?.name}</strong> has been completed. 
              A summary email has been sent to the tenant with all activity records during their stay.
              The unit <strong>{unit?.unit_number}</strong> has been marked as vacant.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" onClick={() => navigate(`/tenants/${exitData.tenant_id}`)}>
                View Tenant Details
              </Button>
              <Button onClick={() => navigate('/tenants')}>
                Back to Tenants
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
