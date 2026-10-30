'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DateTimeInput, Empty, FaDateHint, PageHead, Toggle } from '@/components/admin/ui';
import Sheet from '@/components/ui/Sheet';
import { faDate, toFa } from '@/lib/format';
import type { Category, Festival, Paginated, Product } from '@/lib/types';

const blank = () => ({
  id: '', title: '', slug: '', description: '', bannerText: '', percent: 20,
  startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  isActive: true, allProducts: true, categoryIds: [] as string[], productIds: [] as string[],
});

const state = (f: Festival) => {
  const now = Date.now();
  if (!f.isActive) return { label: 'غیرفعال', tone: 'bg-zinc-100 text-zinc-500' };
  if (new Date(f.startsAt).getTime() > now) return { label: 'شروع نشده', tone: 'bg-sky-50 text-sky-700' };
  if (new Date(f.endsAt).getTime() < now) return { label: 'تمام شده', tone: 'bg-zinc-100 text-zinc-500' };
  return { label: 'در حال اجرا', tone: 'bg-emerald-50 text-emerald-700' };
};

export default function FestivalsPage() {
  const [list, setList] = useState<Festival[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [edit, setEdit] = useState<ReturnType<typeof blank> | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Festival[]>('/festivals/admin', { auth: true }).then(setList).catch(() => setList([]));
  useEffect(() => {
    load();
    api<Category[]>('/categories/all', { auth: true }).then(setCategories).catch(() => null);
    api<Paginated<Product>>('/products/admin?limit=60', { auth: true }).then((d) => setProducts(d.items)).catch(() => null);
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setError('');
    const { id, ...body } = edit;
    try {
      await api(id ? `/festivals/${id}` : '/festivals', { method: id ? 'PATCH' : 'POST', auth: true, body: { ...body, slug: body.slug || undefined, percent: Number(body.percent) } });
      setEdit(null);
      load();
    } catch (err: any) { setError(err.message); }
  };

  const remove = async (f: Festival) => {
    if (!confirm(`«${f.title}» حذف شود؟`)) return;
    await api(`/festivals/${f.id}`, { method: 'DELETE', auth: true }).catch(() => null);
    load();
  };

  const toggleIn = (key: 'categoryIds' | 'productIds', id: string) =>
    edit && setEdit({ ...edit, [key]: edit[key].includes(id) ? edit[key].filter((x) => x !== id) : [...edit[key], id] });

  return (
    <div className="space-y-5">
      <PageHead title="جشنواره و حراج" desc="در بازه تعیین‌شده، قیمت محصولات انتخابی خودکار با تخفیف نمایش داده و فروخته می‌شود."
        actions={<button type="button" onClick={() => setEdit(blank())} className="btn-primary">+ جشنواره جدید</button>} />

      {!list ? null : list.length === 0 ? <Empty text="مثلاً «حراج آخر فصل تابستان» با ۳۰٪ تخفیف روی همه محصولات." /> : (
        <ul className="space-y-3">
          {list.map((f) => {
            const s = state(f);
            return (
              <li key={f.id} className="card flex flex-wrap items-center gap-4 p-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-500 text-lg font-extrabold text-white">{toFa(f.percent)}٪</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{f.title} <span className={`chip ms-1 ${s.tone}`}>{s.label}</span></p>
                  <p className="mt-1 text-xs text-ink-muted">از {faDate(f.startsAt, true)} تا {faDate(f.endsAt, true)}</p>
                  <p className="text-xs text-ink-muted">
                    {f.allProducts ? 'همه محصولات' : [f.categoryIds?.length ? `${toFa(f.categoryIds.length)} دسته` : '', f.products?.length ? `${toFa(f.products.length)} محصول` : ''].filter(Boolean).join(' + ')}
                  </p>
                </div>
                <a href={`/festival/${f.slug}`} target="_blank" className="btn-ghost btn-sm">صفحه</a>
                <button type="button" className="btn-outline btn-sm" onClick={() => setEdit({
                  id: f.id, title: f.title, slug: f.slug, description: f.description || '', bannerText: f.bannerText || '', percent: f.percent,
                  startsAt: f.startsAt, endsAt: f.endsAt, isActive: f.isActive ?? true, allProducts: f.allProducts ?? true,
                  categoryIds: f.categoryIds || [], productIds: f.products?.map((p) => p.id) || [],
                })}>ویرایش</button>
                <button type="button" onClick={() => remove(f)} className="btn-ghost btn-sm">حذف</button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'ویرایش جشنواره' : 'جشنواره جدید'} wide>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div><label className="label">عنوان</label><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="حراج آخر فصل پاییز" required /></div>
              <div><label className="label">درصد تخفیف</label><input className="input text-center" inputMode="numeric" value={edit.percent} onChange={(e) => setEdit({ ...edit, percent: Number(e.target.value.replace(/\D/g, '')) || 0 })} required /></div>
            </div>
            <div><label className="label">متن نوار بالای سایت</label><input className="input" value={edit.bannerText} onChange={(e) => setEdit({ ...edit, bannerText: e.target.value })} placeholder="تا ۳۰٪ تخفیف آخر فصل، فقط تا جمعه" /></div>
            <div><label className="label">توضیح</label><textarea rows={2} className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">شروع</label><DateTimeInput value={edit.startsAt} onChange={(v) => setEdit({ ...edit, startsAt: v })} /><FaDateHint value={edit.startsAt} /></div>
              <div><label className="label">پایان</label><DateTimeInput value={edit.endsAt} onChange={(v) => setEdit({ ...edit, endsAt: v })} /><FaDateHint value={edit.endsAt} /></div>
            </div>
            <div><label className="label">آدرس صفحه (انگلیسی، اختیاری)</label><input className="input text-start" dir="ltr" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="autumn-sale" /></div>
            <div className="flex flex-wrap gap-5">
              <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="فعال" />
              <Toggle checked={edit.allProducts} onChange={(v) => setEdit({ ...edit, allProducts: v })} label="روی همه محصولات" />
            </div>
            {!edit.allProducts && (
              <div className="space-y-3 rounded-2xl bg-pink-50/60 p-4">
                <p className="text-sm font-bold">دسته‌ها</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button key={c.id} type="button" onClick={() => toggleIn('categoryIds', c.id)}
                      className={`chip h-8 border px-3 ${edit.categoryIds.includes(c.id) ? 'border-pink-500 bg-pink-500 text-white' : 'border-line bg-white'}`}>{c.name}</button>
                  ))}
                </div>
                <p className="pt-2 text-sm font-bold">یا محصولات خاص</p>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white">
                      <input type="checkbox" className="h-4 w-4 accent-pink-500" checked={edit.productIds.includes(p.id)} onChange={() => toggleIn('productIds', p.id)} />
                      {p.title}{p.collection && <span className="text-xs text-ink-muted">({p.collection})</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary w-full">ذخیره</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
