import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_SETTINGS: Record<string, string> = {
  shop_name: 'درنلا',
  support_phone: '09135459772',
  support_hours: 'شنبه تا پنجشنبه، ۱۰ صبح تا ۸ شب',
  address: 'اصفهان',
  instagram: 'dornela.shop',
  bale_channel: 'https://ble.ir/dornela',
  bale_popup_enabled: 'true',
  bale_popup_text: 'اگر اینترنت بین‌الملل قطع شد، از کانال بله ما جا نمانید. مدل‌های جدید و تخفیف‌ها را آنجا هم می‌گذاریم.',
  announcement: 'ارسال به سراسر ایران · داخل استان اصفهان با پیک',
  card_number: '6037-9911-2233-4455',
  card_holder: 'درنلا',
  bank_name: 'بانک ملی',
  card_payment_enabled: 'true',
  zarinpal_enabled: 'false',
  hold_enabled: 'true',
  hold_days: '10',
  deposit_type: 'FIXED',
  deposit_value: '200000',
  unpaid_cancel_hours: '48',
  free_shipping_from: '0',
  enamad_html: '',
  zarinpal_badge_html: '',
  sms_footer: 'لغو۱۱',
};

/** کلیدهایی که برای بازدیدکننده سایت قابل خواندن است */
const PUBLIC_KEYS = Object.keys(DEFAULT_SETTINGS);

@Injectable()
export class SettingsService {
  private cache: { at: number; map: Record<string, string> } | null = null;

  constructor(private prisma: PrismaService) {}

  async all() {
    if (this.cache && Date.now() - this.cache.at < 15_000) return this.cache.map;
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, string> = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => (map[r.key] = r.value));
    this.cache = { at: Date.now(), map };
    return map;
  }

  async publicSettings() {
    const all = await this.all();
    return Object.fromEntries(PUBLIC_KEYS.map((k) => [k, all[k] ?? '']));
  }

  async get(key: string, fallback = '') {
    const all = await this.all();
    return all[key] ?? fallback;
  }

  async number(key: string, fallback = 0) {
    const n = Number(await this.get(key, String(fallback)));
    return Number.isFinite(n) ? n : fallback;
  }

  async flag(key: string) {
    return (await this.get(key, 'false')) === 'true';
  }

  async setMany(values: Record<string, string>) {
    for (const [key, value] of Object.entries(values)) {
      if (!PUBLIC_KEYS.includes(key)) continue;
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value ?? '') },
        update: { value: String(value ?? '') },
      });
    }
    this.cache = null;
    return this.publicSettings();
  }
}
