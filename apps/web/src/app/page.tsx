import Link from 'next/link';
import { safeApi, mediaUrl } from '@/lib/api';
import { t } from '@/dictionary';
import { price, toFa } from '@/lib/format';
import ProductGrid from '@/components/shop/ProductGrid';
import SectionHead from '@/components/shop/SectionHead';
import CategoryStrip from '@/components/shop/CategoryStrip';
import FestivalBanner from '@/components/shop/FestivalBanner';
import ClubSignup from '@/components/shop/ClubSignup';
import Icon from '@/components/ui/Icon';
import type { Category, Festival, Paginated, Product, Settings } from '@/lib/types';

const empty: Paginated<Product> = { items: [], total: 0, page: 1, limit: 8, pages: 1 };
const PERK_ICONS = ['truck', 'refresh', 'shield', 'chat'];

export default async function HomePage() {
  const [newest, featured, categories, festivals, collections, settings] = await Promise.all([
    safeApi<Paginated<Product>>('/products?limit=8&sort=newest', empty, 60),
    safeApi<Paginated<Product>>('/products?featured=true&limit=8', empty, 60),
    safeApi<Category[]>('/categories', [], 120),
    safeApi<Festival[]>('/festivals/active', [], 60),
    safeApi<{ name: string; count: number }[]>('/products/collections', [], 120),
    safeApi<Settings>('/settings', {}, 60),
  ]);
  const festival = festivals[0];
  const sale = festival ? await safeApi<Paginated<Product>>(`/products?festival=${festival.slug}&limit=4`, empty, 60) : empty;
  const heroImages = (featured.items.length ? featured.items : newest.items).slice(0, 3);
  const deposit = settings.deposit_type === 'PERCENT' ? `${toFa(settings.deposit_value)}٪` : `${price(Number(settings.deposit_value || 0))} تومان`;
  const holdDays = Number(settings.hold_days || 10);

  return (
    <div className="space-y-14 pb-6 sm:space-y-20">
      {/* بنر اصلی */}
      <section className="bg-gradient-to-b from-pink-50 to-paper">
        <div className="wrap grid items-center gap-8 py-8 md:grid-cols-[1fr_1.1fr] md:py-14">
          <div className="order-2 md:order-1">
            <span className="chip bg-white text-pink-600 ring-1 ring-pink-200">
              <Icon name="sparkle" className="h-3.5 w-3.5" /> {t.home.heroTag}
            </span>
            <h1 className="mt-4 text-[28px] font-extrabold leading-[1.6] sm:text-4xl sm:leading-[1.5]">{t.home.heroTitle}</h1>
            <p className="mt-4 max-w-md text-[15px] leading-8 text-ink-soft">{t.home.heroText}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary btn-lg">{t.home.heroCta}</Link>
              {festival && <Link href={`/festival/${festival.slug}`} className="btn-outline btn-lg">{t.home.heroCta2}</Link>}
            </div>
          </div>
          {heroImages.length > 0 && (
            <div className="order-1 grid grid-cols-[1.25fr_1fr] gap-3 md:order-2">
              <Link href={`/products/${heroImages[0].slug}`} className="row-span-2 overflow-hidden rounded-3xl bg-pink-100">
                <img src={mediaUrl(heroImages[0].images[0]?.url)} alt={heroImages[0].title} className="aspect-[3/4] h-full w-full object-cover" />
              </Link>
              {heroImages.slice(1).map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="overflow-hidden rounded-3xl bg-pink-100">
                  <img src={mediaUrl(p.images[0]?.url)} alt={p.title} className="aspect-square h-full w-full object-cover" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="wrap">
          <CategoryStrip categories={categories} />
        </section>
      )}

      {newest.items.length === 0 && (
        <section className="wrap"><p className="alert-info text-center">{t.home.emptyShop}</p></section>
      )}

      {newest.items.length > 0 && (
        <section className="wrap">
          <SectionHead title={t.home.newTitle} href="/products" />
          <ProductGrid products={newest.items} />
        </section>
      )}

      {festival && (
        <section className="wrap space-y-6">
          <FestivalBanner festival={festival} />
          {sale.items.length > 0 && <ProductGrid products={sale.items} />}
        </section>
      )}

      {/* معرفی سبد ۱۰ روزه */}
      {settings.hold_enabled === 'true' && (
        <section className="wrap">
          <div className="grid gap-8 rounded-3xl border border-line bg-white p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pink-100 text-pink-600"><Icon name="calendar" /></span>
              <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">{t.home.holdTitle}</h2>
              <p className="mt-3 text-sm leading-8 text-ink-soft">{t.home.holdText(deposit, holdDays)}</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {t.home.holdSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 rounded-2xl bg-pink-50/70 p-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-500 text-xs font-bold text-white">{toFa(i + 1)}</span>
                  <span className="text-sm leading-7">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {featured.items.length > 0 && (
        <section className="wrap">
          <SectionHead title={t.home.featuredTitle} href="/products?sort=popular" />
          <ProductGrid products={featured.items} />
        </section>
      )}

      {collections.length > 1 && (
        <section className="wrap">
          <SectionHead title={t.home.collectionsTitle} />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {collections.map((c) => (
              <Link key={c.name} href={`/products?collection=${encodeURIComponent(c.name)}`}
                className="shrink-0 rounded-2xl border border-line bg-white px-5 py-4 hover:border-pink-300">
                <p className="text-sm font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{t.home.collectionCount(c.count)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {t.home.perks.map((perk, i) => (
            <li key={perk.title} className="flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-line sm:flex-row sm:items-start sm:gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600"><Icon name={PERK_ICONS[i]} /></span>
              <span>
                <b className="block text-sm">{perk.title}</b>
                <span className="mt-0.5 block text-xs leading-6 text-ink-muted">{perk.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap">
        <ClubSignup />
      </section>

      {settings.instagram && (
        <section className="wrap">
          <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-l from-pink-500 to-pink-400 p-8 text-center text-white sm:flex-row sm:justify-between sm:text-start">
            <span>
              <b className="block text-lg">{t.home.instagramTitle}</b>
              <span className="mt-1 block text-sm text-pink-50">{t.home.instagramText}</span>
            </span>
            <span className="btn bg-white text-pink-700" dir="ltr"><Icon name="instagram" className="h-5 w-5" /> @{settings.instagram}</span>
          </a>
        </section>
      )}
    </div>
  );
}
