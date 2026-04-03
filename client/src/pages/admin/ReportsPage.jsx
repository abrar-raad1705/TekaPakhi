import { useState } from "react";
import { adminApi } from "../../api/adminApi";
import { formatBDT } from "../../utils/formatCurrency";
import AdminLayout from "../../components/admin/AdminLayout";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toast } from "sonner";
import { DatePicker } from "../../components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("transactions");
  const [groupBy, setGroupBy] = useState("day");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setData(null);
    try {
      const params = { fromDate, toDate, groupBy };
      const res =
        reportType === "transactions"
          ? await adminApi.getTransactionReport(params)
          : await adminApi.getUserGrowthReport(params);
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}_report_${fromDate}_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">
          Generate and export platform reports
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="w-[180px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Report Type
          </label>
          <Select value={reportType} onValueChange={(val) => { setReportType(val); setData(null); }}>
             <SelectTrigger className="w-full bg-white h-[38px]">
               <SelectValue placeholder="Report Type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="transactions">Transaction Volume</SelectItem>
               <SelectItem value="users">User Growth</SelectItem>
             </SelectContent>
          </Select>
        </div>

        <div className="w-[210px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            From
          </label>
          <DatePicker 
            value={fromDate}
            onChange={(val) => setFromDate(val || '')}
            placeholder="Start Date"
          />
        </div>

        <div className="w-[210px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            To
          </label>
          <DatePicker 
            value={toDate}
            onChange={(val) => setToDate(val || '')}
            placeholder="End Date"
          />
        </div>

        <div className="w-[150px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Group By
          </label>
          <Select value={groupBy} onValueChange={(val) => setGroupBy(val)}>
             <SelectTrigger className="w-full bg-white h-[38px]">
               <SelectValue placeholder="Group By" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="day">Day</SelectItem>
               <SelectItem value="week">Week</SelectItem>
               <SelectItem value="month">Month</SelectItem>
             </SelectContent>
          </Select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        {data && data.length > 0 && (
          <button
            onClick={exportCSV}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Results */}
      {loading && <LoadingSpinner size="lg" className="py-12" />}

      {data && !loading && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {data.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No data for the selected period.
            </p>
          ) : reportType === "transactions" ? (
            <TransactionReportTable data={data} />
          ) : (
            <UserGrowthTable data={data} />
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function TransactionReportTable({ data }) {
  // Aggregate totals
  const totals = data.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      volume: acc.volume + parseFloat(r.volume),
      revenue: acc.revenue + parseFloat(r.revenue),
    }),
    { count: 0, volume: 0, revenue: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Count</th>
            <th className="px-4 py-3 text-right">Volume</th>
            <th className="px-4 py-3 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{r.period}</td>
              <td className="px-4 py-3 text-gray-700">{r.type_name}</td>
              <td className="px-4 py-3 text-right text-gray-900">{r.count}</td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {formatBDT(r.volume)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-green-600">
                {formatBDT(r.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50">
          <tr className="font-semibold">
            <td className="px-4 py-3 text-gray-900" colSpan={2}>
              Totals
            </td>
            <td className="px-4 py-3 text-right text-gray-900">
              {totals.count}
            </td>
            <td className="px-4 py-3 text-right text-gray-900">
              {formatBDT(totals.volume)}
            </td>
            <td className="px-4 py-3 text-right text-green-600">
              {formatBDT(totals.revenue)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function UserGrowthTable({ data }) {
  const total = data.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Registrations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{r.period}</td>
              <td className="px-4 py-3 text-gray-700">{r.type_name}</td>
              <td className="px-4 py-3 text-right text-gray-900">{r.count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50">
          <tr className="font-semibold">
            <td className="px-4 py-3 text-gray-900" colSpan={2}>
              Total
            </td>
            <td className="px-4 py-3 text-right text-gray-900">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
