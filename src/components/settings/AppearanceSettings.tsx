import { useState, useEffect } from 'react';
import { Monitor, Moon, Palette, Save, Sun, Check, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { ColorPicker } from '@/components/ui/color-picker';
import { applyAccentColor } from '@/lib/appearance';
import { cn } from '@/lib/utils';

const COLOR_PRESETS = [
  { name: 'FishGate Indigo', value: '#6366f1' },
  { name: 'Emerald Trust', value: '#10b981' },
  { name: 'Amber Horizon', value: '#f59e0b' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Rose Crimson', value: '#f43f5e' },
  { name: 'Teal Ocean', value: '#0d9488' },
  { name: 'Violet Enterprise', value: '#7c3aed' },
  { name: 'Slate Executive', value: '#475569' },
];

export function AppearanceSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && settings?.accentColor) {
      setAccentColor(settings.accentColor);
    }
  }, [settings, isLoading]);

  // Live preview accent color
  useEffect(() => {
    if (accentColor) {
      applyAccentColor(accentColor);
    }
  }, [accentColor]);

  const handleSelectPreset = (hex: string) => {
    setAccentColor(hex);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ accentColor });
      localStorage.setItem('estatepro-accent-color', accentColor);
      toast({ title: 'Appearance saved', description: 'Your visual theme and accent color have been updated across FishGate.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to persist appearance settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Appearance & Interface Theme</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customize dark mode, system contrast, and enterprise brand accent colors</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Theme Mode Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Color Theme</CardTitle>
            </div>
            {mounted && (
              <Badge variant="outline" className="text-[11px] capitalize font-mono">
                Active: {theme || 'system'}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Select light mode, OLED dark mode, or follow your operating system preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Color theme">
            {[
              { value: 'light', label: 'Light Mode', desc: 'Clean high-contrast daytime', icon: Sun },
              { value: 'dark', label: 'Dark Mode', desc: 'Eye-friendly low-glare evening', icon: Moon },
              { value: 'system', label: 'System Default', desc: 'Syncs with device OS theme', icon: Monitor },
            ].map((option) => {
              const isSelected = mounted && theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-center transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/30 font-semibold'
                      : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={isSelected}
                >
                  <option.icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-xs font-semibold">{option.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{option.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Brand Accent Color</CardTitle>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted border text-muted-foreground">
              {accentColor}
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Controls button fills, active navigation highlights, focus rings, and primary indicators across FishGate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Curated Color Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Executive Color Presets</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = accentColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectPreset(preset.value)}
                    className={cn(
                      'flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-card ring-2 ring-primary/40 shadow-xs'
                        : 'border-border/70 bg-card/60 hover:bg-muted/60'
                    )}
                  >
                    <span
                      className="h-5 w-5 rounded-lg shrink-0 flex items-center justify-center shadow-xs border border-white/20"
                      style={{ backgroundColor: preset.value }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-xs text-muted-foreground">Custom Hex Color</Label>
            <ColorPicker value={accentColor} onChange={setAccentColor} />
          </div>

          {/* Live Component Preview */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Live Component Preview
              </span>
              <span className="text-[11px] text-muted-foreground">Updates instantly</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <Button size="sm">Primary Action</Button>
              <Button size="sm" variant="outline">Secondary Action</Button>
              <Badge>Active Status</Badge>
              <Badge variant="outline">Verified Compliant</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
