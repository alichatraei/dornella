import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteMedia, safeApi, SITE_URL } from '@/lib/api';
import { t } from '@/dictionary';
import { totalStock } from '@/lib/format';
import AddToCart from '@/components/shop/AddToCart';
import ProductGallery from '@/components/shop/ProductGallery';
import ProductGrid from '@/components/shop/ProductGrid';
import SectionHead from '@/components/shop/SectionHead';
import Price from '@/components/ui/Price';
import Countdown from '@/components/ui/Countdown';
import Icon from '@/components/ui/Icon';
import type { Product } from '@/lib/types';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await safeApi<Product | null>(`/products/${params.slug}`, null, 60);
  if (!p) return { title: t.product.notFound };
  const description = p.metaDescription || p.shortDescription || p.description.slice(0, 160);
  return {
    title: p.metaTitle || p.title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: 'website', title: p.title, description, images: p.images[0] ? [{ url: absoluteMedia(p.images[0].url) }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await safeApi<Product | null>(`/products/${params.slug}`, null, 30);
  if (!product) notFound();
  const related = await safeApi<Product[]>(`/products/${params.slug}/related`, [], 120);
  const stock = totalStock(product.variants);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || product.description,
    image: product.images.map((i) => absoluteMedia(i.url)),
    brand: { '@type': 'Brand', name: t.brand.name },
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'IRR',
      price: (product.finalPrice ?? product.price) * 10,
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="wrap py-5 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted" aria-label="مسیر">
        <Link href="/" className="hover:text-pink-600">{t.brand.name}</Link>
        <Icon name="chevronLeft" className="h-3 w-3" />
        <Link href="/products" className="hover:text-pink-600">{t.product.breadcrumbProducts}</Link>
        {product.category && (
          <>
            <Icon name="chevronLeft" className="h-3 w-3" />
            <Link href={`/category/${product.category.slug}`} className="hover:text-pink-600">{product.category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} title={product.title} />

        <div>
          {product.collection && (
            <Link href={`/products?collection=${encodeURIComponent(product.collection)}`} className="text-xs font-semibold text-pink-600">
              {product.collection}
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-extrabold leading-10">{product.title}</h1>

          <div className="mt-4">
            <Price base={product.price} final={product.finalPrice ?? product.price} compareAt={product.compareAtPrice} size="lg" />
          </div>

          {product.festival && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pink-50 p-3 ring-1 ring-pink-100">
              <Link href={`/festival/${product.festival.slug}`} className="text-sm font-bold text-pink-700">
                {t.product.festivalOff(product.festival.title, product.festival.percent)}
              </Link>
              <Countdown until={product.festival.endsAt} />
            </div>
          )}

          {product.shortDescription && <p className="mt-5 text-sm leading-8 text-ink-soft">{product.shortDescription}</p>}

          <div className="mt-6 border-t border-line pt-6">
            <AddToCart product={product} />
          </div>

          <ul className="mt-6 space-y-2.5 rounded-2xl bg-white p-4 text-[13px] text-ink-soft ring-1 ring-line">
            <li className="flex items-center gap-2.5"><Icon name="truck" className="h-[18px] w-[18px] text-pink-500" />{t.product.shippingNote}</li>
            <li className="flex items-center gap-2.5"><Icon name="refresh" className="h-[18px] w-[18px] text-pink-500" />{t.product.exchangeNote}</li>
            <li className="flex items-center gap-2.5"><Icon name="calendar" className="h-[18px] w-[18px] text-pink-500" />{t.product.holdNote}</li>
          </ul>

          <section className="mt-8">
            <h2 className="mb-3 font-extrabold">{t.product.description}</h2>
            <div className="whitespace-pre-line text-sm leading-8 text-ink-soft">{product.description}</div>
            {product.material && (
              <dl className="mt-4 flex gap-2 text-sm">
                <dt className="text-ink-muted">{t.product.material}:</dt>
                <dd className="font-semibold">{product.material}</dd>
              </dl>
            )}
          </section>

          {product.sizeGuide && (
            <section id="size-guide" className="mt-8 scroll-mt-32">
              <h2 className="mb-3 font-extrabold">{t.product.sizeGuide}</h2>
              <div className="whitespace-pre-line rounded-2xl bg-pink-50/60 p-4 text-sm leading-8">{product.sizeGuide}</div>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHead title={t.product.related} />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
