import { Suspense } from 'react';
import { safeApi } from '@/lib/api';
import { t } from '@/dictionary';
import ProductGrid from './ProductGrid';
import ProductFilters from './ProductFilters';
import Pagination from './Pagination';
import type { Category, Paginated, Product } from '@/lib/types';

type Search = Record<string, string | undefined>;
const KEYS = ['search', 'category', 'collection', 'size', 'color', 'sort', 'page', 'inStock'];

/** فهرست محصولات با فیلتر؛ در صفحه همه محصولات، دسته‌بندی و جشنواره استفاده می‌شود */
export default async function ProductListing({
  title, subtitle, searchParams, fixed = {}, header,
}: { title: string; subtitle?: string; searchParams: Search; fixed?: Record<string, string>; header?: React.ReactNode }) {
  const query = new URLSearchParams({ limit: '24' });
  KEYS.forEach((k) => searchParams[k] && query.set(k, searchParams[k]!));
  Object.entries(fixed).forEach(([k, v]) => query.set(k, v));

  const [data, facets, categories] = await Promise.all([
    safeApi<Paginated<Product>>(`/products?${query}`, { items: [], total: 0, page: 1, limit: 24, pages: 1 }, 30),
    safeApi<{ sizes: string[]; colors: { name: string; hex?: string }[] }>('/products/facets', { sizes: [], colors: [] }, 120),
    safeApi<Category[]>('/categories', [], 120),
  ]);

  return (
    <div className="wrap py-6 sm:py-10">
      {header}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="h-title">{searchParams.search ? t.list.searchFor(searchParams.search) : title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{subtitle || t.list.count(data.total)}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense>
          <div className="space-y-5 lg:sticky lg:top-36 lg:h-fit">
            <ProductFilters facets={facets} categories={categories} showCategory={!fixed.category} />
          </div>
        </Suspense>

        <section>
          {data.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-pink-200 bg-white px-6 py-16 text-center">
              <h2 className="font-bold">{t.list.empty}</h2>
              <p className="mt-2 text-sm text-ink-muted">{t.list.emptyHint}</p>
            </div>
          ) : (
            <>
              <ProductGrid products={data.items} cols={3} />
              <Pagination page={data.page} pages={data.pages} baseQuery={searchParams} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
