'use client';

import { price, toFa } from '@/lib/format';

type Point = { date: string; revenue: number; profit: number; orders: number };

export default function BarChart({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex h-52 items-end gap-1" dir="ltr">
      {data.map((d) => {
        const label = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', timeZone: 'Asia/Tehran' }).format(new Date(d.date + 'T12:00:00'));
        return (
          <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <div className="w-full max-w-[28px] rounded-t-md bg-pink-200 transition group-hover:bg-pink-500" style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
            <span className="mt-1.5 text-[10px] text-ink-muted">{label}</span>
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-white group-hover:block" dir="rtl">
              {price(d.revenue)} تومان · {toFa(d.orders)} سفارش
            </span>
          </div>
        );
      })}
    </div>
  );
}
