import { useState, useEffect, useCallback } from 'react';
import { Bell, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

export function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailPayments: true,
    emailMaintenance: true,
    emailLeaseExpiry: true,
    emailTenantInvites: true,
    inAppPayments: true,
    inAppMaintenance: true,
    inAppLeaseExpiry: true,
    inAppMessages: true,
  });

  const fetchPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('email_payments, email_maintenance, email_lease_expiry, email_tenant_invites, in_app_payments, in_app_maintenance, in_app_lease_expiry, in_app_messages')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          emailPayments: data.email_payments ?? true,
          emailMaintenance: data.email_maintenance ?? true,
          emailLeaseExpiry: data.email_lease_expiry ?? true,
          emailTenantInvites: data.email_tenant_invites ?? true,
          inAppPayments: data.in_app_payments ?? true,
          inAppMaintenance: data.in_app_maintenance ?? true,
          inAppLeaseExpiry: data.in_app_lease_expiry ?? true,
          inAppMessages: data.in_app_messages ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [fetchPreferences, user]);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('app_settings')
        .update({
          email_payments: preferences.emailPayments,
          email_maintenance: preferences.emailMaintenance,
          email_lease_expiry: preferences.emailLeaseExpiry,
          email_tenant_invites: preferences.emailTenantInvites,
          in_app_payments: preferences.inAppPayments,
          in_app_maintenance: preferences.inAppMaintenance,
          in_app_lease_expiry: preferences.inAppLeaseExpiry,
          in_app_messages: preferences.inAppMessages,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({ 
        title: 'Preferences saved', 
        description: 'Notification preferences updated successfully.' 
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Control how and when you get notified</p>
        </div>
        <Button onClick={handleSave} size="sm" className="gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Email Notifications</CardTitle>
          </div>
          <CardDescription>Choose which events trigger email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'emailPayments' as const, label: 'Payment confirmations', desc: 'When a payment is recorded or confirmed' },
            { key: 'emailMaintenance' as const, label: 'Maintenance updates', desc: 'When maintenance requests change status' },
            { key: 'emailLeaseExpiry' as const, label: 'Lease expiry reminders', desc: 'Upcoming lease expirations and renewals' },
            { key: 'emailTenantInvites' as const, label: 'Tenant invite activity', desc: 'When tenants accept or reject invitations' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={preferences[key]} onCheckedChange={() => handleToggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">In-App Notifications</CardTitle>
          </div>
          <CardDescription>Notifications shown within the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'inAppPayments' as const, label: 'Payments', desc: 'Payment received and overdue alerts' },
            { key: 'inAppMaintenance' as const, label: 'Maintenance', desc: 'New requests and status changes' },
            { key: 'inAppLeaseExpiry' as const, label: 'Lease expiry', desc: 'Expiring leases and renewal reminders' },
            { key: 'inAppMessages' as const, label: 'Messages', desc: 'New messages from tenants' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch checked={preferences[key]} onCheckedChange={() => handleToggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
