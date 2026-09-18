import { useState, useEffect } from 'react';
import { Globe, DollarSign, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { SearchableSelect } from '@/components/ui/searchable-select';

import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/exchangeRates';

const currencyOptions = SUPPORTED_CURRENCIES.map(c => ({
  value: c.code,
  label: `${c.code} - ${c.name} (${c.symbol})`,
  description: `${c.country} • ${c.region}`,
}));

const countryOptions = [
  // East Africa
  { value: 'Rwanda', label: 'Rwanda', description: 'Africa/Kigali (CAT)' },
  { value: 'Kenya', label: 'Kenya', description: 'Africa/Nairobi (EAT)' },
  { value: 'Uganda', label: 'Uganda', description: 'Africa/Kampala (EAT)' },
  { value: 'Tanzania', label: 'Tanzania', description: 'Africa/Dar_es_Salaam (EAT)' },
  { value: 'Burundi', label: 'Burundi', description: 'Africa/Bujumbura (CAT)' },
  { value: 'Ethiopia', label: 'Ethiopia', description: 'Africa/Addis_Ababa (EAT)' },
  { value: 'South Sudan', label: 'South Sudan', description: 'Africa/Juba (CAT)' },
  { value: 'Somalia', label: 'Somalia', description: 'Africa/Mogadishu (EAT)' },

  // West & Central Africa
  { value: 'Nigeria', label: 'Nigeria', description: 'Africa/Lagos (WAT)' },
  { value: 'Ghana', label: 'Ghana', description: 'Africa/Accra (GMT)' },
  { value: 'Cameroon', label: 'Cameroon', description: 'Africa/Douala (WAT)' },
  { value: 'DR Congo', label: 'DR Congo', description: 'Africa/Kinshasa (WAT)' },
  { value: 'Senegal', label: 'Senegal', description: 'Africa/Dakar (GMT)' },
  { value: 'Côte d\'Ivoire', label: 'Côte d\'Ivoire', description: 'Africa/Abidjan (GMT)' },
  { value: 'Sierra Leone', label: 'Sierra Leone', description: 'Africa/Freetown (GMT)' },
  { value: 'Liberia', label: 'Liberia', description: 'Africa/Monrovia (GMT)' },
  { value: 'Gambia', label: 'Gambia', description: 'Africa/Banjul (GMT)' },

  // Southern & Northern Africa
  { value: 'South Africa', label: 'South Africa', description: 'Africa/Johannesburg (SAST)' },
  { value: 'Egypt', label: 'Egypt', description: 'Africa/Cairo (EEST)' },
  { value: 'Morocco', label: 'Morocco', description: 'Africa/Casablanca (WET)' },
  { value: 'Mauritius', label: 'Mauritius', description: 'Indian/Mauritius (MUT)' },
  { value: 'Botswana', label: 'Botswana', description: 'Africa/Gaborone (CAT)' },
  { value: 'Zambia', label: 'Zambia', description: 'Africa/Lusaka (CAT)' },
  { value: 'Namibia', label: 'Namibia', description: 'Africa/Windhoek (CAT)' },

  // Global Majors & Middle East / Asia
  { value: 'United States', label: 'United States', description: 'America/New_York (EST)' },
  { value: 'United Kingdom', label: 'United Kingdom', description: 'Europe/London (GMT/BST)' },
  { value: 'European Union', label: 'European Union', description: 'Europe/Paris (CET)' },
  { value: 'Canada', label: 'Canada', description: 'America/Toronto (EST)' },
  { value: 'Australia', label: 'Australia', description: 'Australia/Sydney (AEST)' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates', description: 'Asia/Dubai (GST)' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia', description: 'Asia/Riyadh (AST)' },
  { value: 'Qatar', label: 'Qatar', description: 'Asia/Qatar (AST)' },
  { value: 'India', label: 'India', description: 'Asia/Kolkata (IST)' },
  { value: 'China', label: 'China', description: 'Asia/Shanghai (CST)' },
  { value: 'Japan', label: 'Japan', description: 'Asia/Tokyo (JST)' },
  { value: 'Singapore', label: 'Singapore', description: 'Asia/Singapore (SGT)' },
  { value: 'Switzerland', label: 'Switzerland', description: 'Europe/Zurich (CET)' },
  { value: 'Brazil', label: 'Brazil', description: 'America/Sao_Paulo (BRT)' },
  { value: 'Turkey', label: 'Turkey', description: 'Europe/Istanbul (TRT)' },
];

const timezoneOptions = [
  { value: 'Africa/Kigali', label: 'Africa/Kigali (CAT)', description: 'UTC+2' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)', description: 'UTC+3' },
  { value: 'Africa/Kampala', label: 'Africa/Kampala (EAT)', description: 'UTC+3' },
  { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar_es_Salaam (EAT)', description: 'UTC+3' },
  { value: 'Africa/Bujumbura', label: 'Africa/Bujumbura (CAT)', description: 'UTC+2' },
  { value: 'Africa/Addis_Ababa', label: 'Africa/Addis_Ababa (EAT)', description: 'UTC+3' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)', description: 'UTC+1' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT)', description: 'UTC+0' },
  { value: 'Africa/Douala', label: 'Africa/Douala (WAT)', description: 'UTC+1' },
  { value: 'Africa/Kinshasa', label: 'Africa/Kinshasa (WAT)', description: 'UTC+1' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)', description: 'UTC+2' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EEST)', description: 'UTC+2' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca (WET)', description: 'UTC+1' },
  { value: 'America/New_York', label: 'America/New_York (EST)', description: 'UTC-5' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)', description: 'UTC-6' },
  { value: 'America/Denver', label: 'America/Denver (MST)', description: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)', description: 'UTC-8' },
  { value: 'America/Toronto', label: 'America/Toronto (EST)', description: 'UTC-5' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)', description: 'UTC+0 / UTC+1' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)', description: 'UTC+1' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)', description: 'UTC+1' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)', description: 'UTC+4' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST)', description: 'UTC+3' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)', description: 'UTC+5:30' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)', description: 'UTC+8' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)', description: 'UTC+9' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)', description: 'UTC+10' },
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
    const symbol = CURRENCY_SYMBOLS[value] || value;
    setFormData(prev => ({ ...prev, currencyCode: value, currencySymbol: symbol }));
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
