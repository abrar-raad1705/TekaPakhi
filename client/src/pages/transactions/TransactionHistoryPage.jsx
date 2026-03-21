import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { transactionApi } from "../../api/transactionApi";
import { useAuth } from "../../context/AuthContext";
import { useSiteHeader } from "../../context/SiteHeaderContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import TransactionDetailPanel from "../../components/transaction/TransactionDetailPanel";
import { formatPhone } from "../../utils/formatCurrency";
import { formatTaka, typeLabels } from "../../utils/transactionDetailFormat";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { TransactionTypeGlyph } from "../../constants/transactionTypeUi";

const ACCENT = "#2563EB";

const TYPES = [
  "ALL",
  "SEND_MONEY",
  "CASH_IN",
  "CASH_OUT",
  "PAYMENT",
  "PAY_BILL",
  "B2B",
];

function filterChipLabel(t) {
  if (t === "ALL") return "All";
  return typeLabels[t] || t;
}

function ninetyDaysAgoIso() {
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
}

function historyRowTitle(tx, isSender) {
  if (tx.type_name === "SEND_MONEY") {
    return isSender ? "Send Money" : "Received Money";
  }
  return typeLabels[tx.type_name] || tx.type_name;
}

function matchesSearch(tx, q) {
  const raw = q.trim().toLowerCase();
  if (!raw) return true;
  const digits = raw.replace(/\D/g, "");
  const ref = (tx.transaction_ref || "").toLowerCase();
  if (ref.includes(raw)) return true;
  const phones = [tx.sender_phone, tx.receiver_phone]
    .filter(Boolean)
    .join("");
  if (digits.length >= 3 && phones.replace(/\D/g, "").includes(digits)) {
    return true;
  }
  const names = [tx.sender_name, tx.receiver_name]
    .filter(Boolean)
    .map((n) => n.toLowerCase());
  return names.some((n) => n.includes(raw));
}

function formatListTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  const mm = String(m).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${String(h12).padStart(2, "0")}:${mm}${ampm} ${day}/${month}/${yy}`;
}

function monthBounds(year, monthIndex) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end, fromISO: start.toISOString(), toISO: end.toISOString() };
}

function monthTitle(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function aggregateMonth(transactions, profileId) {
  const pid = String(profileId ?? "");
  let totalIn = 0;
  let totalOut = 0;
  const map = new Map();

  for (const tx of transactions) {
    const isSender = String(tx.sender_profile_id) === pid;
    const amount = parseFloat(tx.amount) || 0;
    if (isSender) totalOut += amount;
    else totalIn += amount;

    let key;
    let label;
    let outgoing;

    switch (tx.type_name) {
      case "SEND_MONEY":
        outgoing = isSender;
        label = outgoing ? "Send Money" : "Received Money";
        key = outgoing ? "SM_OUT" : "SM_IN";
        break;
      case "CASH_IN":
        key = "CI";
        label = "Cash In";
        outgoing = false;
        break;
      case "CASH_OUT":
        key = "CO";
        label = "Cash Out";
        outgoing = true;
        break;
      case "PAYMENT":
        outgoing = isSender;
        label = outgoing ? "Payment" : "Payment received";
        key = outgoing ? "PY_OUT" : "PY_IN";
        break;
      case "PAY_BILL":
        key = "PB";
        label = "Pay Bill";
        outgoing = true;
        break;
      case "B2B":
        outgoing = isSender;
        label = outgoing ? "B2B Transfer" : "B2B received";
        key = outgoing ? "B2B_OUT" : "B2B_IN";
        break;
      default:
        outgoing = isSender;
        label = typeLabels[tx.type_name] || tx.type_name;
        key = `${tx.type_name}_${outgoing ? "o" : "i"}`;
    }

    const sign = outgoing ? -1 : 1;
    if (!map.has(key)) {
      map.set(key, { key, label, count: 0, total: 0, sign });
    }
    const row = map.get(key);
    row.count += 1;
    row.total += amount;
  }

  const rows = Array.from(map.values())
    .filter((r) => r.count > 0)
    .sort((a, b) => {
      if (a.sign !== b.sign) return b.sign - a.sign;
      return b.total - a.total;
    });

  return { totalIn, totalOut, rows };
}

async function fetchAllHistoryInRange(fromISO, toISO, typeFilter) {
  const all = [];
  let page = 1;
  const limit = 100;
  const maxPages = 30;

  while (page <= maxPages) {
    const params = { page, limit, fromDate: fromISO, toDate: toISO };
    if (typeFilter && typeFilter !== "ALL") params.type = typeFilter;
    const { data } = await transactionApi.getHistory(params);
    const chunk = data.data.transactions || [];
    all.push(...chunk);
    if (page >= data.data.totalPages) break;
    page += 1;
  }
  return all;
}

export default function TransactionHistoryPage() {
  const { user, getHomeRoute } = useAuth();
  const navigate = useNavigate();
  const { setSiteHeaderOverrides, resetSiteHeaderOverrides } = useSiteHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const txParam = searchParams.get("tx");

  const [tab, setTab] = useState("history");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterOpen, setFilterOpen] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [summaryMonth, setSummaryMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [summaryTxns, setSummaryTxns] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState(null);

  const [detailTx, setDetailTx] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const from90d = useMemo(() => ninetyDaysAgoIso(), []);

  const fetchHistory = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const params = {
          page: pageNum,
          limit: 20,
          fromDate: from90d,
        };
        if (filterType !== "ALL") params.type = filterType;
        const { data } = await transactionApi.getHistory(params);
        setTransactions(data.data.transactions);
        setTotalPages(data.data.totalPages);
        setPage(data.data.page);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [filterType, from90d],
  );

  useEffect(() => {
    if (tab !== "history") return;
    fetchHistory(1);
  }, [tab, fetchHistory]);

  const filteredTransactions = useMemo(
    () => transactions.filter((tx) => matchesSearch(tx, search)),
    [transactions, search],
  );

  const fetchSummary = useCallback(async () => {
    const { fromISO, toISO } = monthBounds(summaryMonth.y, summaryMonth.m);
    setSummaryLoading(true);
    try {
      const all = await fetchAllHistoryInRange(fromISO, toISO, "ALL");
      setSummaryTxns(all);
      setSummaryUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
      toast.error("Could not load summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryMonth]);

  useEffect(() => {
    if (tab !== "summary") return;
    fetchSummary();
  }, [tab, fetchSummary]);

  useEffect(() => {
    if (!txParam) {
      setDetailTx(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailTx(null);
    transactionApi
      .getDetail(txParam)
      .then(({ data }) => {
        if (!cancelled) setDetailTx(data.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load transaction");
          setSearchParams({});
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [txParam, setSearchParams]);

  useEffect(() => {
    if (!txParam) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSearchParams({});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [txParam, setSearchParams]);

  const closeDetail = () => setSearchParams({});

  const handleTxClick = (tx) => {
    setSearchParams({ tx: String(tx.transaction_id) });
  };

  const summaryAgg = useMemo(
    () => aggregateMonth(summaryTxns, user?.profileId),
    [summaryTxns, user?.profileId],
  );

  const canSummaryNext = () => {
    const now = new Date();
    return (
      summaryMonth.y < now.getFullYear() ||
      (summaryMonth.y === now.getFullYear() && summaryMonth.m < now.getMonth())
    );
  };

  const shiftSummaryMonth = (delta) => {
    const d = new Date(summaryMonth.y, summaryMonth.m + delta, 1);
    const now = new Date();
    if (d > new Date(now.getFullYear(), now.getMonth(), 1)) return;
    setSummaryMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  const lastUpdatedText = summaryUpdatedAt
    ? `Last Updated: ${formatListTime(summaryUpdatedAt.toISOString())}`
    : "";

  const goHome = useCallback(() => {
    navigate(getHomeRoute());
  }, [navigate, getHomeRoute]);

  useEffect(() => {
    setSiteHeaderOverrides({ back: goHome });
    return () => resetSiteHeaderOverrides();
  }, [goHome, setSiteHeaderOverrides, resetSiteHeaderOverrides]);

  return (
    <div className="relative min-h-dvh bg-[#f4f5f7] pb-8">
      {/* Sticky tabs below global SiteHeader (~56px + border) */}
      <div
        className="sticky z-40 w-full border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-200/30 backdrop-blur-md motion-reduce:backdrop-blur-none"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
      >
        <div className="mx-auto flex max-w-2xl">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`relative flex-1 py-3.5 text-center text-sm font-bold transition-colors ${
              tab === "history" ? "" : "text-slate-500"
            }`}
            style={
              tab === "history"
                ? { color: ACCENT, boxShadow: `inset 0 -3px 0 0 ${ACCENT}` }
                : undefined
            }
          >
            Transaction History
          </button>
          <button
            type="button"
            onClick={() => setTab("summary")}
            className={`relative flex-1 py-3.5 text-center text-sm font-bold transition-colors ${
              tab === "summary" ? "" : "text-slate-500"
            }`}
            style={
              tab === "summary"
                ? { color: ACCENT, boxShadow: `inset 0 -3px 0 0 ${ACCENT}` }
                : undefined
            }
          >
            Transaction Summary
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl overflow-hidden">
        <div
          className="flex w-[200%] will-change-transform transition-transform duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none"
          style={{
            transform: tab === "history" ? "translateX(0)" : "translateX(-50%)",
          }}
        >
          <section className="w-1/2 min-w-[50%] shrink-0 px-4 pt-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  strokeWidth={2}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by TrxID or number"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold shadow-sm transition-colors hover:border-[#2563EB]/40"
                style={{ color: ACCENT }}
              >
                <AdjustmentsHorizontalIcon
                  className="h-5 w-5"
                  strokeWidth={2}
                />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Transactions from the last 90 days
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-col items-center py-16">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3 text-sm font-medium text-slate-400">
                    Loading…
                  </p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-slate-600">
                    No transactions found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try another search or filter.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <HistoryRow
                      key={tx.transaction_id}
                      tx={tx}
                      profileId={user?.profileId}
                      onOpen={() => handleTxClick(tx)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {!loading && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fetchHistory(page - 1)}
                  disabled={page <= 1}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  Previous
                </button>
                <span
                  className="text-sm font-bold"
                  style={{ color: ACCENT }}
                >
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => fetchHistory(page + 1)}
                  disabled={page >= totalPages}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </section>

          <section className="w-1/2 min-w-[50%] shrink-0 px-4 pt-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shiftSummaryMonth(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="min-w-0 flex-1 text-center text-base font-bold text-slate-900">
                  {monthTitle(summaryMonth.y, summaryMonth.m)} Summary
                </p>
                <button
                  type="button"
                  onClick={() => shiftSummaryMonth(1)}
                  disabled={!canSummaryNext()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              {lastUpdatedText ? (
                <p className="mt-2 text-center text-xs text-slate-500">
                  {lastUpdatedText}
                </p>
              ) : null}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              {summaryLoading ? (
                <div className="flex flex-col items-center py-16">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs font-semibold text-slate-500">
                        Total in
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-600">
                        +{formatTaka(summaryAgg.totalIn)}
                      </p>
                    </div>
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs font-semibold text-slate-500">
                        Total out
                      </p>
                      <p className="mt-1 text-lg font-bold text-rose-600">
                        −{formatTaka(summaryAgg.totalOut)}
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {summaryAgg.rows.length === 0 ? (
                      <li className="px-4 py-10 text-center text-sm text-slate-500">
                        No activity this month
                      </li>
                    ) : (
                      summaryAgg.rows.map((row) => (
                        <li
                          key={row.key}
                          className="flex items-center justify-between gap-3 px-4 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-slate-900">
                              {row.label}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.count} time{row.count === 1 ? "" : "s"}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-[15px] font-bold ${
                              row.sign < 0
                                ? "text-rose-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {row.sign < 0 ? "−" : "+"}
                            {formatTaka(row.total)}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Filter sheet */}
      {filterOpen ? (
        <div className="fixed inset-0 z-[55] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close filter"
            onClick={() => setFilterOpen(false)}
          />
          <div className="relative max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
            <p className="mb-3 text-sm font-bold text-slate-900">Filter by type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFilterType(t);
                    setFilterOpen(false);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    filterType === t
                      ? "text-white shadow-md"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                  style={
                    filterType === t
                      ? { backgroundColor: ACCENT }
                      : undefined
                  }
                >
                  {filterChipLabel(t)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {txParam ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-md transition-opacity"
            aria-label="Close transaction details"
            onClick={closeDetail}
          />
          <div className="relative z-10 max-h-[min(90dvh,880px)] w-full max-w-xl overflow-y-auto overscroll-contain animate-in zoom-in-95 fade-in duration-200">
            <span id="tx-detail-title" className="sr-only">
              Transaction details
            </span>
            {detailLoading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailTx ? (
              <TransactionDetailPanel
                tx={detailTx}
                user={user}
                onClose={closeDetail}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HistoryRow({ tx, profileId, onOpen }) {
  const isSender =
    String(tx.sender_profile_id) === String(profileId ?? "");
  const counterparty = isSender
    ? {
        name: tx.receiver_name,
        phone: tx.receiver_phone,
        pictureUrl: tx.receiver_profile_picture_url,
      }
    : {
        name: tx.sender_name,
        phone: tx.sender_phone,
        pictureUrl: tx.sender_profile_picture_url,
      };
  const title = historyRowTitle(tx, isSender);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100/80"
      >
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <TransactionTypeGlyph typeName={tx.type_name} className="h-4 w-4" />
          </div>
          <ProfileAvatar
            pictureUrl={counterparty.pictureUrl}
            name={counterparty.name}
            className="h-11 w-11 text-base"
            accentColor={ACCENT}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-slate-900">{title}</p>
          <p className="truncate text-sm text-slate-500">
            {counterparty.name || "—"}
          </p>
          {counterparty.phone ? (
            <p className="truncate text-sm text-slate-500">
              {formatPhone(counterparty.phone)}
            </p>
          ) : null}
          <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
            TrxID : {tx.transaction_ref}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="text-right">
            <p
              className={`text-[15px] font-bold ${
                isSender ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {isSender ? "− " : "+ "}
              {formatTaka(tx.amount)}
            </p>
            <p className="text-xs text-slate-400">
              {formatListTime(tx.transaction_time)}
            </p>
          </div>
          <ChevronRightIcon
            className="h-5 w-5 text-slate-300"
            strokeWidth={2}
          />
        </div>
      </button>
    </li>
  );
}
