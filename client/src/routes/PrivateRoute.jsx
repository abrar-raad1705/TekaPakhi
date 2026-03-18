import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Block access if phone is not verified
  if (!user?.isPhoneVerified) {
    return <Navigate to="/verify-phone" state={{ phoneNumber: user?.phoneNumber }} replace />;
  }

  return children;
}
