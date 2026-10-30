import type { MetadataRoute } from 'next';
import { safeApi, SITE_URL } from '@/lib/api';
import type { Category, Paginated, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    safeApi<Paginated<Product>>('/products?limit=60', { items: [], total: 0, page: 1, limit: 60, pages: 1 }, 3600),
    safeApi<Category[]>('/categories', [], 3600),
  ]);
  const now = new Date();
  return [
    ...['', '/products', '/club', '/about', '/contact', '/faq', '/rules'].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, priority: p ? 0.6 : 1 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, lastModified: now, priority: 0.8 })),
    ...products.items.map((p) => ({ url: `${SITE_URL}/products/${encodeURIComponent(p.slug)}`, lastModified: new Date(p.createdAt || now), priority: 0.9 })),
  ];
}
