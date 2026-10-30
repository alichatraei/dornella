const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

/** ارقام فارسی/عربی را لاتین می‌کند و شماره را به شکل 09xxxxxxxxx درمی‌آورد */
export function normalizePhone(input: string) {
  let s = String(input || '')
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[^\d+]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  return s;
}

export const isMobile = (phone: string) => /^09\d{9}$/.test(phone);

export const roundToman = (value: number, step = 1000) => Math.round(value / step) * step;

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/** ترتیب طبیعی سایزها: S, M, L… و سایزهای عددی از کوچک به بزرگ */
export function sizeRank(size: string) {
  const s = latin(size).trim().toUpperCase();
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
}

export const bySize = <T extends { size: string }>(a: T, b: T) => sizeRank(a.size) - sizeRank(b.size);
