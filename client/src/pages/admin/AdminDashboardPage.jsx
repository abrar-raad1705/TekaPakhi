import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then((res) => setData(res.data.data))
      .catch(console.error)
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
        <p className="py-24 text-center text-gray-500">Failed to load dashboard.</p>
      </AdminLayout>
    );
  }

  const { users, platform, transactions, recentRegistrations } = data;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your MFS platform</p>
      </div>

      {/* Platform Financial Overview */}
      <div className="mb-6 rounded-xl border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
        <h2 className="mb-4 text-sm font-semibold text-indigo-700">Platform Financials</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Total Float Issued</p>
            <p className="text-xl font-bold text-indigo-900">{formatBDT(platform?.totalFloatIssued || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Platform Cash Reserve</p>
            <p className="text-xl font-bold text-green-700">{formatBDT(platform?.cashReserve || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Platform Revenue</p>
            <p className="text-xl font-bold text-orange-600">{formatBDT(platform?.platformRevenue || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Platform Liability</p>
            <p className="text-xl font-bold text-red-600">{formatBDT(platform?.platformLiability || 0)}</p>
            <p className="mt-0.5 text-[10px] text-gray-400">Owed to non-system wallets</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-[11px] text-gray-500">
          Total E-Money in System: <span className="font-semibold text-gray-700">{formatBDT(platform?.totalEmoney || 0)}</span>
          &nbsp;&middot;&nbsp;
          Invariant: Cash Reserve = Total E-Money Outstanding
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={users.total.toLocaleString()}
          subValue={users.byType.map((t) => `${t.count} ${t.type_name}`).join(', ')}
          icon="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          color="blue"
        />
        <StatCard
          label="Today's Transactions"
          value={transactions.today.count.toLocaleString()}
          subValue={`Volume: ${formatBDT(transactions.today.volume)}`}
          icon="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          color="green"
        />
        <StatCard
          label="This Month's Volume"
          value={formatBDT(transactions.thisMonth.volume)}
          subValue={`${transactions.thisMonth.count.toLocaleString()} transactions`}
          icon="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
          color="purple"
        />
        <StatCard
          label="Total Revenue"
          value={formatBDT(transactions.allTime.revenue)}
          subValue={`Today: ${formatBDT(transactions.today.revenue)}`}
          icon="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                      {u.full_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.phone_number}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
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
