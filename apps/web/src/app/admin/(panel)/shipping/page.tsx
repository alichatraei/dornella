'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHead, Toggle } from '@/components/admin/ui';
import Sheet from '@/components/ui/Sheet';
import { digitsOnly, price } from '@/lib/format';
import { PROVINCES } from '@/lib/provinces';
import type { ShippingMethod } from '@/lib/types';

const blank = { id: '', code: '', title: '', description: '', cost: '0', scope: 'ALL' as ShippingMethod['scope'], province: 'اصفهان', isActive: true, sortOrder: 0 };
const scopeLabel = (m: ShippingMethod) => (m.scope === 'ONLY' ? `فقط ${m.province}` : m.scope === 'EXCEPT' ? `همه استان‌ها به‌جز ${m.province}` : 'همه استان‌ها');

export default function ShippingPage() {
  const [list, setList] = useState<ShippingMethod[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<typeof blank | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api<ShippingMethod[]>('/shipping/all', { auth: true }).then((l) => {
    setList(l);
    setCosts(Object.fromEntries(l.map((m) => [m.id, String(m.cost)])));
  }).catch(() => null);
  useEffect(() => { load(); }, []);

  const body = (m: Omit<typeof blank, 'id'> | ShippingMethod, cost: string) => ({
    code: m.code, title: m.title, description: m.description || undefined, cost: Number(digitsOnly(String(cost))) || 0,
    scope: m.scope, province: m.scope === 'ALL' ? undefined : m.province, isActive: m.isActive, sortOrder: Number(m.sortOrder) || 0,
  });

  const saveCost = async (m: ShippingMethod) => {
    setMsg('');
    await api(`/shipping/${m.id}`, { method: 'PATCH', auth: true, body: body(m, costs[m.id]) });
    setMsg(`هزینه «${m.title}» ذخیره شد`);
    load();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setError('');
    const { id, ...rest } = edit;
    try {
      await api(id ? `/shipping/${id}` : '/shipping', { method: id ? 'PATCH' : 'POST', auth: true, body: body(rest, rest.cost) });
      setEdit(null);
      load();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="space-y-5">
      <PageHead title="روش‌های ارسال" desc="هر وقت هزینه پست یا پیک عوض شد، فقط عدد را اینجا تغییر دهید. روی سفارش‌های قبلی اثری ندارد."
        actions={<button type="button" onClick={() => setEdit({ ...blank })} className="btn-outline">+ روش جدید</button>} />
      {msg && <p className="alert-ok">{msg}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((m) => (
          <li key={m.id} className="card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{m.title} {!m.isActive && <span className="chip bg-zinc-100 text-zinc-500">غیرفعال</span>}</p>
                <p className="mt-1 text-xs text-ink-muted">{scopeLabel(m)} · {m.description}</p>
              </div>
              <button type="button" onClick={() => setEdit({ id: m.id, code: m.code, title: m.title, description: m.description || '', cost: String(m.cost), scope: m.scope, province: m.province || 'اصفهان', isActive: m.isActive, sortOrder: m.sortOrder })} className="btn-ghost btn-sm">ویرایش</button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label">هزینه (تومان)</label>
                <input className="input text-start text-lg font-bold" dir="ltr" inputMode="numeric" value={costs[m.id] || ''} onChange={(e) => setCosts({ ...costs, [m.id]: digitsOnly(e.target.value) })} />
                <p className="hint">{price(Number(costs[m.id] || 0))} تومان</p>
              </div>
              <button type="button" onClick={() => saveCost(m)} className="btn-primary mb-6">ذخیره</button>
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'ویرایش روش ارسال' : 'روش ارسال جدید'}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div><label className="label">عنوان</label><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required /></div>
            <div><label className="label">کد (انگلیسی)</label><input className="input text-start" dir="ltr" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toLowerCase() })} required disabled={!!edit.id} /></div>
            <div><label className="label">توضیح</label><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="۳ تا ۵ روز کاری" /></div>
            <div><label className="label">هزینه (تومان)</label><input className="input text-start" dir="ltr" value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: digitsOnly(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">محدوده</label>
                <select className="input" value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value as any })}>
                  <option value="ALL">همه استان‌ها</option><option value="ONLY">فقط یک استان</option><option value="EXCEPT">همه به‌جز یک استان</option>
                </select>
              </div>
              {edit.scope !== 'ALL' && (
                <div><label className="label">استان</label>
                  <select className="input" value={edit.province} onChange={(e) => setEdit({ ...edit, province: e.target.value })}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
                </div>
              )}
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
