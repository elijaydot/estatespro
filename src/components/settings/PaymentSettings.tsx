import { useState, useEffect } from 'react';
import { CreditCard, Building2, MapPin, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useProperties } from '@/hooks/useProperties';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { format } from 'date-fns';


const paymentSettingsSchema = z.object({
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
  bank_branch: z.string().optional(),
  momo_provider: z.string().optional(),
  momo_number: z.string().optional(),
  momo_name: z.string().optional(),
  flutterwave_enabled: z.boolean(),
  flutterwave_public_key: z.string().optional(),
  flutterwave_secret_key: z.string().optional(),
  paystack_enabled: z.boolean(),
  paystack_public_key: z.string().optional(),
  paystack_secret_key: z.string().optional(),
  preferred_method: z.string().optional(),
  payment_instructions: z.string().optional(),
}).refine((data) => {
  if (data.flutterwave_enabled && (!data.flutterwave_public_key || !data.flutterwave_secret_key)) {
    return false;
  }
  return true;
}, {
  message: "Flutterwave public and secret keys are required when enabled",
  path: ["flutterwave_public_key"],
}).refine((data) => {
  if (data.paystack_enabled && (!data.paystack_public_key || !data.paystack_secret_key)) {
    return false;
  }
  return true;
}, {
  message: "Paystack public and secret keys are required when enabled",
  path: ["paystack_public_key"],
});

type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;

type GatewayStatus = {
  status: 'connected' | 'error' | 'not_configured' | 'verifying';
  lastVerified?: Date;
  error?: string;
};

