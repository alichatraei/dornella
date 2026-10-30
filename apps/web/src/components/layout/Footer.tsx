'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../ui/Logo';
import Icon from '../ui/Icon';
import TrustBadges from './TrustBadges';
import { useSettings } from '../SettingsProvider';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';
import type { Category } from '@/lib/types';

export default function Footer({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const s = useSettings();
  if (pathname?.startsWith('/admin')) return null;

  const phone = s.support_phone || '';
  const phoneLabel = toFa(phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3'));

  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="wrap grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-soft">{t.footer.about}</p>
          <div className="mt-5 flex gap-2">
            {s.instagram && (
              <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer"
                className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100" aria-label={t.footer.instagram}>
                <Icon name="instagram" />
              </a>
            )}
            {s.bale_channel && (
              <a href={s.bale_channel} target="_blank" rel="noopener noreferrer"
                className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100" aria-label={t.bale.footer}>
                <Icon name="bale" />
              </a>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-extrabold">{t.footer.shop}</h2>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link href="/products" className="hover:text-pink-600">{t.nav.all}</Link></li>
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-pink-600">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-extrabold">{t.footer.help}</h2>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link href="/club" className="hover:text-pink-600">{t.nav.club}</Link></li>
            <li><Link href="/account/orders" className="hover:text-pink-600">{t.nav.track}</Link></li>
            <li><Link href="/faq" className="hover:text-pink-600">{t.nav.faq}</Link></li>
            <li><Link href="/rules" className="hover:text-pink-600">{t.nav.rules}</Link></li>
            <li><Link href="/about" className="hover:text-pink-600">{t.nav.about}</Link></li>
            <li><Link href="/contact" className="hover:text-pink-600">{t.nav.contact}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-extrabold">{t.footer.contact}</h2>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center gap-2 text-lg font-extrabold text-ink hover:text-pink-600">
              <Icon name="phone" className="h-5 w-5 text-pink-500" />
              <span dir="ltr">{phoneLabel}</span>
            </a>
          )}
          {s.support_hours && <p className="mt-1 text-xs text-ink-muted">{t.footer.hours}: {s.support_hours}</p>}
          {s.address && <p className="mt-3 text-sm leading-6 text-ink-soft">{s.address}</p>}
          <div className="mt-5">
            <TrustBadges />
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="wrap flex flex-col items-center justify-between gap-1 py-4 text-xs text-ink-muted sm:flex-row">
          <p>{t.footer.rights(toFa(new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(new Date())))}</p>
          <p>{t.brand.latin}</p>
        </div>
      </div>
    </footer>
  );
}
