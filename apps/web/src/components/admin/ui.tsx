'use client';

import Icon from '../ui/Icon';

export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-ink-muted">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'pink' }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === 'pink' ? 'bg-pink-500 text-white' : 'border border-line bg-white'}`}>
      <p className={`text-xs ${tone === 'pink' ? 'text-pink-100' : 'text-ink-muted'}`}>{label}</p>
      <p className="mt-1.5 text-lg font-extrabold sm:text-xl">{value}</p>
      {hint && <p className={`mt-0.5 text-[11px] ${tone === 'pink' ? 'text-pink-100' : 'text-ink-muted'}`}>{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-pink-500' : 'bg-zinc-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`} />
      </button>
      {label}
    </label>
  );
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-200 bg-white px-6 py-14 text-center">
      <Icon name="sparkle" className="mx-auto h-8 w-8 text-pink-300" />
      <p className="mt-3 text-sm text-ink-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** ورودی تاریخ و ساعت محلی؛ مقدار ISO می‌گیرد و ISO برمی‌گرداند */
export function DateTimeInput({ value, onChange, id }: { value?: string | null; onChange: (iso: string) => void; id?: string }) {
  const local = value ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  return (
    <input id={id} type="datetime-local" className="input text-start" dir="ltr" value={local}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />
  );
}

export function FaDateHint({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <p className="hint">
      {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(value))}
    </p>
  );
}
