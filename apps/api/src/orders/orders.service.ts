import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Payment, PaymentPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PricingService } from '../festivals/pricing.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { SmsService } from '../sms/sms.service';
import { roundToman } from '../common/utils/phone';
import { notifyText } from './notify';
import {
  AddItemsDto, CardPaymentDto, CreateOrderDto, OrderItemDto, ReviewPaymentDto, UpdateOrderStatusDto,
} from './dto/order.dto';

type Tx = Prisma.TransactionClient;

export const orderInclude = {
  items: { orderBy: { addedAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'desc' as const } },
  user: { select: { id: true, name: true, phone: true } },
};

/** وضعیت‌هایی که هنوز پولی نهایی نشده و مشتری می‌تواند پرداخت کند */
const PAYABLE: OrderStatus[] = ['AWAITING_DEPOSIT', 'AWAITING_PAYMENT', 'PAYMENT_REVIEW'];
const OPEN_HOLD: OrderStatus[] = ['AWAITING_DEPOSIT', 'HOLDING'];

@Injectable()
export class OrdersService {
  private readonly log = new Logger('Orders');

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private pricing: PricingService,
    private coupons: CouponsService,
    private shipping: ShippingService,
    private sms: SmsService,
  ) {}

  // ───────────── محاسبات ─────────────

  /** مبلغی که مشتری الان باید بپردازد و بابت چه چیزی */
  due(order: Pick<Order, 'status' | 'kind' | 'depositAmount' | 'paidAmount' | 'total'>) {
    if (order.status === 'AWAITING_DEPOSIT' || (order.status === 'PAYMENT_REVIEW' && order.kind === 'HOLD' && order.paidAmount === 0)) {
      return { purpose: 'DEPOSIT' as PaymentPurpose, amount: Math.max(0, order.depositAmount - order.paidAmount) };
    }
    if (order.status === 'AWAITING_PAYMENT' || order.status === 'PAYMENT_REVIEW') {
      return { purpose: (order.kind === 'HOLD' ? 'BALANCE' : 'FULL') as PaymentPurpose, amount: Math.max(0, order.total - order.paidAmount) };
    }
    return { purpose: null, amount: 0 };
  }

  private serialize<T extends Order>(order: T) {
    return { ...order, due: this.due(order) };
  }

  private async depositFor(total: number) {
    const type = await this.settings.get('deposit_type', 'FIXED');
    const value = await this.settings.number('deposit_value', 200000);
    const amount = type === 'PERCENT' ? roundToman((total * value) / 100) : value;
    return Math.max(1000, Math.min(amount, total));
  }

  private orderNumber() {
    const d = new Date();
    const stamp = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `DN${stamp}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /** کالاها را با قیمت روز (با احتساب جشنواره) آماده می‌کند و موجودی را رزرو می‌کند */
  private async reserve(tx: Tx, items: OrderItemDto[]) {
    const merged = new Map<string, OrderItemDto>();
    for (const item of items) {
      const prev = merged.get(item.variantId);
      merged.set(item.variantId, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
    }

    const lines: Omit<Prisma.OrderItemCreateManyInput, 'orderId'>[] = [];
    for (const item of merged.values()) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { images: { orderBy: { position: 'asc' }, take: 1 }, variants: true },
      });
      if (!product || !product.isActive) throw new BadRequestException('یکی از کالاهای سبد دیگر فروخته نمی‌شود. سبد را به‌روز کنید');
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) throw new BadRequestException(`سایز انتخابی «${product.title}» دیگر موجود نیست`);

      // کم کردن شرطی موجودی، تا دو خرید هم‌زمان آخرین عدد را با هم برندارند
      const updated = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          variant.stock > 0
            ? `از «${product.title}» سایز ${variant.size} فقط ${variant.stock} عدد مانده است`
            : `«${product.title}» سایز ${variant.size} تمام شد`,
        );
      }

      const priced = await this.pricing.priceOf(product);
      lines.push({
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        slug: product.slug,
        image: product.images[0]?.url,
        size: variant.size,
        color: variant.color,
        basePrice: product.price,
        unitPrice: priced.finalPrice,
        unitCost: product.costPrice,
        quantity: item.quantity,
      });
    }
    return lines;
  }

  private async restock(tx: Tx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
    }
  }

  /** بعد از هر تغییر در اقلام، جمع‌ها دوباره حساب می‌شوند */
  private async recalc(tx: Tx, orderId: string) {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, coupon: true } });
    const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const festivalDiscount = order.items.reduce((s, i) => s + (i.basePrice - i.unitPrice) * i.quantity, 0);
    const couponDiscount = order.coupon ? this.coupons.amount(order.coupon, subtotal) : 0;
    return tx.order.update({
      where: { id: orderId },
      data: { subtotal, festivalDiscount, couponDiscount, total: subtotal - couponDiscount + order.shippingCost },
    });
  }

  // ───────────── مشتری ─────────────

  async create(userId: string, dto: CreateOrderDto) {
    if (dto.kind === 'HOLD') {
      if (!(await this.settings.flag('hold_enabled'))) throw new BadRequestException('سبد ۱۰ روزه فعلاً فعال نیست');
      const open = await this.prisma.order.findFirst({ where: { userId, kind: 'HOLD', status: { in: OPEN_HOLD } } });
      if (open) {
        throw new BadRequestException(`شما یک سبد ۱۰ روزه باز دارید (${open.orderNumber}). کالاهای جدید را به همان اضافه کنید`);
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const lines = await this.reserve(tx, dto.items);
      const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const festivalDiscount = lines.reduce((s, l) => s + (l.basePrice - l.unitPrice) * l.quantity, 0);

      let couponId: string | undefined;
      let couponDiscount = 0;
      if (dto.couponCode?.trim()) {
        const { coupon, discount } = await this.coupons.evaluate(dto.couponCode, subtotal, userId, tx);
        couponId = coupon.id;
        couponDiscount = discount;
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }

      const { method, cost } = await this.shipping.quote(dto.shippingCode, dto.province, subtotal, tx);
      const total = subtotal - couponDiscount + cost;
      const isHold = dto.kind === 'HOLD';

      return tx.order.create({
        data: {
          orderNumber: this.orderNumber(),
          kind: dto.kind,
          status: isHold ? 'AWAITING_DEPOSIT' : 'AWAITING_PAYMENT',
          userId,
          subtotal,
          festivalDiscount,
          couponDiscount,
          couponId,
          couponCode: couponId ? dto.couponCode.trim().toUpperCase() : null,
          shippingCode: method.code,
          shippingTitle: method.title,
          shippingCost: cost,
          total,
          depositAmount: isHold ? await this.depositFor(total) : 0,
          receiverName: dto.receiverName.trim(),
          receiverPhone: dto.receiverPhone,
          province: dto.province,
          city: dto.city.trim(),
          postalCode: dto.postalCode,
          addressLine: dto.addressLine.trim(),
          note: dto.note?.trim() || null,
          items: { createMany: { data: lines } },
        },
        include: orderInclude,
      });
    });

    await this.prisma.user.update({ where: { id: userId }, data: { city: dto.city.trim(), ...(await this.nameIfEmpty(userId, dto.receiverName)) } });
    return this.serialize(order);
  }

  private async nameIfEmpty(userId: string, name: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return u?.name ? {} : { name: name.trim() };
  }

  async activeHold(userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { userId, kind: 'HOLD', status: { in: [...OPEN_HOLD, 'PAYMENT_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
    });
    return order ? this.serialize(order) : null;
  }

  async addItems(orderId: string, userId: string, dto: AddItemsDto) {
    const order = await this.ownOrder(orderId, userId);
    if (order.kind !== 'HOLD' || !OPEN_HOLD.includes(order.status)) {
      throw new BadRequestException('به این سفارش دیگر نمی‌شود کالا اضافه کرد');
    }
    if (order.status === 'HOLDING' && order.holdUntil && order.holdUntil < new Date()) {
      throw new BadRequestException('مهلت ۱۰ روزه این سبد تمام شده است');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const lines = await this.reserve(tx, dto.items);
      for (const line of lines) {
        const existing = await tx.orderItem.findFirst({ where: { orderId, variantId: line.variantId, unitPrice: line.unitPrice } });
        if (existing) await tx.orderItem.update({ where: { id: existing.id }, data: { quantity: { increment: line.quantity } } });
        else await tx.orderItem.create({ data: { ...line, orderId } });
      }
      await this.recalc(tx, orderId);
      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    });
    return this.serialize(updated);
  }

  async removeItem(orderId: string, itemId: string, userId: string) {
    const order = await this.ownOrder(orderId, userId);
    if (order.kind !== 'HOLD' || !OPEN_HOLD.includes(order.status)) {
      throw new BadRequestException('اقلام این سفارش دیگر قابل تغییر نیست');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({ where: { id: itemId, orderId } });
      if (!item) throw new NotFoundException('این کالا در سبد نیست');
      const count = await tx.orderItem.count({ where: { orderId } });
      if (count <= 1) throw new BadRequestException('سبد نمی‌تواند خالی شود. اگر منصرف شده‌اید با پشتیبانی تماس بگیرید');
      if (item.variantId) {
        await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      await tx.orderItem.delete({ where: { id: item.id } });
      const after = await this.recalc(tx, orderId);
      if (after.total < after.paidAmount) {
        throw new BadRequestException('جمع سبد نمی‌تواند از بیعانه پرداخت‌شده کمتر شود');
      }
      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    });
    return this.serialize(updated);
  }

  /** مشتری خودش زودتر از ۱۰ روز سبد را می‌بندد و فاکتور نهایی را می‌گیرد */
  async closeHold(orderId: string, userId: string) {
    const order = await this.ownOrder(orderId, userId);
    if (order.kind !== 'HOLD' || order.status !== 'HOLDING') throw new BadRequestException('این سبد باز نیست');
    return this.serialize(await this.finishHold(order.id));
  }

  private async finishHold(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    const fullyPaid = order.paidAmount >= order.total;
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: fullyPaid ? 'PAID' : 'AWAITING_PAYMENT',
        holdClosedAt: new Date(),
        ...(fullyPaid ? { paidAt: new Date() } : {}),
      },
      include: orderInclude,
    });
    await this.notify(updated, fullyPaid ? 'paid' : 'holdClosed');
    return updated;
  }

  findMine(userId: string) {
    return this.prisma.order
      .findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: orderInclude })
      .then((list) => list.map((o) => this.serialize(o)));
  }

  async findOne(id: string, user: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (user.role !== 'ADMIN' && order.userId !== user.id) throw new ForbiddenException('این سفارش متعلق به شما نیست');
    return this.serialize(order);
  }

  private async ownOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (order.userId !== userId) throw new ForbiddenException('این سفارش متعلق به شما نیست');
    return order;
  }

  /** آماده‌سازی پرداخت: مبلغ و هدف پرداخت را برمی‌گرداند یا خطا می‌دهد */
  async payableFor(orderId: string, userId: string) {
    const order = await this.ownOrder(orderId, userId);
    if (!PAYABLE.includes(order.status)) throw new BadRequestException('این سفارش الان پرداختی ندارد');
    const due = this.due(order);
    if (!due.purpose || due.amount <= 0) throw new BadRequestException('مبلغی برای پرداخت باقی نمانده است');
    return { order, ...due };
  }

  async submitCardPayment(orderId: string, userId: string, dto: CardPaymentDto) {
    if (!(await this.settings.flag('card_payment_enabled'))) throw new BadRequestException('پرداخت کارت‌به‌کارت فعلاً فعال نیست');
    const { order, purpose } = await this.payableFor(orderId, userId);

    const data = {
      imageUrl: dto.imageUrl,
      amount: dto.amount,
      payerName: dto.payerName,
      trackingCode: dto.trackingCode,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      status: 'PENDING' as const,
      adminNote: null,
    };
    const pending = await this.prisma.payment.findFirst({
      where: { orderId, method: 'CARD', status: 'PENDING', purpose },
    });
    if (pending) await this.prisma.payment.update({ where: { id: pending.id }, data });
    else await this.prisma.payment.create({ data: { ...data, orderId, purpose, method: 'CARD' } });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_REVIEW' },
      include: orderInclude,
    });
    return this.serialize(updated);
  }

  /** ثبت نهایی یک پرداخت تأییدشده (کارت‌به‌کارت با تأیید مدیر یا زرین‌پال) */
  async applyApprovedPayment(payment: Payment) {
    const order = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    const paidAmount = order.paidAmount + payment.amount;
    let data: Prisma.OrderUpdateInput;
    let event: keyof typeof notifyText;

    if (payment.purpose === 'DEPOSIT') {
      const days = await this.settings.number('hold_days', 10);
      const holdUntil = new Date(Date.now() + days * 86400000);
      data = { paidAmount, status: 'HOLDING', holdUntil };
      event = 'holdStarted';
    } else if (paidAmount >= order.total) {
      data = { paidAmount, status: 'PAID', paidAt: new Date() };
      event = 'paid';
    } else {
      data = { paidAmount, status: 'AWAITING_PAYMENT' };
      event = null;
    }

    const updated = await this.prisma.order.update({ where: { id: order.id }, data, include: orderInclude });
    if (event) await this.notify(updated, event);
    return updated;
  }

  async cancelByUser(orderId: string, userId: string) {
    const order = await this.ownOrder(orderId, userId);
    if (!PAYABLE.includes(order.status) || order.paidAmount > 0) {
      throw new BadRequestException('این سفارش دیگر از طرف شما لغو نمی‌شود. با پشتیبانی تماس بگیرید');
    }
    return this.serialize(await this.cancel(orderId));
  }

  private async cancel(orderId: string, adminNote?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (order.status === 'CANCELED') return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
      await this.restock(tx, orderId);
      if (order.couponId) {
        await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'REJECTED', adminNote: 'سفارش لغو شد' } });
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED', ...(adminNote ? { adminNote } : {}) },
        include: orderInclude,
      });
    });
  }

  // ───────────── مدیر ─────────────

  async findAllAdmin(query: { status?: OrderStatus; kind?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 25);
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind === 'HOLD' || query.kind === 'NORMAL' ? { kind: query.kind } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { receiverName: { contains: query.search, mode: 'insensitive' } },
              { receiverPhone: { contains: query.search } },
              { user: { phone: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: orderInclude }),
      this.prisma.order.count({ where }),
    ]);
    const counts: { status: OrderStatus; count: bigint }[] = await this.prisma.$queryRaw`
      SELECT status, COUNT(*)::bigint AS count FROM "Order" GROUP BY status`;
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, Number(c.count)]));
    return { items: items.map((o) => this.serialize(o)), total, page, limit, pages: Math.ceil(total / limit) || 1, byStatus };
  }

  async reviewPayment(paymentId: string, dto: ReviewPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('پرداخت پیدا نشد');
    if (payment.status !== 'PENDING') throw new BadRequestException('این پرداخت قبلاً بررسی شده است');

    if (dto.status === 'APPROVED') {
      const approved = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED', adminNote: dto.adminNote },
      });
      return this.serialize(await this.applyApprovedPayment(approved));
    }

    await this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'REJECTED', adminNote: dto.adminNote } });
    const back: OrderStatus = payment.purpose === 'DEPOSIT' ? 'AWAITING_DEPOSIT' : 'AWAITING_PAYMENT';
    const updated = await this.prisma.order.update({ where: { id: payment.orderId }, data: { status: back }, include: orderInclude });
    await this.notify(updated, 'rejected');
    return this.serialize(updated);
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');

    if (dto.status === 'CANCELED') return this.serialize(await this.cancel(orderId, dto.adminNote));
    if (order.status === 'HOLDING' && dto.status === 'AWAITING_PAYMENT') return this.serialize(await this.finishHold(orderId));

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.trackingNumber !== undefined ? { trackingNumber: dto.trackingNumber || null } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote || null } : {}),
        ...(dto.status === 'PAID' && !order.paidAt ? { paidAt: new Date() } : {}),
      },
      include: orderInclude,
    });
    if (dto.status === 'SHIPPED' && order.status !== 'SHIPPED') await this.notify(updated, 'shipped');
    return this.serialize(updated);
  }

  async extendHold(orderId: string, days: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'HOLDING') throw new BadRequestException('فقط سبد باز را می‌شود تمدید کرد');
    const base = order.holdUntil && order.holdUntil > new Date() ? order.holdUntil : new Date();
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { holdUntil: new Date(base.getTime() + days * 86400000), reminderSentAt: null },
      include: orderInclude,
    });
    return this.serialize(updated);
  }

  // ───────────── کارهای زمان‌بندی‌شده ─────────────

  async runScheduledJobs() {
    const now = new Date();

    // ۱) سبدهایی که مهلتشان تمام شده به مرحله پرداخت می‌روند
    const expired = await this.prisma.order.findMany({ where: { status: 'HOLDING', holdUntil: { lt: now } }, select: { id: true } });
    for (const o of expired) await this.finishHold(o.id).catch((e) => this.log.error(e));

    // ۲) یادآوری یک روز مانده به پایان مهلت
    const soon = await this.prisma.order.findMany({
      where: { status: 'HOLDING', reminderSentAt: null, holdUntil: { gte: now, lt: new Date(now.getTime() + 86400000) } },
    });
    for (const o of soon) {
      await this.prisma.order.update({ where: { id: o.id }, data: { reminderSentAt: now } });
      await this.notify(o, 'holdReminder');
    }

    // ۳) سفارش‌هایی که هیچ پرداختی نداشتند بعد از مهلت تعیین‌شده لغو می‌شوند تا موجودی آزاد شود
    const hours = await this.settings.number('unpaid_cancel_hours', 48);
    if (hours > 0) {
      const stale = await this.prisma.order.findMany({
        where: {
          status: { in: ['AWAITING_DEPOSIT', 'AWAITING_PAYMENT'] },
          paidAmount: 0,
          createdAt: { lt: new Date(now.getTime() - hours * 3600_000) },
          payments: { none: { status: 'PENDING' } },
        },
        select: { id: true },
      });
      for (const o of stale) await this.cancel(o.id, 'لغو خودکار: پرداختی انجام نشد').catch((e) => this.log.error(e));
    }

    // ۴) کدهای ورود قدیمی پاک می‌شوند
    await this.prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 3600_000) } } });
  }

  private async notify(order: Order & { user?: { phone: string } }, event: keyof typeof notifyText) {
    try {
      const phone = order.user?.phone || (await this.prisma.user.findUnique({ where: { id: order.userId } }))?.phone;
      if (phone) await this.sms.send(phone, notifyText[event](order), `order-${event}`);
    } catch (e) {
      this.log.warn(`پیامک ${event} برای ${order.orderNumber} ارسال نشد`);
    }
  }
}
