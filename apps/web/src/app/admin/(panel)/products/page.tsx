'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, mediaUrl } from '@/lib/api';
import { Empty, PageHead } from '@/components/admin/ui';
import { price, toFa, totalStock } from '@/lib/format';
import type { Category, Paginated, Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [q, setQ] = useState({ search: '', category: '', collection: '', page: 1 });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState({ action: '', value: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams({ limit: '40', page: String(q.page) });
    if (q.search) p.set('search', q.search);
    if (q.category) p.set('category', q.category);
    if (q.collection) p.set('collection', q.collection);
    api<Paginated<Product>>(`/products/admin?${p}`, { auth: true }).then(setData).catch(() => null);
  }, [q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<Category[]>('/categories/all', { auth: true }).then(setCategories).catch(() => null);
    api<{ name: string }[]>('/products/collections').then((c) => setCollections(c.map((x) => x.name))).catch(() => null);
  }, []);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const runBulk = async () => {
    if (!selected.length || !bulk.action) return;
    const body: Record<string, unknown> = { ids: selected };
    if (bulk.action === 'show') body.isActive = true;
    if (bulk.action === 'hide') body.isActive = false;
    if (bulk.action === 'feature') body.isFeatured = true;
    if (bulk.action === 'unfeature') body.isFeatured = false;
    if (bulk.action === 'category') body.categoryId = bulk.value;
    if (bulk.action === 'collection') body.collection = bulk.value;
    if (bulk.action === 'price') body.priceChangePercent = Number(bulk.value);
    await api('/products/bulk', { method: 'POST', auth: true, body });
    setMsg(`${toFa(selected.length)} محصول به‌روز شد`);
    setSelected([]);
    load();
  };

  const duplicate = async (p: Product) => {
    const copy = await api<Product>(`/products/${p.id}/duplicate`, { method: 'POST', auth: true });
    window.location.href = `/admin/products/${copy.id}`;
  };

  const remove = async (p: Product) => {
    if (!confirm(`«${p.title}» حذف شود؟`)) return;
    const r = await api<{ message: string }>(`/products/${p.id}`, { method: 'DELETE', auth: true }).catch((e) => ({ message: e.message }));
    setMsg(r.message);
    load();
  };

  return (
    <div className="space-y-5">
      <PageHead title="محصولات" desc={data ? `${toFa(data.total)} محصول` : undefined}
        actions={<Link href="/admin/products/new" className="btn-primary">+ محصول جدید</Link>} />

      <div className="flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex-1">
          <input className="input h-10 min-w-[200px]" placeholder="جست‌وجوی نام محصول" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} />
        </form>
        <select className="input h-10 w-auto" value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value, page: 1 })}>
          <option value="">همه دسته‌ها</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={q.collection} onChange={(e) => setQ({ ...q, collection: e.target.value, page: 1 })}>
          <option value="">همه سری‌ها</option>
          {collections.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-3 text-sm text-white">
          <b className="px-2">{toFa(selected.length)} انتخاب شده</b>
          <select className="input h-9 w-auto text-ink" value={bulk.action} onChange={(e) => setBulk({ action: e.target.value, value: '' })}>
            <option value="">چه کار کنم؟</option>
            <option value="show">نمایش در سایت</option>
            <option value="hide">پنهان کردن</option>
            <option value="feature">افزودن به پرطرفدارها</option>
            <option value="unfeature">برداشتن از پرطرفدارها</option>
            <option value="category">تغییر دسته</option>
            <option value="collection">تغییر سری</option>
            <option value="price">تغییر قیمت به درصد</option>
          </select>
          {bulk.action === 'category' && (
            <select className="input h-9 w-auto text-ink" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })}>
              <option value="">انتخاب دسته</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {bulk.action === 'collection' && <input className="input h-9 w-48 text-ink" placeholder="نام سری" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} />}
          {bulk.action === 'price' && <input className="input h-9 w-36 text-ink" dir="ltr" placeholder="مثلاً 10 یا -15" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} />}
          <button type="button" onClick={runBulk} className="btn-primary btn-sm">اعمال</button>
          <button type="button" onClick={() => setSelected([])} className="btn-sm btn text-white/70">لغو</button>
        </div>
      )}
      {msg && <p className="alert-ok">{msg}</p>}

      {!data ? <p className="text-sm text-ink-muted">یک لحظه…</p> : data.items.length === 0 ? (
        <Empty text="محصولی پیدا نشد." action={<Link href="/admin/products/new" className="btn-primary">اولین محصول را اضافه کنید</Link>} />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" className="h-4 w-4 accent-pink-500" aria-label="انتخاب همه"
                  checked={selected.length === data.items.length} onChange={(e) => setSelected(e.target.checked ? data.items.map((p) => p.id) : [])} /></th>
                <th>محصول</th><th>دسته / سری</th><th>قیمت</th><th>سود</th><th>موجودی</th><th>وضعیت</th><th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const stock = totalStock(p.variants);
                return (
                  <tr key={p.id} className={selected.includes(p.id) ? 'bg-pink-50/60' : 'hover:bg-pink-50/30'}>
                    <td><input type="checkbox" className="h-4 w-4 accent-pink-500" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} aria-label="انتخاب" /></td>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:text-pink-600">
                        <img src={mediaUrl(p.images[0]?.url)} alt="" className="h-14 w-11 rounded-lg bg-pink-50 object-cover" />
                        <span className="font-semibold">{p.title}</span>
                      </Link>
                    </td>
                    <td className="text-xs text-ink-muted">{p.category?.name || '—'}{p.collection && <span className="block text-pink-600">{p.collection}</span>}</td>
                    <td className="whitespace-nowrap">
                      {price(p.finalPrice)}
                      {p.festival && <span className="block text-[11px] text-pink-600">حراج {toFa(p.festival.percent)}٪ (اصلی {price(p.price)})</span>}
                    </td>
                    <td className="whitespace-nowrap text-xs text-emerald-700">{p.costPrice ? price(p.finalPrice - p.costPrice) : '—'}</td>
                    <td><span className={`chip ${stock === 0 ? 'bg-pink-100 text-pink-700' : stock < 4 ? 'bg-amber-soft text-amber-ink' : 'bg-emerald-50 text-emerald-700'}`}>{toFa(stock)}</span></td>
                    <td className="text-xs">{p.isActive ? 'نمایش' : <span className="text-ink-muted">پنهان</span>}{p.isFeatured && <span className="block text-pink-600">پرطرفدار</span>}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/admin/products/${p.id}`} className="btn-outline btn-sm">ویرایش</Link>
                        <button type="button" onClick={() => duplicate(p)} className="btn-ghost btn-sm" title="کپی برای مدل مشابه">کپی</button>
                        <button type="button" onClick={() => remove(p)} className="btn-ghost btn-sm">حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })} className="btn-outline btn-sm">قبلی</button>
          <span className="text-sm">{toFa(q.page)} از {toFa(data.pages)}</span>
          <button disabled={q.page >= data.pages} onClick={() => setQ({ ...q, page: q.page + 1 })} className="btn-outline btn-sm">بعدی</button>
        </div>
      )}
    </div>
  );
}
