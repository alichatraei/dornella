'use client';

import { useSettings } from '../SettingsProvider';
import Icon from '../ui/Icon';
import { t } from '@/dictionary';

/**
 * نماد اعتماد و نشان زرین‌پال.
 * کد HTML هر دو را باید از پنل خودشان (enamad.ir و zarinpal.com) گرفت و در تنظیمات پنل مدیریت گذاشت؛
 * نماد اعتماد بدون کد رسمی نباید نمایش داده شود.
 */
export default function TrustBadges() {
  const s = useSettings();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {s.enamad_html ? (
        <div className="grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-2xl border border-line bg-white p-1 [&_img]:max-h-full"
          dangerouslySetInnerHTML={{ __html: s.enamad_html }} />
      ) : null}
      {s.zarinpal_badge_html ? (
        <div className="grid h-[104px] w-[104px] place-items-center overflow-hidden rounded-2xl border border-line bg-white p-1 [&_img]:max-h-full"
          dangerouslySetInnerHTML={{ __html: s.zarinpal_badge_html }} />
      ) : (
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-white p-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFC20E]/20 text-[#B68400]">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-bold leading-4 text-ink-soft">{t.footer.zarinpal}</span>
        </div>
      )}
    </div>
  );
}
