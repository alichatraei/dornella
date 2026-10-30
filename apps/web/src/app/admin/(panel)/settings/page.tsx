'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHead, Toggle } from '@/components/admin/ui';
import { price } from '@/lib/format';

type Field = { key: string; label: string; hint?: string; type?: 'text' | 'textarea' | 'toggle' | 'money' | 'number' | 'select' | 'code'; ltr?: boolean; options?: [string, string][] };
type Group = { title: string; desc?: string; fields: Field[] };

const GROUPS: Group[] = [
  {
    title: 'اطلاعات فروشگاه',
    fields: [
      { key: 'support_phone', label: 'شماره تماس پشتیبانی', ltr: true },
      { key: 'support_hours', label: 'ساعت پاسخ‌گویی' },
      { key: 'address', label: 'نشانی', type: 'textarea' },
      { key: 'instagram', label: 'آیدی اینستاگرام (بدون @)', ltr: true },
      { key: 'announcement', label: 'متن نوار بالای سایت', hint: 'وقتی جشنواره فعال باشد، متن جشنواره جای این را می‌گیرد.' },
    ],
  },
  {
    title: 'کانال بله',
    desc: 'پیامی که بازدیدکننده‌ها با ورود به سایت می‌بینند (هر ۳ روز یک بار).',
    fields: [
      { key: 'bale_popup_enabled', label: 'نمایش پیام عضویت کانال بله', type: 'toggle' },
      { key: 'bale_channel', label: 'لینک کانال بله', ltr: true, hint: 'مثلاً https://ble.ir/dornela' },
      { key: 'bale_popup_text', label: 'متن پیام', type: 'textarea' },
    ],
  },
  {
    title: 'پرداخت',
    fields: [
      { key: 'zarinpal_enabled', label: 'پرداخت آنلاین زرین‌پال', type: 'toggle', hint: 'مرچنت‌کد زرین‌پال باید در فایل ‎.env‎ سرور (ZARINPAL_MERCHANT_ID) تنظیم شده باشد.' },
      { key: 'card_payment_enabled', label: 'کارت‌به‌کارت با ارسال فیش', type: 'toggle' },
      { key: 'card_number', label: 'شماره کارت', ltr: true },
      { key: 'card_holder', label: 'نام صاحب کارت' },
      { key: 'bank_name', label: 'نام بانک' },
      { key: 'unpaid_cancel_hours', label: 'لغو خودکار سفارش بدون پرداخت بعد از (ساعت)', type: 'number', hint: 'صفر یعنی هیچ‌وقت لغو نشود. کالاهای سفارش لغوشده به موجودی برمی‌گردند.' },
    ],
  },
  {
    title: 'سبد ۱۰ روزه',
    fields: [
      { key: 'hold_enabled', label: 'فعال بودن سبد ۱۰ روزه', type: 'toggle' },
      { key: 'hold_days', label: 'مدت نگه‌داری (روز)', type: 'number' },
      { key: 'deposit_type', label: 'نوع بیعانه', type: 'select', options: [['FIXED', 'مبلغ ثابت'], ['PERCENT', 'درصدی از فاکتور']] },
      { key: 'deposit_value', label: 'مقدار بیعانه', type: 'number', hint: 'اگر ثابت است به تومان، اگر درصدی است عدد درصد.' },
    ],
  },
  {
    title: 'ارسال',
    desc: 'هزینه هر روش ارسال در صفحه «روش‌های ارسال» تعیین می‌شود.',
    fields: [{ key: 'free_shipping_from', label: 'ارسال رایگان برای خرید بالای (تومان)', type: 'money', hint: 'صفر یعنی ارسال رایگان نداریم.' }],
  },
  {
    title: 'نمادها',
    desc: 'کد HTML را از پنل اینماد (بخش «کد نماد») و زرین‌پال (نشان اعتماد) کپی کنید و اینجا بگذارید.',
    fields: [
      { key: 'enamad_html', label: 'کد نماد اعتماد الکترونیکی', type: 'code' },
      { key: 'zarinpal_badge_html', label: 'کد نشان زرین‌پال', type: 'code' },
    ],
  },
  {
    title: 'پیامک',
    fields: [{ key: 'sms_footer', label: 'متن انتهای پیامک‌های تبلیغاتی', hint: 'طبق قانون، پیامک تبلیغاتی باید راه لغو داشته باشد. معمولاً «لغو۱۱».' }],
  },
];

export default function SettingsPage() {
  const [v, setV] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => { api<Record<string, string>>('/settings').then(setV).catch(() => null); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setV(await api('/settings', { method: 'PUT', auth: true, body: v }));
      setMsg('تنظیمات ذخیره شد. تا یک دقیقه دیگر روی سایت اعمال می‌شود.');
    } catch (err: any) { setError(err.message); }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    try {
      const r = await api<{ message: string }>('/auth/password', { method: 'PATCH', auth: true, body: pw });
      setPwMsg(r.message);
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err: any) { setPwMsg(err.message); }
  };

  const input = (f: Field) => {
    const val = v[f.key] ?? '';
    const on = (x: string) => setV({ ...v, [f.key]: x });
    if (f.type === 'toggle') return <Toggle checked={val === 'true'} onChange={(b) => on(String(b))} label={f.label} />;
    if (f.type === 'textarea') return <textarea rows={2} className="input" value={val} onChange={(e) => on(e.target.value)} />;
    if (f.type === 'code') return <textarea rows={3} className="input font-mono text-xs" dir="ltr" value={val} onChange={(e) => on(e.target.value)} placeholder="<a referrerpolicy='origin' ...>" />;
    if (f.type === 'select') return <select className="input" value={val} onChange={(e) => on(e.target.value)}>{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
    return <input className={`input ${f.ltr || f.type ? 'text-start' : ''}`} dir={f.ltr || f.type ? 'ltr' : undefined} value={val} onChange={(e) => on(e.target.value)} inputMode={f.type ? 'numeric' : undefined} />;
  };

  return (
    <div className="space-y-5">
      <PageHead title="تنظیمات" />
      <form onSubmit={save} className="space-y-5">
        {GROUPS.map((g) => (
          <section key={g.title} className="card max-w-3xl space-y-4">
            <div>
              <h2 className="font-extrabold">{g.title}</h2>
              {g.desc && <p className="mt-1 text-xs text-ink-muted">{g.desc}</p>}
            </div>
            {g.fields.map((f) => (
              <div key={f.key}>
                {f.type !== 'toggle' && <label className="label">{f.label}</label>}
                {input(f)}
                {f.type === 'money' && v[f.key] && <p className="hint">{price(Number(v[f.key]))} تومان</p>}
                {f.hint && <p className="hint">{f.hint}</p>}
              </div>
            ))}
          </section>
        ))}
        <div className="sticky bottom-4 z-10 flex max-w-3xl items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-pop ring-1 ring-line">
          <button type="submit" className="btn-primary">ذخیره تنظیمات</button>
          {msg && <span className="text-sm text-emerald-700">{msg}</span>}
          {error && <span className="text-sm text-pink-700">{error}</span>}
        </div>
      </form>

      <form onSubmit={changePw} className="card max-w-3xl space-y-4">
        <h2 className="font-extrabold">تغییر رمز ورود مدیر</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="password" className="input text-start" dir="ltr" placeholder="رمز فعلی" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
          <input type="password" className="input text-start" dir="ltr" placeholder="رمز جدید (حداقل ۸ حرف)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" minLength={8} required />
        </div>
        <button type="submit" className="btn-outline">تغییر رمز</button>
        {pwMsg && <p className="text-sm">{pwMsg}</p>}
      </form>
    </div>
  );
}
