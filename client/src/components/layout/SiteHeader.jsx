import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import logo from "../../assets/icons/logo.svg";
import { useAuth } from "../../context/AuthContext";
import { useSiteHeader } from "../../context/SiteHeaderContext";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-phone",
  "/forgot-pin",
  "/reset-pin",
  "/distributor/setup-pin",
];
const DASHBOARD_PATHS = [
  "/dashboard",
  "/agent",
  "/merchant",
  "/distributor",
  "/biller",
];

function resolveVariant(pathname) {
  if (pathname.startsWith("/admin"))
    return "hidden";
  if (AUTH_PATHS.includes(pathname)) return "auth";
  if (
    DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return "dashboard";
  }
  return "navigation";
}

export default function SiteHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { overrides } = useSiteHeader();

  const variant = resolveVariant(pathname);
  if (variant === "hidden") return null;

  const handleAuthClose = async () => {
    if (pathname === "/login") navigate("/");
    else if (pathname === "/register") navigate("/login");
    else if (pathname === "/forgot-pin" || pathname === "/reset-pin")
      navigate("/login");
    else if (
      pathname === "/verify-phone" ||
      pathname === "/distributor/setup-pin"
    ) {
      await logout();
      navigate("/login", { replace: true });
    }
  };

  const handleBack = () => {
    if (typeof overrides.back === "function") {
      overrides.back();
      return;
    }
    navigate(-1);
  };

  const title = overrides.title;
  const subtitle = overrides.subtitle;
  const showRightMeta = variant === "navigation" && (subtitle || title);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div
        className={`mx-auto flex max-w-7xl items-center px-4 py-3.5 sm:px-8 md:px-10 ${
          variant === "auth"
            ? "justify-between"
            : variant === "dashboard"
              ? "justify-center"
              : ""
        }`}
      >
        {variant === "auth" && (
          <>
            <img
              src={logo}
              alt="TekaPakhi"
              className="h-8 w-auto object-contain sm:h-9"
            />
            <button
              type="button"
              onClick={handleAuthClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          </>
        )}

        {variant === "dashboard" && (
          <img
            src={logo}
            alt="TekaPakhi"
            className="h-8 w-auto object-contain sm:h-9"
          />
        )}

        {variant === "navigation" && (
          <div className="flex w-full items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="Back"
            >
              <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
            </button>
            <img
              src={logo}
              alt="TekaPakhi"
              className="h-8 w-auto object-contain sm:h-9"
            />
            {showRightMeta ? (
              <div className="ml-auto hidden min-w-0 text-right sm:block">
                {subtitle ? (
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {subtitle}
                  </p>
                ) : null}
                {title ? (
                  <p
                    className={`truncate text-sm font-bold text-slate-900 ${subtitle ? "mt-0.5" : ""}`}
                  >
                    {title}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
