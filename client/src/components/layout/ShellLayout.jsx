import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';

/**
 * Global chrome: sticky site header on all routes except /admin/* (admin uses its own shell).
 */
export default function ShellLayout() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  if (pathname.startsWith('/admin')) {
    return <Outlet />;
  }

  return (
    <>
      <SiteHeader />
      <Outlet />
      {isAuthenticated && <BottomNav />}
    </>
  );
}
