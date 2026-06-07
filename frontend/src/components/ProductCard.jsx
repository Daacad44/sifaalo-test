import { formatMoney } from '../lib/format.js';

export default function ProductCard({ product, onBuy }) {
  return (
    <div className="card flex flex-col overflow-hidden transition hover:shadow-md">
      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
        {/* Product image placeholder */}
        <svg
          className="h-16 w-16 text-brand-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18a1.5 1.5 0 001.5-1.5V6A1.5 1.5 0 0021 4.5H3A1.5 1.5 0 001.5 6v12A1.5 1.5 0 003 19.5z"
          />
        </svg>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-500">SifaloPay test item</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {formatMoney(product.price)}
          </span>
        </div>
        <button
          type="button"
          className="btn-primary mt-5 w-full"
          onClick={() => onBuy(product)}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
