'use client';

import { useEffect, useState } from 'react';
import { api, mediaUrl, upload } from '@/lib/api';
import { Empty, PageHead, Toggle } from '@/components/admin/ui';
import Sheet from '@/components/ui/Sheet';
import { toFa } from '@/lib/format';
import type { Category } from '@/lib/types';

const blank = { id: '', name: '', slug: '', description: '', image: '', sortOrder: 0, isActive: true };

export default function CategoriesPage() {
  const [list, setList] = useState<Category[] | null>(null);
  const [edit, setEdit] = useState<typeof blank | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Category[]>('/categories/all', { auth: true }).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setError('');
    const { id, ...body } = edit;
    try {
      await api(id ? `/categories/${id}` : '/categories', { method: id ? 'PATCH' : 'POST', auth: true, body: { ...body, slug: body.slug || undefined, sortOrder: Number(body.sortOrder) || 0 } });
      setEdit(null);
      load();
    } catch (err: any) { setError(err.message); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`دسته «${c.name}» حذف شود؟ محصولاتش بدون دسته می‌شوند.`)) return;
    await api(`/categories/${c.id}`, { method: 'DELETE', auth: true }).catch(() => null);
    load();
  };

  return (
    <div className="space-y-5">
      <PageHead title="دسته‌بندی‌ها" desc="به ترتیب «اولویت» در صفحه اصلی و منو نمایش داده می‌شوند."
        actions={<button type="button" onClick={() => setEdit({ ...blank })} className="btn-primary">+ دسته جدید</button>} />
      {!list ? null : list.length === 0 ? <Empty text="هنوز دسته‌ای نساخته‌اید." /> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <li key={c.id} className="card flex items-center gap-3 p-4">
              <img src={mediaUrl(c.image)} alt="" className="h-14 w-14 rounded-full bg-pink-50 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.name} {!c.isActive && <span className="chip bg-zinc-100 text-zinc-500">پنهان</span>}</p>
                <p className="text-xs text-ink-muted">{toFa(c._count?.products || 0)} محصول · اولویت {toFa(c.sortOrder || 0)}</p>
              </div>
              <button type="button" onClick={() => setEdit({ id: c.id, name: c.name, slug: c.slug, description: c.description || '', image: c.image || '', sortOrder: c.sortOrder || 0, isActive: c.isActive ?? true })} className="btn-outline btn-sm">ویرایش</button>
              <button type="button" onClick={() => remove(c)} className="btn-ghost btn-sm">حذف</button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'ویرایش دسته' : 'دسته جدید'}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={mediaUrl(edit.image)} alt="" className="h-16 w-16 rounded-full bg-pink-50 object-cover" />
              <label className="btn-outline btn-sm cursor-pointer">
                انتخاب عکس
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setEdit({ ...edit, image: (await upload('/uploads/product', f)).url });
                }} />
              </label>
            </div>
            <div><label className="label">نام</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></div>
            <div><label className="label">آدرس (انگلیسی)</label><input className="input text-start" dir="ltr" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="dresses" /></div>
            <div><label className="label">توضیح کوتاه (برای گوگل)</label><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div><label className="label">اولویت نمایش</label><input className="input" inputMode="numeric" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 0 })} /></div>
            <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="نمایش در سایت" />
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary w-full">ذخیره</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
