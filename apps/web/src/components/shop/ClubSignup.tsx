'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from '../ui/Icon';
import { useAuth } from '../AuthProvider';
import { t } from '@/dictionary';
import { digitsOnly } from '@/lib/format';

/** فرم کوتاه عضویت باشگاه؛ شماره را به صفحه ورود با کد پیامکی می‌برد */
export default function ClubSignup({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/login?phone=${digitsOnly(phone)}&redirect=/account`);
  };

  return (
    <div className={`rounded-3xl bg-pink-50 ${compact ? 'p-5' : 'p-6 sm:p-10'}`}>
      <div className={`grid gap-6 ${compact ? '' : 'md:grid-cols-2 md:items-center'}`}>
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-pink-600 shadow-card">
            <Icon name="gift" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">{t.club.title}</h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{t.club.text}</p>
          {!compact && (
            <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
              {t.club.perks.map((p) => (
                <li key={p} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-pink-500" />{p}</li>
              ))}
            </ul>
          )}
        </div>
        {user ? (
          <p className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold text-pink-700">
            <Icon name="check" className="h-5 w-5" /> {t.club.joined}
          </p>
        ) : (
          <form onSubmit={submit} className="flex gap-2 rounded-2xl bg-white p-2 shadow-card">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" required
              placeholder="09xx xxx xxxx" aria-label={t.club.phonePlaceholder}
              className="h-12 min-w-0 flex-1 rounded-xl px-3 text-center text-base tracking-wider focus:outline-none" />
            <button type="submit" className="btn-primary h-12 px-6">{t.club.join}</button>
          </form>
        )}
      </div>
    </div>
  );
}
