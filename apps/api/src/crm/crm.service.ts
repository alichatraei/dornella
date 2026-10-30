import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { SettingsService } from '../settings/settings.service';
import { isMobile, normalizePhone } from '../common/utils/phone';
import { AudienceDto, CampaignDto, ImportContactsDto, UpdateContactDto } from './crm.dto';

const PAID = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

@Injectable()
export class CrmService {
  private readonly log = new Logger('CRM');

  constructor(private prisma: PrismaService, private sms: SmsService, private settings: SettingsService) {}

  /** آمار خرید هر مخاطب: تعداد سفارش پرداخت‌شده، جمع خرید و آخرین خرید */
  private async stats(userIds: string[]) {
    if (!userIds.length) return new Map<string, { orders: number; spent: number; lastOrderAt: Date | null }>();
    const rows = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: { in: [...PAID] } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });
    return new Map(rows.map((r) => [r.userId, { orders: r._count._all, spent: r._sum.total || 0, lastOrderAt: r._max.createdAt }]));
  }

  private async audienceWhere(a: AudienceDto, forSms = false): Promise<Prisma.UserWhereInput> {
    const and: Prisma.UserWhereInput[] = [{ role: 'USER' }];
    if (forSms) and.push({ smsOptIn: true, isActive: true });
    if (a.ids?.length) and.push({ id: { in: a.ids } });
    if (a.search) {
      and.push({ OR: [{ name: { contains: a.search, mode: 'insensitive' } }, { phone: { contains: normalizePhone(a.search) || a.search } }] });
    }
    if (a.tag) and.push({ tags: { has: a.tag } });
    if (a.city) and.push({ city: { contains: a.city, mode: 'insensitive' } });

    const paidOrder = { status: { in: [...PAID] } } as Prisma.OrderWhereInput;
    if (a.segment === 'buyers') and.push({ orders: { some: paidOrder } });
    if (a.segment === 'never') and.push({ orders: { none: paidOrder } });
    if (a.segment === 'inactive') {
      const since = new Date(Date.now() - (a.inactiveDays || 60) * 86400000);
      and.push({ orders: { some: paidOrder } }, { orders: { none: { ...paidOrder, createdAt: { gte: since } } } });
    }
    if (a.minSpent) {
      const rows = await this.prisma.order.groupBy({
        by: ['userId'], where: { status: { in: [...PAID] } }, _sum: { total: true },
        having: { total: { _sum: { gte: a.minSpent } } },
      });
      and.push({ id: { in: rows.map((r) => r.userId) } });
    }
    return { AND: and };
  }

  async contacts(a: AudienceDto & { page?: number; limit?: number }) {
    const page = Math.max(1, Number(a.page) || 1);
    const limit = Math.min(200, Number(a.limit) || 50);
    const where = await this.audienceWhere(a);
    const [users, total, reachable] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { AND: [where, { smsOptIn: true, isActive: true }] } }),
    ]);
    const stats = await this.stats(users.map((u) => u.id));
    const items = users.map(({ passwordHash, ...u }) => ({ ...u, ...(stats.get(u.id) || { orders: 0, spent: 0, lastOrderAt: null }) }));
    return { items, total, reachable, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async overview() {
    const now = Date.now();
    const [total, optedIn, last30, buyers, tagsRows] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'USER', smsOptIn: true, isActive: true } }),
      this.prisma.user.count({ where: { role: 'USER', createdAt: { gte: new Date(now - 30 * 86400000) } } }),
      this.prisma.user.count({ where: { role: 'USER', orders: { some: { status: { in: [...PAID] } } } } }),
      this.prisma.user.findMany({ where: { role: 'USER', NOT: { tags: { isEmpty: true } } }, select: { tags: true } }),
    ]);
    const tags = [...new Set(tagsRows.flatMap((r) => r.tags))].sort();
    return { total, optedIn, last30, buyers, tags, smsProvider: this.sms.providerName, smsReady: this.sms.enabled };
  }

  async contact(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, total: true, kind: true, createdAt: true } },
      },
    });
    if (!user) throw new NotFoundException('مخاطب پیدا نشد');
    const { passwordHash, ...rest } = user;
    const stats = (await this.stats([id])).get(id) || { orders: 0, spent: 0, lastOrderAt: null };
    const sms = await this.prisma.smsLog.findMany({ where: { phone: user.phone }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...rest, ...stats, sms };
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const data = { ...dto, ...(dto.tags ? { tags: [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))] } : {}) };
    const { passwordHash, ...rest } = await this.prisma.user.update({ where: { id }, data });
    return rest;
  }

  /** ورود دستی شماره‌ها (مثلاً از دفترچه تماس یا دایرکت اینستاگرام)، هر خط یک شماره و اختیاری نام */
  async importContacts(dto: ImportContactsDto) {
    let added = 0;
    let existing = 0;
    let invalid = 0;
    for (const raw of dto.text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const match = line.match(/[+0-9۰-۹٠-٩][0-9۰-۹٠-٩\s-]{8,}/);
      const phone = match ? normalizePhone(match[0]) : '';
      if (!isMobile(phone)) { invalid++; continue; }
      const name = line.replace(match[0], '').replace(/[,،;\t]/g, ' ').trim() || null;
      const found = await this.prisma.user.findUnique({ where: { phone } });
      if (found) {
        existing++;
        if (dto.tag && !found.tags.includes(dto.tag)) {
          await this.prisma.user.update({ where: { id: found.id }, data: { tags: { push: dto.tag } } });
        }
        continue;
      }
      await this.prisma.user.create({ data: { phone, name, source: 'import', tags: dto.tag ? [dto.tag] : [] } });
      added++;
    }
    return { added, existing, invalid };
  }

  async exportCsv(a: AudienceDto) {
    const users = await this.prisma.user.findMany({ where: await this.audienceWhere(a), orderBy: { createdAt: 'desc' } });
    const stats = await this.stats(users.map((u) => u.id));
    const head = ['phone', 'name', 'city', 'tags', 'sms_opt_in', 'paid_orders', 'total_spent', 'last_order', 'joined'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = users.map((u) => {
      const s = stats.get(u.id);
      return [u.phone, u.name, u.city, u.tags.join('|'), u.smsOptIn, s?.orders || 0, s?.spent || 0,
        s?.lastOrderAt?.toISOString().slice(0, 10) || '', u.createdAt.toISOString().slice(0, 10)].map(esc).join(',');
    });
    return '﻿' + [head.join(','), ...lines].join('\n');
  }

  async preview(a: AudienceDto) {
    return { count: await this.prisma.user.count({ where: await this.audienceWhere(a, true) }) };
  }

  campaigns() {
    return this.prisma.smsCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async createCampaign(dto: CampaignDto) {
    const users = await this.prisma.user.findMany({ where: await this.audienceWhere(dto.audience, true), select: { phone: true } });
    if (!users.length) throw new BadRequestException('هیچ مخاطبی با این فیلتر پیدا نشد');
    const footer = await this.settings.get('sms_footer', 'لغو۱۱');
    const message = footer && !dto.message.includes(footer) ? `${dto.message.trim()}\n${footer}` : dto.message.trim();

    const campaign = await this.prisma.smsCampaign.create({
      data: { title: dto.title, message, audience: dto.audience as any, recipients: users.length, status: 'SENDING' },
    });

    // ارسال در پس‌زمینه تا درخواست مدیر منتظر نماند
    this.sms
      .sendBulk(users.map((u) => u.phone), message)
      .then((r) =>
        this.prisma.smsCampaign.update({
          where: { id: campaign.id },
          data: { sent: r.sent, failed: r.failed, error: r.error, status: r.failed && !r.sent ? 'FAILED' : 'DONE', finishedAt: new Date() },
        }),
      )
      .catch((e) => this.log.error(e));

    return campaign;
  }
}
