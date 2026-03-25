/**
 * Dashboard chrome (header stripe, accents) per account role.
 * Quick actions: outlined icon on a pale rounded tile (border + soft tint), not a solid circle.
 */
export const ROLE_DASHBOARD_THEME = {
  CUSTOMER: {
    headerClass:
      "bg-gradient-to-r from-primary-600 to-primary-700",
    subtitleClass: "text-primary-200",
    balanceBtnClass: "text-primary-600 hover:text-primary-700",
    statusDotClass: "bg-green-400",
    quickActionTileClass:
      "rounded-2xl border border-primary-200/70 bg-primary-50 shadow-sm",
    quickActionIconClass: "text-primary-600",
  },
  AGENT: {
    headerClass: "bg-gradient-to-r from-teal-600 to-cyan-600",
    subtitleClass: "text-teal-100",
    balanceBtnClass: "text-teal-600 hover:text-teal-700",
    statusDotClass: "bg-teal-400",
    quickActionTileClass:
      "rounded-2xl border border-teal-200/80 bg-teal-50/90 shadow-sm",
    quickActionIconClass: "text-teal-600",
  },
  MERCHANT: {
    headerClass: "bg-gradient-to-r from-purple-500/90 to-purple-600/90",
    subtitleClass: "text-purple-100",
    balanceBtnClass: "text-purple-600 hover:text-purple-700",
    statusDotClass: "bg-purple-400",
    quickActionTileClass:
      "rounded-2xl border border-purple-200/70 bg-purple-50/90 shadow-sm",
    quickActionIconClass: "text-purple-600",
  },
  DISTRIBUTOR: {
    headerClass: "bg-gradient-to-r from-orange-400/90 to-orange-500/90",
    subtitleClass: "text-orange-100",
    balanceBtnClass: "text-orange-600 hover:text-orange-700",
    statusDotClass: "bg-orange-400",
    quickActionTileClass:
      "rounded-2xl border border-orange-200/70 bg-orange-50/90 shadow-sm",
    quickActionIconClass: "text-orange-600",
  },
  BILLER: {
    headerClass: "bg-gradient-to-r from-teal-600 to-teal-700",
    subtitleClass: "text-teal-200",
    balanceBtnClass: "text-teal-600 hover:text-teal-700",
    statusDotClass: "bg-teal-400",
    quickActionTileClass:
      "rounded-2xl border border-teal-200/70 bg-teal-50/90 shadow-sm",
    quickActionIconClass: "text-teal-600",
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
    topStripe: "bg-gradient-to-r from-primary-600 to-primary-700",
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
    topStripe: "bg-gradient-to-r from-teal-600 to-cyan-600",
    headerBar: "bg-teal-50/95 border-b border-teal-100",
    headerTitle: "text-teal-900",
    avatar: "bg-teal-100 text-teal-900 ring-2 ring-teal-200/60 shadow-sm",
    badge: "border border-teal-200/90 bg-teal-50 text-teal-900 shadow-sm",
    cardBorder: "border-teal-100/90",
    actionLink: "text-teal-700 hover:text-teal-800 font-semibold",
    areaChip: "border border-teal-200/70 bg-teal-50/80 text-teal-900",
  },
  MERCHANT: {
    topStripe: "bg-gradient-to-r from-purple-500 to-purple-600",
    headerBar: "bg-purple-50/95 border-b border-purple-100",
    headerTitle: "text-purple-900",
    avatar: "bg-purple-100 text-purple-900 ring-2 ring-purple-200/60 shadow-sm",
    badge: "border border-purple-200/90 bg-purple-50 text-purple-900 shadow-sm",
    cardBorder: "border-purple-100/90",
    actionLink: "text-purple-700 hover:text-purple-800 font-semibold",
    areaChip: "border border-purple-200/70 bg-purple-50/80 text-purple-900",
  },
  DISTRIBUTOR: {
    topStripe: "bg-gradient-to-r from-orange-400 to-orange-500",
    headerBar: "bg-orange-50/95 border-b border-orange-100",
    headerTitle: "text-orange-900",
    avatar: "bg-orange-100 text-orange-900 ring-2 ring-orange-200/60 shadow-sm",
    badge: "border border-orange-200/90 bg-orange-50 text-orange-900 shadow-sm",
    cardBorder: "border-orange-100/90",
    actionLink: "text-orange-700 hover:text-orange-800 font-semibold",
    areaChip: "border border-orange-200/70 bg-orange-50/80 text-orange-900",
  },
  BILLER: {
    topStripe: "bg-gradient-to-r from-teal-600 to-teal-700",
    headerBar: "bg-teal-50/95 border-b border-teal-100",
    headerTitle: "text-teal-900",
    avatar: "bg-teal-100 text-teal-900 ring-2 ring-teal-200/60 shadow-sm",
    badge: "border border-teal-200/90 bg-teal-50 text-teal-900 shadow-sm",
    cardBorder: "border-teal-100/90",
    actionLink: "text-teal-700 hover:text-teal-800 font-semibold",
    areaChip: "border border-teal-200/70 bg-teal-50/80 text-teal-900",
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
