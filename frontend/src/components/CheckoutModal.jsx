import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createPayment,
  simulatePayment,
  deliverWebhook,
} from '../api/services.js';
import { formatMoney } from '../lib/format.js';
import { getPaymentMethodLabel } from '../lib/paymentMethods.js';
import PaymentMethodPicker from './PaymentMethodPicker.jsx';

const phoneRegex = /^\+?[0-9]{7,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  paymentMethod: 'evc_plus',
};

export default function CheckoutModal({ product, testMode, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('form'); // form | prompt | working
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  const validate = () => {
    const next = {};
    if (!form.customerName || form.customerName.trim().length < 2) {
      next.customerName = 'Please enter your full name.';
    }
    if (!phoneRegex.test(form.customerPhone.trim())) {
      next.customerPhone =
        'Enter a valid phone number (digits only, e.g. 252612345678).';
    }
    if (!emailRegex.test(form.customerEmail.trim())) {
      next.customerEmail = 'Enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await createPayment({
        productId: product.id,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        paymentMethod: form.paymentMethod,
      });
      setOrder(result.order);

      if (testMode) {
        setStep('prompt');
      } else if (result.order?.status === 'PAID') {
        navigate(`/status?orderId=${result.order.id}`);
      } else if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        navigate(`/status?orderId=${result.order.id}`);
      }
    } catch (err) {
      setApiError(err.message || 'Payment could not be initiated.');
    } finally {
      setSubmitting(false);
    }
  };

  // TEST MODE: emulate the customer approving / rejecting the payment, which
  // drives a webhook back into the backend.
  const handleSimulate = async (outcome) => {
    if (!order) return;
    setStep('working');
    setApiError('');
    try {
      const built = await simulatePayment(order.id, outcome);
      await deliverWebhook(built);
      navigate(`/status?orderId=${order.id}`);
    } catch (err) {
      setApiError(err.message || 'Could not complete the simulated payment.');
      setStep('prompt');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {step === 'prompt' || step === 'working'
              ? 'Confirm Payment'
              : 'Checkout'}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {apiError && (
            <div className="mb-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {apiError}
            </div>
          )}

          {/* Order summary (always visible) */}
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Product</span>
              <span className="font-medium text-slate-800">{product.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Price</span>
              <span className="font-medium text-slate-800">
                {formatMoney(product.price)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="text-lg font-bold text-brand-700">
                {formatMoney(product.price)}
              </span>
            </div>
          </div>

          {step === 'form' && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="customerName">
                    Full Name
                  </label>
                  <input
                    id="customerName"
                    name="customerName"
                    className="input"
                    placeholder="Jane Doe"
                    value={form.customerName}
                    onChange={handleChange}
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-rose-600">{errors.customerName}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="customerPhone">
                    Mobile Wallet Number
                  </label>
                  <input
                    id="customerPhone"
                    name="customerPhone"
                    className="input"
                    placeholder="e.g. 252612345678 (EVC/ZAAD/Sahal)"
                    value={form.customerPhone}
                    onChange={handleChange}
                  />
                  {errors.customerPhone && (
                    <p className="mt-1 text-xs text-rose-600">{errors.customerPhone}</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="customerEmail">
                    Email Address
                  </label>
                  <input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    className="input"
                    placeholder="jane@example.com"
                    value={form.customerEmail}
                    onChange={handleChange}
                  />
                  {errors.customerEmail && (
                    <p className="mt-1 text-xs text-rose-600">{errors.customerEmail}</p>
                  )}
                </div>
                <PaymentMethodPicker
                  value={form.paymentMethod}
                  disabled={submitting}
                  onChange={(paymentMethod) =>
                    setForm((f) => ({ ...f, paymentMethod }))
                  }
                />
              </div>

              <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
                {submitting ? 'Processing…' : 'Proceed To Payment'}
              </button>
            </form>
          )}

          {step === 'prompt' && (
            <div className="text-center">
              <p className="text-sm text-slate-600">
                A{' '}
                <span className="font-semibold">
                  {getPaymentMethodLabel(form.paymentMethod)}
                </span>{' '}
                payment request for{' '}
                <span className="font-semibold">{formatMoney(product.price)}</span>{' '}
                has been sent to{' '}
                <span className="font-semibold">{form.customerPhone}</span>.
                {testMode
                  ? ' Approve below to simulate the wallet prompt.'
                  : ' Approve the prompt on your phone to complete payment.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSimulate('FAILED')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSimulate('PAID')}
                >
                  Approve Payment
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Test mode: this approves the payment without charging anyone.
              </p>
            </div>
          )}

          {step === 'working' && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              <p className="mt-3 text-sm text-slate-600">Completing payment…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
