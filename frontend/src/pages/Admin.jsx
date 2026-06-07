import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats, getAdminOrders } from '../api/services.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatMoney, formatDate } from '../lib/format.js';
import { getPaymentMethodLabel } from '../lib/paymentMethods.js';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'PROCESSING', 'PAID', 'FAILED'];

const StatCard = ({ label, value, accent }) => (
  <div className="card p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`mt-2 text-3xl font-extrabold ${accent}`}>{value}</p>
  </div>
);

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(() => {
    getAdminStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  const loadOrders = useCallback(() => {
    setLoading(true);
    const params = { page, pageSize: 10 };
    if (search.trim()) params.search = search.trim();
    if (status !== 'ALL') params.status = status;
    getAdminOrders(params)
      .then((res) => {
        setOrders(res.data);
        setPagination(res.pagination);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadOrders, 300); // debounce search
    return () => clearTimeout(t);
  }, [loadOrders]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor SifaloPay test transactions.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            loadStats();
            loadOrders();
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Orders" value={stats?.totalOrders ?? '—'} accent="text-slate-900" />
        <StatCard label="Successful" value={stats?.successfulPayments ?? '—'} accent="text-emerald-600" />
        <StatCard label="Pending" value={stats?.pendingPayments ?? '—'} accent="text-amber-600" />
        <StatCard label="Failed" value={stats?.failedPayments ?? '—'} accent="text-rose-600" />
      </div>

      <div className="card mt-8">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input sm:w-64"
              placeholder="Search name, email, phone, ID…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="input sm:w-40"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All statuses' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {o.id.slice(0, 10)}…
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{o.customerName}</div>
                      <div className="text-xs text-slate-400">{o.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatMoney(o.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {getPaymentMethodLabel(o.paymentMethod)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {o.transactionId ? `${o.transactionId.slice(0, 14)}…` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/status?orderId=${o.id}`}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
