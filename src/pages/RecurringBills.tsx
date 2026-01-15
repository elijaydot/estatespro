import { useState } from 'react';
import { Plus, Pencil, Trash2, Droplets, Shield, Zap, Wifi, Trash, MoreHorizontal, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useRecurringBills, useCreateRecurringBill, useUpdateRecurringBill, useDeleteRecurringBill } from '@/hooks/useRecurringBills';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';

const billTypeOptions = [
  { value: 'water', label: 'Water Bill', description: 'Monthly water utility charges' },
  { value: 'security', label: 'Security/Guard', description: 'Security guard services' },
  { value: 'electricity', label: 'Electricity', description: 'Electric utility charges' },
  { value: 'internet', label: 'Internet/WiFi', description: 'Internet service charges' },
  { value: 'garbage', label: 'Garbage Collection', description: 'Waste disposal services' },
  { value: 'maintenance', label: 'Maintenance Fee', description: 'General maintenance charges' },
  { value: 'parking', label: 'Parking Fee', description: 'Parking space charges' },
  { value: 'other', label: 'Other', description: 'Other recurring charges' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly', description: 'Billed every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Billed every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Billed annually' },
];

const getBillIcon = (type: string) => {
  switch (type) {
    case 'water':
      return Droplets;
    case 'security':
      return Shield;
    case 'electricity':
      return Zap;
    case 'internet':
      return Wifi;
    case 'garbage':
      return Trash;
    default:
      return RefreshCw;
  }
};

interface BillFormData {
  name: string;
  bill_type: string;
  amount: number;
  frequency: string;
  property_id: string | null;
  tenant_id: string | null;
  description: string;
  is_active: boolean;
}

const defaultFormData: BillFormData = {
  name: '',
  bill_type: 'water',
  amount: 0,
  frequency: 'monthly',
  property_id: null,
  tenant_id: null,
  description: '',
  is_active: true,
};

export default function RecurringBills() {
  const { formatCurrency } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [formData, setFormData] = useState<BillFormData>(defaultFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: bills = [], isLoading } = useRecurringBills();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const createBill = useCreateRecurringBill();
  const updateBill = useUpdateRecurringBill();
  const deleteBill = useDeleteRecurringBill();

  const propertyOptions = properties.map(p => ({
    value: p.id,
    label: p.name,
    description: `${p.city}, ${p.country}`,
  }));

  const tenantOptions = tenants.map(t => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const filteredBills = bills.filter(bill =>
    bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.bill_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (bill?: typeof bills[0]) => {
    if (bill) {
      setEditingBill(bill.id);
      setFormData({
        name: bill.name,
        bill_type: bill.bill_type,
        amount: bill.amount,
        frequency: bill.frequency,
        property_id: bill.property_id,
        tenant_id: bill.tenant_id,
        description: bill.description || '',
        is_active: bill.is_active,
      });
    } else {
      setEditingBill(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.bill_type || formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingBill) {
        await updateBill.mutateAsync({
          id: editingBill,
          ...formData,
        });
      } else {
        await createBill.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      setEditingBill(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    try {
      await deleteBill.mutateAsync(billToDelete);
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleToggleActive = async (bill: typeof bills[0]) => {
    try {
      await updateBill.mutateAsync({
        id: bill.id,
        is_active: !bill.is_active,
      });
    } catch (error) {
      console.error('Error toggling bill status:', error);
    }
  };

  // Calculate summary stats
  const totalMonthlyBills = filteredBills
    .filter(b => b.is_active && b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);
  
  const activeBillsCount = filteredBills.filter(b => b.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Bills</h1>
          <p className="text-muted-foreground mt-1">
            Manage amenity bills like water, security, and utilities
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Recurring Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{filteredBills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Bills</p>
                <p className="text-2xl font-bold">{activeBillsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Droplets className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMonthlyBills)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Bills Table */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle>All Recurring Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recurring bills found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => {
                  const IconComponent = getBillIcon(bill.bill_type);
                  const property = (bill as any).properties;
                  const tenant = (bill as any).tenants;
                  
                  return (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{bill.name}</p>
                            {bill.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {bill.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {bill.bill_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(bill.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{bill.frequency}</TableCell>
                      <TableCell>
                        {property?.name || <span className="text-muted-foreground">All</span>}
                      </TableCell>
                      <TableCell>
                        {tenant?.name || <span className="text-muted-foreground">All</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bill.is_active}
                          onCheckedChange={() => handleToggleActive(bill)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(bill)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setBillToDelete(bill.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</DialogTitle>
            <DialogDescription>
              {editingBill
                ? 'Update the recurring bill details.'
                : 'Create a new recurring bill for amenities like water, security, etc.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Bill Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Water Bill"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bill Type *</Label>
                <SearchableSelect
                  options={billTypeOptions}
                  value={formData.bill_type}
                  onValueChange={(value) => setFormData({ ...formData, bill_type: value })}
                  placeholder="Select type..."
                  searchPlaceholder="Search types..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Frequency *</Label>
                <SearchableSelect
                  options={frequencyOptions}
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  placeholder="Select frequency..."
                  searchPlaceholder="Search..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Property (Optional)</Label>
              <SearchableSelect
                options={propertyOptions}
                value={formData.property_id || ''}
                onValueChange={(value) => setFormData({ ...formData, property_id: value || null })}
                placeholder="All properties..."
                searchPlaceholder="Search properties..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all properties
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Tenant (Optional)</Label>
              <SearchableSelect
                options={tenantOptions}
                value={formData.tenant_id || ''}
                onValueChange={(value) => setFormData({ ...formData, tenant_id: value || null })}
                placeholder="All tenants..."
                searchPlaceholder="Search tenants..."
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all tenants at the property
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about this bill..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createBill.isPending || updateBill.isPending}
            >
              {createBill.isPending || updateBill.isPending
                ? 'Saving...'
                : editingBill
                ? 'Update Bill'
                : 'Create Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring bill? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
