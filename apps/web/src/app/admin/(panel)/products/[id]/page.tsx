'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';
import { PageHead } from '@/components/admin/ui';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Product>(`/products/id/${params.id}`, { auth: true }).then(setProduct).catch((e) => setError(e.message));
  }, [params.id]);

  if (!product) return <p className="text-sm text-ink-muted">{error || 'یک لحظه…'}</p>;
  return (
    <>
      <PageHead title={product.title} actions={<Link href={`/products/${product.slug}`} target="_blank" className="btn-outline btn-sm">دیدن در سایت</Link>} />
      <ProductForm product={product} />
    </>
  );
}
