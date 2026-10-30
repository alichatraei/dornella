import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SendResult = { ok: boolean; error?: string };

/**
 * ارسال پیامک با سرویس‌دهنده‌ای که در .env تعیین شده:
 * SMS_PROVIDER = kavenegar | smsir | console
 * در حالت console پیامک فقط در لاگ سرور چاپ می‌شود (برای توسعه).
 */
@Injectable()
export class SmsService {
  private readonly log = new Logger('SMS');
  private readonly provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  private readonly apiKey = process.env.SMS_API_KEY || '';
  private readonly sender = process.env.SMS_SENDER || '';

  constructor(private prisma: PrismaService) {}

  get enabled() {
    return this.provider !== 'console' && !!this.apiKey;
  }

  get providerName() {
    return this.provider;
  }

  /** کد ورود؛ اگر قالب (template) تعریف شده باشد از سرویس اعتبارسنجی استفاده می‌شود که سریع‌تر و بدون فیلتر است */
  async sendOtp(phone: string, code: string) {
    const template = process.env.SMS_OTP_TEMPLATE;
    const text = `کد ورود شما به درنلا: ${code}\nاین کد را به کسی ندهید.`;
    let result: SendResult;

    if (this.provider === 'kavenegar' && template) {
      result = await this.kavenegarLookup(phone, template, code);
    } else if (this.provider === 'smsir' && template) {
      result = await this.smsirVerify(phone, template, code);
    } else {
      result = await this.dispatch([phone], text);
    }
    await this.record(phone, 'otp', text, result);
    return result;
  }

  async send(phone: string, message: string, kind = 'notify') {
    const result = await this.dispatch([phone], message);
    await this.record(phone, kind, message, result);
    return result;
  }

  /** ارسال گروهی در بسته‌های ۱۰۰تایی */
  async sendBulk(phones: string[], message: string) {
    let sent = 0;
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < phones.length; i += 100) {
      const chunk = phones.slice(i, i + 100);
      const result = await this.dispatch(chunk, message);
      if (result.ok) sent += chunk.length;
      else {
        failed += chunk.length;
        lastError = result.error || lastError;
      }
    }
    return { sent, failed, error: lastError || undefined };
  }

  private async dispatch(phones: string[], message: string): Promise<SendResult> {
    try {
      if (this.provider === 'kavenegar') return await this.kavenegarSend(phones, message);
      if (this.provider === 'smsir') return await this.smsirSend(phones, message);
      this.log.log(`(console) → ${phones.join(', ')}\n${message}`);
      return { ok: true };
    } catch (e: any) {
      this.log.error(e?.message || e);
      return { ok: false, error: e?.message || 'ارسال پیامک انجام نشد' };
    }
  }

  private async kavenegarSend(phones: string[], message: string): Promise<SendResult> {
    const body = new URLSearchParams({ receptor: phones.join(','), message });
    if (this.sender) body.set('sender', this.sender);
    const res = await fetch(`https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`, { method: 'POST', body });
    const data: any = await res.json().catch(() => null);
    return data?.return?.status === 200 ? { ok: true } : { ok: false, error: data?.return?.message || `HTTP ${res.status}` };
  }

  private async kavenegarLookup(phone: string, template: string, token: string): Promise<SendResult> {
    const q = new URLSearchParams({ receptor: phone, token, template });
    const res = await fetch(`https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json?${q}`);
    const data: any = await res.json().catch(() => null);
    return data?.return?.status === 200 ? { ok: true } : { ok: false, error: data?.return?.message || `HTTP ${res.status}` };
  }

  private async smsirSend(phones: string[], message: string): Promise<SendResult> {
    const res = await fetch('https://api.sms.ir/v1/send/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
      body: JSON.stringify({ lineNumber: Number(this.sender) || this.sender, messageText: message, mobiles: phones }),
    });
    const data: any = await res.json().catch(() => null);
    return data?.status === 1 ? { ok: true } : { ok: false, error: data?.message || `HTTP ${res.status}` };
  }

  private async smsirVerify(phone: string, templateId: string, code: string): Promise<SendResult> {
    const res = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
      body: JSON.stringify({ mobile: phone, templateId: Number(templateId), parameters: [{ name: 'CODE', value: code }] }),
    });
    const data: any = await res.json().catch(() => null);
    return data?.status === 1 ? { ok: true } : { ok: false, error: data?.message || `HTTP ${res.status}` };
  }

  private record(phone: string, kind: string, message: string, result: SendResult) {
    return this.prisma.smsLog
      .create({ data: { phone, kind, message: kind === 'otp' ? 'کد ورود' : message, ok: result.ok, error: result.error } })
      .catch(() => null);
  }
}
