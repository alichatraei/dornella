'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/ui/Logo';
import { api } from '@/lib/api';
import { t } from '@/dictionary';
import { digitsOnly, toFa } from '@/lib/format';
import type { User } from '@/lib/types';

function LoginForm() {
  const { setSession, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(digitsOnly(params.get('phone') || ''));
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [devCode, setDevCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, redirect, router]);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<{ phone: string; isNew: boolean; devCode?: string }>('/auth/otp/request', { method: 'POST', body: { phone } });
      setPhone(r.phone);
      setIsNew(r.isNew);
      setDevCode(r.devCode || '');
      setStep('code');
      setWait(60);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<{ token: string; user: User }>('/auth/otp/verify', {
        method: 'POST', body: { phone, code, name: isNew ? name : undefined, smsOptIn },
      });
      setSession(r.token, r.user);
      router.replace(redirect);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex justify-center"><Logo /></div>
      <div className="card p-6">
        <h1 className="text-lg font-extrabold">{t.auth.title}</h1>

        {step === 'phone' ? (
          <form onSubmit={requestCode} className="mt-2 space-y-5">
            <p className="text-sm leading-7 text-ink-muted">{t.auth.subtitle}</p>
            <div>
              <label className="label" htmlFor="phone">{t.auth.phone}</label>
              <input id="phone" className="input h-12 text-center text-lg tracking-[.2em]" dir="ltr" inputMode="tel" autoComplete="tel"
                value={phone} onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 11))} placeholder="09xxxxxxxxx" required autoFocus />
            </div>
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary btn-lg w-full" disabled={busy || phone.length < 10}>
              {busy ? t.auth.sending : t.auth.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-2 space-y-5">
            <p className="text-sm text-ink-muted">
              {t.auth.codeSent(phone)}{' '}
              <button type="button" onClick={() => { setStep('phone'); setCode(''); }} className="font-semibold text-pink-600">{t.auth.changePhone}</button>
            </p>
            {devCode && <p className="alert-info text-center">{t.auth.devCode(toFa(devCode))}</p>}
            <div>
              <label className="label" htmlFor="code">{t.auth.code}</label>
              <input id="code" ref={codeRef} className="input h-12 text-center text-xl tracking-[.6em]" dir="ltr" inputMode="numeric" autoComplete="one-time-code"
                value={code} onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 5))} required />
            </div>
            {isNew && (
              <>
                <div>
                  <label className="label" htmlFor="name">{t.auth.name}</label>
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                  <p className="hint">{t.auth.nameHint}</p>
                </div>
                <label className="flex items-start gap-2 text-[13px] leading-6 text-ink-soft">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-pink-500" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
                  {t.club.smsOptIn}
                </label>
              </>
            )}
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary btn-lg w-full" disabled={busy || code.length !== 5}>
              {busy ? t.auth.verifying : t.auth.verify}
            </button>
            <div className="text-center text-sm">
              {wait > 0 ? (
                <span className="text-ink-muted">{t.auth.resendIn(wait)}</span>
              ) : (
                <button type="button" onClick={() => requestCode()} className="font-semibold text-pink-600">{t.auth.resend}</button>
              )}
            </div>
          </form>
        )}
      </div>
      <p className="mt-5 text-center text-xs text-ink-muted">
        <Link href="/rules" className="underline underline-offset-2">{t.auth.terms}</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="wrap flex justify-center py-12 sm:py-20">
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
