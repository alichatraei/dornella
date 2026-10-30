import { t } from '@/dictionary';

export function OrderBadge({ status }: { status: string }) {
  const s = t.status[status] || { label: status, tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`chip ${s.tone}`}>{s.label}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const s = t.paymentStatus[status];
  return <span className={`chip ${s.tone}`}>{s.label}</span>;
}
