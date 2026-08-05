import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { useIsInternalMarketplaceReviewer } from '@/hooks/useMarketplace';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { useUserRole } from '@/hooks/useUserRole';
import {
  getAvailableWorkspaceIds,
  getOwnedWorkspaceId,
  getWorkspaceLandingPath,
  isWorkspaceAvailable,
  resolveStaffWorkspaceId,
  type StaffWorkspaceId,
  type WorkspaceAccess,
} from '@/lib/workspaceNavigation';

const LAST_WORKSPACE_STORAGE_KEY = 'fishgate_last_staff_workspace';

function getStoredWorkspaceId() {
  try {
    return window.sessionStorage.getItem(LAST_WORKSPACE_STORAGE_KEY) as StaffWorkspaceId | null;
  } catch {
    return null;
  }
}

export function useWorkspaceNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { role, isSuperAdmin } = useUserRole();
  const { entitlements, isLoading: entitlementsLoading } = useSaasAccess();
  const reviewerAccess = useIsInternalMarketplaceReviewer(user?.id);
  const [lastWorkspaceId, setLastWorkspaceId] = useState<StaffWorkspaceId | null>(getStoredWorkspaceId);
  const canReviewMarketplace = isSuperAdmin || reviewerAccess.data === true;
  const access = useMemo<WorkspaceAccess>(() => ({
    role,
    isSuperAdmin,
    canReviewMarketplace,
    entitlements,
  }), [canReviewMarketplace, entitlements, isSuperAdmin, role]);
  const ownedWorkspaceId = getOwnedWorkspaceId(location.pathname);
  const currentWorkspaceId = resolveStaffWorkspaceId(location.pathname, access, lastWorkspaceId);
  const availableWorkspaceIds = getAvailableWorkspaceIds(access);

  useEffect(() => {
    if (!ownedWorkspaceId || !isWorkspaceAvailable(ownedWorkspaceId, access)) return;

    setLastWorkspaceId(ownedWorkspaceId);
    try {
      window.sessionStorage.setItem(LAST_WORKSPACE_STORAGE_KEY, ownedWorkspaceId);
    } catch {
      // Route ownership still controls the current workspace when storage is unavailable.
    }
  }, [access, ownedWorkspaceId]);

  return {
    access,
    availableWorkspaceIds,
    currentWorkspaceId,
    getLandingPath: (workspaceId: StaffWorkspaceId) => getWorkspaceLandingPath(workspaceId, access),
    isLoading: entitlementsLoading || (!isSuperAdmin && reviewerAccess.isLoading),
  };
}