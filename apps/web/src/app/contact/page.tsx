import type { Metadata } from 'next';
import Icon from '@/components/ui/Icon';
import { safeApi } from '@/lib/api';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';
import type { Settings } from '@/lib/types';

export const metadata: Metadata = { title: t.pages.contactTitle, alternates: { canonical: '/contact' } };

export default async function ContactPage() {
  const s = await safeApi<Settings>('/settings', {}, 60);
  const items = [
    s.support_phone && { icon: 'phone', label: t.footer.call, value: toFa(s.support_phone), href: `tel:${s.support_phone}`, ltr: true },
    s.bale_channel && { icon: 'bale', label: t.bale.footer, value: s.bale_channel.replace(/^https?:\/\//, ''), href: s.bale_channel, ltr: true },
    s.instagram && { icon: 'instagram', label: t.footer.instagram, value: `@${s.instagram}`, href: `https://instagram.com/${s.instagram}`, ltr: true },
    s.support_hours && { icon: 'clock', label: t.footer.hours, value: s.support_hours },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string; ltr?: boolean }[];

  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="h-title">{t.pages.contactTitle}</h1>
      <p className="mt-3 text-sm leading-8 text-ink-soft">{t.pages.contactText}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const body = (
            <>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600"><Icon name={it.icon} /></span>
              <span><span className="block text-xs text-ink-muted">{it.label}</span><b className="mt-0.5 block" dir={it.ltr ? 'ltr' : undefined}>{it.value}</b></span>
            </>
          );
          return (
            <li key={it.label}>
              {it.href ? <a href={it.href} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 hover:border-pink-200">{body}</a>
                : <div className="card flex items-center gap-3 p-4">{body}</div>}
            </li>
          );
        })}
      </ul>
      {s.address && <p className="mt-6 text-sm text-ink-soft">{s.address}</p>}
    </div>
  );
}
