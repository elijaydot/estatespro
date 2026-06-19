import { useState, useEffect } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ColorPicker } from '@/components/ui/color-picker';

export function LeaseDocumentSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    leaseFont: 'Georgia',
    leasePrimaryColor: '#1e3a5f',
    leaseSecondaryColor: '#2563eb',
    leaseHeaderColor: '#f0f7ff',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setFormData({
        leaseFont: settings.leaseFont,
        leasePrimaryColor: settings.leasePrimaryColor,
        leaseSecondaryColor: settings.leaseSecondaryColor,
        leaseHeaderColor: settings.leaseHeaderColor,
      });
    }
  }, [settings, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast({ title: 'Settings saved', description: 'Lease styling updated.' });
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
          <h2 className="text-xl font-semibold text-foreground">Lease Documents</h2>
          <p className="text-sm text-muted-foreground">Customize lease agreement PDF styling</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Document Styling</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Font Family</Label>
              <SearchableSelect
                options={[
                  { value: 'Georgia', label: 'Georgia', description: 'Classic serif' },
                  { value: 'Times New Roman', label: 'Times New Roman', description: 'Traditional' },
                  { value: 'Arial', label: 'Arial', description: 'Clean sans-serif' },
                  { value: 'Helvetica', label: 'Helvetica', description: 'Modern sans-serif' },
                  { value: 'Palatino', label: 'Palatino', description: 'Elegant serif' },
                  { value: 'Garamond', label: 'Garamond', description: 'Professional serif' },
                ]}
                value={formData.leaseFont}
                onValueChange={(v) => setFormData(prev => ({ ...prev, leaseFont: v }))}
                placeholder="Select font..."
                searchPlaceholder="Search fonts..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Primary Color (Headings)</Label>
              <ColorPicker
                value={formData.leasePrimaryColor}
                onChange={(c) => setFormData(prev => ({ ...prev, leasePrimaryColor: c }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Accent Color (Borders)</Label>
              <ColorPicker
                value={formData.leaseSecondaryColor}
                onChange={(c) => setFormData(prev => ({ ...prev, leaseSecondaryColor: c }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Header Background</Label>
              <ColorPicker
                value={formData.leaseHeaderColor}
                onChange={(c) => setFormData(prev => ({ ...prev, leaseHeaderColor: c }))}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-4 rounded-lg border overflow-hidden">
            <div
              className="p-4 text-center"
              style={{ backgroundColor: formData.leaseHeaderColor, borderBottom: `3px solid ${formData.leaseSecondaryColor}` }}
            >
              <h3 className="text-lg font-bold" style={{ fontFamily: formData.leaseFont, color: formData.leasePrimaryColor }}>
                RESIDENTIAL LEASE AGREEMENT
              </h3>
              <p className="text-sm" style={{ fontFamily: formData.leaseFont, color: formData.leaseSecondaryColor }}>
                Lease Preview
              </p>
            </div>
            <div className="p-4" style={{ fontFamily: formData.leaseFont }}>
              <p
                className="font-bold mb-1"
                style={{ color: formData.leasePrimaryColor, borderBottom: `1px solid ${formData.leaseSecondaryColor}`, paddingBottom: '4px' }}
              >
                PROPERTY INFORMATION
              </p>
              <p className="text-sm text-muted-foreground mt-2">Property Name: Sample Property</p>
              <p className="text-sm text-muted-foreground">Unit: A-101</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
