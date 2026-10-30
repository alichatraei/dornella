'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OrderBadge } from '@/components/ui/StatusBadge';
import { api, mediaUrl } from '@/lib/api';
import { t } from '@/dictionary';
import { faDate, toFa } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api<Order[]>('/orders/mine', { auth: true }).then(setOrders).catch(() => setOrders([]));
  }, []);

  if (!orders) return <p className="text-sm text-ink-muted">{t.common.loading}</p>;
  if (orders.length === 0) {
    return (
      <div className="card py-14 text-center">
        <h1 className="font-extrabold">{t.order.noOrders}</h1>
        <Link href="/products" className="btn-primary mt-6">{t.cart.browse}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="mb-1 font-extrabold">{t.order.myOrders}</h1>
      {orders.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="card block p-4 transition hover:border-pink-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <b className="text-sm">{toFa(o.orderNumber)}</b>
              {o.kind === 'HOLD' && <span className="chip bg-pink-50 text-pink-700">{t.order.kindHold}</span>}
            </div>
            <OrderBadge status={o.status} />
          </div>
          <div className="mt-3 flex items-center gap-2 overflow-hidden">
            {o.items.slice(0, 5).map((i) => (
              <img key={i.id} src={mediaUrl(i.image)} alt="" className="h-14 w-11 rounded-lg bg-pink-50 object-cover" />
            ))}
            {o.items.length > 5 && <span className="text-xs text-ink-muted">+{toFa(o.items.length - 5)}</span>}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-xs text-ink-muted">{faDate(o.createdAt)}</span>
            <span className="flex items-center gap-3">
              {o.due.amount > 0 && <span className="chip bg-pink-500 text-white">{t.order.pay}</span>}
              <b>{t.common.toman(o.total)}</b>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
