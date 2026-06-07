import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getPaymentStatus, verifyPayment } from '../api/services.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatMoney, formatDate } from '../lib/format.js';

const Row = ({ label, value, mono }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
      {value || '-'}
    </span>
  </div>
);

export default function Status() {
  const [params] = useSearchParams();
  const id = params.get('orderId') || params.get('id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError('No order id provided.');
      setLoading(false);
      return;
    }
    try {
      const data = await getPaymentStatus(id);
      setOrder(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-poll while the payment is still in a non-final state.
  useEffect(() => {
    if (!order) return undefined;
    if (['PAID', 'FAILED'].includes(order.status)) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [order, load]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const data = await verifyPayment({ orderId: id });
      setOrder((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const isPaid = order?.status === 'PAID';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {loading && (
        <div className="card h-72 animate-pulse bg-slate-100" />
      )}

      {!loading && error && (
        <div className="card p-6 text-center">
          <p className="text-rose-600">{error}</p>
          <Link to="/" className="btn-secondary mt-4">
            Back to store
          </Link>
        </div>
      )}

      {!loading && order && (
        <div className="card overflow-hidden">
          <div
            className={`px-6 py-8 text-center ${
              isPaid
                ? 'bg-emerald-50'
                : order.status === 'FAILED'
                ? 'bg-rose-50'
                : 'bg-amber-50'
            }`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow">
              {isPaid ? (
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : order.status === 'FAILED' ? (
                <svg className="h-7 w-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <span className="h-6 w-6 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              {isPaid
                ? 'Payment Successful'
                : order.status === 'FAILED'
                ? 'Payment Failed'
                : 'Payment In Progress'}
            </h1>
            <div className="mt-3 flex justify-center">
              <StatusBadge status={order.status} />
            </div>
          </div>

          <div className="px-6 py-4">
            <Row label="Order ID" value={order.id} mono />
            <Row label="Transaction ID" value={order.transactionId} mono />
            <Row label="Amount" value={formatMoney(order.amount)} />
            <Row label="Payment Method" value={order.paymentMethod || 'SifaloPay'} />
            <Row label="Customer" value={order.customerName} />
            <Row label="Email" value={order.customerEmail} />
            <Row label="Phone" value={order.customerPhone} />
            <Row label="Date" value={formatDate(order.createdAt)} />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row">
            <Link to="/" className="btn-secondary flex-1">
              Back to store
            </Link>
            {!isPaid && order.status !== 'FAILED' && (
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? 'Checking…' : 'Refresh status'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
