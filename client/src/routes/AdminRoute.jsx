import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only SYSTEM users (typeId === 6 or typeName === 'SYSTEM') can access admin
  if (user?.typeId !== 6 && user?.typeName !== 'SYSTEM') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
