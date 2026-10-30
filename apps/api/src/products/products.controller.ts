import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { BulkProductDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/** قیمت خرید فقط برای مدیر است و نباید در پاسخ‌های عمومی بیاید */
const hideCost = <T extends { costPrice?: number }>(p: T) => {
  const { costPrice, ...rest } = p;
  return rest;
};

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    query.includeInactive = undefined; // فقط مسیر مدیر محصولات غیرفعال را می‌بیند
    return this.service.findAll(query).then((r) => ({ ...r, items: r.items.map(hideCost) }));
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.service.findAll({ ...query, includeInactive: 'true' });
  }

  @Get('facets')
  facets() {
    return this.service.facets();
  }

  @Get('collections')
  collections() {
    return this.service.collections();
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findBySlug(slug).then(hideCost);
  }

  @Get(':slug/related')
  related(@Param('slug') slug: string) {
    return this.service.related(slug).then((list) => list.map(hideCost));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  bulk(@Body() dto: BulkProductDto) {
    return this.service.bulk(dto);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