export function PaymentSettings() {
  const { data: companies } = useMyCompanies();
  const { data: properties } = useProperties();
  const [settingsType, setSettingsType] = useState<'company' | 'property'>('company');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [flutterwaveStatus, setFlutterwaveStatus] = useState<GatewayStatus>({ status: 'not_configured' });
  const [paystackStatus, setPaystackStatus] = useState<GatewayStatus>({ status: 'not_configured' });

  const companyId = settingsType === 'company' ? selectedCompanyId : undefined;
  const propertyId = settingsType === 'property' ? selectedPropertyId : undefined;

  const { settings, isLoading, updateSettings } = usePaymentSettings(companyId, propertyId);

  const form = useForm<PaymentSettingsFormData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      bank_name: '',
      bank_account_number: '',
      bank_account_name: '',
      bank_branch: '',
      momo_provider: 'MTN',
      momo_number: '',
      momo_name: '',
      flutterwave_enabled: false,
      flutterwave_public_key: '',
      flutterwave_secret_key: '',
      paystack_enabled: false,
      paystack_public_key: '',
      paystack_secret_key: '',
      preferred_method: 'bank_transfer',
      payment_instructions: '',
    },
  });


  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        bank_name: settings.bank_name || '',
        bank_account_number: settings.bank_account_number || '',
        bank_account_name: settings.bank_account_name || '',
        bank_branch: settings.bank_branch || '',
        momo_provider: settings.momo_provider || 'MTN',
        momo_number: settings.momo_number || '',
        momo_name: settings.momo_name || '',
        flutterwave_enabled: settings.flutterwave_enabled || false,
        flutterwave_public_key: settings.flutterwave_public_key || '',
        flutterwave_secret_key: settings.flutterwave_secret_key || '',
        paystack_enabled: settings.paystack_enabled || false,
        paystack_public_key: settings.paystack_public_key || '',
        paystack_secret_key: settings.paystack_secret_key || '',
        preferred_method: settings.preferred_method || 'bank_transfer',
        payment_instructions: settings.payment_instructions || '',
      });

      // Update gateway status based on settings
      if (settings.flutterwave_enabled && settings.flutterwave_public_key) {
        setFlutterwaveStatus({ status: 'connected', lastVerified: new Date(settings.updated_at) });
      }
      if (settings.paystack_enabled && settings.paystack_public_key) {
        setPaystackStatus({ status: 'connected', lastVerified: new Date(settings.updated_at) });
      }
    }
  }, [settings, form]);

  const verifyGateway = async (gateway: 'flutterwave' | 'paystack') => {
    const values = form.getValues();
    
    if (gateway === 'flutterwave') {
      if (!values.flutterwave_public_key || !values.flutterwave_secret_key) {
        toast({ title: 'Error', description: 'Please enter both public and secret keys', variant: 'destructive' });
        return;
      }
      setFlutterwaveStatus({ status: 'verifying' });
    } else {
      if (!values.paystack_public_key || !values.paystack_secret_key) {
        toast({ title: 'Error', description: 'Please enter both public and secret keys', variant: 'destructive' });
        return;
      }
      setPaystackStatus({ status: 'verifying' });
    }

    try {
      // Call verify-payment edge function in test mode
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_mode: true,
          gateway,
          public_key: gateway === 'flutterwave' ? values.flutterwave_public_key : values.paystack_public_key,
          secret_key: gateway === 'flutterwave' ? values.flutterwave_secret_key : values.paystack_secret_key,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newStatus: GatewayStatus = { status: 'connected', lastVerified: new Date() };
        if (gateway === 'flutterwave') {
          setFlutterwaveStatus(newStatus);
        } else {
          setPaystackStatus(newStatus);
        }
        toast({ title: 'Success', description: `${gateway === 'flutterwave' ? 'Flutterwave' : 'Paystack'} connection verified successfully` });
      } else {
        const errorStatus: GatewayStatus = { status: 'error', error: data.error || 'Verification failed' };
        if (gateway === 'flutterwave') {
          setFlutterwaveStatus(errorStatus);
        } else {
          setPaystackStatus(errorStatus);
        }
        toast({ title: 'Error', description: data.error || 'Gateway verification failed', variant: 'destructive' });
      }
    } catch (error) {
      const errorStatus: GatewayStatus = { status: 'error', error: 'Network error' };
      if (gateway === 'flutterwave') {
        setFlutterwaveStatus(errorStatus);
      } else {
        setPaystackStatus(errorStatus);
      }
      toast({ title: 'Error', description: 'Failed to verify gateway connection', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: PaymentSettingsFormData) => {
    if (settingsType === 'company' && !selectedCompanyId) {
      toast({ title: 'Error', description: 'Please select a company', variant: 'destructive' });
      return;
    }
    if (settingsType === 'property' && !selectedPropertyId) {
      toast({ title: 'Error', description: 'Please select a property', variant: 'destructive' });
      return;
    }

    await updateSettings.mutateAsync({
      ...data,
      company_id: companyId,
      property_id: propertyId,
    });
  };

  const getStatusBadge = (status: GatewayStatus) => {
    switch (status.status) {
      case 'connected':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 w-fit">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
            {status.lastVerified && (
              <span className="text-xs text-muted-foreground">
                Last verified: {format(status.lastVerified, 'MMM d, yyyy HH:mm')}
              </span>
            )}
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive" className="w-fit">
              <XCircle className="mr-1 h-3 w-3" />
              Error
            </Badge>
            {status.error && (
              <span className="text-xs text-destructive">{status.error}</span>
            )}
          </div>
        );
      case 'verifying':
        return (
          <Badge variant="secondary" className="w-fit">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Verifying...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="w-fit">
            <AlertCircle className="mr-1 h-3 w-3" />
            Not Configured
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings Scope</CardTitle>
          <CardDescription>Configure default company-wide settings or property-specific overrides</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={settingsType} onValueChange={(v) => setSettingsType(v as 'company' | 'property')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="company">Company Default</TabsTrigger>
              <TabsTrigger value="property">Property Override</TabsTrigger>
            </TabsList>
          </Tabs>

          {settingsType === 'company' && (
            <div className="space-y-2">
              <Label htmlFor="company">Select Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company">
                  <SelectValue placeholder="Choose a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {settingsType === 'property' && (
            <div className="space-y-2">
              <Label htmlFor="property">Select Property</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Choose a property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {property.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {((settingsType === 'company' && selectedCompanyId) || (settingsType === 'property' && selectedPropertyId)) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Manual Payment Details</CardTitle>
              <CardDescription>Bank and Mobile Money details for manual payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., Bank of Kigali"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_name">Account Name</Label>
                  <Input
                    id="bank_account_name"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="momo_provider">Mobile Money Provider</Label>
                <Select value={formData.momo_provider} onValueChange={(v) => setFormData({ ...formData, momo_provider: v })}>
                  <SelectTrigger id="momo_provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN MoMo</SelectItem>
                    <SelectItem value="Airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="momo_name">MoMo Name</Label>
                  <Input
                    id="momo_name"
                    value={formData.momo_name}
                    onChange={(e) => setFormData({ ...formData, momo_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="momo_number">MoMo Number</Label>
                  <Input
                    id="momo_number"
                    value={formData.momo_number}
                    onChange={(e) => setFormData({ ...formData, momo_number: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Online Payment Gateways</CardTitle>
              <CardDescription>Configure Flutterwave and Paystack for online payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Flutterwave</Label>
                    <p className="text-sm text-muted-foreground">Enable card and MoMo payments via Flutterwave</p>
                  </div>
                  <Switch
                    checked={formData.flutterwave_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, flutterwave_enabled: checked })}
                  />
                </div>
                {formData.flutterwave_enabled && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="flutterwave_public_key">Public Key</Label>
                      <Input
                        id="flutterwave_public_key"
                        value={formData.flutterwave_public_key}
                        onChange={(e) => setFormData({ ...formData, flutterwave_public_key: e.target.value })}
                        placeholder="FLWPUBK-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flutterwave_secret_key">Secret Key</Label>
                      <Input
                        id="flutterwave_secret_key"
                        type="password"
                        value={formData.flutterwave_secret_key}
                        onChange={(e) => setFormData({ ...formData, flutterwave_secret_key: e.target.value })}
                        placeholder="FLWSECK-..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Paystack</Label>
                    <p className="text-sm text-muted-foreground">Enable card and MoMo payments via Paystack</p>
                  </div>
                  <Switch
                    checked={formData.paystack_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, paystack_enabled: checked })}
                  />
                </div>
                {formData.paystack_enabled && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="paystack_public_key">Public Key</Label>
                      <Input
                        id="paystack_public_key"
                        value={formData.paystack_public_key}
                        onChange={(e) => setFormData({ ...formData, paystack_public_key: e.target.value })}
                        placeholder="pk_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paystack_secret_key">Secret Key</Label>
                      <Input
                        id="paystack_secret_key"
                        type="password"
                        value={formData.paystack_secret_key}
                        onChange={(e) => setFormData({ ...formData, paystack_secret_key: e.target.value })}
                        placeholder="sk_..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
              <CardDescription>Additional instructions shown to tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_instructions">Custom Instructions</Label>
                <Textarea
                  id="payment_instructions"
                  value={formData.payment_instructions}
                  onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                  placeholder="Add any special instructions for tenants making payments..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <CreditCard className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? 'Saving...' : 'Save Payment Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
