import Link from 'next/link';
import Icon from '../ui/Icon';
import { t } from '@/dictionary';

export default function SectionHead({ title, href, extra }: { title: string; href?: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2.5 text-lg font-extrabold sm:text-xl">
        <span className="h-5 w-1.5 rounded-full bg-pink-500" aria-hidden />
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {extra}
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-pink-600 hover:text-pink-700">
            {t.common.seeAll} <Icon name="chevronLeft" className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
