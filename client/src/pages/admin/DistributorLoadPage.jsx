import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import { formatBDT } from "../../utils/formatCurrency";
import AdminLayout from "../../components/admin/AdminLayout";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../components/ui/pagination";
import { getPaginationRange } from "../../utils/paginationRange";

const DISTRIBUTOR_TYPE_ID = "4";

export default function DistributorLoadPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({
    users: [],
    total: 0,
    page: 1,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [submitting, setSubmitting] = useState(false);

  const [picker, setPicker] = useState(null);
  const [loadAmount, setLoadAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const page = parseInt(searchParams.get("page") || "1", 10);

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 20,
        search: search || undefined,
        typeId: DISTRIBUTOR_TYPE_ID,
        status: "ACTIVE",
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load distributors.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams("search", search);
  };

  const openAmountStep = (u) => {
    setPicker({ profileId: u.profile_id, fullName: u.full_name });
    setLoadAmount("");
  };

  const proceedToConfirm = () => {
    const v = parseFloat(loadAmount);
    if (!loadAmount || !Number.isFinite(v) || v <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setConfirmOpen(true);
  };

  const closePickers = () => {
    setPicker(null);
    setLoadAmount("");
    setConfirmOpen(false);
  };

  const executeLoad = async () => {
    if (!picker) return;
    const v = parseFloat(loadAmount);
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const res = await adminApi.loadWallet(picker.profileId, v);
      toast.success(res.data.message || "E-money loaded.");
      closePickers();
      fetchDistributors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load wallet.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmMessage = picker
    ? `Load ${formatBDT(parseFloat(loadAmount) || 0)} to ${picker.fullName}'s wallet?\n\nThis creates new e-money backed by physical cash deposit. This action cannot be undone.`
    : "";

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Load e-money</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Distributor wallets only · {data.total.toLocaleString()} listed
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : data.users.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">No distributors found.</p>
        ) : (
          <div className="overflow-x-auto px-1">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Distributor
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((u) => (
                  <tr key={u.profile_id} className="bg-white odd:bg-gray-50/60">
                    <td className="px-4 py-3.5 align-middle">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/users/${u.profile_id}`)}
                        className="flex w-full items-center justify-start gap-3 text-left hover:opacity-90"
                      >
                        <ProfileAvatar
                          pictureUrl={u.profile_picture_url}
                          name={u.full_name}
                          className="h-10 w-10 text-sm"
                        />
                        <span className="font-semibold text-gray-900">{u.full_name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-left align-middle text-sm font-medium tabular-nums text-gray-700">
                      {u.phone_number}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-gray-900">
                      {u.balance != null ? formatBDT(u.balance) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => openAmountStep(u)}
                        className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/80 px-5 py-3">
            <div className="text-xs text-gray-500 font-medium sm:flex-1 text-center sm:text-left">
              Page <span className="text-gray-800 font-semibold">{data.page}</span> of {data.totalPages}
            </div>
            <div className="sm:flex-1 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => updateParams("page", String(data.page - 1))}
                      disabled={data.page <= 1}
                      className={data.page <= 1 ? 'pointer-events-none opacity-40' : ''}
                    />
                  </PaginationItem>
                  {getPaginationRange(data.page, data.totalPages).map((p, i) =>
                    p === '…' ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === data.page}
                          onClick={() => updateParams("page", String(p))}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => updateParams("page", String(data.page + 1))}
                      disabled={data.page >= data.totalPages}
                      className={data.page >= data.totalPages ? 'pointer-events-none opacity-40' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
            <div className="hidden sm:block sm:flex-1" />
          </div>
        )}
      </div>

      {picker && !confirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => !submitting && closePickers()}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-200/80">
            <h2 className="text-lg font-bold text-gray-900">Load e-money</h2>
            <p className="mt-1 text-sm text-gray-600">{picker.fullName}</p>
            <div className="relative mt-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-300">
                ৳
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={loadAmount}
                onChange={(e) => setLoadAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-lg font-bold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
              />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Must be backed by physical cash on hand. You will confirm in the next step.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closePickers}
                disabled={submitting}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedToConfirm}
                disabled={submitting}
                className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                Review & confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmOpen && !!picker}
        title="Confirm e-money load"
        message={confirmMessage}
        confirmLabel="Load now"
        isDanger={false}
        onConfirm={executeLoad}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
