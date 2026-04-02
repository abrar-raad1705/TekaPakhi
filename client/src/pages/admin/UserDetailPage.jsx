import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { adminApi } from "../../api/adminApi";
import { formatBDT } from "../../utils/formatCurrency";
import AdminLayout from "../../components/admin/AdminLayout";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { XMarkIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { getProfileTypeAdmin } from "../../utils/roleTheme";

const TX_STATUS_STYLE = {
  COMPLETED: "bg-green-50 text-green-700 border border-green-100",
  PENDING:   "bg-amber-50 text-amber-700 border border-amber-100",
  FAILED:    "bg-red-50 text-red-600 border border-red-100",
  REVERSED:  "border border-[#E2136E]/15 bg-[#E2136E]/10 text-[#E2136E]",
};

const TX_STATUS_BADGE =
  "inline-flex min-w-[4.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide";

/** Reversal type label — brand pink, distinct from MERCHANT purple */
const REVERSAL_TYPE_CLASS = "text-[#E2136E]";

function CopyableTrxId({ value, inline = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("TrxID copied", { duration: 1500 });
  };
  const base =
    "group cursor-pointer items-center font-mono text-xs font-medium text-gray-800 hover:text-primary-700 transition-colors";
  const inner = (
    <>
      <span className={`truncate ${inline ? "max-w-[160px]" : "max-w-[140px]"}`}>{value}</span>
      {copied ? (
        <ClipboardDocumentCheckIcon className={`text-green-600 shrink-0 ${inline ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
      ) : (
        <ClipboardDocumentIcon
          className={`text-gray-400 opacity-70 group-hover:opacity-100 group-hover:text-primary-600 transition-opacity shrink-0 ${inline ? "h-3.5 w-3.5" : "h-4 w-4"}`}
        />
      )}
    </>
  );
  if (inline) {
    return (
      <span onClick={handleCopy} className={`${base} inline-flex gap-1 align-middle`} title="Click to copy TrxID">
        {inner}
      </span>
    );
  }
  return (
    <div onClick={handleCopy} className={`${base} flex gap-1.5 items-center`} title="Click to copy TrxID">
      {inner}
    </div>
  );
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
}

/** e.g. Agent #2, Merchant #9 — uses profile_id with role label */
function formatProfileRefLabel(typeName, profileId) {
  const raw = (typeName || "User").toLowerCase();
  const pretty = raw.charAt(0).toUpperCase() + raw.slice(1);
  return `${pretty} #${profileId}`;
}

function CopyableCode({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied", { duration: 1500 });
  };
  return (
    <div
      onClick={handleCopy}
      className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 font-mono text-sm font-semibold text-gray-900 hover:text-primary-700"
      title="Click to copy"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4 shrink-0 text-gray-400 opacity-70 transition-opacity group-hover:opacity-100 group-hover:text-primary-600" />
      )}
    </div>
  );
}

const statusActions = [
  {
    status: "ACTIVE",
    label: "Activate Account",
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    status: "SUSPENDED",
    label: "Suspend Account",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  { status: "BLOCKED", label: "Block Account", color: "bg-red-600 hover:bg-red-700" },
];

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [walletLimitInput, setWalletLimitInput] = useState("");
  const [savingWalletLimit, setSavingWalletLimit] = useState(false);
  const [editingWalletLimit, setEditingWalletLimit] = useState(false);
  const [walletLimitSaveError, setWalletLimitSaveError] = useState("");
  const [pinGrantSaving, setPinGrantSaving] = useState(false);

  // Status confirmation state
  const [modal, setModal] = useState({ isOpen: false, type: null, payload: null });
  
  // Fintech Modals
  const [distModalOpen, setDistModalOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState(null);

  const closeModal = () => setModal({ isOpen: false, type: null, payload: null });

  useEffect(() => {
    adminApi
      .getUserDetail(id)
      .then((res) => setUser(res.data.data))
      .catch(() => toast.error("User not found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.max_balance != null && user.max_balance !== "") {
      setWalletLimitInput(String(parseFloat(user.max_balance)));
    }
  }, [user]);

  /** Validates and opens the confirmation popup (same pattern as status change). */
  const requestWalletLimitSave = () => {
    const v = parseFloat(walletLimitInput);
    setWalletLimitSaveError("");
    if (walletLimitInput === "" || !Number.isFinite(v) || v <= 0) {
      setWalletLimitSaveError("Enter a valid wallet limit greater than zero.");
      toast.error("Enter a valid wallet limit.");
      return;
    }
    const bal = user?.balance != null ? parseFloat(user.balance) : 0;
    if (Number.isFinite(bal) && v < bal) {
      setWalletLimitSaveError(`Limit cannot be below current balance (${formatBDT(bal)}).`);
      toast.error("Wallet limit cannot be below current balance.");
      return;
    }
    setModal({ isOpen: true, type: "WALLET_LIMIT", payload: v });
  };

  const confirmWalletLimit = async () => {
    const v = modal.payload;
    closeModal();
    setSavingWalletLimit(true);
    setWalletLimitSaveError("");
    try {
      await adminApi.updateWalletLimit(id, v);
      toast.success("Wallet limit updated.");
      setEditingWalletLimit(false);
      const refreshed = await adminApi.getUserDetail(id);
      setUser(refreshed.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update wallet limit.";
      setWalletLimitSaveError(msg);
      toast.error(msg);
    } finally {
      setSavingWalletLimit(false);
    }
  };

  const handlePinResetGrant = async (granted) => {
    setPinGrantSaving(true);
    try {
      await adminApi.setPinResetGrant(id, granted);
      toast.success(
        granted
          ? "One-time Forgot PIN is allowed for this user."
          : "Forgot PIN offer revoked.",
      );
      const refreshed = await adminApi.getUserDetail(id);
      setUser(refreshed.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update PIN reset setting.");
    } finally {
      setPinGrantSaving(false);
    }
  };

  const handleAuthorizeBtn = () => {
    setModal({
      isOpen: true,
      type: 'PIN_RESET',
      payload: true
    });
  };

  const confirmPinReset = async () => {
    closeModal();
    handlePinResetGrant(true);
  };

  const handleStatusChangeBtn = (newStatus) => {
    setModal({
      isOpen: true,
      type: 'STATUS',
      payload: newStatus
    });
  };

  const confirmStatusChange = async () => {
    const newStatus = modal.payload;
    closeModal();
    setUpdating(true);
    try {
      await adminApi.updateUserStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}.`);
      // Refresh
      const res = await adminApi.getUserDetail(id);
      setUser(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner size="lg" className="py-24" />
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <p className="py-24 text-center text-gray-500">User not found.</p>
      </AdminLayout>
    );
  }

  const currentStatus = user.subtypeData?.status || "N/A";
  const accent = getProfileTypeAdmin(user.type_name);
  const balanceNum = user.balance != null ? parseFloat(user.balance) : 0;
  const parsedWalletLimit = parseFloat(walletLimitInput);
  const walletLimitBelowBalance =
    editingWalletLimit &&
    walletLimitInput !== "" &&
    Number.isFinite(parsedWalletLimit) &&
    Number.isFinite(balanceNum) &&
    parsedWalletLimit < balanceNum;

  const fieldLabelClass =
    "text-[11px] font-semibold uppercase tracking-wide text-gray-500";
  const fieldValueClass = "text-sm font-semibold text-gray-900";

  return (
    <AdminLayout>
      {/* Back + Title */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/users")}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ChevronLeftIcon className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="mt-1 text-sm font-semibold tabular-nums text-gray-800">
            {formatProfileRefLabel(user.type_name, user.profile_id)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6 lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)] lg:min-h-0">
        {/* Profile Info — scrollable middle */}
        <div className="min-w-0 flex-1 space-y-6 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {/* Details Card */}
          <div
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${accent.cardBorder}`}
          >
            <div className={`h-1 w-full ${accent.topStripe}`} aria-hidden />
            <div className={`px-4 py-2.5 sm:px-5 ${accent.headerBar}`}>
              <h2 className={`text-xs font-bold uppercase tracking-wide ${accent.headerTitle}`}>
                Profile details
              </h2>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className={fieldLabelClass}>Full name</p>
                <p className="text-base font-semibold text-gray-900">{user.full_name}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className={fieldLabelClass}>Phone</p>
                  <p className={`${fieldValueClass} tabular-nums`}>{user.phone_number}</p>
                </div>
                <div>
                  <p className={fieldLabelClass}>Email</p>
                  <p className={`${fieldValueClass} truncate`}>{user.email || "—"}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className={fieldLabelClass}>NID</p>
                <p className={fieldValueClass}>{user.nid_number || "—"}</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className={fieldLabelClass}>Phone verification</p>
                <p className={`text-sm font-semibold ${user.is_phone_verified ? "text-green-700" : "text-red-600"}`}>
                  {user.is_phone_verified ? "VERIFIED" : "UNVERIFIED"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                <div>
                  <p className={fieldLabelClass}>Joined on</p>
                  <p className={fieldValueClass}>{formatDateTime(user.registration_date)}</p>
                </div>
                <div>
                  <p className={fieldLabelClass}>Approved on</p>
                  {user.subtypeData?.approved_date ? (
                    <p className="text-sm font-semibold text-green-700">{formatDateTime(user.subtypeData.approved_date)}</p>
                  ) : (
                    <p className="text-sm font-medium text-gray-400">—</p>
                  )}
                </div>
              </div>

            </div>
          </div>



          {/* Subtype Details */}
          {user.subtypeData && user.type_name !== "CUSTOMER" && (
            <div
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${accent.cardBorder}`}
            >
              <div className={`h-1 w-full ${accent.topStripe}`} aria-hidden />
              <div
                className={`flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${accent.headerBar}`}
              >
                <div>
                  <h2 className={`text-xs font-bold uppercase tracking-wide ${accent.headerTitle}`}>
                    {user.type_name} account
                  </h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  {user.type_name === "AGENT" && user.distributor && (
                    <button
                      type="button"
                      onClick={() => setDistModalOpen(true)}
                      className={`text-left text-[11px] font-semibold uppercase tracking-wide underline-offset-2 hover:underline ${accent.actionLink}`}
                    >
                      View distributor
                    </button>
                  )}
                  {user.type_name === "DISTRIBUTOR" && user.agents && (
                    <button
                      type="button"
                      onClick={() => setAgentModalOpen(true)}
                      className={`text-left text-[11px] font-semibold uppercase tracking-wide underline-offset-2 hover:underline ${accent.actionLink}`}
                    >
                      View agents ({user.agents.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-5">
                {user.type_name === "MERCHANT" ? (
                  <div className="space-y-4">
                    <div>
                      <p className={fieldLabelClass}>Merchant code</p>
                      {user.subtypeData.merchant_code ? (
                        <CopyableCode value={String(user.subtypeData.merchant_code)} />
                      ) : (
                        <p className={fieldValueClass}>—</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className={fieldLabelClass}>Shop name</p>
                        <p className={fieldValueClass}>{user.subtypeData.shop_name || "—"}</p>
                      </div>
                      <div>
                        <p className={fieldLabelClass}>Address</p>
                        <p className={`${fieldValueClass} whitespace-pre-wrap`}>{user.subtypeData.shop_address || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className={fieldLabelClass}>District</p>
                        <p className={fieldValueClass}>{user.subtypeData.district || "—"}</p>
                      </div>
                      <div>
                        <p className={fieldLabelClass}>Area</p>
                        <p className={fieldValueClass}>{user.subtypeData.area || "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : user.type_name === "AGENT" ? (
                  <div className="space-y-4">
                    <div>
                      <p className={fieldLabelClass}>Agent code</p>
                      {user.subtypeData.agent_code ? (
                        <CopyableCode value={String(user.subtypeData.agent_code)} />
                      ) : (
                        <p className={fieldValueClass}>—</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className={fieldLabelClass}>Shop name</p>
                        <p className={fieldValueClass}>{user.subtypeData.shop_name || "—"}</p>
                      </div>
                      <div>
                        <p className={fieldLabelClass}>Address</p>
                        <p className={`${fieldValueClass} whitespace-pre-wrap`}>{user.subtypeData.shop_address || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className={fieldLabelClass}>District</p>
                        <p className={fieldValueClass}>{user.subtypeData.district || "—"}</p>
                      </div>
                      <div>
                        <p className={fieldLabelClass}>Area</p>
                        <p className={fieldValueClass}>{user.subtypeData.area || "—"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {Object.entries(user.subtypeData)
                    .filter(([key]) =>
                      !["profile_id", "status", "approved_date", "distributor_id"].includes(key),
                    )
                    .map(([key, value]) => {
                      const isCopyableRoleCode = key === "agent_code" || key === "merchant_code";
                      const raw = value?.toString() || "";
                      return (
                        <div key={key}>
                          <p className={fieldLabelClass}>{key.replace(/_/g, " ")}</p>
                          {isCopyableRoleCode && raw ? (
                            <CopyableCode value={raw} />
                          ) : (
                            <p className={fieldValueClass}>{raw || "—"}</p>
                          )}
                        </div>
                      );
                    })}
                  {user.type_name === "DISTRIBUTOR" && user.agents && (
                    <div>
                      <p className={fieldLabelClass}>Managing agents</p>
                      <p className={fieldValueClass}>{user.agents.length}</p>
                    </div>
                  )}
                </div>
                  </>
                )}

                {user.type_name === "DISTRIBUTOR" && user.areas && user.areas.length > 0 && (
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <p className={`${fieldLabelClass} mb-2`}>Service areas</p>
                    <div className="flex flex-wrap gap-2">
                      {user.areas.map((a, i) => (
                        <span
                          key={i}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${accent.areaChip}`}
                        >
                          {a.area}, {a.district}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Recent transactions</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">Last 10 movements on this wallet.</p>
            </div>
            <div className="p-4 sm:p-5">
              {!user.recentTransactions || user.recentTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">TrxID</th>
                        <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">Type</th>
                        <th className="pb-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">Amount</th>
                        <th className="pb-3 pr-4 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">Status</th>
                        <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {user.recentTransactions.map((tx) => {
                        const isReversal = !!tx.original_transaction_id;
                        const displayType = isReversal ? "Reversal" : tx.type_name.replace(/_/g, " ");
                        return (
                          <tr key={tx.transaction_id} className="bg-white odd:bg-gray-50/60 hover:bg-primary-50/40 transition-colors">
                            <td className="py-3.5 pr-4 align-top">
                              <CopyableTrxId value={tx.transaction_ref} />
                            </td>
                            <td className="py-3.5 pr-4 align-top">
                              <span className={`text-sm font-semibold ${isReversal ? REVERSAL_TYPE_CLASS : "text-gray-900"}`}>
                                {displayType}
                              </span>
                              {isReversal && tx.original_transaction_ref && (
                                <p className="mt-0.5 text-xs text-gray-600 leading-snug">
                                  of: <CopyableTrxId value={tx.original_transaction_ref} inline />
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 pr-4 text-right align-top font-semibold tabular-nums text-gray-900">{formatBDT(tx.amount)}</td>
                            <td className="py-3.5 pr-4 text-center align-top">
                              <span className={`${TX_STATUS_BADGE} ${TX_STATUS_STYLE[tx.status] || "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right align-top">
                              <span className="text-xs font-medium text-gray-800 tabular-nums">
                                {new Date(tx.transaction_time).toLocaleString("en-BD", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: wallet + actions (fixed width; main column scrolls on large screens) */}
        <div className="w-full shrink-0 space-y-4 lg:w-80 lg:max-w-[20rem]">
          {/* Wallet Card */}
          {user.type_name !== "SYSTEM" && (
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Wallet</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">Balance and maximum balance cap.</p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-300">৳</span>
                <span className="text-3xl font-extrabold tracking-tight text-gray-900">
                  {user.balance != null ? parseFloat(user.balance).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Wallet limit
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-gray-900">
                      ৳
                      {user.max_balance != null
                        ? parseFloat(user.max_balance).toLocaleString("en-BD", { minimumFractionDigits: 2 })
                        : "—"}
                    </p>
                  </div>
                  {!editingWalletLimit && (
                    <button
                      type="button"
                      onClick={() => {
                        setWalletLimitSaveError("");
                        setWalletLimitInput(
                          user.max_balance != null
                            ? String(parseFloat(user.max_balance))
                            : "",
                        );
                        setEditingWalletLimit(true);
                      }}
                      className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-700 transition-all uppercase tracking-tight"
                    >
                      Update limit
                    </button>
                  )}
                </div>
                {editingWalletLimit && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={walletLimitInput}
                          onChange={(e) => {
                            setWalletLimitInput(e.target.value);
                            setWalletLimitSaveError("");
                          }}
                          className={`w-full rounded-xl border bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500/15 ${
                            walletLimitBelowBalance
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/15"
                              : "border-gray-200 focus:border-primary-500"
                          }`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={requestWalletLimitSave}
                          disabled={savingWalletLimit || walletLimitBelowBalance}
                          className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                        >
                          {savingWalletLimit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWalletLimit(false);
                            setWalletLimitSaveError("");
                            if (user?.max_balance != null) {
                              setWalletLimitInput(String(parseFloat(user.max_balance)));
                            }
                          }}
                          className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {walletLimitSaveError ? (
                      <p className="text-[11px] font-medium text-red-600" role="alert">
                        {walletLimitSaveError}
                      </p>
                    ) : null}
                    {walletLimitBelowBalance ? (
                      <p className="text-[11px] font-medium text-red-600" role="alert">
                        Limit cannot be below current balance ({formatBDT(balanceNum)}).
                      </p>
                    ) : null}
                    {savingWalletLimit ? (
                      <p className="text-[11px] font-medium text-amber-800">Saving wallet limit…</p>
                    ) : null}
                    <p className="text-[11px] text-gray-500">
                      The limit must be at least the current balance ({formatBDT(balanceNum)}).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Security: Pin Reset Authorization */}
          {["AGENT", "DISTRIBUTOR", "BILLER"].includes(user.type_name) && (
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-3.5 shadow-sm transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">PIN Reset</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-[13px] font-bold whitespace-nowrap ${user.pin_reset_granted ? 'text-red-500' : 'text-[#008236]'}`}>
                    {user.pin_reset_granted ? "Authorized" : "Locked"}
                  </p>
                </div>
              </div>
              {!user.pin_reset_granted ? (
                <button
                  type="button"
                  disabled={pinGrantSaving}
                  onClick={handleAuthorizeBtn}
                  className="rounded-xl bg-primary-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {pinGrantSaving ? "..." : "Authorize"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pinGrantSaving}
                  onClick={() => handlePinResetGrant(false)}
                  className="rounded-xl bg-primary-600 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {pinGrantSaving ? "..." : "Revoke"}
                </button>
              )}
            </div>
          )}

          {/* Account Status Management Section (Fintech Style) */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Account Status</h2>
              <span
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                  currentStatus === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' :
                  currentStatus === 'SUSPENDED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-red-50 text-red-700 border-red-100'
                }`}
              >
                {currentStatus}
              </span>
            </div>

            {user.type_name !== "SYSTEM" && (
              <div className="flex flex-col gap-2">
                {statusActions
                  .filter((a) => a.status !== currentStatus)
                  .map((action) => {
                    const hierarchyStyles = {
                      'ACTIVE': 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
                      'SUSPENDED': 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100', // Soft warning
                      'BLOCKED': 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-100' // Prominent destructive
                    };
                    
                    return (
                      <button
                        key={action.status}
                        disabled={updating}
                        onClick={() => handleStatusChangeBtn(action.status)}
                        className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 border border-transparent ${hierarchyStyles[action.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {updating ? "..." : action.label}
                      </button>
                    );
                  })}
                
                <p className="mt-1 text-[9px] text-center text-gray-400 font-medium leading-tight px-1">
                  Status changes take effect immediately.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modal.isOpen}
        title={
          modal.type === "WALLET_LIMIT"
            ? "Confirm wallet limit"
            : modal.type === "PIN_RESET"
              ? "Confirm PIN Reset Authorization"
              : "Confirm status change"
        }
        message={
          modal.type === "WALLET_LIMIT"
            ? (() => {
                const newLim = modal.payload;
                const prev =
                  user.max_balance != null ? parseFloat(user.max_balance) : null;
                const balStr = formatBDT(balanceNum);
                const newStr = formatBDT(newLim);
                const prevStr =
                  prev != null && Number.isFinite(prev) ? formatBDT(prev) : "—";
                return `You are about to set the wallet limit for ${user.full_name}.\n\nNew limit: ${newStr}\nPrevious limit: ${prevStr}\nCurrent balance: ${balStr}\n\nThe limit must stay at or above the current balance. This takes effect immediately after you confirm.`;
              })()
            : modal.type === "PIN_RESET"
              ? `Are you sure you want to authorize a one-time PIN reset for ${user.full_name}?\n\nThis will allow the user to choose a new PIN from the login screen. Once used, it will be automatically disabled again.`
              : `Are you sure you want to change ${user.full_name}'s status to ${modal.payload}?\n\nThis affects their ability to perform transactions immediately.`
        }
        confirmLabel={
          modal.type === "WALLET_LIMIT"
            ? "Update limit"
            : modal.type === "PIN_RESET"
              ? "Authorize Reset"
              : "Update status"
        }
        isDanger={
          (modal.type === "STATUS" && ["SUSPENDED", "BLOCKED"].includes(modal.payload)) ||
          modal.type === "PIN_RESET"
        }
        onConfirm={
          modal.type === "WALLET_LIMIT"
            ? confirmWalletLimit
            : modal.type === "PIN_RESET"
              ? confirmPinReset
              : confirmStatusChange
        }
        onCancel={closeModal}
      />

      {/* Distributor Modal (for Agents) */}
      {user.distributor && (
        <FintechModal
          isOpen={distModalOpen}
          onClose={() => setDistModalOpen(false)}
          title="Linked distributor"
          accentStripe={getProfileTypeAdmin("DISTRIBUTOR").topStripe}
        >
          <div className="space-y-5">
            <div className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <ProfileAvatar
                pictureUrl={user.distributor.profile_picture_url}
                name={user.distributor.full_name}
                className="h-12 w-12 text-base"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Business
                </p>
                <p className="text-base font-bold text-gray-900">
                  {user.distributor.business_name || user.distributor.full_name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Contact: <span className="font-medium text-gray-900">{user.distributor.full_name}</span>
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-gray-800">
                  {user.distributor.phone_number}
                </p>
              </div>
            </div>

            {user.distributor.areas && user.distributor.areas.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  Service areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.distributor.areas.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-orange-200/80 bg-orange-50/90 px-2.5 py-1 text-[11px] font-semibold text-orange-900"
                    >
                      {a.area}, {a.district}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                navigate(`/admin/users/${user.distributor.profile_id}`);
                setDistModalOpen(false);
              }}
              className="w-full rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
            >
              Open distributor profile
            </button>
          </div>
        </FintechModal>
      )}

      {/* Agents List Modal (for Distributors) */}
      {user.agents && (
        <FintechModal
          isOpen={agentModalOpen}
          onClose={() => setAgentModalOpen(false)}
          title="Connected agents"
          subtitle={`${user.agents.length} agent${user.agents.length === 1 ? "" : "s"} linked to this distributor`}
          accentStripe={getProfileTypeAdmin("AGENT").topStripe}
        >
          <div className="custom-scrollbar max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto pr-1">
            {user.agents.map((agent) => {
              const expanded = activeAgentId === agent.profile_id;
              return (
                <div
                  key={agent.profile_id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50/80"
                    onClick={() =>
                      setActiveAgentId(expanded ? null : agent.profile_id)
                    }
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ProfileAvatar
                        pictureUrl={agent.profile_picture_url}
                        name={agent.full_name}
                        className="h-10 w-10 text-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {agent.full_name}
                        </p>
                        <p className="text-xs font-medium tabular-nums text-gray-500">
                          {agent.phone_number}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex h-7 w-[4.5rem] shrink-0 items-center justify-center rounded-md border text-[10px] font-bold uppercase tracking-wide ${
                        agent.status === "ACTIVE"
                          ? "border-green-100 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </button>
                  {expanded && (
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Agent code
                          </p>
                          <CopyableCode value={agent.agent_code} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Shop
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {agent.shop_name || "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(`/admin/users/${agent.profile_id}`);
                          setAgentModalOpen(false);
                        }}
                        className="w-full rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        Open agent profile
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FintechModal>
      )}
    </AdminLayout>
  );
}

// ── Admin overlay modal (consistent with user detail cards) ───
function FintechModal({ isOpen, onClose, title, subtitle, accentStripe, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md animate-scaleIn overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        {accentStripe ? (
          <div className={`h-1 w-full ${accentStripe}`} aria-hidden />
        ) : null}
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="admin-modal-title"
                className="text-lg font-bold tracking-tight text-gray-900"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-sm font-medium tabular-nums text-gray-600">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

