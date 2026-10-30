'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, mediaUrl } from '@/lib/api';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/Icon';
import { PageHead } from '@/components/admin/ui';
import { t } from '@/dictionary';
import { faDate, price, timeLeft, toFa } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const NEXT: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function AdminOrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [reject, setReject] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const apply = (o: Order) => {
    setOrder(o);
    setTracking(o.trackingNumber || '');
    setNote(o.adminNote || '');
  };
  const load = useCallback(() => api<Order>(`/orders/${params.id}`, { auth: true }).then(apply).catch((e) => setError(e.message)), [params.id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<Order>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError('');
    try { apply(await fn()); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const setStatus = (status: OrderStatus, confirmText?: string) =>
    run(() => api(`/orders/${params.id}/status`, { method: 'PATCH', auth: true, body: { status, trackingNumber: tracking, adminNote: note } }), confirmText);

  if (!order) return <p className="text-sm text-ink-muted">{error || t.common.loading}</p>;
  const pending = order.payments.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-5">
      <PageHead
        title={`سفارش ${toFa(order.orderNumber)}`}
        desc={`${order.kind === 'HOLD' ? 'سبد ۱۰ روزه' : 'خرید عادی'} · ثبت ${faDate(order.createdAt, true)}`}
        actions={<>
          <OrderBadge status={order.status} />
          <button type="button" onClick={() => window.print()} className="btn-outline btn-sm print:hidden">چاپ برچسب ارسال</button>
          <Link href="/admin/orders" className="btn-ghost btn-sm print:hidden">بازگشت</Link>
        </>}
      />
      {error && <p className="alert-error">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {pending.map((p) => (
            <section key={p.id} className="card border-amber-200 ring-4 ring-amber-50 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-extrabold">بررسی {t.paymentPurpose[p.purpose]} — {t.paymentMethod[p.method]}</h2>
                <b className="text-lg">{t.common.toman(p.amount)}</b>
              </div>
              {p.method === 'CARD' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                  {p.imageUrl?.endsWith('.pdf') ? (
                    <a href={mediaUrl(p.imageUrl)} target="_blank" className="btn-outline">باز کردن فیش (PDF)</a>
                  ) : (
                    <button type="button" onClick={() => setPreview(mediaUrl(p.imageUrl))} className="overflow-hidden rounded-xl ring-1 ring-line">
                      <img src={mediaUrl(p.imageUrl)} alt="فیش" className="h-48 w-full object-cover" />
                    </button>
                  )}
                  <dl className="space-y-1.5 text-sm">
                    <div><dt className="inline text-ink-muted">واریزکننده: </dt><dd className="inline">{p.payerName || '—'}</dd></div>
                    <div><dt className="inline text-ink-muted">پیگیری: </dt><dd className="inline" dir="ltr">{toFa(p.trackingCode || '—')}</dd></div>
                    <div><dt className="inline text-ink-muted">زمان: </dt><dd className="inline">{faDate(p.paidAt || p.createdAt, true)}</dd></div>
                    <div><dt className="inline text-ink-muted">مبلغ مورد انتظار: </dt><dd className="inline font-bold">{t.common.toman(order.due.amount)}</dd></div>
                    {p.amount !== order.due.amount && <p className="alert-info mt-2 text-xs">مبلغ فیش با مبلغ قابل پرداخت یکی نیست.</p>}
                  </dl>
                </div>
              ) : <p className="mt-3 text-sm text-ink-muted">پرداخت آنلاین هنوز از درگاه برنگشته است.</p>}
              {p.method === 'CARD' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className="btn-primary"
                    onClick={() => run(() => api(`/orders/payments/${p.id}/review`, { method: 'PATCH', auth: true, body: { status: 'APPROVED' } }))}>
                    <Icon name="check" className="h-4 w-4" /> تأیید پرداخت
                  </button>
                  <input className="input h-11 min-w-0 flex-1" placeholder="دلیل رد (برای مشتری پیامک نمی‌شود، در صفحه سفارش می‌بیند)" value={reject} onChange={(e) => setReject(e.target.value)} />
                  <button type="button" disabled={busy} className="btn-outline"
                    onClick={() => run(() => api(`/orders/payments/${p.id}/review`, { method: 'PATCH', auth: true, body: { status: 'REJECTED', adminNote: reject || 'فیش تأیید نشد' } }))}>
                    رد فیش
                  </button>
                </div>
              )}
            </section>
          ))}

          {order.status === 'HOLDING' && (
            <section className="card flex flex-wrap items-center justify-between gap-3 bg-pink-50/50 print:hidden">
              <div>
                <b className="text-sm">سبد باز است · {timeLeft(order.holdUntil)} مانده</b>
                <p className="text-xs text-ink-muted">تا {faDate(order.holdUntil, true)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} className="btn-outline btn-sm" onClick={() => run(() => api(`/orders/${order.id}/extend`, { method: 'PATCH', auth: true, body: { days: 3 } }))}>۳ روز تمدید</button>
                <button type="button" disabled={busy} className="btn-soft btn-sm" onClick={() => setStatus('AWAITING_PAYMENT', 'سبد بسته و فاکتور نهایی برای مشتری صادر شود؟')}>بستن سبد</button>
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-extrabold">اقلام ({toFa(order.items.reduce((s, i) => s + i.quantity, 0))} عدد)</h2>
            <div className="tbl-wrap border-0">
              <table className="tbl min-w-[560px]">
                <thead><tr><th>کالا</th><th>سایز / رنگ</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td><div className="flex items-center gap-2"><img src={mediaUrl(i.image)} alt="" className="h-12 w-9 rounded-md object-cover print:hidden" />{i.title}</div>
                        {order.kind === 'HOLD' && <p className="text-[11px] text-ink-muted">افزوده‌شده {faDate(i.addedAt)}</p>}</td>
                      <td>{i.size} · {i.color}</td>
                      <td>{toFa(i.quantity)}</td>
                      <td className="whitespace-nowrap">{price(i.unitPrice)}{i.unitPrice < i.basePrice && <span className="ms-1 text-[11px] text-ink-muted line-through">{price(i.basePrice)}</span>}</td>
                      <td className="whitespace-nowrap font-bold">{price(i.unitPrice * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>جمع کالاها (بعد از حراج)</dt><dd>{t.common.toman(order.subtotal)}</dd></div>
              {order.festivalDiscount > 0 && <div className="flex justify-between text-ink-muted"><dt>تخفیف حراج</dt><dd>{t.common.toman(order.festivalDiscount)}</dd></div>}
              {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>کد تخفیف <span dir="ltr">{order.couponCode}</span></dt><dd>−{t.common.toman(order.couponDiscount)}</dd></div>}
              <div className="flex justify-between"><dt>ارسال ({order.shippingTitle})</dt><dd>{t.common.toman(order.shippingCost)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>جمع فاکتور</dt><dd>{t.common.toman(order.total)}</dd></div>
              <div className="flex justify-between text-emerald-700"><dt>پرداخت‌شده</dt><dd>{t.common.toman(order.paidAmount)}</dd></div>
              {order.total - order.paidAmount > 0 && <div className="flex justify-between font-bold text-pink-600"><dt>مانده</dt><dd>{t.common.toman(order.total - order.paidAmount)}</dd></div>}
            </dl>
          </section>

          {order.payments.length > 0 && (
            <section className="card print:hidden">
              <h2 className="mb-3 font-extrabold">تاریخچه پرداخت</h2>
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pink-50/50 px-3 py-2">
                    <span>{t.paymentPurpose[p.purpose]} · {t.paymentMethod[p.method]} · {faDate(p.createdAt, true)}</span>
                    <span className="flex items-center gap-2">
                      {p.refId && <span className="text-xs text-ink-muted" dir="ltr">Ref {p.refId}</span>}
                      {p.imageUrl && <button type="button" onClick={() => setPreview(mediaUrl(p.imageUrl))} className="text-xs font-bold text-pink-600">فیش</button>}
                      <b>{price(p.amount)}</b><PaymentBadge status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="card text-sm">
            <h2 className="mb-3 font-extrabold">گیرنده</h2>
            <p className="font-bold">{order.receiverName}</p>
            <p className="mt-1" dir="ltr">{toFa(order.receiverPhone)}</p>
            <p className="mt-2 leading-7">{order.province}، {order.city}، {order.addressLine}</p>
            <p className="mt-1 text-ink-muted">کد پستی: {toFa(order.postalCode)}</p>
            {order.note && <p className="mt-3 rounded-xl bg-amber-soft p-3 text-amber-ink">یادداشت مشتری: {order.note}</p>}
            {order.user && <Link href={`/admin/customers/${order.user.id}`} className="mt-3 inline-block text-xs font-bold text-pink-600 print:hidden">پرونده مشتری در CRM</Link>}
          </section>

          <section className="card space-y-3 print:hidden">
            <h2 className="font-extrabold">وضعیت و ارسال</h2>
            <div>
              <label className="label" htmlFor="tracking">کد رهگیری پست</label>
              <input id="tracking" className="input text-start" dir="ltr" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="note">یادداشت داخلی</label>
              <textarea id="note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NEXT.map((s) => (
                <button key={s} type="button" disabled={busy || order.status === s} onClick={() => setStatus(s)}
                  className={order.status === s ? 'btn-soft btn-sm' : 'btn-outline btn-sm'}>
                  {t.status[s].label}
                </button>
              ))}
            </div>
            <button type="button" disabled={busy} onClick={() => setStatus(order.status, undefined)} className="btn-dark btn-sm w-full">ذخیره کد رهگیری و یادداشت</button>
            {order.status !== 'CANCELED' && (
              <button type="button" disabled={busy} onClick={() => setStatus('CANCELED', 'سفارش لغو شود؟ کالاها به موجودی برمی‌گردند.')} className="btn-ghost btn-sm w-full text-pink-700">لغو سفارش</button>
            )}
            <p className="hint">با زدن «ارسال شد» کد رهگیری برای مشتری پیامک می‌شود.</p>
          </section>
        </aside>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="فیش" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
