import { CheckCircle, Clock, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PortalStatusBadgeProps {
  tenantUserId: string | null;
  hasPendingInvite?: boolean;
  compact?: boolean;
}

export function PortalStatusBadge({ tenantUserId, hasPendingInvite, compact = false }: PortalStatusBadgeProps) {
  if (tenantUserId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-success/10 text-success border-success/20 gap-1">
              <CheckCircle className="h-3 w-3" />
              {!compact && 'Linked'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tenant has linked their account and can access the portal</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasPendingInvite) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
              <Clock className="h-3 w-3" />
              {!compact && 'Invited'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Invite sent - waiting for tenant to register</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-muted text-muted-foreground gap-1">
            <UserX className="h-3 w-3" />
            {!compact && 'Not Invited'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tenant has not been invited to the portal</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
