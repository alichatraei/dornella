'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { OrderBadge } from '@/components/ui/StatusBadge';
import { PageHead, Stat, Toggle } from '@/components/admin/ui';
import { faDate, price, toFa } from '@/lib/format';

type Detail = {
  id: string; name?: string; phone: string; city?: string; birthDate?: string; tags: string[]; adminNote?: string;
  smsOptIn: boolean; isActive: boolean; source?: string; createdAt: string; lastLoginAt?: string;
  orders: { id: string; orderNumber: string; status: string; total: number; kind: string; createdAt: string }[];
  addresses: { id: string; province: string; city: string; line: string }[];
  sms: { id: string; kind: string; message: string; ok: boolean; createdAt: string }[];
  spent: number; lastOrderAt?: string;
};

export default function CustomerPage({ params }: { params: { id: string } }) {
  const [c, setC] = useState<Detail | null>(null);
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<Detail>(`/crm/contacts/${params.id}`, { auth: true }).then((d) => {
      setC(d);
      setTags(d.tags.join('، '));
      setNote(d.adminNote || '');
    }).catch(() => null);
  }, [params.id]);

  const save = async (patch: Record<string, unknown>) => {
    await api(`/crm/contacts/${params.id}`, { method: 'PATCH', auth: true, body: patch });
    setC((prev) => (prev ? { ...prev, ...patch } as Detail : prev));
    setMsg('ذخیره شد');
    setTimeout(() => setMsg(''), 1500);
  };

  if (!c) return <p className="text-sm text-ink-muted">یک لحظه…</p>;
  return (
    <div className="space-y-5">
      <PageHead title={c.name || 'بدون نام'} desc={`${toFa(c.phone)} · عضو از ${faDate(c.createdAt)}${c.source === 'import' ? ' · واردشده دستی' : ''}`}
        actions={<a href={`tel:${c.phone}`} className="btn-outline btn-sm">تماس</a>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="pink" label="جمع خرید" value={`${price(c.spent)} تومان`} />
        <Stat label="سفارش‌ها" value={toFa(c.orders.length)} />
        <Stat label="آخرین خرید" value={c.lastOrderAt ? faDate(c.lastOrderAt) : '—'} />
        <Stat label="تولد" value={c.birthDate ? toFa(c.birthDate) : '—'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card">
            <h2 className="mb-3 font-extrabold">سفارش‌ها</h2>
            {c.orders.length === 0 ? <p className="text-sm text-ink-muted">هنوز سفارشی ندارد.</p> : (
              <ul className="divide-y divide-line text-sm">
                {c.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-pink-600">{toFa(o.orderNumber)}</Link>
                    <span className="text-xs text-ink-muted">{faDate(o.createdAt)}</span>
                    <span>{price(o.total)}</span>
                    <OrderBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 font-extrabold">پیامک‌های ارسالی</h2>
            {c.sms.length === 0 ? <p className="text-sm text-ink-muted">پیامکی ثبت نشده.</p> : (
              <ul className="space-y-2 text-xs">
                {c.sms.map((s) => (
                  <li key={s.id} className="rounded-xl bg-pink-50/50 p-3">
                    <p className="flex justify-between text-ink-muted"><span>{s.kind}</span><span>{faDate(s.createdAt, true)} {s.ok ? '✓' : '✗'}</span></p>
                    <p className="mt-1 whitespace-pre-line leading-6">{s.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card space-y-3">
            <div>
              <label className="label">برچسب‌ها (با کاما جدا کنید)</label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VIP، اینستاگرام، مانتو" />
            </div>
            <div>
              <label className="label">یادداشت</label>
              <textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="سایز M می‌پوشد، رنگ روشن دوست دارد…" />
            </div>
            <button type="button" className="btn-primary w-full" onClick={() => save({ tags: tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean), adminNote: note })}>ذخیره</button>
            <div className="space-y-3 border-t border-line pt-3">
              <Toggle checked={c.smsOptIn} onChange={(v) => save({ smsOptIn: v })} label="دریافت پیامک تبلیغاتی" />
              <Toggle checked={c.isActive} onChange={(v) => save({ isActive: v })} label="حساب فعال" />
            </div>
            {msg && <p className="alert-ok">{msg}</p>}
          </section>
          {c.addresses.length > 0 && (
            <section className="card text-sm">
              <h2 className="mb-2 font-extrabold">نشانی‌ها</h2>
              {c.addresses.map((a) => <p key={a.id} className="leading-7 text-ink-soft">{a.province}، {a.city}، {a.line}</p>)}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
