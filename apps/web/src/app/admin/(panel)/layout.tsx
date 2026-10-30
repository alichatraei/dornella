'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/ui/Logo';
import Icon from '@/components/ui/Icon';
import { t } from '@/dictionary';

const m = t.admin.menu;
const LINKS = [
  { href: '/admin', label: m.dashboard, icon: 'grid' },
  { href: '/admin/orders', label: m.orders, icon: 'bag' },
  { href: '/admin/products', label: m.products, icon: 'tag' },
  { href: '/admin/categories', label: m.categories, icon: 'filter' },
  { href: '/admin/festivals', label: m.festivals, icon: 'sparkle' },
  { href: '/admin/coupons', label: m.coupons, icon: 'gift' },
  { href: '/admin/shipping', label: m.shipping, icon: 'truck' },
  { href: '/admin/customers', label: m.customers, icon: 'user' },
  { href: '/admin/sms', label: m.sms, icon: 'send' },
  { href: '/admin/settings', label: m.settings, icon: 'shield' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/admin/login');
  }, [loading, user, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (!user || user.role !== 'ADMIN') return <div className="p-10 text-sm text-ink-muted">{t.common.loading}</div>;

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const nav = (
    <nav className="space-y-0.5 px-3 pb-6">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active(l.href) ? 'bg-pink-500 font-bold text-white' : 'text-ink-soft hover:bg-pink-50'}`}>
          <Icon name={l.icon} className="h-[18px] w-[18px]" /> {l.label}
        </Link>
      ))}
      <div className="mt-4 border-t border-line pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-pink-50">
          <Icon name="home" className="h-[18px] w-[18px]" /> {t.admin.viewSite}
        </Link>
        <button type="button" onClick={() => { logout(); router.push('/admin/login'); }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-pink-50">
          <Icon name="close" className="h-[18px] w-[18px]" /> {t.nav.logout}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FCF7F9] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen print:!hidden overflow-y-auto border-e border-line bg-white lg:block">
        <div className="p-5"><Logo compact /></div>
        {nav}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 print:hidden items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Logo compact />
        <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-pink-50" aria-label={t.nav.menu}>
          <Icon name="menu" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label={t.common.close} />
          <aside className="absolute inset-y-0 start-0 w-64 overflow-y-auto bg-white pt-4 shadow-pop">{nav}</aside>
        </div>
      )}
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
