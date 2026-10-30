import { BadRequestException, Injectable, Logger } from '@nestjs/common';

/** درگاه زرین‌پال (API نسخه ۴). مبلغ‌ها در سایت تومان‌اند و برای درگاه به ریال تبدیل می‌شوند */
@Injectable()
export class ZarinpalService {
  private readonly log = new Logger('Zarinpal');
  private readonly merchant = process.env.ZARINPAL_MERCHANT_ID || '';
  private readonly host = process.env.ZARINPAL_SANDBOX === 'true' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';

  get configured() {
    return !!this.merchant;
  }

  async request(input: { amountToman: number; description: string; callbackUrl: string; mobile?: string }) {
    if (!this.configured) throw new BadRequestException('درگاه زرین‌پال هنوز تنظیم نشده است');
    const res = await fetch(`${this.host}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchant,
        amount: input.amountToman * 10,
        description: input.description,
        callback_url: input.callbackUrl,
        metadata: input.mobile ? { mobile: input.mobile } : undefined,
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (data?.data?.code !== 100 || !data.data.authority) {
      this.log.error(JSON.stringify(data?.errors || data));
      throw new BadRequestException('اتصال به درگاه برقرار نشد. چند دقیقه دیگر دوباره امتحان کنید');
    }
    const authority: string = data.data.authority;
    return { authority, url: `${this.host}/pg/StartPay/${authority}` };
  }

  async verify(authority: string, amountToman: number) {
    const res = await fetch(`${this.host}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ merchant_id: this.merchant, amount: amountToman * 10, authority }),
    });
    const data: any = await res.json().catch(() => null);
    const code = data?.data?.code;
    if (code === 100 || code === 101) {
      return { ok: true, refId: String(data.data.ref_id), cardPan: data.data.card_pan as string | undefined };
    }
    this.log.warn(`verify failed ${authority}: ${JSON.stringify(data?.errors || data)}`);
    return { ok: false };
  }
}
