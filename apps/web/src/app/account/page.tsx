'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { t } from '@/dictionary';
import { faDate, toFa } from '@/lib/format';

export default function AccountPage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', city: '', birthDate: '', smsOptIn: true });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setForm({ name: user.name || '', city: user.city || '', birthDate: user.birthDate || '', smsOptIn: user.smsOptIn ?? true });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api('/users/me', { method: 'PATCH', auth: true, body: { ...form, name: form.name || undefined } });
      await refresh();
      setMsg(t.common.saved);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-l from-pink-500 to-pink-400 p-5 text-white">
        <Icon name="gift" className="h-8 w-8" />
        <div className="flex-1">
          <b>{t.club.member}</b>
          <p className="text-xs text-pink-50">{user.createdAt && t.account.memberSince(faDate(user.createdAt))}</p>
        </div>
        <span className="chip bg-white/20 text-white">{form.smsOptIn ? t.club.perks[0] : t.club.smsOff}</span>
      </div>

      <form onSubmit={save} className="card space-y-4">
        <h1 className="font-extrabold">{t.account.profile}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">{t.account.name}</label>
            <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t.account.phone}</label>
            <input className="input text-start" dir="ltr" value={toFa(user.phone)} disabled />
          </div>
          <div>
            <label className="label" htmlFor="city">{t.account.city}</label>
            <input id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="birth">{t.account.birthDate}</label>
            <input id="birth" className="input" value={form.birthDate} placeholder={t.account.birthPlaceholder} maxLength={10}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="h-4 w-4 accent-pink-500" checked={form.smsOptIn} onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })} />
          {t.club.smsOptIn}
        </label>
        {msg && <p className="alert-ok">{msg}</p>}
        {error && <p className="alert-error">{error}</p>}
        <button type="submit" className="btn-primary">{t.common.save}</button>
      </form>
    </div>
  );
}
