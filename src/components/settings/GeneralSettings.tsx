import { useState, useEffect } from 'react';
import { Globe, DollarSign, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { SearchableSelect } from '@/components/ui/searchable-select';

const currencyOptions = [
  { value: 'RWF', label: 'RWF - Rwandan Franc', description: 'Rwanda' },
  { value: 'USD', label: 'USD - US Dollar', description: 'United States' },
  { value: 'EUR', label: 'EUR - Euro', description: 'European Union' },
  { value: 'GBP', label: 'GBP - British Pound', description: 'United Kingdom' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi', description: 'Ghana' },
  { value: 'NGN', label: 'NGN - Nigerian Naira', description: 'Nigeria' },
  { value: 'KES', label: 'KES - Kenyan Shilling', description: 'Kenya' },
  { value: 'ZAR', label: 'ZAR - South African Rand', description: 'South Africa' },
  { value: 'UGX', label: 'UGX - Ugandan Shilling', description: 'Uganda' },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling', description: 'Tanzania' },
];

const countryOptions = [
  { value: 'Rwanda', label: 'Rwanda', description: 'Africa/Kigali' },
  { value: 'Ghana', label: 'Ghana', description: 'Africa/Accra' },
  { value: 'Nigeria', label: 'Nigeria', description: 'Africa/Lagos' },
  { value: 'Kenya', label: 'Kenya', description: 'Africa/Nairobi' },
  { value: 'South Africa', label: 'South Africa', description: 'Africa/Johannesburg' },
  { value: 'Uganda', label: 'Uganda', description: 'Africa/Kampala' },
  { value: 'Tanzania', label: 'Tanzania', description: 'Africa/Dar_es_Salaam' },
  { value: 'United States', label: 'United States', description: 'America/New_York' },
  { value: 'United Kingdom', label: 'United Kingdom', description: 'Europe/London' },
];

const timezoneOptions = [
  { value: 'Africa/Kigali', label: 'Africa/Kigali (CAT)', description: 'UTC+2' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT)', description: 'UTC+0' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)', description: 'UTC+1' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)', description: 'UTC+3' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)', description: 'UTC+2' },
  { value: 'America/New_York', label: 'America/New_York (EST)', description: 'UTC-5' },
  { value: 'Europe/London', label: 'Europe/London (GMT)', description: 'UTC+0' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)', description: 'UTC+4' },
];

const dateFormatOptions = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', description: 'e.g., 15/01/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', description: 'e.g., 01/15/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', description: 'e.g., 2026-01-15' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', description: 'e.g., 15-01-2026' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', description: 'e.g., Jan 15, 2026' },
];

export function GeneralSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    currencyCode: 'RWF',
    currencySymbol: 'RWF',
    defaultCountry: 'Rwanda',
    timezone: 'Africa/Kigali',
    dateFormat: 'DD/MM/YYYY',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setFormData({
        currencyCode: settings.currencyCode,
        currencySymbol: settings.currencySymbol,
        defaultCountry: settings.defaultCountry,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
      });
    }
  }, [settings, isLoading]);

  const handleCurrencyChange = (value: string) => {
    setFormData(prev => ({ ...prev, currencyCode: value, currencySymbol: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast({ title: 'Settings saved', description: 'Regional preferences updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">General</h2>
          <p className="text-sm text-muted-foreground">Regional, currency, and date preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Regional */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Region</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Country</Label>
              <SearchableSelect
                options={countryOptions}
                value={formData.defaultCountry}
                onValueChange={(v) => setFormData(prev => ({ ...prev, defaultCountry: v }))}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <SearchableSelect
                options={timezoneOptions}
                value={formData.timezone}
                onValueChange={(v) => setFormData(prev => ({ ...prev, timezone: v }))}
                placeholder="Select timezone..."
                searchPlaceholder="Search timezones..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Currency</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <SearchableSelect
                options={currencyOptions}
                value={formData.currencyCode}
                onValueChange={handleCurrencyChange}
                placeholder="Select currency..."
                searchPlaceholder="Search currencies..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Currency Symbol</Label>
              <Input
                value={formData.currencySymbol}
                onChange={(e) => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                placeholder="e.g., RWF, $, €"
              />
              <p className="text-xs text-muted-foreground">Displayed before all monetary values</p>
            </div>
          </CardContent>
        </Card>

        {/* Date Format */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Date Format</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Format</Label>
              <SearchableSelect
                options={dateFormatOptions}
                value={formData.dateFormat}
                onValueChange={(v) => setFormData(prev => ({ ...prev, dateFormat: v }))}
                placeholder="Select format..."
                searchPlaceholder="Search formats..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-medium">{formData.currencySymbol} 1,500,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country:</span>
                <span className="font-medium">{formData.defaultCountry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timezone:</span>
                <span className="font-medium">{formData.timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date Format:</span>
                <span className="font-medium">{formData.dateFormat}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
