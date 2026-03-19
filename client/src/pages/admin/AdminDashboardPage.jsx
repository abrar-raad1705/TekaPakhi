import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UsersIcon, 
  ArrowsRightLeftIcon, 
  BanknotesIcon, 
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';
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
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          label="Today's Transactions"
          value={transactions.today.count.toLocaleString()}
          subValue={`Volume: ${formatBDT(transactions.today.volume)}`}
          icon={ArrowsRightLeftIcon}
          color="green"
        />
        <StatCard
          label="This Month's Volume"
          value={formatBDT(transactions.thisMonth.volume)}
          subValue={`${transactions.thisMonth.count.toLocaleString()} transactions`}
          icon={BanknotesIcon}
          color="purple"
        />
        <StatCard
          label="Total Revenue"
          value={formatBDT(transactions.allTime.revenue)}
          subValue={`Today: ${formatBDT(transactions.today.revenue)}`}
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
