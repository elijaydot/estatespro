import { CheckCircle, Clock, UserX } from 'lucide-react';
import { StatusPill } from '@/components/shared/StatusPill';
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
            <StatusPill variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {!compact && 'Linked'}
            </StatusPill>
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
            <StatusPill variant="warning" className="gap-1">
              <Clock className="h-3 w-3" />
              {!compact && 'Invited'}
            </StatusPill>
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
          <StatusPill className="gap-1">
            <UserX className="h-3 w-3" />
            {!compact && 'Not Invited'}
          </StatusPill>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tenant has not been invited to the portal</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
