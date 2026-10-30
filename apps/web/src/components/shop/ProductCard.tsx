import Link from 'next/link';
import { mediaUrl } from '@/lib/api';
import { totalStock } from '@/lib/format';
import Price from '../ui/Price';
import { t } from '@/dictionary';
import type { Product } from '@/lib/types';

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const stock = totalStock(product.variants);
  const [first, second] = product.images || [];
  const colors = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()].slice(0, 4);

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-pink-50">
          <img src={mediaUrl(first?.url)} alt={first?.alt || product.title} loading={priority ? 'eager' : 'lazy'}
            className={`h-full w-full object-cover transition duration-500 ${second ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'} ${stock === 0 ? 'opacity-60 grayscale-[40%]' : ''}`} />
          {second && (
            <img src={mediaUrl(second.url)} alt="" aria-hidden loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
            {product.festival && <span className="chip bg-pink-500 text-white shadow-sm">{t.nav.sale}</span>}
            {stock === 0 && <span className="chip bg-ink/80 text-white">{t.product.soldOut}</span>}
          </div>
        </div>
      </Link>
      <div className="mt-3 px-0.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-ink">
          <Link href={`/products/${product.slug}`} className="hover:text-pink-600">{product.title}</Link>
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Price base={product.price} final={product.finalPrice ?? product.price} compareAt={product.compareAtPrice} size="sm" />
          {colors.length > 1 && (
            <span className="flex -space-x-1 space-x-reverse">
              {colors.map(([name, hex]) => (
                <span key={name} title={name} className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-line" style={{ background: hex || '#eee' }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
