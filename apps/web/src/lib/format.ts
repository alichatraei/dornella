const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const toFa = (value: string | number | null | undefined) =>
  String(value ?? '').replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/** ارقام فارسی و عربی را لاتین می‌کند (برای ورودی‌های عددی) */
export const toEn = (value: string) =>
  String(value || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const digitsOnly = (value: string) => toEn(value).replace(/\D/g, '');

export const price = (value: number) => toFa(new Intl.NumberFormat('en-US').format(Math.round(value || 0)));

export const faDate = (input?: string | Date | null, withTime = false) => {
  if (!input) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Tehran',
  }).format(new Date(input));
};

export const faShortDate = (input?: string | Date | null) =>
  input ? new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(input)) : '—';

/** «۳ روز و ۵ ساعت» تا یک تاریخ */
export const timeLeft = (until?: string | Date | null) => {
  if (!until) return '';
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 'تمام شده';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${toFa(d)} روز${h ? ` و ${toFa(h)} ساعت` : ''}`;
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${toFa(h)} ساعت و ${toFa(m)} دقیقه` : `${toFa(m)} دقیقه`;
};

export const percentOff = (base: number, final: number) => (base > final ? Math.round(((base - final) / base) * 100) : 0);

export const totalStock = (variants: { stock: number }[] = []) => variants.reduce((s, v) => s + v.stock, 0);

export const formatCard = (card: string) => toFa(digitsOnly(card).replace(/(\d{4})(?=\d)/g, '$1-'));
