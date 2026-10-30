'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DateTimeInput, Empty, FaDateHint, PageHead, Toggle } from '@/components/admin/ui';
import Sheet from '@/components/ui/Sheet';
import { digitsOnly, faDate, price, toFa } from '@/lib/format';
import type { Coupon } from '@/lib/types';

const blank = () => ({
  id: '', code: '', description: '', type: 'PERCENT' as 'PERCENT' | 'FIXED', value: '10', maxDiscount: '', minOrder: '',
  startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  usageLimit: '', perUserLimit: '1', isActive: true,
});
const randomCode = () => 'DN' + Math.random().toString(36).slice(2, 7).toUpperCase();

export default function CouponsPage() {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [edit, setEdit] = useState<ReturnType<typeof blank> | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Coupon[]>('/coupons', { auth: true }).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setError('');
    const n = (v: string) => (v ? Number(digitsOnly(v)) : undefined);
    const body = {
      code: edit.code.trim(), description: edit.description || undefined, type: edit.type, value: n(edit.value),
      maxDiscount: n(edit.maxDiscount), minOrder: n(edit.minOrder), usageLimit: n(edit.usageLimit), perUserLimit: n(edit.perUserLimit),
      startsAt: edit.startsAt || undefined, endsAt: edit.endsAt || undefined, isActive: edit.isActive,
    };
    try {
      await api(edit.id ? `/coupons/${edit.id}` : '/coupons', { method: edit.id ? 'PATCH' : 'POST', auth: true, body });
      setEdit(null);
      load();
    } catch (err: any) { setError(err.message); }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`کد ${c.code} حذف شود؟`)) return;
    await api(`/coupons/${c.id}`, { method: 'DELETE', auth: true }).catch(() => null);
    load();
  };

  const expired = (c: Coupon) => !!c.endsAt && new Date(c.endsAt) < new Date();

  return (
    <div className="space-y-5">
      <PageHead title="کدهای تخفیف" desc="برای هر کد بازه زمانی، سقف استفاده و حداقل خرید تعیین کنید."
        actions={<button type="button" onClick={() => setEdit({ ...blank(), code: randomCode() })} className="btn-primary">+ کد جدید</button>} />

      {!list ? null : list.length === 0 ? <Empty text="هنوز کد تخفیفی نساخته‌اید." /> : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>کد</th><th>تخفیف</th><th>بازه</th><th>استفاده</th><th>وضعیت</th><th /></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><b dir="ltr">{c.code}</b>{c.description && <p className="text-xs text-ink-muted">{c.description}</p>}</td>
                  <td className="whitespace-nowrap">{c.type === 'PERCENT' ? `${toFa(c.value)}٪` : `${price(c.value)} تومان`}
                    {c.maxDiscount ? <p className="text-[11px] text-ink-muted">سقف {price(c.maxDiscount)}</p> : null}
                    {c.minOrder ? <p className="text-[11px] text-ink-muted">خرید بالای {price(c.minOrder)}</p> : null}</td>
                  <td className="text-xs text-ink-muted">{c.startsAt ? faDate(c.startsAt) : '—'} تا {c.endsAt ? faDate(c.endsAt) : 'همیشه'}</td>
                  <td>{toFa(c.usedCount)}{c.usageLimit ? ` از ${toFa(c.usageLimit)}` : ''}</td>
                  <td>{!c.isActive ? <span className="chip bg-zinc-100 text-zinc-500">غیرفعال</span> : expired(c) ? <span className="chip bg-zinc-100 text-zinc-500">منقضی</span> : <span className="chip bg-emerald-50 text-emerald-700">فعال</span>}</td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-outline btn-sm" onClick={() => setEdit({
                        id: c.id, code: c.code, description: c.description || '', type: c.type, value: String(c.value),
                        maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '', minOrder: c.minOrder ? String(c.minOrder) : '',
                        startsAt: c.startsAt || '', endsAt: c.endsAt || '', usageLimit: c.usageLimit ? String(c.usageLimit) : '',
                        perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '', isActive: c.isActive,
                      })}>ویرایش</button>
                      <button type="button" onClick={() => remove(c)} className="btn-ghost btn-sm">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'ویرایش کد' : 'کد تخفیف جدید'} wide>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">کد</label>
                <div className="flex gap-2">
                  <input className="input text-start font-bold uppercase" dir="ltr" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} required />
                  <button type="button" onClick={() => setEdit({ ...edit, code: randomCode() })} className="btn-outline shrink-0">تصادفی</button>
                </div>
              </div>
              <div><label className="label">توضیح (برای مشتری)</label><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="تخفیف تولد" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">نوع</label>
                <select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as any })}>
                  <option value="PERCENT">درصدی</option><option value="FIXED">مبلغ ثابت (تومان)</option>
                </select>
              </div>
              <div><label className="label">{edit.type === 'PERCENT' ? 'درصد' : 'مبلغ'}</label><input className="input text-start" dir="ltr" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} required /></div>
              {edit.type === 'PERCENT' && <div><label className="label">سقف تخفیف (تومان)</label><input className="input text-start" dir="ltr" value={edit.maxDiscount} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value })} /></div>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">شروع</label><DateTimeInput value={edit.startsAt} onChange={(v) => setEdit({ ...edit, startsAt: v })} /><FaDateHint value={edit.startsAt} /></div>
              <div><label className="label">پایان</label><DateTimeInput value={edit.endsAt} onChange={(v) => setEdit({ ...edit, endsAt: v })} /><FaDateHint value={edit.endsAt} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">حداقل خرید (تومان)</label><input className="input text-start" dir="ltr" value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: e.target.value })} /></div>
              <div><label className="label">کل دفعات استفاده</label><input className="input text-start" dir="ltr" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value })} placeholder="نامحدود" /></div>
              <div><label className="label">برای هر نفر</label><input className="input text-start" dir="ltr" value={edit.perUserLimit} onChange={(e) => setEdit({ ...edit, perUserLimit: e.target.value })} /></div>
            </div>
            <Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="فعال" />
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary w-full">ذخیره</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
