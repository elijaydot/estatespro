import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ActiveCompanyProvider } from "@/contexts/ActiveCompanyContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TenantPortalLayout } from "@/pages/tenant-portal/TenantPortalLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyMembership } from "@/hooks/useCompanies";
import { isDeviceTrusted } from "@/lib/trustedDevice";

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
const Reports = lazy(() => import("./pages/Reports"));
const MessagesPageV2 = lazy(() => import("./pages/MessagesPageV2"));
const Bookings = lazy(() => import("./pages/Bookings"));
const GuestBookingPortal = lazy(() => import("./pages/GuestBookingPortal"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TenantExitWorkflow = lazy(() => import("./pages/TenantExitWorkflow"));
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
const TenantLeaseSign = lazy(() => import("./pages/tenant-portal/TenantLeaseSign"));
const TenantLogin = lazy(() => import("./pages/tenant-portal/TenantLogin"));
const TenantSignup = lazy(() => import("./pages/tenant-portal/TenantSignup"));
const TenantForgotPassword = lazy(() => import("./pages/tenant-portal/TenantForgotPassword"));
const TenantResetPassword = lazy(() => import("./pages/tenant-portal/TenantResetPassword"));
const GuestBookingPage = lazy(() => import("./pages/guest-booking/GuestBookingPage"));
const GuestBookingActionPage = lazy(() => import("./pages/guest-booking/GuestBookingActionPage"));
const MarketplacePublic = lazy(() => import("./pages/MarketplacePublic"));
const MarketplaceManage = lazy(() => import("./pages/MarketplaceManage"));
const MarketplaceModeration = lazy(() => import("./pages/MarketplaceModeration"));
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

const queryClient = new QueryClient();

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<FullPageLoading />}>{node}</Suspense>;
}

function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading, isPropertyManager, isTenant } = useUserRole();
  const { data: membership, isLoading: membershipLoading } = useMyMembership();
  const location = useLocation();

  if (authLoading || roleLoading || membershipLoading || mfa.isLoading) {
    return <FullPageLoading />;
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

  const trusted = isDeviceTrusted(user?.id);
  if (mfa.needsChallenge && !trusted && location.pathname !== "/mfa-challenge") {
    return <Navigate to="/mfa-challenge" replace />;
  }

  if ((role === "landlord" || role === "property_manager") && !mfa.isEnabled && location.pathname !== "/settings") {
    return <Navigate to="/settings?tab=security&enforce_mfa=1" replace />;
  }

  if (isPropertyManager && membership) {
    if (membership.status !== "approved") {
      return <PendingApproval />;
    }
  }

  return <AppLayout>{children}</AppLayout>;
}

function TenantPortalRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, mfa, user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading || mfa.isLoading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/tenant/login" replace />;
  }

  if (role !== "tenant") {
    return <Navigate to="/dashboard" replace />;
  }

  if (mfa.needsChallenge && !isDeviceTrusted(user?.id)) {
    return <Navigate to="/mfa-challenge" replace />;
  }

  return <TenantPortalLayout>{children}</TenantPortalLayout>;
}

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === "tenant") {
    return <TenantPortalLayout>{children}</TenantPortalLayout>;
  }

  return <AppLayout>{children}</AppLayout>;
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
      <Route path="/mfa-challenge" element={<AuthenticatedRoute>{withSuspense(<MfaChallenge />)}</AuthenticatedRoute>} />
      <Route path="/book/:propertyId" element={withSuspense(<GuestBookingPage />)} />
      <Route path="/bookings/guest-action" element={withSuspense(<GuestBookingActionPage />)} />
      <Route path="/marketplace" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/marketplace/:idOrSlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug/:areaSlug" element={withSuspense(<MarketplacePublic />)} />
      <Route path="/rent/:citySlug/:areaSlug/:idOrSlug" element={withSuspense(<MarketplacePublic />)} />

      <Route path="/dashboard" element={<PrivateRoute>{withSuspense(<Dashboard />)}</PrivateRoute>} />
      <Route path="/team" element={<PrivateRoute>{withSuspense(<TeamManagement />)}</PrivateRoute>} />
      <Route path="/properties" element={<PrivateRoute>{withSuspense(<Properties />)}</PrivateRoute>} />
      <Route path="/properties/:id" element={<PrivateRoute>{withSuspense(<PropertyDetail />)}</PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute>{withSuspense(<Units />)}</PrivateRoute>} />
      <Route path="/units/:id" element={<PrivateRoute>{withSuspense(<UnitDetail />)}</PrivateRoute>} />
      <Route path="/tenants" element={<PrivateRoute>{withSuspense(<Tenants />)}</PrivateRoute>} />
      <Route path="/tenants/:id" element={<PrivateRoute>{withSuspense(<TenantDetail />)}</PrivateRoute>} />
      <Route path="/tenant-exit/:exitId" element={<PrivateRoute>{withSuspense(<TenantExitWorkflow />)}</PrivateRoute>} />
      <Route path="/leases" element={<PrivateRoute>{withSuspense(<Leases />)}</PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute>{withSuspense(<Invoices />)}</PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute>{withSuspense(<Payments />)}</PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute>{withSuspense(<MaintenancePage />)}</PrivateRoute>} />
      <Route path="/recurring-bills" element={<PrivateRoute>{withSuspense(<RecurringBills />)}</PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute>{withSuspense(<MessagesPageV2 />)}</PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute>{withSuspense(<Bookings />)}</PrivateRoute>} />
      <Route path="/marketplace/manage" element={<PrivateRoute>{withSuspense(<MarketplaceManage />)}</PrivateRoute>} />
      <Route path="/marketplace/moderation" element={<PrivateRoute>{withSuspense(<MarketplaceModeration />)}</PrivateRoute>} />
      <Route path="/marketplace/verification" element={<PrivateRoute>{withSuspense(<MarketplaceVerification />)}</PrivateRoute>} />
      <Route path="/marketplace/reviewer" element={<PrivateRoute>{withSuspense(<MarketplaceReviewerQueue />)}</PrivateRoute>} />
      <Route path="/marketplace/crm" element={<PrivateRoute>{withSuspense(<MarketplaceCrmOverview />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/reports" element={<PrivateRoute>{withSuspense(<MarketplaceCrmReports />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/automation" element={<PrivateRoute>{withSuspense(<MarketplaceCrmAutomation />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/modules" element={<PrivateRoute>{withSuspense(<MarketplaceCrmModules />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/leads" element={<PrivateRoute>{withSuspense(<MarketplaceCrmLeads />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/contacts" element={<PrivateRoute>{withSuspense(<MarketplaceCrmContacts />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/accounts" element={<PrivateRoute>{withSuspense(<MarketplaceCrmAccounts />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/deals" element={<PrivateRoute>{withSuspense(<MarketplaceCrmDeals />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/tasks" element={<PrivateRoute>{withSuspense(<MarketplaceCrmTasks />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/meetings" element={<PrivateRoute>{withSuspense(<MarketplaceCrmMeetings />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/calls" element={<PrivateRoute>{withSuspense(<MarketplaceCrmCalls />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/campaigns" element={<PrivateRoute>{withSuspense(<MarketplaceCrmCampaigns />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/documents" element={<PrivateRoute>{withSuspense(<MarketplaceCrmDocuments />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/visits" element={<PrivateRoute>{withSuspense(<MarketplaceCrmVisits />)}</PrivateRoute>} />
      <Route path="/marketplace/crm/projects" element={<PrivateRoute>{withSuspense(<MarketplaceCrmProjects />)}</PrivateRoute>} />
      <Route path="/guest-booking-portal" element={<PrivateRoute>{withSuspense(<GuestBookingPortal />)}</PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute>{withSuspense(<Notifications />)}</PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute>{withSuspense(<Reports />)}</PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute>{withSuspense(<Settings />)}</PrivateRoute>} />
      <Route path="/support" element={<PrivateRoute>{withSuspense(<HelpSupport />)}</PrivateRoute>} />
      <Route path="/broadcasts" element={<PrivateRoute>{withSuspense(<Broadcasts />)}</PrivateRoute>} />

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
      <Route path="/tenant/support" element={<TenantPortalRoute>{withSuspense(<HelpSupport />)}</TenantPortalRoute>} />

      <Route path="/portal" element={<Navigate to="/tenant" replace />} />
      <Route path="/portal/*" element={<Navigate to="/tenant" replace />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={withSuspense(<NotFound />)} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <ActiveCompanyProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ActiveCompanyProvider>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
