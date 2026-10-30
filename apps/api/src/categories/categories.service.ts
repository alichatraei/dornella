import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private makeSlug(input: string) {
    return slugify(input, { lower: true, strict: true, locale: 'fa' }) || `cat-${Date.now()}`;
  }

  findAll(onlyActive = true) {
    return this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('دسته‌بندی پیدا نشد');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { ...dto, slug: dto.slug || this.makeSlug(dto.name) },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensure(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'دسته‌بندی حذف شد' };
  }

  private async ensure(id: string) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('دسته‌بندی پیدا نشد');
    return found;
  }
}
