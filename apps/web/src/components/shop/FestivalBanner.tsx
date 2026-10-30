import Link from 'next/link';
import Countdown from '../ui/Countdown';
import { t } from '@/dictionary';
import type { Festival } from '@/lib/types';

export default function FestivalBanner({ festival }: { festival: Festival }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-pink-600 px-6 py-7 text-white sm:px-10 sm:py-9">
      <svg className="pointer-events-none absolute -end-10 -top-16 h-72 w-72 text-pink-500" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="100" fill="currentColor" />
      </svg>
      <svg className="pointer-events-none absolute -bottom-24 end-40 h-56 w-56 text-pink-700/60" viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="100" fill="currentColor" />
      </svg>
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="chip bg-white/20 text-white">{t.festival.upTo(festival.percent)}</span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{festival.title}</h2>
          {festival.description && <p className="mt-2 max-w-lg text-sm leading-7 text-pink-50">{festival.description}</p>}
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <div>
            <p className="mb-2 text-xs text-pink-100">{t.home.festivalEnds}</p>
            <Countdown until={festival.endsAt} tone="light" />
          </div>
          <Link href={`/festival/${festival.slug}`} className="btn bg-white text-pink-700 hover:bg-pink-50">{t.common.seeAll}</Link>
        </div>
      </div>
    </div>
  );
}
