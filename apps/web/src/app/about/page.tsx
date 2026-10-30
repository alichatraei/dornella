import type { Metadata } from 'next';
import { pages, t } from '@/dictionary';

export const metadata: Metadata = { title: t.pages.aboutTitle, alternates: { canonical: '/about' } };

export default function AboutPage() {
  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="h-title">{t.pages.aboutTitle}</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-9 text-ink-soft">
        {pages.about.map((p) => <p key={p}>{p}</p>)}
      </div>
    </div>
  );
}
