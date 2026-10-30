import Link from 'next/link';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';

export default function Pagination({ page, pages, baseQuery }: { page: number; pages: number; baseQuery: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    Object.entries(baseQuery).forEach(([k, v]) => v && k !== 'page' && q.set(k, v));
    if (p > 1) q.set('page', String(p));
    const s = q.toString();
    return s ? `?${s}` : '?';
  };
  const around = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="صفحه‌ها">
      {page > 1 && <Link href={href(page - 1)} className="btn-outline btn-sm">{t.list.prev}</Link>}
      {around.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - around[i - 1] > 1 && <span className="text-ink-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? 'page' : undefined}
            className={`grid h-9 w-9 place-items-center rounded-lg text-sm ${p === page ? 'bg-pink-500 font-bold text-white' : 'bg-white text-ink-soft ring-1 ring-line hover:text-pink-600'}`}>
            {toFa(p)}
          </Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className="btn-outline btn-sm">{t.list.next}</Link>}
    </nav>
  );
}
