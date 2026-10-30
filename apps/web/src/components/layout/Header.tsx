'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';
import { useCart } from '../CartProvider';
import { useAuth } from '../AuthProvider';
import { useSettings } from '../SettingsProvider';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';
import type { Category, Festival } from '@/lib/types';

export default function Header({ categories, festival }: { categories: Category[]; festival?: Festival | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const { count } = useCart();
  const { user, hold } = useAuth();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => setMenu(false), [pathname]);
  if (pathname?.startsWith('/admin')) return null;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  const nav = [
    { href: '/products', label: t.nav.all },
    ...categories.slice(0, 6).map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
  ];

  return (
    <>
      {(festival?.bannerText || settings.announcement) && (
        <div className="bg-pink-600 text-white">
          <div className="wrap flex h-9 items-center justify-center gap-2 text-center text-xs font-medium">
            {festival ? (
              <Link href={`/festival/${festival.slug}`} className="flex items-center gap-1.5 hover:underline">
                <Icon name="sparkle" className="h-3.5 w-3.5" />
                {festival.bannerText || festival.title}
              </Link>
            ) : (
              <span>{settings.announcement}</span>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="wrap flex h-16 items-center gap-3 lg:h-[72px] lg:gap-6">
          <button type="button" className="-ms-2 grid h-10 w-10 place-items-center rounded-xl text-ink lg:hidden"
            onClick={() => setMenu(true)} aria-label={t.nav.menu}>
            <Icon name="menu" className="h-6 w-6" />
          </button>

          <Link href="/" aria-label={t.nav.home} className="shrink-0">
            <Logo />
          </Link>

          <form onSubmit={search} className="relative mx-auto hidden max-w-md flex-1 md:block">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.nav.searchPlaceholder}
              className="input h-11 rounded-full bg-pink-50/60 pe-11 ps-4" aria-label={t.common.search} />
            <button type="submit" className="absolute inset-y-0 end-1 my-1 grid w-9 place-items-center rounded-full text-ink-muted hover:text-pink-600" aria-label={t.common.search}>
              <Icon name="search" className="h-5 w-5" />
            </button>
          </form>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="btn-soft btn-sm hidden sm:inline-flex">{t.nav.admin}</Link>
            )}
            <Link href={user ? '/account' : '/login'} aria-label={user ? t.nav.account : t.nav.login} className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm text-ink hover:bg-pink-50">
              <Icon name="user" className="h-[22px] w-[22px]" />
              <span className="hidden lg:inline">{user ? user.name?.split(' ')[0] || t.nav.account : t.nav.login}</span>
            </Link>
            <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm text-ink hover:bg-pink-50" aria-label={t.nav.cart}>
              <Icon name="bag" className="h-[22px] w-[22px]" />
              <span className="hidden lg:inline">{t.nav.cart}</span>
              {count > 0 && (
                <span className="absolute -top-0.5 start-6 grid h-5 min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[11px] font-bold text-white lg:static lg:-ms-1">
                  {toFa(count)}
                </span>
              )}
            </Link>
          </div>
        </div>

        <nav className="hidden border-t border-line/70 lg:block" aria-label={t.nav.categories}>
          <div className="wrap flex h-11 items-center gap-1 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href}
                className={`rounded-lg px-3 py-1.5 transition ${pathname === item.href ? 'font-bold text-pink-600' : 'text-ink-soft hover:text-pink-600'}`}>
                {item.label}
              </Link>
            ))}
            {festival && (
              <Link href={`/festival/${festival.slug}`} className="rounded-lg px-3 py-1.5 font-bold text-pink-600 hover:bg-pink-50">
                {t.nav.sale}
              </Link>
            )}
            <span className="ms-auto" />
            {hold && (
              <Link href={`/orders/${hold.id}`} className="chip bg-pink-100 py-1 text-pink-700 hover:bg-pink-200">
                <Icon name="clock" className="h-3.5 w-3.5" /> {t.account.holdBanner}
              </Link>
            )}
            <Link href="/club" className="rounded-lg px-3 py-1.5 text-ink-soft hover:text-pink-600">{t.nav.club}</Link>
          </div>
        </nav>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setMenu(false)} aria-label={t.common.close} />
          <aside className="absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col bg-white shadow-pop animate-fade-in">
            <div className="flex items-center justify-between border-b border-line p-4">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-pink-50" aria-label={t.common.close}>
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={search} className="p-4">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.nav.searchPlaceholder} className="input rounded-full bg-pink-50/60" />
            </form>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {festival && (
                <Link href={`/festival/${festival.slug}`} className="mb-1 flex items-center gap-2 rounded-xl bg-pink-50 px-3 py-3 text-sm font-bold text-pink-700">
                  <Icon name="sparkle" className="h-4 w-4" /> {festival.title}
                </Link>
              )}
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-3 text-sm text-ink hover:bg-pink-50">{item.label}</Link>
              ))}
              <div className="my-2 border-t border-line" />
              {[
                { href: '/club', label: t.nav.club },
                { href: '/account/orders', label: t.nav.track },
                { href: '/faq', label: t.nav.faq },
                { href: '/contact', label: t.nav.contact },
                ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: t.nav.admin }] : []),
              ].map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-3 text-sm text-ink-soft hover:bg-pink-50">{item.label}</Link>
              ))}
            </div>
            {settings.support_phone && (
              <a href={`tel:${settings.support_phone}`} className="flex items-center gap-2 border-t border-line p-4 text-sm text-ink-soft">
                <Icon name="phone" className="h-4 w-4" /> <span dir="ltr">{toFa(settings.support_phone)}</span>
              </a>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
