import { useState, useEffect } from 'react';
import { Monitor, Moon, Palette, Save, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { ColorPicker } from '@/components/ui/color-picker';
import { applyAccentColor } from '@/lib/appearance';

export function AppearanceSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const { theme, setTheme } = useTheme();
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAccentColor(settings.accentColor);
    }
  }, [settings, isLoading]);

  // Live preview accent color
  useEffect(() => {
    applyAccentColor(accentColor);
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
            <Sun className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Color Theme</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Color theme">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={theme === option.value ? 'default' : 'outline'}
                className="h-auto min-h-16 flex-col gap-1.5 px-2 py-3"
                onClick={() => setTheme(option.value)}
                aria-pressed={theme === option.value}
              >
                <option.icon className="h-4 w-4" />
                <span className="text-xs">{option.label}</span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            System follows your device appearance automatically.
          </p>
        </CardContent>
      </Card>

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
