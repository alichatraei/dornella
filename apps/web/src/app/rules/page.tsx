import type { Metadata } from 'next';
import { pages, t } from '@/dictionary';
import { toFa } from '@/lib/format';

export const metadata: Metadata = { title: t.pages.rulesTitle, alternates: { canonical: '/rules' } };

export default function RulesPage() {
  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="h-title">{t.pages.rulesTitle}</h1>
      <div className="mt-6 space-y-6">
        {pages.rules.map((r, i) => (
          <section key={r.title}>
            <h2 className="font-extrabold">{toFa(i + 1)}. {r.title}</h2>
            <p className="mt-2 text-sm leading-8 text-ink-soft">{r.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
