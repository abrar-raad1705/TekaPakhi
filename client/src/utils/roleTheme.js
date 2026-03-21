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
