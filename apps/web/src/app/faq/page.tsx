import type { Metadata } from 'next';
import { pages, t } from '@/dictionary';

export const metadata: Metadata = { title: t.pages.faqTitle, alternates: { canonical: '/faq' } };

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pages.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <div className="wrap max-w-3xl py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="h-title">{t.pages.faqTitle}</h1>
      <div className="mt-6 space-y-3">
        {pages.faq.map((f, i) => (
          <details key={f.q} open={i === 0} className="group rounded-2xl border border-line bg-white p-5 open:border-pink-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {f.q}
              <span className="text-xl text-pink-500 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-8 text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
