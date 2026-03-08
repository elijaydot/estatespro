import { useState, useEffect } from 'react';
import { Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorPicker } from '@/components/ui/color-picker';

export function AppearanceSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAccentColor(settings.accentColor);
    }
  }, [settings, isLoading]);

  // Live preview accent color
  useEffect(() => {
    const root = document.documentElement;
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
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
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      root.style.setProperty('--accent', hsl);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
      const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
      const fg = yiq >= 128 ? '222.2 84% 4.9%' : '210 40% 98%';
      root.style.setProperty('--primary-foreground', fg);
      root.style.setProperty('--accent-foreground', fg);
    }
  }, [accentColor]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ accentColor });
      toast({ title: 'Settings saved', description: 'Appearance updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground">Customize the look and feel</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Accent Color</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Choose accent color</Label>
            <ColorPicker value={accentColor} onChange={setAccentColor} />
            <p className="text-xs text-muted-foreground">
              Affects buttons, links, and highlights across the app
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: accentColor }} />
              <div>
                <p className="font-medium" style={{ color: accentColor }}>Preview</p>
                <p className="text-xs text-muted-foreground">This is how your accent color will look</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
