'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Icon from '../ui/Icon';
import Sheet from '../ui/Sheet';
import { t } from '@/dictionary';
import type { Category } from '@/lib/types';

type Facets = { sizes: string[]; colors: { name: string; hex?: string | null }[] };

function Chips({ items, value, onPick, swatch }: {
  items: { key: string; label: string; hex?: string | null }[]; value: string | null; onPick: (v: string | null) => void; swatch?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button key={it.key} type="button" onClick={() => onPick(active ? null : it.key)}
            className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              active ? 'border-pink-500 bg-pink-500 text-white' : 'border-line bg-white text-ink-soft hover:border-pink-300'}`}>
            {swatch && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: it.hex || '#eee' }} />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ProductFilters({ facets, categories, showCategory = true }: {
  facets: Facets; categories: Category[]; showCategory?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    router.push(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  const active = ['size', 'color', 'category', 'inStock', 'search'].filter((k) => params.get(k)).length;

  const body = (
    <div className="space-y-6">
      {showCategory && categories.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-bold">{t.list.category}</h3>
          <Chips items={categories.map((c) => ({ key: c.slug, label: c.name }))} value={params.get('category')} onPick={(v) => set('category', v)} />
        </section>
      )}
      {facets.sizes.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-bold">{t.list.sizes}</h3>
          <Chips items={facets.sizes.map((s) => ({ key: s, label: s }))} value={params.get('size')} onPick={(v) => set('size', v)} />
        </section>
      )}
      {facets.colors.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-sm font-bold">{t.list.colors}</h3>
          <Chips swatch items={facets.colors.map((c) => ({ key: c.name, label: c.name, hex: c.hex }))} value={params.get('color')} onPick={(v) => set('color', v)} />
        </section>
      )}
      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-pink-50/70 px-3 py-3 text-sm font-semibold">
        {t.list.inStock}
        <input type="checkbox" className="h-5 w-5 accent-pink-500" checked={params.get('inStock') === 'true'}
          onChange={(e) => set('inStock', e.target.checked ? 'true' : null)} />
      </label>
      {active > 0 && (
        <button type="button" onClick={() => router.push(pathname)} className="btn-ghost btn-sm w-full">{t.list.clear}</button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn-outline btn-sm lg:hidden">
          <Icon name="filter" className="h-4 w-4" /> {t.list.filters}
          {active > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-pink-500 text-[10px] text-white">{active}</span>}
        </button>
        <label className="ms-auto flex items-center gap-2 text-xs text-ink-muted">
          {t.list.sort}
          <select value={params.get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value === 'newest' ? null : e.target.value)}
            className="input h-9 w-auto rounded-lg py-0 pe-8 text-xs font-semibold">
            {Object.entries(t.list.sorts).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
      </div>
      <aside className="hidden lg:block">{body}</aside>
      <Sheet open={open} onClose={() => setOpen(false)} title={t.list.filters}>
        {body}
        <button type="button" onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">{t.list.apply}</button>
      </Sheet>
    </>
  );
}
