import type { Metadata } from 'next';
import ProductListing from '@/components/shop/ProductListing';
import { t } from '@/dictionary';

export const metadata: Metadata = {
  title: t.list.allTitle,
  description: 'همه مدل‌های لباس دخترانه درنلا با فیلتر سایز، رنگ و قیمت.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <ProductListing title={searchParams.collection || t.list.allTitle} searchParams={searchParams} />;
}
