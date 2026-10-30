'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { OrderBadge } from '@/components/ui/StatusBadge';
import { Empty, PageHead } from '@/components/admin/ui';
import { t } from '@/dictionary';
import { faDate, timeLeft, toFa } from '@/lib/format';
import type { Order, Paginated } from '@/lib/types';

const TABS = ['', 'PAYMENT_REVIEW', 'AWAITING_DEPOSIT', 'HOLDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'];

function OrdersTable() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status') || '';
  const kind = params.get('kind') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(params.get('search') || '');
  const [data, setData] = useState<(Paginated<Order> & { byStatus: Record<string, number> }) | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams({ limit: '25', page: String(page) });
    if (status) q.set('status', status);
    if (kind) q.set('kind', kind);
    if (params.get('search')) q.set('search', params.get('search')!);
    api(`/orders/admin?${q}`, { auth: true }).then(setData).catch(() => null);
  }, [status, kind, page, params]);

  useEffect(() => { load(); }, [load]);

  const go = (patch: Record<string, string>) => {
    const q = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    if (!('page' in patch)) q.delete('page');
    router.push(`/admin/orders?${q}`);
  };

  return (
    <div className="space-y-5">
      <PageHead title={t.admin.menu.orders} actions={
        <form onSubmit={(e) => { e.preventDefault(); go({ search }); }} className="flex gap-2">
          <input className="input h-10 w-60" placeholder="شماره سفارش، نام یا موبایل" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-outline h-10">جست‌وجو</button>
        </form>
      } />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((s) => (
          <button key={s || 'all'} type="button" onClick={() => go({ status: s })}
            className={`chip h-8 shrink-0 border px-3 ${status === s ? 'border-pink-500 bg-pink-500 text-white' : 'border-line bg-white text-ink-soft'}`}>
            {s ? t.status[s].label : 'همه'}
            {s && data?.byStatus?.[s] ? <span className="opacity-70">({toFa(data.byStatus[s])})</span> : null}
          </button>
        ))}
        <select className="input h-8 w-auto shrink-0 rounded-full py-0 text-xs" value={kind} onChange={(e) => go({ kind: e.target.value })}>
          <option value="">همه نوع‌ها</option>
          <option value="HOLD">سبد ۱۰ روزه</option>
          <option value="NORMAL">خرید عادی</option>
        </select>
      </div>

      {!data ? <p className="text-sm text-ink-muted">{t.common.loading}</p> : data.items.length === 0 ? <Empty text="سفارشی با این فیلتر نیست." /> : (
        <>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>سفارش</th><th>مشتری</th><th>تاریخ</th><th>مبلغ</th><th>پرداخت‌شده</th><th>وضعیت</th><th /></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-pink-50/40">
                    <td>
                      <b>{toFa(o.orderNumber)}</b>
                      {o.kind === 'HOLD' && (
                        <p className="text-[11px] text-pink-600">سبد ۱۰ روزه{o.status === 'HOLDING' && o.holdUntil ? ` · ${timeLeft(o.holdUntil)}` : ''}</p>
                      )}
                    </td>
                    <td><p>{o.receiverName}</p><p className="text-xs text-ink-muted" dir="ltr">{toFa(o.user?.phone || o.receiverPhone)}</p></td>
                    <td className="text-xs text-ink-muted">{faDate(o.createdAt)}</td>
                    <td className="whitespace-nowrap font-bold">{t.common.toman(o.total)}</td>
                    <td className="whitespace-nowrap text-xs">{o.paidAmount ? t.common.toman(o.paidAmount) : '—'}</td>
                    <td><OrderBadge status={o.status} /></td>
                    <td><Link href={`/admin/orders/${o.id}`} className="btn-outline btn-sm">جزئیات</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="btn-outline btn-sm">قبلی</button>
              <span className="text-sm">{toFa(page)} از {toFa(data.pages)}</span>
              <button disabled={page >= data.pages} onClick={() => go({ page: String(page + 1) })} className="btn-outline btn-sm">بعدی</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return <Suspense><OrdersTable /></Suspense>;
}
