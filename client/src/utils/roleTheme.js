/**
 * Dashboard chrome (header stripe, accents) per account role.
 * Quick actions: outlined icon on a pale rounded tile (border + soft tint), not a solid circle.
 */
export const ROLE_DASHBOARD_THEME = {
  CUSTOMER: {
    headerClass: "bg-gradient-to-br from-primary-800 to-primary-950",
    subtitleClass: "text-primary-100/80",
    balanceBtnClass: "text-primary-600 hover:text-primary-700",
    statusDotClass: "bg-primary-500",
    statusTextClass: "text-primary-600/90",
    dashboardBgClass: "bg-slate-100",
    cardShadowClass: "shadow-primary-100/50",
    quickActionTileClass:
      "rounded-2xl border border-primary-200/70 bg-primary-50 shadow-sm",
    quickActionIconClass: "text-primary-600",
  },
  AGENT: {
    headerClass: "bg-gradient-to-r from-emerald-800 to-emerald-950",
    subtitleClass: "text-emerald-100",
    balanceBtnClass: "text-emerald-600 hover:text-emerald-700",
    statusDotClass: "bg-emerald-400",
    statusTextClass: "text-emerald-600/90",
    dashboardBgClass: "bg-emerald-50/50",
    cardShadowClass: "shadow-emerald-100/50",
    quickActionTileClass:
      "rounded-2xl border border-emerald-200/80 bg-emerald-50/90 shadow-sm",
    quickActionIconClass: "text-emerald-600",
  },
  MERCHANT: {
    headerClass: "bg-gradient-to-r from-violet-800 to-violet-950",
    subtitleClass: "text-violet-100",
    balanceBtnClass: "text-violet-600 hover:text-violet-700",
    statusDotClass: "bg-violet-400",
    statusTextClass: "text-violet-600/90",
    dashboardBgClass: "bg-violet-50/50",
    cardShadowClass: "shadow-violet-100/50",
    quickActionTileClass:
      "rounded-2xl border border-violet-200/70 bg-violet-50/90 shadow-sm",
    quickActionIconClass: "text-violet-600",
  },
  DISTRIBUTOR: {
    headerClass: "bg-gradient-to-r from-amber-700 to-orange-950",
    subtitleClass: "text-amber-100",
    balanceBtnClass: "text-orange-600 hover:text-orange-700",
    statusDotClass: "bg-orange-400",
    statusTextClass: "text-orange-600/90",
    dashboardBgClass: "bg-orange-50/40",
    cardShadowClass: "shadow-orange-200/50",
    quickActionTileClass:
      "rounded-2xl border border-orange-200/70 bg-orange-50/90 shadow-sm",
    quickActionIconClass: "text-orange-600",
  },
  BILLER: {
    headerClass: "bg-gradient-to-r from-indigo-800 to-indigo-950",
    subtitleClass: "text-indigo-200",
    balanceBtnClass: "text-indigo-700 hover:text-indigo-800",
    statusDotClass: "bg-indigo-500",
    statusTextClass: "text-indigo-600/90",
    dashboardBgClass: "bg-indigo-50/60",
    cardShadowClass: "shadow-indigo-200/40",
    quickActionTileClass:
      "rounded-2xl border border-indigo-200/70 bg-indigo-50/90 shadow-sm",
    quickActionIconClass: "text-indigo-700",
  },
};

export function getDashboardTheme(typeName) {
  return ROLE_DASHBOARD_THEME[typeName] || ROLE_DASHBOARD_THEME.CUSTOMER;
}

/**
 * Admin user detail: badges and card accents aligned with each role’s dashboard
 * (see ROLE_DASHBOARD_THEME header / quick-action tile colors).
 */
