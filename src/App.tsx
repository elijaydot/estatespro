import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TenantPortalLayout } from "@/pages/tenant-portal/TenantPortalLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyMembership } from "@/hooks/useCompanies";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Units from "./pages/Units";
import UnitDetail from "./pages/UnitDetail";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import Payments from "./pages/Payments";
import Invoices from "./pages/Invoices";
import MaintenancePage from "./pages/Maintenance";
import Settings from "./pages/Settings";
import RecurringBills from "./pages/RecurringBills";
import Leases from "./pages/Leases";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import MessagesPageV2 from "./pages/MessagesPageV2";
import Bookings from "./pages/Bookings";
import TeamManagement from "./pages/TeamManagement";
import TenantExitWorkflow from "./pages/TenantExitWorkflow";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";

// Tenant Portal
import TenantDashboard from "./pages/tenant-portal/TenantDashboard";
import TenantPayments from "./pages/tenant-portal/TenantPayments";
import TenantInvoices from "./pages/tenant-portal/TenantInvoices";
import TenantRecurringBills from "./pages/tenant-portal/TenantRecurringBills";
import TenantMaintenance from "./pages/tenant-portal/TenantMaintenance";
import TenantLease from "./pages/tenant-portal/TenantLease";
import TenantMessages from "./pages/tenant-portal/TenantMessages";
import TenantLeaseSign from "./pages/tenant-portal/TenantLeaseSign";
import TenantLogin from "./pages/tenant-portal/TenantLogin";
import TenantSignup from "./pages/tenant-portal/TenantSignup";
import TenantForgotPassword from "./pages/tenant-portal/TenantForgotPassword";
import TenantResetPassword from "./pages/tenant-portal/TenantResetPassword";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { role, isLoading: roleLoading, isPropertyManager } = useUserRole();
  const { data: membership, isLoading: membershipLoading } = useMyMembership();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If PM, check membership status
  if (!roleLoading && !membershipLoading && isPropertyManager && membership) {
    if (membership.status !== 'approved') {
      return <PendingApproval />;
    }
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function TenantPortalRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/tenant/login" replace />;
  }
  
  return <TenantPortalLayout>{children}</TenantPortalLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/team" element={<PrivateRoute><TeamManagement /></PrivateRoute>} />
      <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
      <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute><Units /></PrivateRoute>} />
      <Route path="/units/:id" element={<PrivateRoute><UnitDetail /></PrivateRoute>} />
      <Route path="/tenants" element={<PrivateRoute><Tenants /></PrivateRoute>} />
      <Route path="/tenants/:id" element={<PrivateRoute><TenantDetail /></PrivateRoute>} />
      <Route path="/tenant-exit/:exitId" element={<PrivateRoute><TenantExitWorkflow /></PrivateRoute>} />
      <Route path="/leases" element={<PrivateRoute><Leases /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute><MaintenancePage /></PrivateRoute>} />
      <Route path="/recurring-bills" element={<PrivateRoute><RecurringBills /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><MessagesPageV2 /></PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      
      {/* Tenant Portal Routes */}
      <Route path="/tenant/login" element={<TenantLogin />} />
      <Route path="/tenant/signup" element={<TenantSignup />} />
      <Route path="/tenant/forgot-password" element={<TenantForgotPassword />} />
      <Route path="/tenant/reset-password" element={<TenantResetPassword />} />
      <Route path="/tenant" element={<TenantPortalRoute><TenantDashboard /></TenantPortalRoute>} />
      <Route path="/tenant/payments" element={<TenantPortalRoute><TenantPayments /></TenantPortalRoute>} />
      <Route path="/tenant/invoices" element={<TenantPortalRoute><TenantInvoices /></TenantPortalRoute>} />
      <Route path="/tenant/recurring-bills" element={<TenantPortalRoute><TenantRecurringBills /></TenantPortalRoute>} />
      <Route path="/tenant/maintenance" element={<TenantPortalRoute><TenantMaintenance /></TenantPortalRoute>} />
      <Route path="/tenant/lease" element={<TenantPortalRoute><TenantLease /></TenantPortalRoute>} />
      <Route path="/tenant/lease/sign/:id" element={<TenantPortalRoute><TenantLeaseSign /></TenantPortalRoute>} />
      <Route path="/tenant/messages" element={<TenantPortalRoute><TenantMessages /></TenantPortalRoute>} />
      
      {/* Legacy portal routes */}
      <Route path="/portal" element={<Navigate to="/tenant" replace />} />
      <Route path="/portal/*" element={<Navigate to="/tenant" replace />} />
      
      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
