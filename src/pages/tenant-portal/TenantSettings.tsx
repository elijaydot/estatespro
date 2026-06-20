import { Shield, Sparkles } from 'lucide-react';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { Badge } from '@/components/ui/badge';

export default function TenantSettings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/15 via-background to-info/10 p-5 md:p-6 card-shadow-md">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-info/20 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Account Protection</p>
              <h1 className="font-display text-2xl font-bold text-foreground">Security Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account protection and MFA preferences.</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 border-primary/30 bg-primary/5 text-primary font-display">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Secure Session
          </Badge>
        </div>
      </section>

      <SecuritySettings />
    </div>
  );
}