export const PROFILE_TYPE_ADMIN = {
  CUSTOMER: {
    topStripe: "bg-gradient-to-br from-primary-800 to-primary-950",
    headerBar: "bg-primary-50/95 border-b border-primary-100",
    headerTitle: "text-primary-900",
    avatar:
      "bg-primary-100 text-primary-800 ring-2 ring-primary-200/60 shadow-sm",
    badge:
      "border border-primary-200/90 bg-primary-50 text-primary-900 shadow-sm",
    cardBorder: "border-primary-100/90",
    actionLink: "text-primary-700 hover:text-primary-800 font-semibold",
    areaChip:
      "border border-primary-200/70 bg-primary-50/80 text-primary-900",
  },
  AGENT: {
    topStripe: "bg-gradient-to-r from-emerald-800 to-emerald-950",
    headerBar: "bg-emerald-50/95 border-b border-emerald-100",
    headerTitle: "text-emerald-900",
    avatar: "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-200/60 shadow-sm",
    badge: "border border-emerald-200/90 bg-emerald-50 text-emerald-900 shadow-sm",
    cardBorder: "border-emerald-100/90",
    actionLink: "text-emerald-700 hover:text-emerald-800 font-semibold",
    areaChip: "border border-emerald-200/70 bg-emerald-50/80 text-emerald-900",
  },
  MERCHANT: {
    topStripe: "bg-gradient-to-r from-violet-800 to-violet-950",
    headerBar: "bg-violet-50/95 border-b border-violet-100",
    headerTitle: "text-violet-900",
    avatar: "bg-purple-100 text-purple-900 ring-2 ring-purple-200/60 shadow-sm",
    badge: "border border-purple-200/90 bg-purple-50 text-purple-900 shadow-sm",
    cardBorder: "border-purple-100/90",
    actionLink: "text-purple-700 hover:text-purple-800 font-semibold",
    areaChip: "border border-purple-200/70 bg-purple-50/80 text-purple-900",
  },
  DISTRIBUTOR: {
    topStripe: "bg-gradient-to-r from-amber-700 to-orange-950",
    headerBar: "bg-orange-50/95 border-b border-orange-100",
    headerTitle: "text-orange-900",
    avatar: "bg-orange-100 text-orange-900 ring-2 ring-orange-200/60 shadow-sm",
    badge: "border border-orange-200/90 bg-orange-50 text-orange-900 shadow-sm",
    cardBorder: "border-orange-100/90",
    actionLink: "text-orange-700 hover:text-orange-800 font-semibold",
    areaChip: "border border-orange-200/70 bg-orange-50/80 text-orange-900",
  },
  BILLER: {
    topStripe: "bg-gradient-to-r from-indigo-800 to-indigo-950",
    headerBar: "bg-indigo-50/95 border-b border-indigo-100",
    headerTitle: "text-indigo-900",
    avatar: "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-200/60 shadow-sm",
    badge: "border border-indigo-200/90 bg-indigo-50 text-indigo-900 shadow-sm",
    cardBorder: "border-indigo-100/90",
    actionLink: "text-indigo-700 hover:text-indigo-800 font-semibold",
    areaChip: "border border-indigo-200/70 bg-indigo-50/80 text-indigo-900",
  },
  SYSTEM: {
    topStripe: "bg-gradient-to-r from-slate-600 to-slate-700",
    headerBar: "bg-slate-50/95 border-b border-slate-200",
    headerTitle: "text-slate-900",
    avatar: "bg-slate-200 text-slate-800 ring-2 ring-slate-300/70 shadow-sm",
    badge: "border border-slate-200 bg-slate-100 text-slate-800 shadow-sm",
    cardBorder: "border-slate-200/90",
    actionLink: "text-slate-700 hover:text-slate-900 font-semibold",
    areaChip: "border border-slate-200 bg-slate-50 text-slate-800",
  },
};

export function getProfileTypeAdmin(typeName) {
  if (!typeName) return PROFILE_TYPE_ADMIN.SYSTEM;
  return PROFILE_TYPE_ADMIN[typeName] || PROFILE_TYPE_ADMIN.SYSTEM;
}

/** Fixed width type pill in admin tables (compact) */
export const ADMIN_TYPE_PILL_BOX =
  "inline-flex h-6 w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] shrink-0 items-center justify-center truncate rounded-md px-1 text-center text-[9px] font-bold uppercase tracking-wide leading-none shadow-sm";
