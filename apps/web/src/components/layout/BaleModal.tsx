'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sheet from '../ui/Sheet';
import Icon from '../ui/Icon';
import { useSettings } from '../SettingsProvider';
import { t } from '@/dictionary';

const KEY = 'dornela_bale_seen';
const EVERY_DAYS = 3;

/** پیام عضویت در کانال بله؛ هر چند روز یک بار به هر بازدیدکننده نشان داده می‌شود */
export default function BaleModal() {
  const settings = useSettings();
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const enabled = settings.bale_popup_enabled === 'true' && !!settings.bale_channel;

  useEffect(() => {
    if (!enabled || pathname.startsWith('/admin')) return;
    let last = 0;
    try { last = Number(localStorage.getItem(KEY) || 0); } catch {}
    if (Date.now() - last < EVERY_DAYS * 86400000) return;
    const id = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(id);
  }, [enabled, pathname]);

  const close = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setOpen(false);
  };

  return (
    <Sheet open={open} onClose={close}>
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-pink-100 text-pink-600">
          <Icon name="bale" className="h-9 w-9" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">{t.bale.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">{settings.bale_popup_text}</p>
        <div className="mt-6 grid gap-2">
          <a href={settings.bale_channel} target="_blank" rel="noopener noreferrer" onClick={close} className="btn-primary btn-lg w-full">
            {t.bale.join}
          </a>
          <button type="button" onClick={close} className="btn-ghost w-full">{t.bale.later}</button>
        </div>
      </div>
    </Sheet>
  );
}
