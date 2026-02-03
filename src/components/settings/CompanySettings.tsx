import { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Upload, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { useCompanySettings, useUpdateCompanySettings, uploadCompanyLogo } from '@/hooks/useCompanySettings';

export function CompanySettings() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    logo_url: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_email: settings.company_email || '',
        company_phone: settings.company_phone || '',
        company_address: settings.company_address || '',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 2MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const logoUrl = await uploadCompanyLogo(file);
      setFormData(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: 'Success', description: 'Logo uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <Card className="card-shadow-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>
              Your company information appears on tenant invites and the tenant portal
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            {formData.logo_url ? (
              <AvatarImage src={formData.logo_url} alt="Company logo" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                <Building2 className="h-10 w-10" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Logo'}
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={isUploading}
              />
            </Label>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, max 2MB
            </p>
          </div>
        </div>

        {/* Company Name */}
        <div className="grid gap-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            placeholder="e.g., ABC Property Management"
          />
        </div>

        {/* Contact Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company_email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="company_email"
              type="email"
              value={formData.company_email}
              onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
              placeholder="contact@company.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company_phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone
            </Label>
            <Input
              id="company_phone"
              value={formData.company_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, company_phone: e.target.value }))}
              placeholder="+250 XX XXX XXXX"
            />
          </div>
        </div>

        {/* Address */}
        <div className="grid gap-2">
          <Label htmlFor="company_address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
          </Label>
          <Textarea
            id="company_address"
            value={formData.company_address}
            onChange={(e) => setFormData(prev => ({ ...prev, company_address: e.target.value }))}
            placeholder="Enter your company address"
            rows={2}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="gap-2"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettings.isPending ? 'Saving...' : 'Save Company Details'}
        </Button>
      </CardContent>
    </Card>
  );
}
