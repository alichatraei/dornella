'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/ui/Logo';
import { api } from '@/lib/api';
import { t } from '@/dictionary';
import type { User } from '@/lib/types';

export default function AdminLoginPage() {
  const { user, setSession } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') router.replace('/admin');
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string; user: User }>('/auth/admin/login', { method: 'POST', body: form });
      setSession(r.token, r.user);
      router.replace('/admin');
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-pink-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <Logo />
        <h1 className="pt-2 text-lg font-extrabold">{t.auth.adminTitle}</h1>
        <div>
          <label className="label" htmlFor="u">{t.auth.adminUser}</label>
          <input id="u" className="input text-start" dir="ltr" autoComplete="username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="p">{t.auth.adminPass}</label>
          <input id="p" type="password" className="input text-start" dir="ltr" autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        {error && <p className="alert-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? t.common.loading : t.auth.adminLogin}</button>
      </form>
    </div>
  );
}
