import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Lazy-load all view pages for code splitting
const LoginPage = lazy(() => import('../views/auth/LoginPage'));
const RegisterControllerPage = lazy(() => import('../views/auth/RegisterControllerPage'));
const RequestAccessPage = lazy(() => import('../views/auth/RequestAccessPage'));
const ActivateAccountPage = lazy(() => import('../views/auth/ActivateAccountPage'));
const ForgotPasswordPage = lazy(() => import('../views/auth/ForgotPasswordPage'));
const AccessDeniedPage = lazy(() => import('../views/auth/AccessDeniedPage'));
const DashboardPage = lazy(() => import('../views/dashboard/DashboardPage'));
const ProductListPage = lazy(() => import('../views/products/ProductListPage'));
const HotelListPage = lazy(() => import('../views/hotels/HotelListPage'));
const HotelFormPage = lazy(() => import('../views/hotels/HotelFormPage'));
const ContractListPage = lazy(() => import('../views/contracts/ContractListPage'));
const ContractFormPage = lazy(() => import('../views/contracts/ContractFormPage'));
const ContractDetailPage = lazy(() => import('../views/contracts/ContractDetailPage'));
const BillingPage = lazy(() => import('../views/billing/BillingPage'));
const DraftListPage = lazy(() => import('../views/billing/DraftListPage'));
const InvoiceListPage = lazy(() => import('../views/invoices/InvoiceListPage'));
const InvoiceViewPage = lazy(() => import('../views/invoices/InvoiceViewPage'));
const EmployeeListPage = lazy(() => import('../views/employees/EmployeeListPage'));
const AuditLogPage = lazy(() => import('../views/audit/AuditLogPage'));
const SettingsPage = lazy(() => import('../views/settings/SettingsPage'));

import { useAuth } from '../context/AuthContext';

const RootRedirect: React.FC = () => {
  const { userProfile, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner fullPage message="Loading..." />;
  }
  return <Navigate to={userProfile ? "/dashboard" : "/login"} replace />;
};

const LogoutRedirect: React.FC = () => {
  const { logout } = useAuth();
  React.useEffect(() => {
    logout();
  }, [logout]);
  return <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullPage message="Loading..." />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register-controller" element={<PublicRoute><RegisterControllerPage /></PublicRoute>} />
          <Route path="/request-access" element={<PublicRoute><RequestAccessPage /></PublicRoute>} />
          <Route path="/activate-account" element={<PublicRoute><ActivateAccountPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="/logout" element={<LogoutRedirect />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Products */}
            <Route path="/products" element={<ProductListPage />} />

            {/* Hotels */}
            <Route path="/hotels" element={<HotelListPage />} />
            <Route path="/hotels/create" element={<HotelFormPage />} />
            <Route path="/hotels/:id/edit" element={<HotelFormPage />} />

            {/* Contracts */}
            <Route path="/contracts" element={<ContractListPage />} />
            <Route path="/contracts/create" element={<ContractFormPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />

            {/* Billing */}
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/drafts" element={<DraftListPage />} />

            {/* Invoices */}
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/invoices/:id" element={<InvoiceViewPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Controller-only routes */}
            <Route path="/employees" element={
              <ProtectedRoute requiredRoles={['controller']}>
                <EmployeeListPage />
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute requiredRoles={['controller']}>
                <AuditLogPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
