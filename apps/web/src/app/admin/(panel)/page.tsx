'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import BarChart from '@/components/admin/BarChart';
import { PageHead, Stat } from '@/components/admin/ui';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';

type Summary = {
  revenue: number; cost: number; profit: number; profitMargin: number; paidOrders: number; totalOrders: number;
  itemsSold: number; averageOrderValue: number; pendingPayment: number; paymentReview: number; processing: number;
  holding: number; customers: number; newCustomers: number;
};
type Point = { date: string; revenue: number; profit: number; orders: number };
type Top = { productId: string; title: string; sold: number; revenue: number; profit: number };
type Low = { productId: string; title: string; size: string; color: string; stock: number };

const RANGES = [7, 30, 90];

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Summary | null>(null);
  const [chart, setChart] = useState<Point[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [low, setLow] = useState<Low[]>([]);

  useEffect(() => {
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString();
    api<Summary>(`/reports/summary?from=${from}`, { auth: true }).then(setS).catch(() => null);
    api<Point[]>(`/reports/sales-chart?days=${Math.min(days, 30)}`, { auth: true }).then(setChart).catch(() => null);
    api<Top[]>('/reports/top-products?limit=6', { auth: true }).then(setTop).catch(() => null);
    api<Low[]>('/reports/low-stock?threshold=2', { auth: true }).then(setLow).catch(() => null);
  }, [days]);

  const toman = t.common.toman;

  return (
    <div className="space-y-6">
      <PageHead title={t.admin.menu.dashboard} actions={
        <div className="flex rounded-xl border border-line bg-white p-1">
          {RANGES.map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${days === d ? 'bg-pink-500 text-white' : 'text-ink-muted'}`}>
              {toFa(d)} روز
            </button>
          ))}
        </div>
      } />

      {s && (s.paymentReview > 0 || s.holding > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {s.paymentReview > 0 && (
            <Link href="/admin/orders?status=PAYMENT_REVIEW" className="flex items-center justify-between rounded-2xl bg-amber-soft p-4 text-sm text-amber-ink ring-1 ring-amber-200">
              <b>{toFa(s.paymentReview)} فیش منتظر بررسی است</b><span className="btn-sm btn bg-white">بررسی</span>
            </Link>
          )}
          {s.holding > 0 && (
            <Link href="/admin/orders?status=HOLDING" className="flex items-center justify-between rounded-2xl bg-pink-50 p-4 text-sm text-pink-800 ring-1 ring-pink-200">
              <b>{toFa(s.holding)} سبد ۱۰ روزه باز است</b><span className="btn-sm btn bg-white">مشاهده</span>
            </Link>
          )}
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat tone="pink" label="فروش (بدون هزینه ارسال)" value={toman(s.revenue)} hint={`${toFa(s.paidOrders)} سفارش پرداخت‌شده`} />
          <Stat label="سود ناخالص" value={toman(s.profit)} hint={`حاشیه سود ${toFa(s.profitMargin)}٪`} />
          <Stat label="میانگین هر سفارش" value={toman(s.averageOrderValue)} hint={`${toFa(s.itemsSold)} قلم فروخته شد`} />
          <Stat label="مشتری‌ها" value={toFa(s.customers)} hint={`${toFa(s.newCustomers)} عضو جدید در این بازه`} />
          <Stat label="منتظر پرداخت" value={toFa(s.pendingPayment)} />
          <Stat label="آماده ارسال" value={toFa(s.processing)} />
          <Stat label="سبد ۱۰ روزه باز" value={toFa(s.holding)} />
          <Stat label="کل سفارش‌های بازه" value={toFa(s.totalOrders)} />
        </div>
      )}

      <section className="card">
        <h2 className="mb-5 font-extrabold">فروش روزانه</h2>
        {chart.some((c) => c.revenue > 0) ? <BarChart data={chart} /> : <p className="py-10 text-center text-sm text-ink-muted">هنوز فروشی در این بازه ثبت نشده.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-extrabold">پرفروش‌ترین‌ها</h2>
          {top.length === 0 ? <p className="text-sm text-ink-muted">هنوز فروشی نداشته‌اید.</p> : (
            <ul className="divide-y divide-line text-sm">
              {top.map((p) => (
                <li key={p.productId || p.title} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">{p.title}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{toFa(p.sold)} عدد · سود {toman(p.profit)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-4 font-extrabold">موجودی رو به اتمام</h2>
          {low.length === 0 ? <p className="text-sm text-ink-muted">همه سایزها موجودی کافی دارند.</p> : (
            <ul className="divide-y divide-line text-sm">
              {low.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/products/${v.productId}`} className="truncate hover:text-pink-600">{v.title} <span className="text-xs text-ink-muted">({v.size} · {v.color})</span></Link>
                  <span className={`chip ${v.stock === 0 ? 'bg-pink-100 text-pink-700' : 'bg-amber-soft text-amber-ink'}`}>{v.stock === 0 ? 'تمام شد' : `${toFa(v.stock)} عدد`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
