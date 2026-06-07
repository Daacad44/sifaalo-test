import { PAYMENT_METHODS } from '../lib/paymentMethods.js';

export default function PaymentMethodPicker({ value, onChange, disabled }) {
  return (
    <fieldset className="space-y-2">
      <legend className="label mb-2">Payment Method</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method) => {
          const selected = value === method.id;
          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                selected
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(method.id)}
                className="mt-1 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  {method.label}
                </span>
                <span className="block text-xs text-slate-500">{method.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
