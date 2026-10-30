import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileTabBar from '@/components/layout/MobileTabBar';
import BaleModal from '@/components/layout/BaleModal';
import { safeApi, SITE_URL } from '@/lib/api';
import { t } from '@/dictionary';
import type { Category, Festival, Settings } from '@/lib/types';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: t.brand.titleDefault, template: `%s | ${t.brand.name}` },
  description: t.brand.description,
  keywords: t.brand.keywords,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'fa_IR', siteName: t.brand.name, title: t.brand.titleDefault, description: t.brand.description, url: '/' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

// صفحه‌ها در هر درخواست با آخرین موجودی و قیمت ساخته می‌شوند (و هنگام build به API نیازی نیست)
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { themeColor: '#E8578C', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, festivals] = await Promise.all([
    safeApi<Settings>('/settings', {}, 60),
    safeApi<Category[]>('/categories', [], 120),
    safeApi<Festival[]>('/festivals/active', [], 60),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: t.brand.name,
    url: SITE_URL,
    telephone: settings.support_phone,
    address: { '@type': 'PostalAddress', addressRegion: 'اصفهان', addressCountry: 'IR' },
  };

  return (
    <html lang="fa" dir="rtl">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers settings={settings}>
          <div className="flex min-h-screen flex-col">
            <Header categories={categories} festival={festivals[0] || null} />
            <main className="flex-1">{children}</main>
            <Footer categories={categories} />
            <MobileTabBar />
          </div>
          <BaleModal />
        </Providers>
      </body>
    </html>
  );
}
