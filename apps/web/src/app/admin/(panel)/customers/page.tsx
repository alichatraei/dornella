'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, apiUrl, getToken } from '@/lib/api';
import AudienceFilter, { Audience, audienceQuery } from '@/components/admin/AudienceFilter';
import { Empty, PageHead, Stat } from '@/components/admin/ui';
import Sheet from '@/components/ui/Sheet';
import { faDate, price, toFa } from '@/lib/format';

type Contact = {
  id: string; name?: string; phone: string; city?: string; tags: string[]; smsOptIn: boolean; isActive: boolean;
  source?: string; orders: number; spent: number; lastOrderAt?: string; createdAt: string;
};
type Overview = { total: number; optedIn: number; last30: number; buyers: number; tags: string[]; smsReady: boolean; smsProvider: string };

export default function CustomersPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audience, setAudience] = useState<Audience>({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Contact[]; total: number; reachable: number; pages: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTag, setImportTag] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    const q = audienceQuery(audience);
    q.set('page', String(page));
    api(`/crm/contacts?${q}`, { auth: true }).then(setData).catch(() => null);
  }, [audience, page]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);
  useEffect(() => { api<Overview>('/crm/overview', { auth: true }).then(setOverview).catch(() => null); }, []);

  const exportCsv = async () => {
    const res = await fetch(apiUrl(`/crm/contacts/export?${audienceQuery(audience)}`), { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dornela-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const runImport = async () => {
    const r = await api<{ added: number; existing: number; invalid: number }>('/crm/contacts/import', { method: 'POST', auth: true, body: { text: importText, tag: importTag || undefined } });
    setMsg(`${toFa(r.added)} شماره جدید اضافه شد · ${toFa(r.existing)} از قبل بود · ${toFa(r.invalid)} نامعتبر`);
    setImportOpen(false);
    setImportText('');
    load();
  };

  return (
    <div className="space-y-5">
      <PageHead title="مشتریان و باشگاه (CRM)" desc="هر کس با شماره موبایل وارد سایت شود خودکار اینجا ثبت می‌شود."
        actions={<>
          <button type="button" onClick={() => setImportOpen(true)} className="btn-outline btn-sm">وارد کردن شماره‌ها</button>
          <button type="button" onClick={exportCsv} className="btn-outline btn-sm">خروجی اکسل (CSV)</button>
          <Link href="/admin/sms" className="btn-primary btn-sm">ارسال پیامک گروهی</Link>
        </>} />

      {overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat tone="pink" label="کل اعضا" value={toFa(overview.total)} />
          <Stat label="پیامک‌پذیر" value={toFa(overview.optedIn)} hint="پیامک تبلیغاتی را خاموش نکرده‌اند" />
          <Stat label="خریدار" value={toFa(overview.buyers)} />
          <Stat label="عضو جدید (۳۰ روز)" value={toFa(overview.last30)} />
        </div>
      )}

      <AudienceFilter value={audience} onChange={(a) => { setAudience(a); setPage(1); }} tags={overview?.tags || []} />
      {msg && <p className="alert-ok">{msg}</p>}

      {!data ? null : data.items.length === 0 ? <Empty text="مخاطبی با این فیلتر نیست." /> : (
        <>
          <p className="text-xs text-ink-muted">{toFa(data.total)} نفر · {toFa(data.reachable)} نفر پیامک‌پذیر</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>مشتری</th><th>شهر</th><th>سفارش</th><th>جمع خرید</th><th>آخرین خرید</th><th>عضویت</th><th>برچسب</th><th /></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-pink-50/30">
                    <td><p className="font-semibold">{c.name || '—'}</p><p className="text-xs text-ink-muted" dir="ltr">{toFa(c.phone)}</p></td>
                    <td className="text-xs">{c.city || '—'}</td>
                    <td>{toFa(c.orders)}</td>
                    <td className="whitespace-nowrap">{c.spent ? price(c.spent) : '—'}</td>
                    <td className="text-xs text-ink-muted">{c.lastOrderAt ? faDate(c.lastOrderAt) : '—'}</td>
                    <td className="text-xs text-ink-muted">{faDate(c.createdAt)}{!c.smsOptIn && <span className="block text-pink-600">پیامک خاموش</span>}</td>
                    <td><div className="flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="chip bg-pink-50 text-pink-700">{t}</span>)}</div></td>
                    <td><Link href={`/admin/customers/${c.id}`} className="btn-outline btn-sm">پرونده</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline btn-sm">قبلی</button>
              <span className="text-sm">{toFa(page)} از {toFa(data.pages)}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="btn-outline btn-sm">بعدی</button>
            </div>
          )}
        </>
      )}

      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title="وارد کردن شماره‌ها">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-ink-soft">هر خط یک شماره، و اگر خواستید بعد از آن نام. مثلاً شماره‌هایی که از دایرکت اینستاگرام دارید.<br />فقط شماره کسانی را وارد کنید که خودشان خواسته‌اند خبرها را بگیرند.</p>
          <textarea rows={8} className="input font-mono text-sm" dir="ltr" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'09121234567 سارا\n09351234567'} />
          <input className="input" placeholder="برچسب (اختیاری)، مثلاً: اینستاگرام" value={importTag} onChange={(e) => setImportTag(e.target.value)} />
          <button type="button" onClick={runImport} disabled={importText.trim().length < 10} className="btn-primary w-full">وارد کن</button>
        </div>
      </Sheet>
    </div>
  );
}
