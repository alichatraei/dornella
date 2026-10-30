import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShippingMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ShippingMethodDto } from './shipping.dto';

const same = (a?: string | null, b?: string | null) => (a || '').trim() === (b || '').trim();

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService, private settings: SettingsService) {}

  available(m: ShippingMethod, province?: string) {
    if (!province) return true;
    if (m.scope === 'ONLY') return same(m.province, province);
    if (m.scope === 'EXCEPT') return !same(m.province, province);
    return true;
  }

  async list(province?: string) {
    const methods = await this.prisma.shippingMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    return methods.filter((m) => this.available(m, province));
  }

  listAll() {
    return this.prisma.shippingMethod.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /** هزینه ارسال یک روش برای یک استان؛ ارسال رایگان اگر در تنظیمات سقفی تعیین شده باشد */
  async quote(code: string, province: string, subtotal: number, tx: Prisma.TransactionClient = this.prisma) {
    const method = await tx.shippingMethod.findUnique({ where: { code } });
    if (!method || !method.isActive) throw new BadRequestException('روش ارسال انتخاب‌شده در دسترس نیست');
    if (!this.available(method, province)) throw new BadRequestException(`«${method.title}» برای استان ${province} نیست`);
    const freeFrom = await this.settings.number('free_shipping_from', 0);
    const cost = freeFrom > 0 && subtotal >= freeFrom ? 0 : method.cost;
    return { method, cost };
  }

  create(dto: ShippingMethodDto) {
    return this.prisma.shippingMethod.create({ data: dto });
  }

  async update(id: string, dto: ShippingMethodDto) {
    const found = await this.prisma.shippingMethod.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('روش ارسال پیدا نشد');
    return this.prisma.shippingMethod.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.shippingMethod.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('روش ارسال پیدا نشد');
    });
    return { message: 'روش ارسال حذف شد' };
  }
}
