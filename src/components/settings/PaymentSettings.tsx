import { useState } from 'react';
import { CreditCard, Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useProperties } from '@/hooks/useProperties';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

export function PaymentSettings() {
  const { data: companies } = useCompanies();
  const { data: properties } = useProperties();
  const [settingsType, setSettingsType] = useState<'company' | 'property'>('company');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  const companyId = settingsType === 'company' ? selectedCompanyId : undefined;
  const propertyId = settingsType === 'property' ? selectedPropertyId : undefined;

  const { settings, isLoading, updateSettings } = usePaymentSettings(companyId, propertyId);

  const [formData, setFormData] = useState({
    // Manual Payment Methods
    bank_name: settings?.bank_name || '',
    bank_account_number: settings?.bank_account_number || '',
    bank_account_name: settings?.bank_account_name || '',
    bank_branch: settings?.bank_branch || '',
    momo_provider: settings?.momo_provider || 'MTN',
    momo_number: settings?.momo_number || '',
    momo_name: settings?.momo_name || '',
    
    // Gateway Settings
    flutterwave_enabled: settings?.flutterwave_enabled || false,
    flutterwave_public_key: settings?.flutterwave_public_key || '',
    flutterwave_secret_key: settings?.flutterwave_secret_key || '',
    paystack_enabled: settings?.paystack_enabled || false,
    paystack_public_key: settings?.paystack_public_key || '',
    paystack_secret_key: settings?.paystack_secret_key || '',
    
    preferred_method: settings?.preferred_method || 'bank_transfer',
    payment_instructions: settings?.payment_instructions || '',
  });

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormData({
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
    }
  });

  const handleSave = async () => {
    if (settingsType === 'company' && !selectedCompanyId) {
      toast({ title: 'Error', description: 'Please select a company', variant: 'destructive' });
      return;
    }
    if (settingsType === 'property' && !selectedPropertyId) {
      toast({ title: 'Error', description: 'Please select a property', variant: 'destructive' });
      return;
    }

    await updateSettings.mutateAsync({
      ...formData,
      company_id: companyId,
      property_id: propertyId,
    });
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
