import { BadRequestException, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { SettingsService } from '../settings/settings.service';
import { ZarinpalService } from './zarinpal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const site = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const apiPublic = () => (process.env.PUBLIC_URL || site()).replace(/\/$/, '');

@Controller('payments')
export class PaymentsController {
  constructor(
    private prisma: PrismaService,
    private orders: OrdersService,
    private settings: SettingsService,
    private zarinpal: ZarinpalService,
  ) {}

  @Get('methods')
  async methods() {
    return {
      card: await this.settings.flag('card_payment_enabled'),
      zarinpal: this.zarinpal.configured && (await this.settings.flag('zarinpal_enabled')),
    };
  }

  @Post('zarinpal/:orderId')
  @UseGuards(JwtAuthGuard)
  async start(@Param('orderId') orderId: string, @CurrentUser('id') userId: string) {
    if (!(await this.settings.flag('zarinpal_enabled'))) throw new BadRequestException('پرداخت آنلاین فعلاً فعال نیست');
    const { order, purpose, amount } = await this.orders.payableFor(orderId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const label = purpose === 'DEPOSIT' ? 'بیعانه سبد ۱۰ روزه' : purpose === 'BALANCE' ? 'مانده فاکتور' : 'سفارش';
    const { authority, url } = await this.zarinpal.request({
      amountToman: amount,
      description: `${label} ${order.orderNumber} - درنلا`,
      callbackUrl: `${apiPublic()}/api/payments/zarinpal/callback`,
      mobile: user?.phone,
    });
    await this.prisma.payment.create({
      data: { orderId, purpose, method: 'ZARINPAL', amount, authority, status: 'PENDING' },
    });
    return { url };
  }

  @Get('zarinpal/callback')
  async callback(@Query('Authority') authority: string, @Query('Status') status: string, @Res() res: Response) {
    const payment = authority ? await this.prisma.payment.findUnique({ where: { authority } }) : null;
    if (!payment) return res.redirect(`${site()}/account/orders?payment=failed`);
    const back = (state: string) => res.redirect(`${site()}/orders/${payment.orderId}?payment=${state}`);

    if (payment.status === 'APPROVED') return back('ok');
    if (status !== 'OK') {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REJECTED', adminNote: 'پرداخت توسط کاربر لغو شد' } });
      return back('canceled');
    }

    const result = await this.zarinpal.verify(authority, payment.amount);
    if (!result.ok) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REJECTED', adminNote: 'تأیید درگاه ناموفق بود' } });
      return back('failed');
    }

    // جلوگیری از ثبت دوباره در صورت رفرش صفحه بازگشت
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'APPROVED', refId: result.refId, cardPan: result.cardPan, paidAt: new Date() },
    });
    if (claimed.count === 1) {
      await this.orders.applyApprovedPayment(await this.prisma.payment.findUnique({ where: { id: payment.id } }));
    }
    return back('ok');
  }
}
