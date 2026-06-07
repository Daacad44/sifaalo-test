import { statusStyles, statusLabel } from '../lib/format.js';

export default function StatusBadge({ status }) {
  const cls = statusStyles[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`badge ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {statusLabel[status] || status}
    </span>
  );
}
