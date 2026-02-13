import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyOTPPage from './pages/auth/VerifyOTPPage';
import ForgotPinPage from './pages/auth/ForgotPinPage';
import ResetPinPage from './pages/auth/ResetPinPage';
import ChangePinPage from './pages/auth/ChangePinPage';

// Role-specific dashboards
import DashboardPage from './pages/dashboard/DashboardPage';
import AgentDashboardPage from './pages/agent/AgentDashboardPage';
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage';
import DistributorDashboardPage from './pages/distributor/DistributorDashboardPage';
import BillerDashboardPage from './pages/biller/BillerDashboardPage';

// Shared pages
import ProfilePage from './pages/profile/ProfilePage';
import EditProfilePage from './pages/profile/EditProfilePage';
import SavedRecipientsPage from './pages/recipients/SavedRecipientsPage';

// Transaction pages
import SendMoneyPage from './pages/transactions/SendMoneyPage';
import CashInPage from './pages/transactions/CashInPage';
import CashOutPage from './pages/transactions/CashOutPage';
import PaymentPage from './pages/transactions/PaymentPage';
import B2BTransferPage from './pages/transactions/B2BTransferPage';
import PayBillPage from './pages/transactions/PayBillPage';
import TransactionHistoryPage from './pages/transactions/TransactionHistoryPage';
import TransactionDetailPage from './pages/transactions/TransactionDetailPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import TransactionMonitorPage from './pages/admin/TransactionMonitorPage';
import ConfigPage from './pages/admin/ConfigPage';
import ReportsPage from './pages/admin/ReportsPage';

export default function App() {
  const { isAuthenticated, getHomeRoute } = useAuth();
  const homeRoute = getHomeRoute();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to={homeRoute} replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={homeRoute} replace /> : <RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOTPPage />} />
      <Route path="/forgot-pin" element={<ForgotPinPage />} />
      <Route path="/reset-pin" element={<ResetPinPage />} />

      {/* Customer dashboard */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

      {/* Agent dashboard */}
      <Route path="/agent" element={<PrivateRoute><AgentDashboardPage /></PrivateRoute>} />

      {/* Merchant dashboard */}
      <Route path="/merchant" element={<PrivateRoute><MerchantDashboardPage /></PrivateRoute>} />

      {/* Distributor dashboard */}
      <Route path="/distributor" element={<PrivateRoute><DistributorDashboardPage /></PrivateRoute>} />

      {/* Biller dashboard */}
      <Route path="/biller" element={<PrivateRoute><BillerDashboardPage /></PrivateRoute>} />

      {/* Shared protected routes (all roles) */}
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/profile/edit" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
      <Route path="/change-pin" element={<PrivateRoute><ChangePinPage /></PrivateRoute>} />
      <Route path="/recipients" element={<PrivateRoute><SavedRecipientsPage /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><TransactionHistoryPage /></PrivateRoute>} />
      <Route path="/transactions/:id" element={<PrivateRoute><TransactionDetailPage /></PrivateRoute>} />

      {/* Transaction routes (role-validated on server) */}
      <Route path="/send-money" element={<PrivateRoute><SendMoneyPage /></PrivateRoute>} />
      <Route path="/cash-in" element={<PrivateRoute><CashInPage /></PrivateRoute>} />
      <Route path="/cash-out" element={<PrivateRoute><CashOutPage /></PrivateRoute>} />
      <Route path="/payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
      <Route path="/b2b" element={<PrivateRoute><B2BTransferPage /></PrivateRoute>} />
      <Route path="/pay-bill" element={<PrivateRoute><PayBillPage /></PrivateRoute>} />

      {/* Admin routes — SYSTEM users only */}
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
      <Route path="/admin/users/:id" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
      <Route path="/admin/transactions" element={<AdminRoute><TransactionMonitorPage /></AdminRoute>} />
      <Route path="/admin/config" element={<AdminRoute><ConfigPage /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? homeRoute : '/login'} replace />} />
    </Routes>
  );
}
