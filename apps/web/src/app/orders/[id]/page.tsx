'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { OrderBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import Countdown from '@/components/ui/Countdown';
import Icon from '@/components/ui/Icon';
import { api, mediaUrl, upload } from '@/lib/api';
import { t } from '@/dictionary';
import { digitsOnly, faDate, formatCard, price, toFa } from '@/lib/format';
import type { Order } from '@/lib/types';

function PaymentBox({ order, onDone }: { order: Order; onDone: (o: Order) => void }) {
  const settings = useSettings();
  const [methods, setMethods] = useState<{ card: boolean; zarinpal: boolean } | null>(null);
  const [tab, setTab] = useState<'online' | 'card'>('online');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ amount: String(order.due.amount), payerName: order.receiverName, trackingCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pending = order.payments.find((p) => p.status === 'PENDING' && p.method === 'CARD');

  useEffect(() => {
    api<{ card: boolean; zarinpal: boolean }>('/payments/methods').then((m) => {
      setMethods(m);
      setTab(m.zarinpal ? 'online' : 'card');
    }).catch(() => setMethods({ card: true, zarinpal: false }));
  }, []);

  useEffect(() => setForm((f) => ({ ...f, amount: String(order.due.amount) })), [order.due.amount]);

  const payOnline = async () => {
    setBusy(true);
    setError('');
    try {
      const { url } = await api<{ url: string }>(`/payments/zarinpal/${order.id}`, { method: 'POST', auth: true });
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const sendReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError(t.order.receiptFile);
    setBusy(true);
    setError('');
    try {
      const { url } = await upload('/uploads/receipt', file);
      onDone(await api<Order>(`/orders/${order.id}/payments/card`, {
        method: 'POST', auth: true,
        body: { imageUrl: url, amount: Number(digitsOnly(form.amount)), payerName: form.payerName, trackingCode: form.trackingCode || undefined },
      }));
      setFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digitsOnly(settings.card_number || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  if (!methods) return null;
  if (!methods.card && !methods.zarinpal) return <p className="alert-info">{t.order.noPaymentMethod}</p>;

  return (
    <section className="card border-pink-200 ring-4 ring-pink-50">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-extrabold">{t.order.paymentTitle[order.due.purpose || 'FULL']}</h2>
        <b className="text-lg text-pink-600">{t.common.toman(order.due.amount)}</b>
      </div>

      {pending && order.status === 'PAYMENT_REVIEW' && (
        <p className="alert-info mt-4">{t.order.receiptSent}</p>
      )}

      {methods.card && methods.zarinpal && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-pink-50 p-1 text-sm font-bold">
          {(['online', 'card'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`h-10 rounded-lg transition ${tab === k ? 'bg-white text-pink-700 shadow-card' : 'text-ink-muted'}`}>
              {k === 'online' ? t.paymentMethod.ZARINPAL : t.order.payCard}
            </button>
          ))}
        </div>
      )}

      {tab === 'online' && methods.zarinpal ? (
        <div className="mt-5">
          <button type="button" onClick={payOnline} disabled={busy} className="btn-primary btn-lg w-full">
            <Icon name="lock" className="h-5 w-5" /> {busy ? t.order.redirecting : t.order.payOnline}
          </button>
          <p className="hint text-center">{t.order.payOnlineHint}</p>
        </div>
      ) : (
        <form onSubmit={sendReceipt} className="mt-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-l from-pink-500 to-pink-600 p-5 text-white">
            <p className="text-xs text-pink-100">{t.order.cardTo}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <b className="text-lg tracking-wider sm:text-xl" dir="ltr">{formatCard(settings.card_number || '')}</b>
              <button type="button" onClick={copy} className="btn-sm btn shrink-0 bg-white/20 text-white hover:bg-white/30">
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" /> {copied ? t.common.copied : t.common.copy}
              </button>
            </div>
            <p className="mt-3 text-xs text-pink-50">{t.order.cardHolder(settings.card_holder || '', settings.bank_name || '')}</p>
          </div>

          <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${file ? 'border-pink-400 bg-pink-50/60' : 'border-line hover:border-pink-300'}`}>
            <Icon name="upload" className="h-7 w-7 text-pink-500" />
            <span className="text-sm font-semibold">{file ? file.name : t.order.receiptFile}</span>
            {!file && <span className="text-xs text-ink-muted">{t.order.receiptPick}</span>}
            <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="amount">{t.order.receiptAmount}</label>
              <input id="amount" className="input text-start" dir="ltr" inputMode="numeric" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: digitsOnly(e.target.value) })} required />
            </div>
            <div>
              <label className="label" htmlFor="payer">{t.order.receiptPayer}</label>
              <input id="payer" className="input" value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="track">{t.order.receiptTrack}</label>
              <input id="track" className="input text-start" dir="ltr" value={form.trackingCode} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
            {busy ? t.common.loading : pending ? t.order.receiptReplace : t.order.receiptSubmit}
          </button>
        </form>
      )}
      {error && <p className="alert-error mt-4">{error}</p>}
    </section>
  );
}

function OrderView({ id }: { id: string }) {
  const { user, loading, refreshHold } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const paymentState = params.get('payment');

  const load = useCallback(() => api<Order>(`/orders/${id}`, { auth: true }).then(setOrder).catch((e) => setError(e.message)), [id]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?redirect=/orders/${id}`);
    else load();
  }, [loading, user, id, load, router]);

  const act = async (fn: () => Promise<Order>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError('');
    try {
      setOrder(await fn());
      refreshHold();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!order) {
    return <div className="wrap py-20 text-center text-sm text-ink-muted">{error ? <p className="alert-error inline-block">{error}</p> : t.common.loading}</div>;
  }

  const isHold = order.kind === 'HOLD';
  const holdOpen = order.status === 'HOLDING' || order.status === 'AWAITING_DEPOSIT';
  const canPay = ['AWAITING_DEPOSIT', 'AWAITING_PAYMENT', 'PAYMENT_REVIEW'].includes(order.status) && order.due.amount > 0;
  const canCancel = canPay && order.paidAmount === 0;
  const statusInfo = t.status[order.status];

  return (
    <div className="wrap max-w-5xl py-6 sm:py-10">
      {paymentState === 'ok' && <p className="alert-ok mb-5">{t.order.paymentOk}</p>}
      {paymentState === 'canceled' && <p className="alert-error mb-5">{t.order.paymentCanceled}</p>}
      {paymentState === 'failed' && <p className="alert-error mb-5">{t.order.paymentFailed}</p>}

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="h-title">{t.order.title(order.orderNumber)}</h1>
            <OrderBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {isHold ? t.order.kindHold : t.order.kindNormal} · {t.order.placedAt} {faDate(order.createdAt)}
          </p>
        </div>
        <Link href="/account/orders" className="btn-ghost btn-sm">{t.order.myOrders}</Link>
      </header>

      {statusInfo && <p className="mb-6 text-sm text-ink-soft">{statusInfo.hint}</p>}

      {order.status === 'HOLDING' && order.holdUntil && (
        <section className="mb-6 flex flex-col gap-4 rounded-3xl bg-pink-50 p-5 ring-1 ring-pink-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-pink-800">{t.order.holdLeft}</p>
            <p className="mt-1 text-xs text-pink-800/70">{t.order.holdUntil(faDate(order.holdUntil, true))}</p>
            <div className="mt-3"><Countdown until={order.holdUntil} /></div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link href="/products" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> {t.order.holdAdd}</Link>
            <button type="button" disabled={busy} onClick={() => act(() => api(`/orders/${order.id}/close`, { method: 'POST', auth: true }), t.order.holdCloseConfirm)}
              className="btn-outline btn-sm">{t.order.holdClose}</button>
          </div>
        </section>
      )}

      {error && <p className="alert-error mb-5">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {canPay && <PaymentBox order={order} onDone={(o) => setOrder(o)} />}

          <section className="card">
            <h2 className="mb-2 font-extrabold">{t.order.items}</h2>
            {order.status === 'HOLDING' && <p className="mb-3 text-xs text-ink-muted">{t.order.holdAddHint}</p>}
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <img src={mediaUrl(item.image)} alt="" className="h-16 w-12 rounded-lg bg-pink-50 object-cover" />
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link href={`/products/${item.slug}`} className="line-clamp-1 text-sm font-semibold hover:text-pink-600">{item.title}</Link>
                    ) : <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>}
                    <p className="text-xs text-ink-muted">{item.size} · {item.color} · {toFa(item.quantity)} عدد</p>
                  </div>
                  <div className="text-end">
                    {item.unitPrice < item.basePrice && <p className="text-[11px] text-ink-muted line-through">{price(item.basePrice * item.quantity)}</p>}
                    <p className="text-sm font-bold">{price(item.unitPrice * item.quantity)}</p>
                  </div>
                  {holdOpen && order.items.length > 1 && (
                    <button type="button" disabled={busy} aria-label={t.common.delete}
                      onClick={() => act(() => api(`/orders/${order.id}/items/${item.id}`, { method: 'DELETE', auth: true }), t.order.removeItemConfirm)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-pink-50 hover:text-pink-600">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {order.payments.length > 0 && (
            <section className="card">
              <h2 className="mb-3 font-extrabold">{t.order.payments}</h2>
              <ul className="space-y-2">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-pink-50/50 px-3 py-2.5 text-sm">
                    <span>{t.paymentPurpose[p.purpose]} · {t.paymentMethod[p.method]}</span>
                    <span className="flex items-center gap-2"><b>{price(p.amount)}</b><PaymentBadge status={p.status} /></span>
                    {p.status === 'REJECTED' && p.adminNote && <p className="w-full text-xs text-pink-700">{p.adminNote}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-36">
          <div className="card">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">{t.cart.itemsTotal}</dt><dd>{t.common.toman(order.subtotal + order.festivalDiscount)}</dd></div>
              {order.festivalDiscount > 0 && <div className="flex justify-between text-pink-600"><dt>{t.cart.festivalDiscount}</dt><dd>{t.common.toman(order.festivalDiscount)}−</dd></div>}
              {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>{t.cart.couponDiscount} <span dir="ltr">({order.couponCode})</span></dt><dd>{t.common.toman(order.couponDiscount)}−</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-muted">{t.cart.shipping}</dt><dd>{order.shippingCost ? t.common.toman(order.shippingCost) : t.common.free}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold"><dt>{t.cart.payable}</dt><dd>{t.common.toman(order.total)}</dd></div>
              {order.paidAmount > 0 && <div className="flex justify-between text-emerald-700"><dt>{t.order.paid}</dt><dd>{t.common.toman(order.paidAmount)}</dd></div>}
              {isHold && <div className="flex justify-between text-xs text-ink-muted"><dt>{t.checkout.deposit}</dt><dd>{t.common.toman(order.depositAmount)}</dd></div>}
            </dl>
          </div>

          <div className="card space-y-3 text-sm">
            <div>
              <p className="text-xs text-ink-muted">{t.order.receiver}</p>
              <p className="mt-1 font-semibold">{order.receiverName} · <span dir="ltr">{toFa(order.receiverPhone)}</span></p>
              <p className="mt-1 leading-7 text-ink-soft">{order.province}، {order.city}، {order.addressLine}</p>
              <p className="text-xs text-ink-muted">{t.account.postal(order.postalCode)}</p>
            </div>
            {order.shippingTitle && (
              <div><p className="text-xs text-ink-muted">{t.order.shippingMethod}</p><p className="mt-1 font-semibold">{order.shippingTitle}</p></div>
            )}
            {order.trackingNumber && (
              <div><p className="text-xs text-ink-muted">{t.order.tracking}</p><p className="mt-1 font-bold" dir="ltr">{toFa(order.trackingNumber)}</p></div>
            )}
            {order.note && <div><p className="text-xs text-ink-muted">{t.order.note}</p><p className="mt-1">{order.note}</p></div>}
          </div>

          {canCancel && (
            <button type="button" disabled={busy} onClick={() => act(() => api(`/orders/${order.id}/cancel`, { method: 'PATCH', auth: true }), t.order.cancelConfirm)}
              className="btn-ghost btn-sm w-full">{t.order.cancel}</button>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function OrderPage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <OrderView id={params.id} />
    </Suspense>
  );
}
