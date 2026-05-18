import { Shield } from 'lucide-react';
import { SecuritySettings } from '@/components/settings/SecuritySettings';

export default function TenantSettings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account protection and MFA preferences.</p>
        </div>
      </div>

      <SecuritySettings />
    </div>
  );
}
