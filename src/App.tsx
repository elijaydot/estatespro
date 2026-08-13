import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ActiveCompanyProvider } from "@/contexts/ActiveCompanyContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TenantPortalLayout } from "@/pages/tenant-portal/TenantPortalLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyMembership, usePendingMembership } from "@/hooks/useCompanies";
import { isDeviceTrusted } from "@/lib/trustedDevice";
import { useSaasAccess, type SaasEntitlementKey } from "@/hooks/useSaasAccess";
import { useActiveCompany } from "@/contexts/useActiveCompany";
import { useSuperAdminOverride } from "@/hooks/useSuperAdminOverride";
import { usePrincipalSuspension } from "@/hooks/usePrincipalSuspension";
import { useIsInternalMarketplaceReviewer } from "@/hooks/useMarketplace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmActionProvider } from "@/components/ui/confirm-action";
import { Link } from "react-router-dom";
import { LoaderCircle, Lock, RefreshCw, ShieldX } from "lucide-react";
import { ThemeProvider } from "next-themes";

import PendingApproval from "./pages/PendingApproval";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Units = lazy(() => import("./pages/Units"));
const UnitDetail = lazy(() => import("./pages/UnitDetail"));
const Tenants = lazy(() => import("./pages/Tenants"));
const TenantDetail = lazy(() => import("./pages/TenantDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const Invoices = lazy(() => import("./pages/Invoices"));
const MaintenancePage = lazy(() => import("./pages/Maintenance"));
const Settings = lazy(() => import("./pages/Settings"));
const RecurringBills = lazy(() => import("./pages/RecurringBills"));
const Leases = lazy(() => import("./pages/Leases"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorDetail = lazy(() => import("./pages/VendorDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const MessagesPageV2 = lazy(() => import("./pages/MessagesPageV2"));
const Bookings = lazy(() => import("./pages/Bookings"));
const GuestBookingPortal = lazy(() => import("./pages/GuestBookingPortal"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TenantExitWorkflow = lazy(() => import("./pages/TenantExitWorkflow"));
const TenantInventoryBaseline = lazy(() => import("./pages/TenantInventoryBaseline"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Broadcasts = lazy(() => import("./pages/Broadcasts"));
const MfaChallenge = lazy(() => import("./pages/MfaChallenge"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Tenant Portal
const TenantDashboard = lazy(() => import("./pages/tenant-portal/TenantDashboard"));
const TenantPayments = lazy(() => import("./pages/tenant-portal/TenantPayments"));
const TenantInvoices = lazy(() => import("./pages/tenant-portal/TenantInvoices"));
const TenantRecurringBills = lazy(() => import("./pages/tenant-portal/TenantRecurringBills"));
const TenantMaintenance = lazy(() => import("./pages/tenant-portal/TenantMaintenance"));
const TenantLease = lazy(() => import("./pages/tenant-portal/TenantLease"));
const TenantMessages = lazy(() => import("./pages/tenant-portal/TenantMessages"));
const TenantNotifications = lazy(() => import("./pages/tenant-portal/TenantNotifications"));
const TenantSettings = lazy(() => import("./pages/tenant-portal/TenantSettings"));
const TenantExitStatus = lazy(() => import("./pages/tenant-portal/TenantExitStatus"));
const TenantLeaseSign = lazy(() => import("./pages/tenant-portal/TenantLeaseSign"));
const TenantLogin = lazy(() => import("./pages/tenant-portal/TenantLogin"));
const TenantSignup = lazy(() => import("./pages/tenant-portal/TenantSignup"));
const TenantForgotPassword = lazy(() => import("./pages/tenant-portal/TenantForgotPassword"));
const TenantResetPassword = lazy(() => import("./pages/tenant-portal/TenantResetPassword"));
const GuestBookingPage = lazy(() => import("./pages/guest-booking/GuestBookingPage"));
const GuestBookingActionPage = lazy(() => import("./pages/guest-booking/GuestBookingActionPage"));
const MarketplacePublic = lazy(() => import("./pages/MarketplacePublic"));
const MarketplaceManage = lazy(() => import("./pages/MarketplaceManage"));
const MarketplaceVerification = lazy(() => import("./pages/MarketplaceVerification"));
const MarketplaceReviewerQueue = lazy(() => import("./pages/MarketplaceReviewerQueue"));
const MarketplaceCrmOverview = lazy(() => import("./pages/marketplace-crm/Overview"));
const MarketplaceCrmReports = lazy(() => import("./pages/marketplace-crm/Reports"));
const MarketplaceCrmAutomation = lazy(() => import("./pages/marketplace-crm/Automation"));
const MarketplaceCrmModules = lazy(() => import("./pages/marketplace-crm/Modules"));
const MarketplaceCrmLeads = lazy(() => import("./pages/marketplace-crm/Leads"));
const MarketplaceCrmContacts = lazy(() => import("./pages/marketplace-crm/Contacts"));
const MarketplaceCrmAccounts = lazy(() => import("./pages/marketplace-crm/Accounts"));
const MarketplaceCrmDeals = lazy(() => import("./pages/marketplace-crm/Deals"));
const MarketplaceCrmTasks = lazy(() => import("./pages/marketplace-crm/Tasks"));
const MarketplaceCrmMeetings = lazy(() => import("./pages/marketplace-crm/Meetings"));
const MarketplaceCrmCalls = lazy(() => import("./pages/marketplace-crm/Calls"));
const MarketplaceCrmCampaigns = lazy(() => import("./pages/marketplace-crm/Campaigns"));
const MarketplaceCrmDocuments = lazy(() => import("./pages/marketplace-crm/Documents"));
const MarketplaceCrmVisits = lazy(() => import("./pages/marketplace-crm/Visits"));
const MarketplaceCrmProjects = lazy(() => import("./pages/marketplace-crm/Projects"));
const SuperAdminControlPlane = lazy(() => import("./pages/SuperAdminControlPlane"));
const CatalogManagement = lazy(() => import("./pages/CatalogManagement"));
const AccountBilling = lazy(() => import("./pages/AccountBilling"));
const OwnerPortal = lazy(() => import("./pages/OwnerPortal"));
const OwnerBillingGroup360 = lazy(() => import("./pages/OwnerBillingGroup360"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));

const queryClient = new QueryClient();

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<FullPageLoading />}>{node}</Suspense>;
}

function FullPageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground" role="status">
      <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      <span>Preparing your secure workspace...</span>
    </div>
  );
}

function useLoadingTimeout(isLoading: boolean, timeoutMs = 12_000) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, timeoutMs]);

  return timedOut;
}

function AccessCheckUnavailable() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-lg border-border/70">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <ShieldX className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">We could not verify access</h1>
            <p className="text-sm text-muted-foreground">
              The security check is taking longer than expected. Your access has not been changed.
            </p>
          </div>
          <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => void logout()}>Sign out</Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry access check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureLockedPage({ featureName }: { featureName: string }) {
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <Card className="border-border/70">
        <CardContent className="py-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">{featureName} is not included in your current plan</p>
          <p className="text-sm text-muted-foreground">
            Upgrade your subscription to unlock this module for your active company.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link to="/settings?tab=billing">Open Billing & Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessSuspendedPage({ scope }: { scope: 'account' | 'company' }) {
  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <Card className="border-destructive/40">
        <CardContent className="py-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-lg font-semibold text-foreground">Access suspended</p>
          <p className="text-sm text-muted-foreground">
            {scope === 'company'
              ? 'Your current company workspace is temporarily suspended. Contact support for reactivation.'
              : 'Your account is temporarily suspended. Contact support for reactivation.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureRoute({
  entitlementKey,
  featureName,
  children,
}: {
  entitlementKey: SaasEntitlementKey;
  featureName: string;
  children: ReactNode;
}) {
  const { activeCompanyId } = useActiveCompany();
  const { isOverrideActive, isLoadingRole } = useSuperAdminOverride();
  const { entitlements, isLoading } = useSaasAccess();
  const accessLoading = isLoadingRole || isLoading;
  const loadingTimedOut = useLoadingTimeout(accessLoading);

  if (accessLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (isOverrideActive) {
    return <>{children}</>;
  }

  if (!activeCompanyId) {
    return <FeatureLockedPage featureName={featureName} />;
  }

  if (!entitlements[entitlementKey]) {
    return <FeatureLockedPage featureName={featureName} />;
  }

  return <>{children}</>;
}

function OwnerPortalRoute({ children }: { children: ReactNode }) {
  const { role, isLoading } = useUserRole();
  const loadingTimedOut = useLoadingTimeout(isLoading);

  if (isLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }
  if (role !== 'landlord' && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <FeatureRoute entitlementKey="portal.owner.enabled" featureName="Owner / Investor Portal">
      {children}
    </FeatureRoute>
  );
}

function MarketplaceReviewerRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const reviewerAccess = useIsInternalMarketplaceReviewer(user?.id);
  const isLoading = role !== 'super_admin' && reviewerAccess.isLoading;
  const loadingTimedOut = useLoadingTimeout(isLoading);

  if (isLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (role !== 'super_admin' && !reviewerAccess.data) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl">
        <Card className="border-border/70">
          <CardContent className="py-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShieldX className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold text-foreground">Reviewer access required</p>
            <p className="text-sm text-muted-foreground">
              Marketplace governance is limited to assigned reviewers and platform administrators.
            </p>
            <Button asChild variant="outline"><Link to="/dashboard">Return to dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading, isPropertyManager, isTenant } = useUserRole();
  const { activeCompanyId, isLoading: companyLoading, isResolved: companyResolved } = useActiveCompany();
  const { data: membership, isLoading: membershipLoading } = useMyMembership(activeCompanyId);
  const { data: pendingMembership, isLoading: pendingMembershipLoading } = usePendingMembership();
  const userSuspension = usePrincipalSuspension('user', user?.id, Boolean(user?.id));
  const companySuspension = usePrincipalSuspension('company', activeCompanyId, Boolean(activeCompanyId));
  const location = useLocation();
  const accessLoading = authLoading || roleLoading || companyLoading || !companyResolved || membershipLoading || pendingMembershipLoading || mfa.isLoading || userSuspension.isLoading || companySuspension.isLoading;
  const loadingTimedOut = useLoadingTimeout(accessLoading);

  if (accessLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isTenant) {
    return <Navigate to="/tenant" replace />;
  }

  if (role !== "landlord" && role !== "property_manager" && role !== "super_admin") {
    return <Navigate to="/login" replace />;
  }

  if (userSuspension.data) {
    return <AccessSuspendedPage scope="account" />;
  }

  if (role !== 'super_admin' && companySuspension.data) {
    return <AccessSuspendedPage scope="company" />;
  }

  const trusted = isDeviceTrusted(user?.id);
  if (mfa.needsChallenge && !trusted && location.pathname !== "/mfa-challenge") {
    return <Navigate to="/mfa-challenge" replace />;
  }

  if ((role === "landlord" || role === "property_manager") && !mfa.isEnabled && location.pathname !== "/settings") {
    return <Navigate to="/settings?tab=security&enforce_mfa=1" replace />;
  }

  if (isPropertyManager && !membership && pendingMembership) {
    return <PendingApproval />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function TenantPortalRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const userSuspension = usePrincipalSuspension('user', user?.id, Boolean(user?.id));
  const companySuspension = usePrincipalSuspension('company', activeCompanyId, Boolean(activeCompanyId));
  const accessLoading = authLoading || roleLoading || mfa.isLoading || userSuspension.isLoading || companySuspension.isLoading;
  const loadingTimedOut = useLoadingTimeout(accessLoading);

  if (accessLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/tenant/login" replace />;
  }

  if (role !== "tenant") {
    return <Navigate to="/dashboard" replace />;
  }

  if (userSuspension.data) {
    return <AccessSuspendedPage scope="account" />;
  }

  if (companySuspension.data) {
    return <AccessSuspendedPage scope="company" />;
  }

  if (mfa.needsChallenge && !isDeviceTrusted(user?.id)) {
    return <Navigate to="/mfa-challenge" replace />;
  }

  return <TenantPortalLayout>{children}</TenantPortalLayout>;
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const accessLoading = authLoading || roleLoading;
  const loadingTimedOut = useLoadingTimeout(accessLoading);

  if (accessLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const accessLoading = authLoading || roleLoading;
  const loadingTimedOut = useLoadingTimeout(accessLoading);

  if (accessLoading) {
    return loadingTimedOut ? <AccessCheckUnavailable /> : <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === "tenant") {
    return <TenantPortalLayout>{children}</TenantPortalLayout>;
  }

  return <AppLayout>{children}</AppLayout>;
}

function MfaChallengeRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading || mfa.isLoading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to={role === "tenant" ? "/tenant/login" : "/login"} replace />;
  }

  // If challenge is no longer required (or device became trusted), return to role home.
  if (!mfa.needsChallenge || isDeviceTrusted(user?.id)) {
    return <Navigate to={role === "tenant" ? "/tenant" : "/dashboard"} replace />;
  }

  // Intentionally no AppLayout/TenantPortalLayout to match login-style flow.
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading || mfa.isLoading) {
    return <FullPageLoading />;
  }

  if (isAuthenticated) {
    if (mfa.needsChallenge && !isDeviceTrusted(user?.id)) {
      return <Navigate to="/mfa-challenge" replace />;
    }
    return <Navigate to={role === "tenant" ? "/tenant" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute>{withSuspense(<Login />)}</PublicRoute>} />
      <Route path="/signup" element={<PublicRoute>{withSuspense(<Signup />)}</PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute>{withSuspense(<ForgotPassword />)}</PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute>{withSuspense(<ResetPassword />)}</PublicRoute>} />
      <Route path="/mfa-challenge" element={<MfaChallengeRoute>{withSuspense(<MfaChallenge />)}</MfaChallengeRoute>} />
      <Route path="/book/:propertyId" element={withSuspense(<GuestBookingPage />)} />
      <Route path="/bookings/guest-action" element={withSuspense(<GuestBookingActionPage />)} />
      <Route path="/marketplace" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/marketplace/:idOrSlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug/:areaSlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug/:areaSlug/:idOrSlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/api/docs" element={withSuspense(<ApiDocs />)} />

      <Route path="/dashboard" element={<PrivateRoute>{withSuspense(<Dashboard />)}</PrivateRoute>} />
      <Route path="/team" element={<PrivateRoute>{withSuspense(<TeamManagement />)}</PrivateRoute>} />
      <Route path="/properties" element={<PrivateRoute>{withSuspense(<Properties />)}</PrivateRoute>} />
      <Route path="/properties/:id" element={<PrivateRoute>{withSuspense(<PropertyDetail />)}</PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute>{withSuspense(<Units />)}</PrivateRoute>} />
      <Route path="/units/:id" element={<PrivateRoute>{withSuspense(<UnitDetail />)}</PrivateRoute>} />
      <Route path="/tenants" element={<PrivateRoute>{withSuspense(<Tenants />)}</PrivateRoute>} />
      <Route path="/tenants/:id" element={<PrivateRoute>{withSuspense(<TenantDetail />)}</PrivateRoute>} />
      <Route path="/tenant-exit/:exitId" element={<PrivateRoute>{withSuspense(<TenantExitWorkflow />)}</PrivateRoute>} />
      <Route path="/tenant-inventory-baseline/:tenantId" element={<PrivateRoute>{withSuspense(<TenantInventoryBaseline />)}</PrivateRoute>} />
      <Route path="/leases" element={<PrivateRoute>{withSuspense(<Leases />)}</PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute>{withSuspense(<Invoices />)}</PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute>{withSuspense(<Payments />)}</PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute>{withSuspense(<MaintenancePage />)}</PrivateRoute>} />
      <Route path="/recurring-bills" element={<PrivateRoute>{withSuspense(<RecurringBills />)}</PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute>{withSuspense(<MessagesPageV2 />)}</PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute>{withSuspense(<Bookings />)}</PrivateRoute>} />
      <Route
        path="/marketplace/manage"
        element={<PrivateRoute><FeatureRoute entitlementKey="marketplace.listings.manage" featureName="Marketplace">{withSuspense(<MarketplaceManage />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/verification"
        element={<PrivateRoute><FeatureRoute entitlementKey="marketplace.verification.manage" featureName="Marketplace Verification">{withSuspense(<MarketplaceVerification />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/reviewer"
        element={<PrivateRoute><FeatureRoute entitlementKey="marketplace.moderation.view" featureName="Marketplace Reviewer Console"><MarketplaceReviewerRoute>{withSuspense(<MarketplaceReviewerQueue />)}</MarketplaceReviewerRoute></FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM">{withSuspense(<MarketplaceCrmOverview />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/reports"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Reports">{withSuspense(<MarketplaceCrmReports />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/automation"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.automation.manage" featureName="Marketplace CRM Automation">{withSuspense(<MarketplaceCrmAutomation />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/modules"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.automation.manage" featureName="Marketplace CRM Modules">{withSuspense(<MarketplaceCrmModules />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/leads"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Leads">{withSuspense(<MarketplaceCrmLeads />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/contacts"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Contacts">{withSuspense(<MarketplaceCrmContacts />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/accounts"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Accounts">{withSuspense(<MarketplaceCrmAccounts />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/deals"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.deals.manage" featureName="Marketplace CRM Deals">{withSuspense(<MarketplaceCrmDeals />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/tasks"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.calls_meetings.manage" featureName="Marketplace CRM Tasks">{withSuspense(<MarketplaceCrmTasks />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/meetings"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.calls_meetings.manage" featureName="Marketplace CRM Meetings">{withSuspense(<MarketplaceCrmMeetings />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/calls"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.calls_meetings.manage" featureName="Marketplace CRM Calls">{withSuspense(<MarketplaceCrmCalls />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/campaigns"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.automation.manage" featureName="Marketplace CRM Campaigns">{withSuspense(<MarketplaceCrmCampaigns />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/documents"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Documents">{withSuspense(<MarketplaceCrmDocuments />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/visits"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Visits">{withSuspense(<MarketplaceCrmVisits />)}</FeatureRoute></PrivateRoute>}
      />
      <Route
        path="/marketplace/crm/projects"
        element={<PrivateRoute><FeatureRoute entitlementKey="crm.leads.manage" featureName="Marketplace CRM Projects">{withSuspense(<MarketplaceCrmProjects />)}</FeatureRoute></PrivateRoute>}
      />
      <Route path="/guest-booking-portal" element={<PrivateRoute>{withSuspense(<GuestBookingPortal />)}</PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute>{withSuspense(<Notifications />)}</PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute>{withSuspense(<Alerts />)}</PrivateRoute>} />
      <Route path="/vendors" element={<PrivateRoute>{withSuspense(<Vendors />)}</PrivateRoute>} />
      <Route path="/vendors/:id" element={<PrivateRoute>{withSuspense(<VendorDetail />)}</PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute>{withSuspense(<Reports />)}</PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute>{withSuspense(<Settings />)}</PrivateRoute>} />
      <Route path="/owner-portal" element={<PrivateRoute><OwnerPortalRoute>{withSuspense(<OwnerPortal />)}</OwnerPortalRoute></PrivateRoute>} />
      <Route path="/account/billing" element={<PrivateRoute>{withSuspense(<AccountBilling />)}</PrivateRoute>} />
      <Route path="/upgrade" element={<PrivateRoute>{withSuspense(<Upgrade />)}</PrivateRoute>} />
      <Route path="/support" element={<PrivateRoute>{withSuspense(<HelpSupport />)}</PrivateRoute>} />
      <Route path="/broadcasts" element={<PrivateRoute>{withSuspense(<Broadcasts />)}</PrivateRoute>} />
      <Route path="/super-admin/control-plane" element={<SuperAdminRoute>{withSuspense(<SuperAdminControlPlane />)}</SuperAdminRoute>} />
      <Route path="/super-admin/catalog" element={<SuperAdminRoute>{withSuspense(<CatalogManagement />)}</SuperAdminRoute>} />
      <Route path="/super-admin/billing-groups" element={<SuperAdminRoute>{withSuspense(<OwnerBillingGroup360 />)}</SuperAdminRoute>} />

      <Route path="/tenant/login" element={withSuspense(<TenantLogin />)} />
      <Route path="/tenant/signup" element={withSuspense(<TenantSignup />)} />
      <Route path="/tenant/forgot-password" element={withSuspense(<TenantForgotPassword />)} />
      <Route path="/tenant/reset-password" element={withSuspense(<TenantResetPassword />)} />
      <Route path="/tenant" element={<TenantPortalRoute>{withSuspense(<TenantDashboard />)}</TenantPortalRoute>} />
      <Route path="/tenant/payments" element={<TenantPortalRoute>{withSuspense(<TenantPayments />)}</TenantPortalRoute>} />
      <Route path="/tenant/invoices" element={<TenantPortalRoute>{withSuspense(<TenantInvoices />)}</TenantPortalRoute>} />
      <Route path="/tenant/recurring-bills" element={<TenantPortalRoute>{withSuspense(<TenantRecurringBills />)}</TenantPortalRoute>} />
      <Route path="/tenant/maintenance" element={<TenantPortalRoute>{withSuspense(<TenantMaintenance />)}</TenantPortalRoute>} />
      <Route path="/tenant/lease" element={<TenantPortalRoute>{withSuspense(<TenantLease />)}</TenantPortalRoute>} />
      <Route path="/tenant/lease/sign/:id" element={<TenantPortalRoute>{withSuspense(<TenantLeaseSign />)}</TenantPortalRoute>} />
      <Route path="/tenant/messages" element={<TenantPortalRoute>{withSuspense(<TenantMessages />)}</TenantPortalRoute>} />
      <Route path="/tenant/notifications" element={<TenantPortalRoute>{withSuspense(<TenantNotifications />)}</TenantPortalRoute>} />
      <Route path="/tenant/settings" element={<TenantPortalRoute>{withSuspense(<TenantSettings />)}</TenantPortalRoute>} />
      <Route path="/tenant/exit" element={<TenantPortalRoute>{withSuspense(<TenantExitStatus />)}</TenantPortalRoute>} />
      <Route path="/tenant/support" element={<TenantPortalRoute>{withSuspense(<HelpSupport />)}</TenantPortalRoute>} />

      <Route path="/portal" element={<Navigate to="/tenant" replace />} />
      <Route path="/portal/*" element={<Navigate to="/tenant" replace />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={withSuspense(<NotFound />)} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="fishgate-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <ActiveCompanyProvider>
              <ConfirmActionProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </ConfirmActionProvider>
            </ActiveCompanyProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
