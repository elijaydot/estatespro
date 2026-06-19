import { useState, useEffect, useCallback } from 'react';
import { User, Upload, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

export function ProfileSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: ''
  });

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Failed to update profile';
  };

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone, avatar_url')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [fetchProfile, user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Avatar must be less than 2MB',
          variant: 'destructive'
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive'
        });
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: 'Success',
        description: 'Avatar updated successfully'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);

      // Validate inputs
      if (!profile.name.trim()) {
        toast({
          title: 'Validation error',
          description: 'Name is required',
          variant: 'destructive'
        });
        return;
      }

      if (!profile.email.trim() || !profile.email.includes('@')) {
        toast({
          title: 'Validation error',
          description: 'Valid email is required',
          variant: 'destructive'
        });
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim() || null
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      // Update auth email if changed
      if (profile.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email.trim()
        });

        if (emailError) {
          // Revert profile email on auth error
          await supabase
            .from('profiles')
            .update({ email: user?.email })
            .eq('user_id', user?.id);
          
          throw new Error('Failed to update email. Check if the email is already in use.');
        }

        toast({
          title: 'Email verification required',
          description: 'Please check your new email to confirm the change',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
      }
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your account details and avatar</p>
        </div>
        <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                <AvatarFallback className="text-lg">
                  {profile.name ? getInitials(profile.name) : <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors w-fit">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Avatar
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or WEBP. Max size 2MB.
                </p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  You'll need to verify a new email address
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+250 123 456 789"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
