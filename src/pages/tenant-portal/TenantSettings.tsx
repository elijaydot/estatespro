import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { PageHeader } from '@/components/shared/PageHeader';

export default function TenantSettings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader eyebrow="Account Protection" title="Security Settings" description="Manage your account protection and MFA preferences." />

      <SecuritySettings />
    </div>
  );
}
