import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roundToman } from '../common/utils/phone';
import { CouponDto } from './coupon.dto';

const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  private data(dto: CouponDto) {
    if (dto.type === 'PERCENT' && dto.value > 100) throw new BadRequestException('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
    return {
      ...dto,
      code: dto.code.toUpperCase(),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }

  async create(dto: CouponDto) {
    try {
      return await this.prisma.coupon.create({ data: this.data(dto) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('این کد قبلاً ساخته شده است');
      throw e;
    }
  }

  async update(id: string, dto: CouponDto) {
    await this.ensure(id);
    return this.prisma.coupon.update({ where: { id }, data: this.data(dto) });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'کد تخفیف حذف شد' };
  }

  private async ensure(id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('کد تخفیف پیدا نشد');
    return c;
  }

  /** بررسی اعتبار کد و محاسبه مبلغ تخفیف روی جمع کالاها */
  async evaluate(rawCode: string, subtotal: number, userId: string, tx: Prisma.TransactionClient = this.prisma) {
    const code = rawCode.trim().toUpperCase();
    const coupon = await tx.coupon.findUnique({ where: { code } });
    const now = new Date();
    if (!coupon || !coupon.isActive) throw new BadRequestException('این کد تخفیف معتبر نیست');
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('زمان استفاده از این کد هنوز نرسیده است');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException('مهلت استفاده از این کد تمام شده است');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('ظرفیت این کد تخفیف پر شده است');
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      throw new BadRequestException(`این کد برای خریدهای بالای ${fmt(coupon.minOrder)} تومان است`);
    }
    if (coupon.perUserLimit) {
      const used = await tx.order.count({ where: { userId, couponId: coupon.id, status: { not: 'CANCELED' } } });
      if (used >= coupon.perUserLimit) throw new BadRequestException('شما قبلاً از این کد استفاده کرده‌اید');
    }
    return { coupon, discount: this.amount(coupon, subtotal) };
  }

  amount(coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>, subtotal: number) {
    let discount = coupon.type === 'PERCENT' ? roundToman((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    return Math.max(0, Math.min(discount, subtotal));
  }
}
