import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TenantPortalLayout } from "@/pages/tenant-portal/TenantPortalLayout";

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
import { Leases, Messages, Notifications } from "./pages/Placeholders";
import MaintenancePage from "./pages/Maintenance";
import Settings from "./pages/Settings";
import RecurringBills from "./pages/RecurringBills";
import NotFound from "./pages/NotFound";

// Tenant Portal
import TenantDashboard from "./pages/tenant-portal/TenantDashboard";
import TenantPayments from "./pages/tenant-portal/TenantPayments";
import TenantMaintenance from "./pages/tenant-portal/TenantMaintenance";
import TenantLease from "./pages/tenant-portal/TenantLease";
import TenantMessages from "./pages/tenant-portal/TenantMessages";

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function TenantPortalRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
      
      {/* Protected Routes - Property Manager */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
      <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute><Units /></PrivateRoute>} />
      <Route path="/units/:id" element={<PrivateRoute><UnitDetail /></PrivateRoute>} />
      <Route path="/tenants" element={<PrivateRoute><Tenants /></PrivateRoute>} />
      <Route path="/tenants/:id" element={<PrivateRoute><TenantDetail /></PrivateRoute>} />
      <Route path="/leases" element={<PrivateRoute><Leases /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute><MaintenancePage /></PrivateRoute>} />
      <Route path="/recurring-bills" element={<PrivateRoute><RecurringBills /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      
      {/* Tenant Portal Routes */}
      <Route path="/portal" element={<TenantPortalRoute><TenantDashboard /></TenantPortalRoute>} />
      <Route path="/portal/payments" element={<TenantPortalRoute><TenantPayments /></TenantPortalRoute>} />
      <Route path="/portal/maintenance" element={<TenantPortalRoute><TenantMaintenance /></TenantPortalRoute>} />
      <Route path="/portal/lease" element={<TenantPortalRoute><TenantLease /></TenantPortalRoute>} />
      <Route path="/portal/messages" element={<TenantPortalRoute><TenantMessages /></TenantPortalRoute>} />
      
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
