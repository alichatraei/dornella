'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCart } from '../CartProvider';
import { useAuth } from '../AuthProvider';
import Stepper from '../ui/Stepper';
import Icon from '../ui/Icon';
import { api } from '@/lib/api';
import { t } from '@/dictionary';
import type { Product } from '@/lib/types';

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const { hold, refreshHold } = useAuth();
  const colors = useMemo(() => [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()], [product.variants]);
  const [color, setColor] = useState(colors.find(([c]) => product.variants.some((v) => v.color === c && v.stock > 0))?.[0] || colors[0]?.[0]);
  const sizes = product.variants.filter((v) => v.color === color);
  const [variantId, setVariantId] = useState(() => (sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].id : ''));
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<'' | 'added' | 'hold' | 'busy'>('');
  const [error, setError] = useState('');
  const variant = product.variants.find((v) => v.id === variantId);
  const inStock = product.variants.some((v) => v.stock > 0);
  const holdOpen = hold?.status === 'HOLDING' || hold?.status === 'AWAITING_DEPOSIT';

  if (!inStock) return <p className="alert-info">{t.product.soldOutLong}</p>;

  const line = () => ({
    productId: product.id, variantId: variant!.id, slug: product.slug, title: product.title,
    image: product.images?.[0]?.url, size: variant!.size, color: variant!.color,
    price: product.price, finalPrice: product.finalPrice ?? product.price, maxStock: variant!.stock, quantity: qty,
  });

  const toCart = () => {
    if (!variant) return setError(t.product.pickSize);
    setError('');
    add(line());
    setState('added');
  };

  const toHold = async () => {
    if (!variant || !hold) return setError(t.product.pickSize);
    setError('');
    setState('busy');
    try {
      await api(`/orders/${hold.id}/items`, { method: 'POST', auth: true, body: { items: [{ productId: product.id, variantId: variant.id, quantity: qty }] } });
      await refreshHold();
      setState('hold');
    } catch (e: any) {
      setError(e.message);
      setState('');
    }
  };

  return (
    <div className="space-y-5">
      {colors.length > 1 && (
        <div>
          <p className="label">{t.product.color}: <span className="font-normal text-ink">{color}</span></p>
          <div className="flex flex-wrap gap-2">
            {colors.map(([name, hex]) => (
              <button key={name} type="button" title={name} onClick={() => { setColor(name); setVariantId(''); setState(''); }}
                className={`h-9 w-9 rounded-full ring-2 ring-offset-2 transition ${color === name ? 'ring-pink-500' : 'ring-transparent hover:ring-pink-200'}`}
                style={{ background: hex || '#eee' }} aria-label={name} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label mb-0">{t.product.size}</p>
          {product.sizeGuide && <a href="#size-guide" className="text-xs font-semibold text-pink-600">{t.product.sizeGuide}</a>}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((v) => (
            <button key={v.id} type="button" disabled={v.stock === 0}
              onClick={() => { setVariantId(v.id); setQty(1); setState(''); setError(''); }}
              className={`h-11 min-w-[52px] rounded-xl border px-3 text-sm font-bold transition ${
                v.id === variantId ? 'border-pink-500 bg-pink-500 text-white'
                  : v.stock === 0 ? 'cursor-not-allowed border-line bg-zinc-50 text-ink-muted/50 line-through'
                    : 'border-line bg-white text-ink hover:border-pink-400'}`}>
              {v.size}
            </button>
          ))}
        </div>
        {variant && variant.stock <= 3 && <p className="mt-2 text-xs font-semibold text-pink-600">{t.product.lastOnes(variant.stock)}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Stepper value={qty} onChange={setQty} max={variant?.stock || 1} />
        <button type="button" onClick={toCart} className="btn-primary btn-lg flex-1">
          <Icon name="bag" className="h-5 w-5" /> {t.product.addToCart}
        </button>
      </div>

      {holdOpen && hold?.status === 'HOLDING' && (
        <button type="button" onClick={toHold} disabled={state === 'busy'} className="btn-soft w-full">
          <Icon name="clock" className="h-4 w-4" /> {state === 'busy' ? t.common.loading : t.product.addToHold}
        </button>
      )}

      {error && <p className="alert-error">{error}</p>}
      {state === 'added' && (
        <div className="alert-ok flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><Icon name="check" className="h-4 w-4" />{t.product.added}</span>
          <Link href="/cart" className="font-bold underline underline-offset-4">{t.product.goToCart}</Link>
        </div>
      )}
      {state === 'hold' && hold && (
        <div className="alert-ok flex items-center justify-between gap-3">
          <span>{t.product.addedToHold}</span>
          <Link href={`/orders/${hold.id}`} className="font-bold underline underline-offset-4">{t.cart.viewHold}</Link>
        </div>
      )}
    </div>
  );
}
