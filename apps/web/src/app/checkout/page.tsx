'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import Icon from '@/components/ui/Icon';
import { api, mediaUrl } from '@/lib/api';
import { t } from '@/dictionary';
import { digitsOnly, price, toFa } from '@/lib/format';
import { PROVINCES } from '@/lib/provinces';
import type { Address, Order, ShippingMethod } from '@/lib/types';

type Mode = 'NORMAL' | 'HOLD';
const emptyForm = { receiverName: '', receiverPhone: '', province: 'اصفهان', city: '', postalCode: '', addressLine: '', note: '' };

function Radio({ checked, onClick, title, text, extra }: { checked: boolean; onClick: () => void; title: string; text?: string; extra?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition ${checked ? 'border-pink-400 bg-pink-50/60 ring-2 ring-pink-100' : 'border-line bg-white hover:border-pink-200'}`}>
      <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-pink-500' : 'border-line'}`}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />}
      </span>
      <span className="flex-1">
        <span className="flex items-center justify-between gap-2">
          <b className="text-sm">{title}</b>
          {extra}
        </span>
        {text && <span className="mt-1 block text-xs leading-6 text-ink-muted">{text}</span>}
      </span>
    </button>
  );
}

export default function CheckoutPage() {
  const cart = useCart();
  const { user, loading, hold, refreshHold } = useAuth();
  const settings = useSettings();
  const router = useRouter();

  const holdEnabled = settings.hold_enabled === 'true';
  const holdDays = Number(settings.hold_days || 10);
  const [mode, setMode] = useState<Mode>('NORMAL');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('new');
  const [form, setForm] = useState(emptyForm);
  const [saveAddress, setSaveAddress] = useState(true);
  const [methods, setMethods] = useState<ShippingMethod[] | null>(null);
  const [shippingCode, setShippingCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/checkout');
  }, [loading, user, router]);

  useEffect(() => {
    if (cart.ready && cart.lines.length === 0 && !submitting) router.replace('/cart');
  }, [cart.ready, cart.lines.length, submitting, router]);

  useEffect(() => {
    if (!user) return;
    api<Address[]>('/users/me/addresses', { auth: true }).then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) pickAddress(def);
      else setForm((f) => ({ ...f, receiverName: user.name || '', receiverPhone: user.phone }));
    }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // روش‌های ارسال به استان بستگی دارد
  useEffect(() => {
    if (!form.province) return setMethods(null);
    api<ShippingMethod[]>(`/shipping?province=${encodeURIComponent(form.province)}`).then((list) => {
      setMethods(list);
      setShippingCode((code) => (list.some((m) => m.code === code) ? code : list[0]?.code || ''));
    }).catch(() => setMethods([]));
  }, [form.province]);

  const pickAddress = (a: Address) => {
    setAddressId(a.id);
    setForm((f) => ({ ...f, receiverName: a.receiverName, receiverPhone: a.phone, province: a.province, city: a.city, postalCode: a.postalCode, addressLine: a.line }));
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = key === 'receiverPhone' || key === 'postalCode' ? digitsOnly(e.target.value) : e.target.value;
    setForm({ ...form, [key]: value });
    if (key !== 'note' && addressId !== 'new') setAddressId('new');
  };

  const method = methods?.find((m) => m.code === shippingCode);
  const freeFrom = Number(settings.free_shipping_from || 0);
  const shipping = method ? (freeFrom > 0 && cart.subtotal >= freeFrom ? 0 : method.cost) : 0;
  const couponDiscount = coupon?.discount || 0;
  const total = cart.subtotal - couponDiscount + shipping;
  const deposit = useMemo(() => {
    const v = Number(settings.deposit_value || 0);
    const raw = settings.deposit_type === 'PERCENT' ? Math.round((total * v) / 100 / 1000) * 1000 : v;
    return Math.max(1000, Math.min(raw, total));
  }, [settings.deposit_type, settings.deposit_value, total]);
  const depositLabel = settings.deposit_type === 'PERCENT' ? `${toFa(settings.deposit_value)}٪ مبلغ` : t.common.toman(Number(settings.deposit_value || 0));
  const holdBlocked = !!hold;

  const applyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    try {
      setCoupon(await api('/coupons/check', { method: 'POST', auth: true, body: { code: couponInput.trim(), subtotal: cart.subtotal } }));
    } catch (e: any) {
      setCoupon(null);
      setCouponError(e.message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!shippingCode) return setError(t.checkout.shippingNone);
    setSubmitting(true);
    try {
      if (saveAddress && addressId === 'new') {
        await api('/users/me/addresses', {
          method: 'POST', auth: true,
          body: { receiverName: form.receiverName, phone: form.receiverPhone, province: form.province, city: form.city, postalCode: form.postalCode, line: form.addressLine },
        }).catch(() => null);
      }
      const order = await api<Order>('/orders', {
        method: 'POST', auth: true,
        body: {
          ...form,
          kind: mode,
          shippingCode,
          couponCode: coupon?.code,
          items: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        },
      });
      cart.clear();
      if (mode === 'HOLD') refreshHold();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!user || !cart.ready) return <div className="wrap py-20 text-center text-sm text-ink-muted">{t.common.loading}</div>;

  return (
    <div className="wrap py-6 sm:py-10">
      <h1 className="h-title mb-6">{t.checkout.title}</h1>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {holdEnabled && (
            <section className="card space-y-3">
              <h2 className="font-extrabold">{t.checkout.mode}</h2>
              <Radio checked={mode === 'NORMAL'} onClick={() => setMode('NORMAL')} title={t.checkout.modeNow} text={t.checkout.modeNowText} />
              {holdBlocked ? (
                <Link href={`/orders/${hold!.id}`} className="alert-info block">
                  {hold!.status === 'HOLDING' ? t.cart.holdOpenText(hold!.orderNumber, '') : t.cart.holdAwaitingDeposit(hold!.orderNumber)}
                </Link>
              ) : (
                <Radio checked={mode === 'HOLD'} onClick={() => setMode('HOLD')} title={t.checkout.modeHold}
                  text={t.checkout.modeHoldText(depositLabel, holdDays)}
                  extra={<span className="chip bg-pink-500 text-white">{t.common.days(holdDays)}</span>} />
              )}
            </section>
          )}

          <section className="card space-y-4">
            <h2 className="font-extrabold">{t.checkout.address}</h2>

            {addresses.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <Radio key={a.id} checked={addressId === a.id} onClick={() => pickAddress(a)}
                    title={a.receiverName} text={`${a.province}، ${a.city}، ${a.line}`} />
                ))}
                <Radio checked={addressId === 'new'} onClick={() => { setAddressId('new'); setForm({ ...emptyForm, receiverName: user.name || '', receiverPhone: user.phone }); }}
                  title={t.checkout.newAddress} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="receiverName">{t.checkout.receiverName}</label>
                <input id="receiverName" className="input" value={form.receiverName} onChange={set('receiverName')} required minLength={3} />
              </div>
              <div>
                <label className="label" htmlFor="receiverPhone">{t.checkout.receiverPhone}</label>
                <input id="receiverPhone" className="input text-start" dir="ltr" inputMode="tel" maxLength={11} value={form.receiverPhone}
                  onChange={set('receiverPhone')} required pattern="09\d{9}" placeholder="09xxxxxxxxx" />
              </div>
              <div>
                <label className="label" htmlFor="province">{t.checkout.province}</label>
                <select id="province" className="input" value={form.province} onChange={set('province')} required>
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="city">{t.checkout.city}</label>
                <input id="city" className="input" value={form.city} onChange={set('city')} required />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="addressLine">{t.checkout.addressLine}</label>
                <textarea id="addressLine" rows={2} className="input" value={form.addressLine} onChange={set('addressLine')}
                  placeholder={t.checkout.addressPlaceholder} required minLength={10} />
              </div>
              <div>
                <label className="label" htmlFor="postalCode">{t.checkout.postalCode}</label>
                <input id="postalCode" className="input text-start" dir="ltr" inputMode="numeric" maxLength={10} value={form.postalCode}
                  onChange={set('postalCode')} required pattern="\d{10}" />
                <p className="hint">{t.checkout.postalHint}</p>
              </div>
              <div>
                <label className="label" htmlFor="note">{t.checkout.note}</label>
                <input id="note" className="input" value={form.note} onChange={set('note')} placeholder={t.checkout.notePlaceholder} />
              </div>
            </div>
            {addressId === 'new' && (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="h-4 w-4 accent-pink-500" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                {t.checkout.saveAddress}
              </label>
            )}
          </section>

          <section className="card space-y-3">
            <h2 className="font-extrabold">{t.checkout.shipping}</h2>
            {methods === null ? (
              <p className="text-sm text-ink-muted">{t.checkout.shippingPickProvince}</p>
            ) : methods.length === 0 ? (
              <p className="alert-info">{t.checkout.shippingNone}</p>
            ) : (
              methods.map((m) => (
                <Radio key={m.code} checked={shippingCode === m.code} onClick={() => setShippingCode(m.code)}
                  title={m.title} text={m.description || undefined}
                  extra={<b className="text-sm">{freeFrom > 0 && cart.subtotal >= freeFrom ? t.common.free : t.common.toman(m.cost)}</b>} />
              ))
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-36">
          <div className="card">
            <h2 className="mb-4 font-extrabold">{t.checkout.summary}</h2>
            <ul className="space-y-3">
              {cart.lines.map((l) => (
                <li key={l.variantId} className="flex items-center gap-3">
                  <img src={mediaUrl(l.image)} alt="" className="h-14 w-11 rounded-lg bg-pink-50 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-[13px] font-semibold">{l.title}</span>
                    <span className="text-xs text-ink-muted">{l.size} · {toFa(l.quantity)} عدد</span>
                  </span>
                  <span className="text-[13px] font-bold">{price(l.finalPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-line pt-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  <span className="flex items-center gap-2"><Icon name="tag" className="h-4 w-4" /> <span dir="ltr">{coupon.code}</span></span>
                  <button type="button" onClick={() => { setCoupon(null); setCouponInput(''); }} className="text-xs font-bold underline">{t.checkout.couponRemove}</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input className="input h-10 text-start" dir="ltr" value={couponInput} onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t.checkout.couponPlaceholder} aria-label={t.checkout.coupon}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} />
                  <button type="button" onClick={applyCoupon} className="btn-outline h-10 shrink-0">{t.checkout.couponApply}</button>
                </div>
              )}
              {couponError && <p className="mt-2 text-xs text-pink-700">{couponError}</p>}
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">{t.cart.itemsTotal}</dt><dd>{t.common.toman(cart.baseTotal)}</dd></div>
              {cart.baseTotal > cart.subtotal && (
                <div className="flex justify-between text-pink-600"><dt>{t.cart.festivalDiscount}</dt><dd>{t.common.toman(cart.baseTotal - cart.subtotal)}−</dd></div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>{t.cart.couponDiscount}</dt><dd>{t.common.toman(couponDiscount)}−</dd></div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">{t.cart.shipping}</dt>
                <dd>{method ? (shipping ? t.common.toman(shipping) : t.common.free) : '—'}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold">
                <dt>{t.cart.payable}</dt><dd>{t.common.toman(total)}</dd>
              </div>
              {mode === 'HOLD' && (
                <>
                  <div className="flex justify-between rounded-xl bg-pink-50 px-3 py-2.5 font-bold text-pink-700">
                    <dt>{t.checkout.deposit}</dt><dd>{t.common.toman(deposit)}</dd>
                  </div>
                  <div className="flex justify-between px-3 text-xs text-ink-muted">
                    <dt>{t.checkout.remaining}</dt><dd>{t.common.toman(total - deposit)}</dd>
                  </div>
                </>
              )}
            </dl>

            {error && <p className="alert-error mt-4">{error}</p>}

            <button type="submit" className="btn-primary btn-lg mt-5 w-full" disabled={submitting || !shippingCode}>
              {submitting ? t.checkout.submitting : mode === 'HOLD' ? t.checkout.submitHold : t.checkout.submitNow}
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-ink-muted">
              <Link href="/rules" className="underline underline-offset-2">{t.checkout.agree}</Link>
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
