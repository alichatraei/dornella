import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { FestivalDto } from './festival.dto';

@Injectable()
export class FestivalsService {
  constructor(private prisma: PrismaService, private pricing: PricingService) {}

  async active() {
    const now = new Date();
    return this.prisma.festival.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      select: { id: true, title: true, slug: true, description: true, bannerText: true, percent: true, startsAt: true, endsAt: true },
    });
  }

  async bySlug(slug: string) {
    const f = await this.prisma.festival.findUnique({
      where: { slug },
      select: {
        id: true, title: true, slug: true, description: true, bannerText: true, percent: true,
        startsAt: true, endsAt: true, isActive: true, allProducts: true, categoryIds: true,
        products: { select: { id: true } },
      },
    });
    if (!f || !f.isActive) throw new NotFoundException('این جشنواره پیدا نشد');
    const { products, ...rest } = f;
    return { ...rest, productIds: products.map((p) => p.id) };
  }

  listAdmin() {
    return this.prisma.festival.findMany({
      orderBy: { startsAt: 'desc' },
      include: { products: { select: { id: true, title: true } } },
    });
  }

  private data(dto: FestivalDto) {
    const { productIds, slug, ...rest } = dto;
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) throw new BadRequestException('تاریخ پایان باید بعد از تاریخ شروع باشد');
    return { ...rest, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) };
  }

  async create(dto: FestivalDto) {
    const base = dto.slug?.trim() || slugify(dto.title, { lower: true, strict: true }) || `festival-${Date.now()}`;
    let slug = base;
    for (let i = 2; await this.prisma.festival.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const created = await this.prisma.festival.create({
      data: { ...this.data(dto), slug, products: { connect: (dto.productIds || []).map((id) => ({ id })) } },
    });
    this.pricing.invalidate();
    return created;
  }

  async update(id: string, dto: FestivalDto) {
    await this.ensure(id);
    const updated = await this.prisma.festival.update({
      where: { id },
      data: {
        ...this.data(dto),
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.productIds ? { products: { set: dto.productIds.map((pid) => ({ id: pid })) } } : {}),
      },
    });
    this.pricing.invalidate();
    return updated;
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.festival.delete({ where: { id } });
    this.pricing.invalidate();
    return { message: 'جشنواره حذف شد' };
  }

  private async ensure(id: string) {
    const f = await this.prisma.festival.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('جشنواره پیدا نشد');
    return f;
  }
}
