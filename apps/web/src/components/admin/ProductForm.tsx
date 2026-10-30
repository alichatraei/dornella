'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, mediaUrl, upload } from '@/lib/api';
import Icon from '../ui/Icon';
import { Toggle } from './ui';
import { digitsOnly, price, toFa } from '@/lib/format';
import type { Category, Product } from '@/lib/types';

type Img = { url: string; alt?: string };
type Row = { id?: string; size: string; color: string; colorHex: string; stock: number };

const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'فری‌سایز', '۳۶', '۳۸', '۴۰', '۴۲', '۴۴'];
const NEXT_KEY = 'dornela_admin_last_product';

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [images, setImages] = useState<Img[]>(product?.images.map((i) => ({ url: i.url, alt: i.alt })) || []);
  const [rows, setRows] = useState<Row[]>(
    product?.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.colorHex || '#F2A7BE', stock: v.stock })) || [],
  );
  const [form, setForm] = useState({
    title: product?.title || '',
    slug: product?.slug || '',
    categoryId: product?.categoryId || product?.category?.id || '',
    collection: product?.collection || '',
    price: product ? String(product.price) : '',
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : '',
    costPrice: product?.costPrice ? String(product.costPrice) : '',
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    material: product?.material || '',
    sizeGuide: product?.sizeGuide || '',
    metaTitle: product?.metaTitle || '',
    metaDescription: product?.metaDescription || '',
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
  });
  const [gen, setGen] = useState({ sizes: 'S, M, L, XL', color: '', hex: '#F2A7BE', stock: '3' });
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories/all', { auth: true }).then(setCategories).catch(() => null);
    api<{ name: string }[]>('/products/collections').then((c) => setCollections(c.map((x) => x.name))).catch(() => null);
    // برای محصول جدید، دسته و سری آخرین محصول ثبت‌شده پیشنهاد می‌شود تا بارگذاری یک سری سریع‌تر شود
    if (!product) {
      try {
        const last = JSON.parse(localStorage.getItem(NEXT_KEY) || '{}');
        setForm((f) => ({ ...f, categoryId: last.categoryId || '', collection: last.collection || '', sizeGuide: last.sizeGuide || '' }));
        if (last.sizes) setGen((g) => ({ ...g, sizes: last.sizes }));
      } catch {}
    }
  }, [product]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: ['price', 'compareAtPrice', 'costPrice'].includes(k) ? digitsOnly(e.target.value) : e.target.value });

  const addFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    setError('');
    setUploading(list.length);
    try {
      // آپلود چندتایی در یک درخواست؛ سرور عکس‌ها را فشرده و webp می‌کند
      const result = await upload<{ url: string }[]>('/uploads/products', list, 'files');
      setImages((prev) => [...prev, ...result.map((r) => ({ url: r.url, alt: form.title }))]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(0);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  const generate = () => {
    const sizes = gen.sizes.split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean);
    const color = gen.color.trim() || 'تک‌رنگ';
    const fresh = sizes
      .filter((s) => !rows.some((r) => r.size === s && r.color === color))
      .map((size) => ({ size, color, colorHex: gen.hex, stock: Number(digitsOnly(gen.stock)) || 0 }));
    setRows([...rows, ...fresh]);
  };

  const updateRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async (andNew = false) => {
    setError('');
    if (!form.title.trim()) return setError('نام محصول را بنویسید');
    if (!form.price) return setError('قیمت را وارد کنید');
    if (!rows.length) return setError('حداقل یک سایز با موجودی اضافه کنید');
    setBusy(true);
    const body = {
      ...form,
      slug: form.slug || undefined,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      costPrice: Number(form.costPrice || 0),
      categoryId: form.categoryId || null,
      collection: form.collection.trim() || null,
      images: images.map((img) => ({ url: img.url, alt: img.alt || form.title })),
      variants: rows.map((r) => ({ ...r, stock: Number(r.stock) || 0 })),
    };
    try {
      if (product) await api(`/products/${product.id}`, { method: 'PATCH', auth: true, body });
      else await api('/products', { method: 'POST', auth: true, body });
      try {
        localStorage.setItem(NEXT_KEY, JSON.stringify({ categoryId: form.categoryId, collection: form.collection, sizeGuide: form.sizeGuide, sizes: [...new Set(rows.map((r) => r.size))].join(', ') }));
      } catch {}
      if (andNew) {
        window.location.href = '/admin/products/new';
      } else {
        router.push('/admin/products');
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const profit = Number(form.price || 0) - Number(form.costPrice || 0);
  const totalStock = rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="card space-y-4">
          <div>
            <label className="label" htmlFor="title">نام محصول</label>
            <input id="title" className="input" value={form.title} onChange={set('title')} placeholder="مثلاً: پیراهن گل‌ریز نخی" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cat">دسته‌بندی</label>
              <select id="cat" className="input" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">بدون دسته</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="col">سری / کالکشن</label>
              <input id="col" className="input" list="collections" value={form.collection} onChange={set('collection')} placeholder="مثلاً: سری پاییز ۱۴۰۵" />
              <datalist id="collections">{collections.map((c) => <option key={c} value={c} />)}</datalist>
              <p className="hint">محصولات هر سری که می‌فرستید را با یک نام ثبت کنید تا کنار هم نمایش داده شوند.</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="short">یک خط معرفی (زیر قیمت دیده می‌شود)</label>
            <input id="short" className="input" value={form.shortDescription} onChange={set('shortDescription')} />
          </div>
          <div>
            <label className="label" htmlFor="desc">توضیحات کامل</label>
            <textarea id="desc" rows={5} className="input" value={form.description} onChange={set('description')}
              placeholder="جنس پارچه، قد لباس، فرم، نکته شست‌وشو…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mat">جنس پارچه</label>
              <input id="mat" className="input" value={form.material} onChange={set('material')} placeholder="نخ پنبه" />
            </div>
            <div>
              <label className="label" htmlFor="guide">راهنمای سایز</label>
              <textarea id="guide" rows={2} className="input" value={form.sizeGuide} onChange={set('sizeGuide')} placeholder="S: قد ۹۰، دور سینه ۹۶&#10;M: …" />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">عکس‌ها</h2>
            <span className="text-xs text-ink-muted">عکس اول، عکس اصلی است. عکس دوم با بردن ماوس نمایش داده می‌شود.</span>
          </div>
          <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-pink-500 bg-pink-50' : 'border-line hover:border-pink-300'}`}>
            <Icon name="upload" className="h-7 w-7 text-pink-500" />
            <span className="text-sm font-semibold">{uploading ? `در حال آپلود ${toFa(uploading)} عکس…` : 'عکس‌ها را اینجا بکشید یا کلیک کنید'}</span>
            <span className="text-xs text-ink-muted">چند عکس را با هم انتخاب کنید؛ خودکار فشرده می‌شوند</span>
            <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          {images.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((img, i) => (
                <li key={img.url + i} className="group relative">
                  <img src={mediaUrl(img.url)} alt="" className={`aspect-[3/4] w-full rounded-xl object-cover ${i === 0 ? 'ring-2 ring-pink-500' : ''}`} />
                  {i === 0 && <span className="chip absolute start-1.5 top-1.5 bg-pink-500 text-[10px] text-white">اصلی</span>}
                  <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-xs shadow" aria-label="جلوتر">→</button>
                    <button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))} className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-pink-700 shadow" aria-label="حذف">
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-xs shadow" aria-label="عقب‌تر">←</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">سایز، رنگ و موجودی</h2>
            <span className="text-xs text-ink-muted">جمع موجودی: {toFa(totalStock)}</span>
          </div>

          <div className="grid gap-2 rounded-2xl bg-pink-50/60 p-3 sm:grid-cols-[1.4fr_1fr_auto_80px_auto]">
            <input className="input h-10" value={gen.sizes} onChange={(e) => setGen({ ...gen, sizes: e.target.value })} placeholder="سایزها با کاما: S, M, L" aria-label="سایزها" />
            <input className="input h-10" value={gen.color} onChange={(e) => setGen({ ...gen, color: e.target.value })} placeholder="نام رنگ" aria-label="رنگ" />
            <input type="color" className="h-10 w-12 cursor-pointer rounded-xl border border-line bg-white p-1" value={gen.hex} onChange={(e) => setGen({ ...gen, hex: e.target.value })} aria-label="کد رنگ" />
            <input className="input h-10 text-center" inputMode="numeric" value={gen.stock} onChange={(e) => setGen({ ...gen, stock: e.target.value })} aria-label="موجودی هر سایز" />
            <button type="button" onClick={generate} className="btn-primary h-10">ساخت ردیف‌ها</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_SIZES.map((s) => (
              <button key={s} type="button" onClick={() => setGen({ ...gen, sizes: gen.sizes ? `${gen.sizes}, ${s}` : s })}
                className="chip border border-line bg-white text-ink-soft hover:border-pink-300">+ {s}</button>
            ))}
            <button type="button" onClick={() => setGen({ ...gen, sizes: '' })} className="chip text-ink-muted">پاک کردن</button>
          </div>

          {rows.length > 0 && (
            <ul className="mt-4 space-y-2">
              {rows.map((r, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_44px_90px_36px] items-center gap-2">
                  <input className="input h-10" value={r.size} onChange={(e) => updateRow(i, { size: e.target.value })} aria-label="سایز" />
                  <input className="input h-10" value={r.color} onChange={(e) => updateRow(i, { color: e.target.value })} aria-label="رنگ" />
                  <input type="color" className="h-10 w-11 cursor-pointer rounded-xl border border-line bg-white p-1" value={r.colorHex} onChange={(e) => updateRow(i, { colorHex: e.target.value })} aria-label="کد رنگ" />
                  <input className={`input h-10 text-center ${r.stock === 0 ? 'border-pink-300 text-pink-700' : ''}`} inputMode="numeric" value={r.stock}
                    onChange={(e) => updateRow(i, { stock: Number(digitsOnly(e.target.value)) || 0 })} aria-label="موجودی" />
                  <button type="button" onClick={() => setRows(rows.filter((_, x) => x !== i))} className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-pink-50 hover:text-pink-600" aria-label="حذف ردیف">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <details className="card">
          <summary className="cursor-pointer font-extrabold">سئو (اختیاری)</summary>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="slug">آدرس صفحه</label>
              <input id="slug" className="input text-start" dir="ltr" value={form.slug} onChange={set('slug')} placeholder="خالی بماند تا از نام ساخته شود" />
            </div>
            <div>
              <label className="label" htmlFor="mt">عنوان در گوگل</label>
              <input id="mt" className="input" value={form.metaTitle} onChange={set('metaTitle')} />
            </div>
            <div>
              <label className="label" htmlFor="md">توضیح در گوگل (حدود ۱۵۰ حرف)</label>
              <textarea id="md" rows={2} className="input" value={form.metaDescription} onChange={set('metaDescription')} />
            </div>
          </div>
        </details>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
        <section className="card space-y-4">
          <h2 className="font-extrabold">قیمت</h2>
          <div>
            <label className="label" htmlFor="price">قیمت فروش (تومان)</label>
            <input id="price" className="input text-start text-base font-bold" dir="ltr" inputMode="numeric" value={form.price} onChange={set('price')} required />
            {form.price && <p className="hint">{price(Number(form.price))} تومان</p>}
          </div>
          <div>
            <label className="label" htmlFor="cmp">قیمت قبل از تخفیف (اختیاری)</label>
            <input id="cmp" className="input text-start" dir="ltr" inputMode="numeric" value={form.compareAtPrice} onChange={set('compareAtPrice')} />
          </div>
          <div>
            <label className="label" htmlFor="cost">قیمت خرید</label>
            <input id="cost" className="input text-start" dir="ltr" inputMode="numeric" value={form.costPrice} onChange={set('costPrice')} />
            <p className="hint">فقط شما می‌بینید؛ برای محاسبه سود.</p>
          </div>
          {form.price && form.costPrice && (
            <p className={`rounded-xl p-3 text-sm ${profit > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-pink-50 text-pink-800'}`}>
              سود هر فروش: {price(profit)} تومان
            </p>
          )}
        </section>

        <section className="card space-y-4">
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="نمایش در سایت" />
          <Toggle checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} label="در بخش پرطرفدارها" />
          {error && <p className="alert-error">{error}</p>}
          <button type="submit" disabled={busy || uploading > 0} className="btn-primary w-full">{busy ? 'در حال ذخیره…' : product ? 'ذخیره تغییرات' : 'ثبت محصول'}</button>
          {!product && (
            <button type="button" disabled={busy || uploading > 0} onClick={() => save(true)} className="btn-soft w-full">ثبت و محصول بعدی همین سری</button>
          )}
          <button type="button" onClick={() => router.push('/admin/products')} className="btn-ghost btn-sm w-full">انصراف</button>
        </section>
      </aside>
    </form>
  );
}
