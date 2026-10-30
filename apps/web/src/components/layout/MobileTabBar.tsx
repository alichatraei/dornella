'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../ui/Icon';
import { useCart } from '../CartProvider';
import { useAuth } from '../AuthProvider';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';

/** نوار پایین صفحه در موبایل، مثل اپلیکیشن‌ها */
export default function MobileTabBar() {
  const pathname = usePathname() || '/';
  const { count } = useCart();
  const { user } = useAuth();
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return null;

  const tabs = [
    { href: '/', icon: 'home', label: t.nav.home, active: pathname === '/' },
    { href: '/products', icon: 'grid', label: t.nav.categories, active: pathname.startsWith('/products') || pathname.startsWith('/category') },
    { href: '/cart', icon: 'bag', label: t.nav.cart, active: pathname === '/cart', badge: count },
    { href: user ? '/account' : '/login', icon: 'user', label: user ? t.nav.account : t.nav.login.split(' ')[0], active: pathname.startsWith('/account') || pathname === '/login' },
  ];

  return (
    <>
      <div className="h-16 lg:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid h-16 grid-cols-4">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${tab.active ? 'font-bold text-pink-600' : 'text-ink-muted'}`}>
              <Icon name={tab.icon} className="h-[22px] w-[22px]" stroke={tab.active ? 2 : 1.7} />
              {tab.label}
              {!!tab.badge && (
                <span className="absolute top-2 start-[calc(50%+6px)] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
                  {toFa(tab.badge)}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
