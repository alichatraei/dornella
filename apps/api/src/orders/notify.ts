const site = () => (process.env.SITE_URL || 'https://dornela.ir').replace(/\/$/, '');
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => `${fa(new Intl.NumberFormat('en-US').format(n))} تومان`;
const day = (d: Date) => new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(d);

type O = { id: string; orderNumber: string; total: number; paidAmount: number; holdUntil?: Date | null; trackingNumber?: string | null };

/** متن پیامک‌های وضعیت سفارش */
export const notifyText = {
  holdStarted: (o: O) =>
    `درنلا: بیعانه سفارش ${fa(o.orderNumber)} تأیید شد. سبد شما تا ${day(o.holdUntil!)} باز است و می‌توانید کالای جدید اضافه کنید.\n${site()}/orders/${o.id}`,
  holdReminder: (o: O) =>
    `درنلا: فردا مهلت سبد ۱۰ روزه شما تمام می‌شود. اگر چیزی مانده، امروز اضافه کنید.\n${site()}/orders/${o.id}`,
  holdClosed: (o: O) =>
    `درنلا: مهلت سبد ${fa(o.orderNumber)} تمام شد و فاکتور نهایی صادر شد. مانده قابل پرداخت: ${toman(o.total - o.paidAmount)}\n${site()}/orders/${o.id}`,
  paid: (o: O) => `درنلا: پرداخت سفارش ${fa(o.orderNumber)} تأیید شد. به‌زودی بسته‌بندی و ارسال می‌شود. ممنون از خریدتان`,
  rejected: (o: O) =>
    `درنلا: فیش سفارش ${fa(o.orderNumber)} تأیید نشد. لطفاً جزئیات را در سایت ببینید یا با ما تماس بگیرید.\n${site()}/orders/${o.id}`,
  shipped: (o: O) =>
    `درنلا: سفارش ${fa(o.orderNumber)} ارسال شد.${o.trackingNumber ? ` کد رهگیری: ${fa(o.trackingNumber)}` : ''}`,
};
