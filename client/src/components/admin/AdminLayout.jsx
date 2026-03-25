import logo from "../../assets/icons/logo.svg";
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Squares2X2Icon, end: true },
  { to: "/admin/users", label: "Users", icon: UsersIcon },
  {
    to: "/admin/transactions",
    label: "Transactions",
    icon: ArrowsRightLeftIcon,
  },
  {
    to: "/admin/load-emoney",
    label: "Load e-money",
    icon: BanknotesIcon,
  },
  { to: "/admin/config", label: "Config", icon: Cog6ToothIcon },
  { to: "/admin/reports", label: "Reports", icon: ChartBarIcon },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  function adminLogout() {
    localStorage.removeItem("adminToken");
    navigate("/root", { replace: true });
  }

  return (
    <div className="flex min-h-dvh bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-20 flex-col justify-center border-b border-gray-200 px-6 py-4">
          <img src={logo} alt="TekaPakhi" className="h-8 w-auto self-start" />
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Admin Panel
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-900">
                Admin
              </p>
              <p className="text-[10px] text-gray-400">System Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={adminLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 bg-gray-100">
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
