'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  image?: string;
  size: string;
  color: string;
  price: number; // قیمت اصلی
  finalPrice: number; // قیمت بعد از حراج
  maxStock: number;
  quantity: number;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  baseTotal: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
};

const STORAGE_KEY = 'dornela_cart_v2';
const CartContext = createContext<CartValue>(null!);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {
      /* سبد ذخیره‌شده خراب بود؛ از صفر شروع می‌کنیم */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const value = useMemo<CartValue>(() => {
    const clamp = (q: number, max: number) => Math.max(1, Math.min(max || 1, q));
    return {
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: lines.reduce((s, l) => s + l.finalPrice * l.quantity, 0),
      baseTotal: lines.reduce((s, l) => s + l.price * l.quantity, 0),
      add: (line) =>
        setLines((prev) => {
          const found = prev.find((l) => l.variantId === line.variantId);
          if (!found) return [...prev, { ...line, quantity: clamp(line.quantity, line.maxStock) }];
          return prev.map((l) =>
            l.variantId === line.variantId ? { ...line, quantity: clamp(l.quantity + line.quantity, line.maxStock) } : l,
          );
        }),
      setQuantity: (variantId, quantity) =>
        setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: clamp(quantity, l.maxStock) } : l))),
      remove: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
      replace: setLines,
      clear: () => setLines([]),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
