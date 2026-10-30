'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { useAuth } from '@/components/AuthProvider';
import Stepper from '@/components/ui/Stepper';
import Icon from '@/components/ui/Icon';
import { api, mediaUrl } from '@/lib/api';
import { t } from '@/dictionary';
import { price, timeLeft } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function CartPage() {
  const cart = useCart();
  const { user, hold, refreshHold } = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // قیمت و موجودی سبد با آخرین وضعیت فروشگاه هماهنگ می‌شود
  useEffect(() => {
    if (!cart.ready || cart.lines.length === 0) return;
    let changed = false;
    Promise.all(cart.lines.map((l) => api<Product>(`/products/${encodeURIComponent(l.slug)}`).catch(() => null))).then((products) => {
      const next = cart.lines.flatMap((l, i) => {
        const p = products[i];
        const v = p?.variants.find((x) => x.id === l.variantId);
        if (!p || !v || v.stock === 0) { changed = true; return []; }
        const qty = Math.min(l.quantity, v.stock);
        if (qty !== l.quantity || p.finalPrice !== l.finalPrice) changed = true;
        return [{ ...l, price: p.price, finalPrice: p.finalPrice, maxStock: v.stock, quantity: qty }];
      });
      if (changed) {
        cart.replace(next);
        setNotice(t.cart.stockChanged);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  const addAllToHold = async () => {
    if (!hold) return;
    setBusy(true);
    setError('');
    try {
      await api(`/orders/${hold.id}/items`, {
        method: 'POST', auth: true,
        body: { items: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })) },
      });
      cart.clear();
      await refreshHold();
      router.push(`/orders/${hold.id}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (!cart.ready) return <div className="wrap py-20 text-center text-sm text-ink-muted">{t.common.loading}</div>;

  if (cart.lines.length === 0) {
    return (
      <div className="wrap py-20 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-pink-50 text-pink-400"><Icon name="bag" className="h-10 w-10" /></span>
        <h1 className="mt-5 text-lg font-extrabold">{t.cart.empty}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t.cart.emptyHint}</p>
        <Link href="/products" className="btn-primary mt-7">{t.cart.browse}</Link>
        {hold && <Link href={`/orders/${hold.id}`} className="btn-soft ms-2 mt-7">{t.cart.viewHold}</Link>}
      </div>
    );
  }

  const saved = cart.baseTotal - cart.subtotal;

  return (
    <div className="wrap py-6 sm:py-10">
      <h1 className="h-title mb-6">{t.cart.title}</h1>

      {hold?.status === 'HOLDING' && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-pink-50 p-4 ring-1 ring-pink-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <b className="text-sm text-pink-800">{t.cart.holdOpenTitle}</b>
            <p className="mt-1 text-xs leading-6 text-pink-800/80">{t.cart.holdOpenText(hold.orderNumber, timeLeft(hold.holdUntil))}</p>
          </div>
          <button type="button" onClick={addAllToHold} disabled={busy} className="btn-primary shrink-0">
            {busy ? t.common.loading : t.cart.addAllToHold}
          </button>
        </div>
      )}
      {hold && hold.status !== 'HOLDING' && (
        <Link href={`/orders/${hold.id}`} className="alert-info mb-6 block">{t.cart.holdAwaitingDeposit(hold.orderNumber)}</Link>
      )}
      {notice && <p className="alert-info mb-4">{notice}</p>}
      {error && <p className="alert-error mb-4">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4">
              <Link href={`/products/${l.slug}`} className="shrink-0">
                <img src={mediaUrl(l.image)} alt={l.title} className="h-28 w-[84px] rounded-xl bg-pink-50 object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/products/${l.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-pink-600">{l.title}</Link>
                  <button type="button" onClick={() => cart.remove(l.variantId)} className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-pink-50 hover:text-pink-600" aria-label={t.cart.remove}>
                    <Icon name="trash" className="h-[18px] w-[18px]" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{t.product.size} {l.size} · {l.color}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                  <Stepper small value={l.quantity} max={l.maxStock} onChange={(q) => cart.setQuantity(l.variantId, q)} />
                  <div className="text-end">
                    {l.finalPrice < l.price && <p className="text-xs text-ink-muted line-through">{price(l.price * l.quantity)}</p>}
                    <p className="text-sm font-extrabold">{t.common.toman(l.finalPrice * l.quantity)}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-3 lg:sticky lg:top-36">
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">{t.cart.itemsTotal}</dt><dd>{t.common.toman(cart.baseTotal)}</dd></div>
            {saved > 0 && <div className="flex justify-between text-pink-600"><dt>{t.cart.festivalDiscount}</dt><dd>{t.common.toman(saved)}−</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-muted">{t.cart.shipping}</dt><dd className="text-ink-muted">{t.cart.shippingLater}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold">
              <dt>{t.cart.payable}</dt><dd>{t.common.toman(cart.subtotal)}</dd>
            </div>
          </dl>
          <button type="button" className="btn-primary btn-lg w-full"
            onClick={() => router.push(user ? '/checkout' : '/login?redirect=/checkout')}>
            {t.cart.checkout}
          </button>
          <Link href="/products" className="btn-ghost w-full">{t.cart.continue}</Link>
        </aside>
      </div>
    </div>
  );
}
