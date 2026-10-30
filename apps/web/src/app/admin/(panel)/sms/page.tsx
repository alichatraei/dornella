'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import AudienceFilter, { Audience, audienceBody } from '@/components/admin/AudienceFilter';
import { PageHead } from '@/components/admin/ui';
import { faDate, toFa } from '@/lib/format';
import { useSettings } from '@/components/SettingsProvider';

type Campaign = { id: string; title: string; message: string; recipients: number; sent: number; failed: number; status: string; error?: string; createdAt: string };
const TEMPLATES = [
  'سلام! سری جدید درنلا رسید. مدل‌ها محدودند، زودتر ببینید:\nhttps://dornela.ir/products',
  'حراج آخر فصل درنلا شروع شد؛ تا ۳۰٪ تخفیف فقط تا آخر هفته.\nhttps://dornela.ir',
  'یک کد تخفیف مخصوص اعضای باشگاه: DN10\nتا پنجشنبه روی همه محصولات.',
];

/** تعداد پیامک (هر پیامک فارسی ۷۰ حرف، چندبخشی ۶۷ حرف) */
const parts = (text: string) => (text.length <= 70 ? 1 : Math.ceil(text.length / 67));

export default function SmsPage() {
  const settings = useSettings();
  const [audience, setAudience] = useState<Audience>({});
  const [tags, setTags] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [list, setList] = useState<Campaign[]>([]);
  const [smsReady, setSmsReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadList = () => api<Campaign[]>('/crm/campaigns', { auth: true }).then(setList).catch(() => null);
  useEffect(() => {
    loadList();
    api<{ tags: string[]; smsReady: boolean }>('/crm/overview', { auth: true }).then((o) => { setTags(o.tags); setSmsReady(o.smsReady); }).catch(() => null);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      api<{ count: number }>('/crm/audience/preview', { method: 'POST', auth: true, body: audienceBody(audience) }).then((r) => setCount(r.count)).catch(() => null);
    }, 300);
    return () => clearTimeout(id);
  }, [audience]);

  const footer = settings.sms_footer || '';
  const full = footer && !message.includes(footer) ? `${message}\n${footer}` : message;

  const send = async () => {
    if (!count) return;
    if (!confirm(`این پیامک برای ${toFa(count)} نفر فرستاده شود؟ (${toFa(parts(full) * count)} پیامک)`)) return;
    setBusy(true);
    setError('');
    try {
      await api('/crm/campaigns', { method: 'POST', auth: true, body: { title: title || message.slice(0, 30), message, audience: audienceBody(audience) } });
      setMsg('ارسال شروع شد. نتیجه چند دقیقه دیگر در فهرست پایین به‌روز می‌شود.');
      setMessage('');
      setTitle('');
      setTimeout(loadList, 1500);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHead title="پیامک گروهی" desc="اطلاع‌رسانی مدل‌های جدید و تخفیف‌ها به اعضای باشگاه. کسانی که پیامک را خاموش کرده‌اند حذف می‌شوند." />
      {!smsReady && <p className="alert-info">سرویس پیامک هنوز تنظیم نشده و پیامک‌ها فقط در لاگ سرور ثبت می‌شوند. کلید API را در فایل ‎.env‎ سرور بگذارید (SMS_PROVIDER و SMS_API_KEY).</p>}

      <section className="card space-y-4">
        <h2 className="font-extrabold">۱. چه کسانی؟</h2>
        <AudienceFilter value={audience} onChange={setAudience} tags={tags} />
        <p className="text-sm">گیرندگان: <b className="text-pink-600">{count === null ? '…' : toFa(count)} نفر</b></p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-extrabold">۲. چه پیامی؟</h2>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl, i) => <button key={i} type="button" onClick={() => setMessage(tpl)} className="chip border border-line bg-white py-1.5 text-ink-soft hover:border-pink-300">نمونه {toFa(i + 1)}</button>)}
        </div>
        <input className="input" placeholder="عنوان کمپین (فقط برای خودتان)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea rows={5} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="متن پیامک…" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>{toFa(full.length)} حرف · {toFa(parts(full))} پیامک برای هر نفر{footer && ` · «${footer}» خودکار اضافه می‌شود`}</span>
        </div>
        {full && <div className="max-w-xs whitespace-pre-line rounded-2xl rounded-ee-sm bg-pink-50 p-3 text-sm leading-7">{full}</div>}
        {error && <p className="alert-error">{error}</p>}
        {msg && <p className="alert-ok">{msg}</p>}
        <button type="button" disabled={busy || !count || message.trim().length < 5} onClick={send} className="btn-primary">
          ارسال برای {count ? toFa(count) : ''} نفر
        </button>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">ارسال‌های قبلی</h2><button type="button" onClick={loadList} className="btn-ghost btn-sm">به‌روزرسانی</button></div>
        {list.length === 0 ? <p className="text-sm text-ink-muted">هنوز کمپینی نفرستاده‌اید.</p> : (
          <ul className="divide-y divide-line text-sm">
            {list.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{c.title}</b>
                  <span className="text-xs text-ink-muted">{faDate(c.createdAt, true)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-soft">{c.message}</p>
                <p className="mt-1 text-xs">
                  {c.status === 'SENDING' ? 'در حال ارسال…' : `${toFa(c.sent)} موفق از ${toFa(c.recipients)}`}
                  {c.failed > 0 && <span className="text-pink-600"> · {toFa(c.failed)} ناموفق {c.error && `(${c.error})`}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
