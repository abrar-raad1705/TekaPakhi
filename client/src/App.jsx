import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';
import ShellLayout from './components/layout/ShellLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyPhonePage from './pages/auth/VerifyPhonePage';
import ForgotPinPage from './pages/auth/ForgotPinPage';
import ResetPinPage from './pages/auth/ResetPinPage';
import ChangePinPage from './pages/auth/ChangePinPage';
import AccountSetupPinPage from './pages/auth/AccountSetupPinPage';

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
import AdminLoginPage from './pages/admin/AdminLoginPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import TransactionMonitorPage from './pages/admin/TransactionMonitorPage';
import ConfigPage from './pages/admin/ConfigPage';
import ReportsPage from './pages/admin/ReportsPage';
import DistributorLoadPage from './pages/admin/DistributorLoadPage';
import SecurityLogsPage from './pages/admin/SecurityLogsPage';
import AdminActionLogsPage from './pages/admin/AdminActionLogsPage';
import AuditTrailPage from './pages/admin/AuditTrailPage';

export default function App() {
  const { isAuthenticated, user, getHomeRoute } = useAuth();
  const homeRoute = getHomeRoute();

  return (
    <Routes>
      <Route element={<ShellLayout />}>
        {/* Public routes */}
        <Route path="/root" element={<AdminLoginPage />} />
        <Route path="/login" element={isAuthenticated ? (user?.isPhoneVerified ? <Navigate to={homeRoute} replace /> : <Navigate to="/verify-phone" state={{ phoneNumber: user?.phoneNumber }} replace />) : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? (user?.isPhoneVerified ? <Navigate to={homeRoute} replace /> : <Navigate to="/verify-phone" state={{ phoneNumber: user?.phoneNumber }} replace />) : <RegisterPage />} />
        <Route path="/verify-phone" element={<VerifyPhonePage />} />
        <Route path="/forgot-pin" element={<ForgotPinPage />} />
        <Route path="/reset-pin" element={<ResetPinPage />} />

        {/* Customer dashboard */}
        <Route path="/dashboard" element={<PrivateRoute allowedRoles={['CUSTOMER', 'SYSTEM']}><DashboardPage /></PrivateRoute>} />

        {/* Agent dashboard */}
        <Route path="/agent" element={<PrivateRoute allowedRoles={['AGENT']}><AgentDashboardPage /></PrivateRoute>} />

        {/* Merchant dashboard */}
        <Route path="/merchant" element={<PrivateRoute allowedRoles={['MERCHANT']}><MerchantDashboardPage /></PrivateRoute>} />

        {/* Distributor: mandatory PIN setup after first login (temp PIN) */}
        <Route path="/distributor/setup-pin" element={<PrivateRoute allowedRoles={['DISTRIBUTOR']}><AccountSetupPinPage /></PrivateRoute>} />
        <Route path="/distributor" element={<PrivateRoute allowedRoles={['DISTRIBUTOR']}><DistributorDashboardPage /></PrivateRoute>} />

        {/* Biller: mandatory PIN setup after first login (temp PIN) */}
        <Route path="/biller/setup-pin" element={<PrivateRoute allowedRoles={['BILLER']}><AccountSetupPinPage /></PrivateRoute>} />
        <Route path="/biller" element={<PrivateRoute allowedRoles={['BILLER']}><BillerDashboardPage /></PrivateRoute>} />

        {/* Shared protected routes (all roles) */}
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/profile/edit" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
        <Route path="/change-pin" element={<PrivateRoute><ChangePinPage /></PrivateRoute>} />
        <Route path="/recipients" element={<PrivateRoute allowedRoles={['CUSTOMER']}><SavedRecipientsPage /></PrivateRoute>} />
        <Route path="/transactions" element={<PrivateRoute><TransactionHistoryPage /></PrivateRoute>} />
        <Route path="/transactions/:id" element={<PrivateRoute><TransactionDetailPage /></PrivateRoute>} />

        {/* Transaction routes (role-validated on server) */}
        <Route path="/send-money" element={<PrivateRoute allowedRoles={['CUSTOMER', 'MERCHANT']} requireActiveStatus><SendMoneyPage /></PrivateRoute>} />
        <Route path="/cash-in" element={<PrivateRoute allowedRoles={['AGENT']} requireActiveStatus><CashInPage /></PrivateRoute>} />
        <Route path="/cash-out" element={<PrivateRoute allowedRoles={['CUSTOMER', 'MERCHANT']} requireActiveStatus><CashOutPage /></PrivateRoute>} />
        <Route path="/payment" element={<PrivateRoute allowedRoles={['CUSTOMER', 'MERCHANT']} requireActiveStatus><PaymentPage /></PrivateRoute>} />
        <Route path="/b2b" element={<PrivateRoute allowedRoles={['DISTRIBUTOR', 'AGENT']} requireActiveStatus><B2BTransferPage /></PrivateRoute>} />
        <Route path="/pay-bill" element={<PrivateRoute allowedRoles={['CUSTOMER', 'MERCHANT', 'AGENT']} requireActiveStatus><PayBillPage /></PrivateRoute>} />

        {/* Admin — ShellLayout renders no SiteHeader for /admin/* (AdminLayout is self-contained) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
        <Route path="/admin/users/:id" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
        <Route path="/admin/transactions" element={<AdminRoute><TransactionMonitorPage /></AdminRoute>} />
        <Route path="/admin/load-emoney" element={<AdminRoute><DistributorLoadPage /></AdminRoute>} />
        <Route path="/admin/config" element={<AdminRoute><ConfigPage /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="/admin/logs/security" element={<AdminRoute><SecurityLogsPage /></AdminRoute>} />
        <Route path="/admin/logs/actions" element={<AdminRoute><AdminActionLogsPage /></AdminRoute>} />
        <Route path="/admin/logs/audit" element={<AdminRoute><AuditTrailPage /></AdminRoute>} />

        <Route path="*" element={<Navigate to={isAuthenticated ? homeRoute : '/login'} replace />} />
      </Route>
    </Routes>
  );
}
