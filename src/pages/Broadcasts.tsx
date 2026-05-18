import { useMemo, useState } from 'react';
import { Megaphone, Send, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBroadcastAnnouncements, useSendBroadcast } from '@/hooks/useBroadcasts';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { logSecurityEvent } from '@/lib/security';

const audienceLabel: Record<string, string> = {
  all: 'All users',
  landlord: 'Landlords only',
  property_manager: 'Property managers only',
  tenant: 'Tenants only',
};

export default function Broadcasts() {
  const { isManager, isLoading: roleLoading } = useUserRole();
  const { companies, activeCompanyId } = useActiveCompany();
  const { data: broadcasts = [], isLoading } = useBroadcastAnnouncements();
  const { data: properties = [] } = useProperties();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'landlord' | 'property_manager' | 'tenant'>('all');
  const [propertyId, setPropertyId] = useState<string>('all');
  const [unitId, setUnitId] = useState<string>('all');

  const selectedPropertyId = propertyId === 'all' ? undefined : propertyId;
  const selectedUnitId = unitId === 'all' ? undefined : unitId;

  const { data: units = [] } = useUnits(selectedPropertyId);
  const sendBroadcast = useSendBroadcast();
  const { ensureAal2 } = useStepUpGuard();

  const activeCompanyName = useMemo(
    () => companies.find((company) => company.id === activeCompanyId)?.name || 'No active company',
    [companies, activeCompanyId]
  );

  const handleSend = async () => {
    const canProceed = await ensureAal2('broadcasts.send');
    if (!canProceed) return;

    sendBroadcast.mutate({
      title,
      message,
      targetRole,
      propertyId: selectedPropertyId,
      unitId: selectedUnitId,
    }, {
      onSuccess: async () => {
        await logSecurityEvent('broadcast_sent', {
          targetRole,
          propertyId: selectedPropertyId || null,
          unitId: selectedUnitId || null,
        });
      },
      onError: async (error: any) => {
        await logSecurityEvent('broadcast_send_failed', {
          targetRole,
          reason: error?.message || 'unknown',
        });
      },
    });

    setTitle('');
    setMessage('');
    setTargetRole('all');
    setPropertyId('all');
    setUnitId('all');
  };

  if (roleLoading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isManager) {
    return (
      <div className="py-10 text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Access restricted</p>
        <p className="text-sm text-muted-foreground">Only landlords and property managers can send broadcasts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Broadcasts</h1>
        <p className="text-muted-foreground mt-1">Send announcements with granular targeting by audience, property, and unit.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Building2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active Company</p>
            <p className="font-semibold text-foreground">{activeCompanyName}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            New Broadcast
          </CardTitle>
          <CardDescription>Choose who should receive this announcement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Broadcast title" />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your announcement..."
              rows={5}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={targetRole} onValueChange={(value: any) => setTargetRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="landlord">Landlords only</SelectItem>
                  <SelectItem value="property_manager">Property managers only</SelectItem>
                  <SelectItem value="tenant">Tenants only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property (optional)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit (optional)</Label>
              <Select value={unitId} onValueChange={setUnitId} disabled={!selectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedPropertyId ? 'All units' : 'Select property first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {(units || []).map((unit: any) => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="gap-2"
            onClick={handleSend}
            disabled={!title.trim() || !message.trim() || sendBroadcast.isPending || !activeCompanyId}
          >
            <Send className="h-4 w-4" />
            {sendBroadcast.isPending ? 'Sending...' : 'Send Broadcast'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Broadcasts</CardTitle>
          <CardDescription>Announcements sent for the current active company.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading broadcasts...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts sent yet for this company.</p>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((item) => (
                <div key={item.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <Badge variant="secondary">{audienceLabel[item.target_role]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
