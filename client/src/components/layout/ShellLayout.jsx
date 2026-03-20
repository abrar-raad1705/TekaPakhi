import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';

/**
 * Global chrome: sticky site header on all routes except /admin/* (admin uses its own shell).
 */
export default function ShellLayout() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin')) {
    return <Outlet />;
  }

  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
  );
}
