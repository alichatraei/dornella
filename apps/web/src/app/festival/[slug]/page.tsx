import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductListing from '@/components/shop/ProductListing';
import FestivalBanner from '@/components/shop/FestivalBanner';
import { safeApi } from '@/lib/api';
import { t } from '@/dictionary';
import type { Festival } from '@/lib/types';

type Props = { params: { slug: string }; searchParams: Record<string, string | undefined> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = await safeApi<Festival | null>(`/festivals/${params.slug}`, null, 120);
  return f ? { title: f.title, description: f.description || f.bannerText || undefined, alternates: { canonical: `/festival/${f.slug}` } } : {};
}

export default async function FestivalPage({ params, searchParams }: Props) {
  const f = await safeApi<Festival | null>(`/festivals/${params.slug}`, null, 60);
  if (!f) notFound();
  const live = new Date(f.endsAt) > new Date() && new Date(f.startsAt) <= new Date();
  return (
    <ProductListing
      title={f.title}
      searchParams={searchParams}
      fixed={{ festival: f.slug }}
      header={<div className="mb-8">{live ? <FestivalBanner festival={f} /> : <p className="alert-info">{t.festival.ended}</p>}</div>}
    />
  );
}
