import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

export default function ProductGrid({ products, cols = 4 }: { products: Product[]; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 ${cols === 4 ? 'lg:grid-cols-4' : ''}`}>
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
    </div>
  );
}
