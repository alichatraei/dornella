'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Icon from '@/components/ui/Icon';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';

const LINKS = [
  { href: '/account', label: t.account.profile, icon: 'user' },
  { href: '/account/orders', label: t.account.orders, icon: 'bag' },
  { href: '/account/addresses', label: t.account.addresses, icon: 'home' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hold } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${pathname}`);
  }, [loading, user, router, pathname]);

  if (!user) return <div className="wrap py-20 text-center text-sm text-ink-muted">{t.common.loading}</div>;

  return (
    <div className="wrap grid gap-6 py-6 sm:py-10 lg:grid-cols-[250px_1fr]">
      <aside className="h-fit space-y-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-pink-100 text-lg font-extrabold text-pink-600">
            {(user.name || 'د').slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.name || t.account.title}</p>
            <p className="text-xs text-ink-muted" dir="ltr">{toFa(user.phone)}</p>
          </div>
        </div>
        {hold && (
          <Link href={`/orders/${hold.id}`} className="flex items-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-bold text-white">
            <Icon name="clock" className="h-4 w-4" /> {t.account.holdBanner}
          </Link>
        )}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 lg:flex-col">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${pathname === l.href ? 'bg-pink-50 font-bold text-pink-700' : 'text-ink-soft hover:bg-pink-50/60'}`}>
              <Icon name={l.icon} className="h-[18px] w-[18px]" /> {l.label}
            </Link>
          ))}
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-pink-50/60">
              <Icon name="grid" className="h-[18px] w-[18px]" /> {t.nav.admin}
            </Link>
          )}
          <button type="button" onClick={() => { logout(); router.push('/'); }}
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-pink-50/60">
            <Icon name="close" className="h-[18px] w-[18px]" /> {t.nav.logout}
          </button>
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
