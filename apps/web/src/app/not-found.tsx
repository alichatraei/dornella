import Link from 'next/link';
import { t } from '@/dictionary';

export default function NotFound() {
  return (
    <div className="wrap py-24 text-center">
      <p className="text-6xl font-extrabold text-pink-200">۴۰۴</p>
      <h1 className="mt-4 h-title">{t.pages.notFoundTitle}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t.pages.notFoundText}</p>
      <Link href="/products" className="btn-primary mt-8">{t.cart.browse}</Link>
    </div>
  );
}
