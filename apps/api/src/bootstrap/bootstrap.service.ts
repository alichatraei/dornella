import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/utils/phone';

export const DEFAULT_SHIPPING = [
  {
    code: 'isfahan', title: 'ارسال داخل استان اصفهان', description: 'با پیک یا تیپاکس، ۱ تا ۲ روز کاری',
    cost: 50000, scope: 'ONLY' as const, province: 'اصفهان', sortOrder: 1,
  },
  {
    code: 'post', title: 'پست پیشتاز (شهرستان‌ها)', description: '۳ تا ۵ روز کاری، با کد رهگیری',
    cost: 150000, scope: 'EXCEPT' as const, province: 'اصفهان', sortOrder: 2,
  },
];

/** با هر بار بالا آمدن سرور: حساب مدیر و روش‌های ارسال پیش‌فرض اگر نبودند ساخته می‌شوند */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly log = new Logger('Bootstrap');

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureAdmin();
      await this.ensureShipping();
    } catch (e: any) {
      this.log.error(`راه‌اندازی اولیه انجام نشد: ${e?.message || e}`);
    }
  }

  private async ensureAdmin() {
    const phone = normalizePhone(process.env.ADMIN_PHONE || '09135459772');
    const email = (process.env.ADMIN_EMAIL || 'admin@dornela.ir').toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const found = await this.prisma.user.findFirst({ where: { OR: [{ phone }, { email }] } });

    if (!found) {
      if (!password) return this.log.warn('ADMIN_PASSWORD تعریف نشده؛ حساب مدیر ساخته نشد');
      await this.prisma.user.create({
        data: { phone, email, name: 'مدیر درنلا', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 10), smsOptIn: false },
      });
      return this.log.log(`حساب مدیر ساخته شد: ${email} / ${phone}`);
    }
    if (found.role !== 'ADMIN' || !found.passwordHash || process.env.ADMIN_RESET_PASSWORD === 'true') {
      await this.prisma.user.update({
        where: { id: found.id },
        data: {
          role: 'ADMIN',
          ...(password && (!found.passwordHash || process.env.ADMIN_RESET_PASSWORD === 'true')
            ? { passwordHash: await bcrypt.hash(password, 10) }
            : {}),
        },
      });
      this.log.log('دسترسی حساب مدیر به‌روز شد');
    }
  }

  private async ensureShipping() {
    if ((await this.prisma.shippingMethod.count()) > 0) return;
    await this.prisma.shippingMethod.createMany({ data: DEFAULT_SHIPPING });
    this.log.log('روش‌های ارسال پیش‌فرض ساخته شد');
  }
}
