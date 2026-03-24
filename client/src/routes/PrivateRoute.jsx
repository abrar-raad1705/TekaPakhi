import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ACTIVE_ACCOUNT_STATUS = 'ACTIVE';

export default function PrivateRoute({ children, allowedRoles, requireActiveStatus = false }) {
  const { isAuthenticated, user, getHomeRoute } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isPhoneVerified) {
    return (
      <Navigate
        to="/verify-phone"
        state={{ phoneNumber: user?.phoneNumber }}
        replace
      />
    );
  }

  // Role-based access control
  if (allowedRoles && !allowedRoles.includes(user?.typeName)) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  if (requireActiveStatus && user?.accountStatus !== ACTIVE_ACCOUNT_STATUS) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  if (user?.typeName === 'DISTRIBUTOR' && user?.requiresPinSetup) {
    if (!location.pathname.startsWith('/distributor/setup-pin')) {
      return <Navigate to="/distributor/setup-pin" replace />;
    }
  }

  if (
    user?.typeName === 'DISTRIBUTOR' &&
    !user?.requiresPinSetup &&
    location.pathname === '/distributor/setup-pin'
  ) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return children;
}
