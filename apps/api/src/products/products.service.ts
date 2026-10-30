import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../festivals/pricing.service';
import { bySize, roundToman, sizeRank } from '../common/utils/phone';
import { BulkProductDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';

const listInclude = {
  images: { orderBy: { position: 'asc' as const } },
  variants: true,
  category: { select: { id: true, name: true, slug: true } },
};

const sortVariants = <T extends { variants: { size: string }[] }>(p: T) => ({ ...p, variants: [...p.variants].sort(bySize) });

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private pricing: PricingService) {}

  private async uniqueSlug(title: string, custom?: string, exceptId?: string) {
    const fromTitle = title.trim().replace(/[\s‌]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
    const base = (custom && custom.trim()) || fromTitle || slugify(title, { lower: true, strict: true }) || 'product';
    let slug = base;
    for (let i = 2; ; i++) {
      const found = await this.prisma.product.findUnique({ where: { slug } });
      if (!found || found.id === exceptId) return slug;
      slug = `${base}-${i}`;
    }
  }

  private async festivalWhere(slug: string): Promise<Prisma.ProductWhereInput> {
    const f = await this.prisma.festival.findUnique({ where: { slug }, include: { products: { select: { id: true } } } });
    if (!f) return { id: '__none__' };
    if (f.allProducts) return {};
    return {
      OR: [
        { id: { in: f.products.map((p) => p.id) } },
        ...(f.categoryIds.length ? [{ categoryId: { in: f.categoryIds } }] : []),
      ],
    };
  }

  async findAll(q: ProductQueryDto) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(q.limit) || 12));
    const and: Prisma.ProductWhereInput[] = [];

    if (q.includeInactive !== 'true') and.push({ isActive: true });
    if (q.featured === 'true') and.push({ isFeatured: true });
    if (q.category) and.push({ category: { slug: q.category } });
    if (q.collection) and.push({ collection: q.collection });
    if (q.festival) and.push(await this.festivalWhere(q.festival));
    if (q.inStock === 'true') and.push({ variants: { some: { stock: { gt: 0 } } } });
    if (q.search) {
      and.push({
        OR: [
          { title: { contains: q.search, mode: 'insensitive' } },
          { description: { contains: q.search, mode: 'insensitive' } },
          { collection: { contains: q.search, mode: 'insensitive' } },
        ],
      });
    }
    if (q.minPrice || q.maxPrice) {
      and.push({ price: { gte: Number(q.minPrice) || 0, lte: Number(q.maxPrice) || 999_999_999 } });
    }
    if (q.size || q.color) {
      and.push({ variants: { some: { ...(q.size ? { size: q.size } : {}), ...(q.color ? { color: q.color } : {}), stock: { gt: 0 } } } });
    }

    const where: Prisma.ProductWhereInput = { AND: and };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      q.sort === 'cheapest' ? { price: 'asc' }
      : q.sort === 'expensive' ? { price: 'desc' }
      : q.sort === 'popular' ? { viewCount: 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: listInclude }),
      this.prisma.product.count({ where }),
    ]);

    return { items: await this.pricing.decorate(items.map(sortVariants)), total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug: decodeURIComponent(slug) }, include: listInclude });
    if (!product || !product.isActive) throw new NotFoundException('این محصول پیدا نشد');
    this.prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);
    return this.pricing.priceOf(sortVariants(product));
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: listInclude });
    if (!product) throw new NotFoundException('محصول پیدا نشد');
    return this.pricing.priceOf(sortVariants(product));
  }

  async related(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug: decodeURIComponent(slug) } });
    if (!product) return [];
    const items = await this.prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [{ categoryId: product.categoryId }, ...(product.collection ? [{ collection: product.collection }] : [])],
      },
      take: 4,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.pricing.decorate(items.map(sortVariants));
  }

  async collections() {
    const rows = await this.prisma.product.groupBy({
      by: ['collection'],
      where: { isActive: true, collection: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });
    return rows.filter((r) => r.collection).map((r) => ({ name: r.collection, count: r._count._all }));
  }

  private variantData(variants: CreateProductDto['variants'] = []) {
    return variants
      .filter((v) => v.size?.trim() && v.color?.trim())
      .map(({ id, ...v }) => ({ ...v, size: v.size.trim(), color: v.color.trim(), sku: v.sku || null }));
  }

  async create(dto: CreateProductDto) {
    const { images = [], variants = [], slug, ...data } = dto;
    const product = await this.prisma.product.create({
      data: {
        ...data,
        description: data.description || '',
        slug: await this.uniqueSlug(dto.title, slug),
        images: { create: images.map((img, i) => ({ url: img.url, alt: img.alt || dto.title, position: i })) },
        variants: { create: this.variantData(variants) },
      },
      include: listInclude,
    });
    return this.pricing.priceOf(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!current) throw new NotFoundException('محصول پیدا نشد');
    const { images, variants, slug, ...data } = dto;

    const product = await this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img, i) => ({ url: img.url, alt: img.alt || current.title, productId: id, position: i })),
        });
      }
      if (variants) {
        // واریانت‌های موجود به‌روز می‌شوند تا پیوند آن‌ها با سفارش‌های قبلی و سبدهای ۱۰ روزه نشکند
        const keep = variants.filter((v) => v.id && current.variants.some((c) => c.id === v.id));
        const fresh = variants.filter((v) => !v.id || !current.variants.some((c) => c.id === v.id));
        await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keep.map((v) => v.id!) } } });
        for (const v of keep) {
          const [row] = this.variantData([v]);
          if (row) await tx.productVariant.update({ where: { id: v.id }, data: row });
        }
        const rows = this.variantData(fresh);
        if (rows.length) await tx.productVariant.createMany({ data: rows.map((r) => ({ ...r, productId: id })) });
      }
      return tx.product.update({
        where: { id },
        data: { ...data, ...(slug && slug !== current.slug ? { slug: await this.uniqueSlug(current.title, slug, id) } : {}) },
        include: listInclude,
      });
    });
    return this.pricing.priceOf(product);
  }

  async duplicate(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, include: { images: true, variants: true } });
    if (!p) throw new NotFoundException('محصول پیدا نشد');
    const { id: _, slug, createdAt, updatedAt, viewCount, images, variants, ...rest } = p;
    const title = `${p.title} (کپی)`;
    return this.prisma.product.create({
      data: {
        ...rest,
        title,
        isActive: false,
        slug: await this.uniqueSlug(title),
        images: { create: images.map(({ url, alt, position }) => ({ url, alt, position })) },
        variants: { create: variants.map(({ size, color, colorHex }) => ({ size, color, colorHex, stock: 0 })) },
      },
    });
  }

  async bulk(dto: BulkProductDto) {
    const { ids, priceChangePercent, ...fields } = dto;
    const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''));
    if (Object.keys(data).length) await this.prisma.product.updateMany({ where: { id: { in: ids } }, data });
    if (priceChangePercent) {
      const rows = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
      for (const r of rows) {
        await this.prisma.product.update({
          where: { id: r.id },
          data: { price: Math.max(1000, roundToman(r.price * (1 + priceChangePercent / 100))) },
        });
      }
    }
    return { updated: ids.length };
  }

  async remove(id: string) {
    await this.findById(id);
    const sold = await this.prisma.orderItem.count({ where: { productId: id } });
    if (sold > 0) {
      // محصولی که فروش داشته حذف نمی‌شود تا گزارش‌ها خراب نشوند؛ فقط از فروشگاه برداشته می‌شود
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      return { message: 'این محصول سابقه فروش دارد؛ به‌جای حذف، از فروشگاه برداشته شد' };
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: 'محصول حذف شد' };
  }

  async facets() {
    const variants = await this.prisma.productVariant.findMany({
      where: { stock: { gt: 0 }, product: { isActive: true } },
      select: { size: true, color: true, colorHex: true },
    });
    const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));
    const colorsMap = new Map<string, string | null>();
    variants.forEach((v) => colorsMap.set(v.color, v.colorHex));
    return { sizes, colors: [...colorsMap].map(([name, hex]) => ({ name, hex })) };
  }
}
