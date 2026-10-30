import Link from 'next/link';
import { mediaUrl } from '@/lib/api';
import type { Category } from '@/lib/types';

/** دسته‌بندی‌ها به شکل دایره‌های هایلایت اینستاگرامی */
export default function CategoryStrip({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:justify-center sm:gap-7 sm:px-0">
      {categories.map((c) => (
        <Link key={c.id} href={`/category/${c.slug}`} className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center sm:w-24">
          <span className="rounded-full bg-gradient-to-tr from-pink-500 via-pink-300 to-amber-200 p-[2.5px] transition group-hover:scale-105">
            <span className="block rounded-full bg-white p-[3px]">
              <img src={mediaUrl(c.image)} alt="" className="h-[62px] w-[62px] rounded-full bg-pink-50 object-cover sm:h-20 sm:w-20" />
            </span>
          </span>
          <span className="text-xs font-semibold leading-5 text-ink group-hover:text-pink-600">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
