import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductListing from '@/components/shop/ProductListing';
import { safeApi } from '@/lib/api';
import type { Category } from '@/lib/types';

type Props = { params: { slug: string }; searchParams: Record<string, string | undefined> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await safeApi<Category | null>(`/categories/${params.slug}`, null, 300);
  if (!c) return {};
  return {
    title: `خرید ${c.name} دخترانه`,
    description: c.description || `مدل‌های ${c.name} دخترانه درنلا با ارسال به سراسر ایران.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await safeApi<Category | null>(`/categories/${params.slug}`, null, 120);
  if (!c) notFound();
  return <ProductListing title={c.name} searchParams={searchParams} fixed={{ category: c.slug }} />;
}
