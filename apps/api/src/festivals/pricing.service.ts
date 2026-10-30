import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { roundToman } from '../common/utils/phone';

type ActiveFestival = {
  id: string; title: string; slug: string; percent: number; endsAt: Date;
  allProducts: boolean; categoryIds: string[]; productIds: Set<string>;
};

export type PricedFields = {
  finalPrice: number;
  festival: { title: string; slug: string; percent: number; endsAt: Date } | null;
};

/** قیمت نهایی هر محصول را با در نظر گرفتن جشنواره‌های فعال حساب می‌کند */
@Injectable()
export class PricingService {
  private cache: { at: number; list: ActiveFestival[] } | null = null;

  constructor(private prisma: PrismaService) {}

  invalidate() {
    this.cache = null;
  }

  async active(): Promise<ActiveFestival[]> {
    if (this.cache && Date.now() - this.cache.at < 30_000) return this.cache.list;
    const now = new Date();
    const rows = await this.prisma.festival.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { products: { select: { id: true } } },
      orderBy: { percent: 'desc' },
    });
    const list = rows.map((f) => ({
      id: f.id, title: f.title, slug: f.slug, percent: f.percent, endsAt: f.endsAt,
      allProducts: f.allProducts, categoryIds: f.categoryIds, productIds: new Set(f.products.map((p) => p.id)),
    }));
    this.cache = { at: Date.now(), list };
    return list;
  }

  private match(list: ActiveFestival[], p: { id: string; categoryId?: string | null }) {
    // فهرست به ترتیب درصد نزولی است؛ اولین جشنواره منطبق بیشترین تخفیف را دارد
    return list.find(
      (f) => f.allProducts || f.productIds.has(p.id) || (!!p.categoryId && f.categoryIds.includes(p.categoryId)),
    );
  }

  async priceOf<T extends { id: string; price: number; categoryId?: string | null }>(p: T): Promise<T & PricedFields> {
    return (await this.decorate([p]))[0];
  }

  async decorate<T extends { id: string; price: number; categoryId?: string | null }>(products: T[]): Promise<(T & PricedFields)[]> {
    const list = await this.active();
    return products.map((p) => {
      const f = this.match(list, p);
      if (!f) return { ...p, finalPrice: p.price, festival: null };
      const finalPrice = Math.max(1000, roundToman(p.price * (1 - f.percent / 100)));
      return { ...p, finalPrice, festival: { title: f.title, slug: f.slug, percent: f.percent, endsAt: f.endsAt } };
    });
  }
}
