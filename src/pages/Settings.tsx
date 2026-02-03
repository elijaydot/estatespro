import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, DollarSign, Calendar, Save, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ColorPicker } from '@/components/ui/color-picker';
import { CompanySettings } from '@/components/settings/CompanySettings';

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

export default function Settings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    currencyCode: 'RWF',
    currencySymbol: 'RWF',
    defaultCountry: 'Rwanda',
    timezone: 'Africa/Kigali',
    dateFormat: 'DD/MM/YYYY',
    accentColor: '#f59e0b',
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
        accentColor: settings.accentColor,
      });
    }
  }, [settings, isLoading]);

  // Apply accent color to CSS custom property
  useEffect(() => {
    const root = document.documentElement;
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const rgb = hexToRgb(formData.accentColor);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      root.style.setProperty('--accent', hsl);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);

      // Calculate contrast for foreground
      const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
      const foreground = (yiq >= 128) ? '222.2 84% 4.9%' : '210 40% 98%';
      
      root.style.setProperty('--primary-foreground', foreground);
      root.style.setProperty('--accent-foreground', foreground);
    }
  }, [formData.accentColor]);

  const handleCurrencyChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      currencyCode: value,
      currencySymbol: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your app preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Company Settings - Full Width */}
      <CompanySettings />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Regional Settings */}
        <Card className="card-shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Configure your location and locale preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Country</Label>
              <SearchableSelect
                options={countryOptions}
                value={formData.defaultCountry}
                onValueChange={(value) => setFormData(prev => ({ ...prev, defaultCountry: value }))}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <SearchableSelect
                options={timezoneOptions}
                value={formData.timezone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                placeholder="Select timezone..."
                searchPlaceholder="Search timezones..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card className="card-shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Currency</CardTitle>
                <CardDescription>Set your preferred currency for all transactions</CardDescription>
              </div>
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
              <p className="text-xs text-muted-foreground">
                This symbol will be displayed before all monetary values
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time Settings */}
        <Card className="card-shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Date Format</CardTitle>
                <CardDescription>Choose how dates are displayed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Date Format</Label>
              <SearchableSelect
                options={dateFormatOptions}
                value={formData.dateFormat}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dateFormat: value }))}
                placeholder="Select format..."
                searchPlaceholder="Search formats..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="card-shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Palette className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the app</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Accent Color</Label>
              <ColorPicker
                value={formData.accentColor}
                onChange={(color) => setFormData(prev => ({ ...prev, accentColor: color }))}
              />
              <p className="text-xs text-muted-foreground">
                Choose a color to accent buttons, links, and highlights
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-lg"
                  style={{ backgroundColor: formData.accentColor }}
                />
                <div>
                  <p className="font-medium" style={{ color: formData.accentColor }}>Preview</p>
                  <p className="text-xs text-muted-foreground">This is how your accent color will look</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="card-shadow-md md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <SettingsIcon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>See how your settings will look</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-medium">{formData.currencySymbol} 1,500,000</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Country:</span>
                <span className="font-medium">{formData.defaultCountry}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
                <span className="text-muted-foreground">Timezone:</span>
                <span className="font-medium">{formData.timezone}</span>
              </div>
              <div className="flex justify-between sm:flex-col sm:gap-1">
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
