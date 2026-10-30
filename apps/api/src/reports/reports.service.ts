import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** سفارش‌هایی که پولشان تأیید شده و در محاسبه فروش و سود می‌آیند */
const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED,
];

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 29 * 86400000);
    const end = to ? new Date(to) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async summary(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const window = { createdAt: { gte: start, lte: end } };

    const paidOrders = await this.prisma.order.findMany({
      where: { status: { in: PAID_STATUSES }, ...window },
      include: { items: true },
    });

    const revenue = paidOrders.reduce((sum, o) => sum + o.subtotal - o.couponDiscount, 0);
    const cost = paidOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
      0,
    );
    const itemsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    const [totalOrders, pendingPayment, paymentReview, processing, holding, customers, newCustomers] = await this.prisma.$transaction([
      this.prisma.order.count({ where: window }),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.AWAITING_DEPOSIT, OrderStatus.AWAITING_PAYMENT] } } }),
      this.prisma.order.count({ where: { status: OrderStatus.PAYMENT_REVIEW } }),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] } } }),
      this.prisma.order.count({ where: { status: OrderStatus.HOLDING } }),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'USER', ...window } }),
    ]);

    return {
      range: { from: start, to: end },
      revenue,
      cost,
      profit: revenue - cost,
      profitMargin: revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0,
      paidOrders: paidOrders.length,
      totalOrders,
      itemsSold,
      averageOrderValue: paidOrders.length ? Math.round(revenue / paidOrders.length) : 0,
      pendingPayment,
      paymentReview,
      processing,
      holding,
      customers,
      newCustomers,
    };
  }

  /** کلید روز به وقت تهران، تا فروش بعد از نیمه‌شب در روز درست بیفتد */
  private dayKey(d: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(d);
  }

  async salesChart(days = 14) {
    const start = new Date(Date.now() - (days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: start } },
      include: { items: true },
    });

    const buckets = new Map<string, { revenue: number; profit: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = this.dayKey(new Date(start.getTime() + i * 86400000));
      buckets.set(d, { revenue: 0, profit: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = this.dayKey(o.paidAt || o.createdAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      const revenue = o.subtotal - o.couponDiscount;
      const cost = o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0);
      bucket.revenue += revenue;
      bucket.profit += revenue - cost;
      bucket.orders += 1;
    }
    return [...buckets].map(([date, v]) => ({ date, ...v }));
  }

  async topProducts(limit = 8) {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId', 'title'],
      where: { order: { status: { in: PAID_STATUSES } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    // محصول‌های حذف‌شده productId ندارند و نباید وارد شرط in شوند
    const productIds = grouped.map((g) => g.productId).filter((id): id is string => !!id);

    const items = await this.prisma.orderItem.findMany({
      where: { order: { status: { in: PAID_STATUSES } }, productId: { in: productIds } },
      select: { productId: true, unitPrice: true, unitCost: true, quantity: true },
    });

    return grouped.map((g) => {
      const rows = items.filter((i) => i.productId === g.productId);
      const revenue = rows.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const profit = rows.reduce((s, i) => s + (i.unitPrice - i.unitCost) * i.quantity, 0);
      return { productId: g.productId, title: g.title, sold: g._sum.quantity || 0, revenue, profit };
    });
  }

  async lowStock(threshold = 3) {
    const variants = await this.prisma.productVariant.findMany({
      where: { stock: { lte: threshold }, product: { isActive: true } },
      include: { product: { select: { id: true, title: true, slug: true } } },
      orderBy: { stock: 'asc' },
      take: 20,
    });
    return variants.map((v) => ({
      productId: v.product.id, title: v.product.title, size: v.size, color: v.color, stock: v.stock,
    }));
  }
}
