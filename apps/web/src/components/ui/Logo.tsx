import { t } from '@/dictionary';

/** نشان‌واره درنلا: حرف «د» در یک قطره گل‌برگی */
export default function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <path d="M20 2c9 6 15 12.5 15 20.5A15 15 0 0 1 5 22.5C5 14.5 11 8 20 2Z" fill="#E8578C" />
        <path d="M15 17.5c4.2-.6 9.6.4 9.6 5.6 0 3.4-2.6 5.4-6.3 5.4h-4.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className={`block text-[19px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>{t.brand.name}</span>
        {!compact && <span className={`mt-1 block text-2xs font-medium ${light ? 'text-pink-100' : 'text-ink-muted'}`}>{t.brand.tagline}</span>}
      </span>
    </span>
  );
}
