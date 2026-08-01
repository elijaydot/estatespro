import { BellRing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_ALERT_THRESHOLDS,
  useAlertThresholds,
  useUpsertAlertThreshold,
  type OperationalAlertType,
} from '@/hooks/useOperationalAlerts';

const alertTypes: Array<{ type: OperationalAlertType; label: string; description: string }> = [
  { type: 'lease_expiry', label: 'Lease expiry', description: 'Warn before an active lease reaches its end date.' },
  { type: 'vacant_unit', label: 'Vacant unit', description: 'Flag units that remain vacant beyond the threshold.' },
  { type: 'overdue_payment', label: 'Overdue payment', description: 'Flag unpaid invoices after their due date.' },
  { type: 'vendor_document_expiring', label: 'Vendor document expiry', description: 'Warn before insurance, licenses, or certifications expire.' },
];

export function AlertSettings() {
  const { data: thresholds = [], isLoading } = useAlertThresholds();
  const updateThreshold = useUpsertAlertThreshold();

  const current = (type: OperationalAlertType) => thresholds.find((item) => item.alert_type === type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Operational Alerts</h2>
        <p className="text-sm text-muted-foreground">Set company-level detection windows. Changes apply to the next evaluation.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4" /> Alert rules</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {alertTypes.map(({ type, label, description }) => {
            const threshold = current(type);
            const days = threshold?.threshold_days ?? DEFAULT_ALERT_THRESHOLDS[type];
            const enabled = threshold?.enabled ?? true;
            return (
              <div key={type} className="grid gap-4 p-5 md:grid-cols-[1fr_120px_52px] md:items-center">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${type}-days`} className="text-xs">Days</Label>
                  <Input
                    key={`${type}-${days}`}
                    id={`${type}-days`}
                    type="number"
                    min={0}
                    max={3650}
                    defaultValue={days}
                    disabled={isLoading || updateThreshold.isPending}
                    onBlur={(event) => updateThreshold.mutate({
                      alert_type: type,
                      threshold_days: Math.max(0, Math.min(3650, Number(event.target.value) || 0)),
                      enabled,
                    })}
                  />
                </div>
                <Switch
                  checked={enabled}
                  disabled={isLoading || updateThreshold.isPending}
                  onCheckedChange={(checked) => updateThreshold.mutate({ alert_type: type, threshold_days: days, enabled: checked })}
                  aria-label={`Enable ${label}`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}