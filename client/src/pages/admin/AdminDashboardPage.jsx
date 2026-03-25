import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  BuildingLibraryIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getProfileTypeAdmin, ADMIN_TYPE_PILL_BOX } from '../../utils/roleTheme';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => setData(res.data.data))
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Could not reach the server. Is the API running on port 5000?';
        setLoadError(msg);
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner size="lg" className="py-24" />
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="py-12 text-center">
          <p className="text-lg font-medium text-gray-800">Failed to load dashboard</p>
          {loadError && (
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            Ensure <code className="rounded bg-gray-100 px-1">server/.env</code> has{' '}
            <code className="rounded bg-gray-100 px-1">ADMIN_PASSWORD_HASH</code> and the API is running (
            <code className="rounded bg-gray-100 px-1">npm run server:dev</code>).
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('adminToken');
              navigate('/root', { replace: true });
            }}
            className="mt-6 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Sign in again
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { users, platform, transactions, recentRegistrations } = data;

  const userBreakdownNonSystem = users.byType.filter(
    (t) => String(t.type_name).toUpperCase() !== "SYSTEM",
  );
  const userTotalNonSystem = userBreakdownNonSystem.reduce(
    (s, t) => s + Number(t.count),
    0,
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Overview of TekaPakhi Payment System
        </p>
      </div>

      {/* Platform Financial Overview */}
      <section
        className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
        aria-labelledby="platform-financials-heading"
      >
        <h2
          id="platform-financials-heading"
          className="mb-3 text-sm font-semibold tracking-tight text-gray-900"
        >
          Platform financials
        </h2>

        <div>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            {[
              {
                key: "float",
                title: "Total float issued",
                value: formatBDT(platform?.totalFloatIssued || 0),
                valueClass: "text-gray-900",
                hint: "Digital balance in circulation",
                icon: CircleStackIcon,
                iconWrap: "bg-indigo-50 text-indigo-600",
              },
              {
                key: "reserve",
                title: "Cash reserve",
                value: formatBDT(platform?.cashReserve || 0),
                valueClass: "text-emerald-700",
                hint: "Backed cash on hand",
                icon: ShieldCheckIcon,
                iconWrap: "bg-emerald-50 text-emerald-600",
              },
              {
                key: "revenue",
                title: "Platform revenue",
                value: formatBDT(platform?.platformRevenue || 0),
                valueClass: "text-amber-800",
                hint: "Fees collected to date",
                icon: ArrowTrendingUpIcon,
                iconWrap: "bg-amber-50 text-amber-700",
              },
              {
                key: "liability",
                title: "Platform liability",
                value: formatBDT(platform?.platformLiability || 0),
                valueClass: "text-red-600",
                hint: "Cash obligation (treasury)",
                icon: ExclamationTriangleIcon,
                iconWrap: "bg-red-50 text-red-600",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.key}
                  className="flex gap-2.5 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.iconWrap}`}
                    aria-hidden
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {m.title}
                    </dt>
                    <dd
                      className={`mt-0.5 text-lg font-bold tabular-nums tracking-tight ${m.valueClass}`}
                    >
                      {m.value}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>

        {platform?.treasuryBalance != null && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h3 className="mb-2.5 text-sm font-semibold tracking-tight text-gray-900">
              System wallet balances
            </h3>
            <ul className="grid grid-cols-3 gap-2 lg:gap-3">
              {[
                {
                  label: "Treasury",
                  value: formatBDT(platform.treasuryBalance),
                  icon: BuildingLibraryIcon,
                  iconWrap: "bg-indigo-50 text-indigo-600",
                },
                {
                  label: "Revenue",
                  value: formatBDT(platform.revenueBalance),
                  icon: CurrencyDollarIcon,
                  iconWrap: "bg-emerald-50 text-emerald-600",
                },
                {
                  label: "Adjustment",
                  value: formatBDT(platform.adjustmentBalance),
                  icon: AdjustmentsHorizontalIcon,
                  iconWrap: "bg-amber-50 text-amber-700",
                },
              ].map((w) => {
                const WIcon = w.icon;
                return (
                  <li
                    key={w.label}
                    className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${w.iconWrap}`}
                      aria-hidden
                    >
                      <WIcon className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {w.label}
                      </p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-gray-900">
                        {w.value}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={userTotalNonSystem.toLocaleString()}
          breakdown={userBreakdownNonSystem}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          label="Transactions"
          sections={[
            {
              period: "Today",
              value: transactions.today.count.toLocaleString(),
            },
            {
              period: "This month",
              value: transactions.thisMonth.count.toLocaleString(),
            },
          ]}
          icon={ArrowsRightLeftIcon}
          color="green"
        />
        <StatCard
          label="Volume"
          sections={[
            {
              period: "Today",
              value: formatBDT(transactions.today.volume),
            },
            {
              period: "This month",
              value: formatBDT(transactions.thisMonth.volume),
            },
          ]}
          icon={BanknotesIcon}
          color="purple"
        />
        <StatCard
          label="Total revenue"
          value={formatBDT(transactions.allTime.revenue)}
          equalFooter={{
            label: "Today",
            value: formatBDT(transactions.today.revenue),
          }}
          icon={CurrencyDollarIcon}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Monthly Trend (Last 6 Months)</h2>
          {transactions.monthlyTrend.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.monthlyTrend.map((m) => (
                <div key={m.month} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-700">{m.month}</span>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Txns</p>
                      <p className="text-sm font-semibold text-gray-900">{m.count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Volume</p>
                      <p className="text-sm font-semibold text-gray-900">{formatBDT(m.volume)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Revenue</p>
                      <p className="text-sm font-semibold text-green-600">{formatBDT(m.revenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Registrations */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Recent Registrations</h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          </div>
          {recentRegistrations.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No users yet</p>
          ) : (
            <div className="space-y-2">
              {recentRegistrations.map((u) => (
                <div
                  key={u.profile_id}
                  className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5 hover:bg-gray-100"
                  onClick={() => navigate(`/admin/users/${u.profile_id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getProfileTypeAdmin(u.type_name).avatar}`}
                    >
                      {(u.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.phone_number}</p>
                    </div>
                  </div>
                  <span className={`${ADMIN_TYPE_PILL_BOX} ${getProfileTypeAdmin(u.type_name).badge}`}>
                    {u.type_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All-time stats row */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">All-Time Platform Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{transactions.allTime.count.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Transactions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatBDT(transactions.allTime.volume)}</p>
            <p className="text-xs text-gray-500">Total Volume</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{formatBDT(transactions.allTime.revenue)}</p>
            <p className="text-xs text-gray-500">Total Revenue</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
