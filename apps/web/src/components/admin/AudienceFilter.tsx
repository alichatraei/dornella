'use client';

export type Audience = { search?: string; segment?: string; tag?: string; city?: string; minSpent?: string; inactiveDays?: string };

export const SEGMENTS = [
  { value: '', label: 'همه' },
  { value: 'buyers', label: 'خرید کرده‌اند' },
  { value: 'never', label: 'هنوز خرید نکرده‌اند' },
  { value: 'inactive', label: 'مدتی است خرید نکرده‌اند' },
];

export const audienceQuery = (a: Audience) => {
  const q = new URLSearchParams();
  Object.entries(a).forEach(([k, v]) => v && q.set(k, v));
  return q;
};

export const audienceBody = (a: Audience) => ({
  search: a.search || undefined, segment: a.segment || undefined, tag: a.tag || undefined, city: a.city || undefined,
  minSpent: a.minSpent ? Number(a.minSpent) : undefined, inactiveDays: a.inactiveDays ? Number(a.inactiveDays) : undefined,
});

export default function AudienceFilter({ value, onChange, tags, withSearch = true }: {
  value: Audience; onChange: (a: Audience) => void; tags: string[]; withSearch?: boolean;
}) {
  const set = (k: keyof Audience) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {withSearch && <input className="input h-10" placeholder="نام یا شماره" value={value.search || ''} onChange={set('search')} />}
      <select className="input h-10" value={value.segment || ''} onChange={set('segment')}>
        {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {value.segment === 'inactive' && (
        <input className="input h-10" inputMode="numeric" placeholder="چند روز؟ (پیش‌فرض ۶۰)" value={value.inactiveDays || ''} onChange={set('inactiveDays')} />
      )}
      <select className="input h-10" value={value.tag || ''} onChange={set('tag')}>
        <option value="">همه برچسب‌ها</option>
        {tags.map((t) => <option key={t}>{t}</option>)}
      </select>
      <input className="input h-10" placeholder="شهر" value={value.city || ''} onChange={set('city')} />
      <input className="input h-10" inputMode="numeric" placeholder="حداقل جمع خرید (تومان)" value={value.minSpent || ''} onChange={set('minSpent')} />
    </div>
  );
}
