'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { t } from '@/dictionary';
import { digitsOnly, toFa } from '@/lib/format';
import { PROVINCES } from '@/lib/provinces';
import type { Address } from '@/lib/types';

const empty = { receiverName: '', phone: '', province: 'اصفهان', city: '', postalCode: '', line: '' };

export default function AddressesPage() {
  const [list, setList] = useState<Address[] | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const load = () => api<Address[]>('/users/me/addresses', { auth: true }).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api('/users/me/addresses', { method: 'POST', auth: true, body: form });
      setForm(empty);
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const remove = async (id: string) => {
    await api(`/users/me/addresses/${id}`, { method: 'DELETE', auth: true }).catch(() => null);
    load();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h1 className="font-extrabold">{t.account.addresses}</h1>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-outline btn-sm">{open ? t.common.close : t.account.addAddress}</button>
      </div>

      {open && (
        <form onSubmit={save} className="mt-5 grid gap-3 rounded-2xl bg-pink-50/60 p-4 sm:grid-cols-2">
          <input className="input" placeholder={t.checkout.receiverName} value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} required />
          <input className="input text-start" dir="ltr" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: digitsOnly(e.target.value) })} required />
          <select className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input className="input" placeholder={t.checkout.city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <input className="input sm:col-span-2" placeholder={t.checkout.addressPlaceholder} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} required />
          <input className="input text-start" dir="ltr" placeholder={t.checkout.postalCode} maxLength={10} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: digitsOnly(e.target.value) })} required />
          <button type="submit" className="btn-primary">{t.common.save}</button>
          {error && <p className="alert-error sm:col-span-2">{error}</p>}
        </form>
      )}

      {list && list.length === 0 && !open && <p className="mt-5 text-sm text-ink-muted">{t.account.noAddress}</p>}
      <ul className="mt-5 space-y-3">
        {list?.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line p-4 text-sm">
            <div>
              <p className="font-bold">{a.receiverName} <span className="font-normal text-ink-muted" dir="ltr">{toFa(a.phone)}</span>
                {a.isDefault && <span className="chip ms-2 bg-pink-50 text-pink-700">{t.account.default}</span>}</p>
              <p className="mt-1 leading-7 text-ink-soft">{a.province}، {a.city}، {a.line}</p>
              <p className="text-xs text-ink-muted">{t.account.postal(a.postalCode)}</p>
            </div>
            <button type="button" onClick={() => remove(a.id)} className="btn-ghost btn-sm">{t.common.delete}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
