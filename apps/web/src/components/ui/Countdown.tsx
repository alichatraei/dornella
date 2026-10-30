'use client';

import { useEffect, useState } from 'react';
import { t } from '@/dictionary';
import { toFa } from '@/lib/format';

const split = (ms: number) => ({
  d: Math.floor(ms / 86400000),
  h: Math.floor((ms % 86400000) / 3600000),
  m: Math.floor((ms % 3600000) / 60000),
  s: Math.floor((ms % 60000) / 1000),
});

export default function Countdown({ until, tone = 'pink' }: { until: string; tone?: 'pink' | 'light' }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span className="inline-block h-10" />;
  const left = new Date(until).getTime() - now;
  if (left <= 0) return <span className="text-sm">{t.festival.ended}</span>;
  const parts = split(left);
  const box = tone === 'light' ? 'bg-white/20 text-white' : 'bg-white text-pink-700 ring-1 ring-pink-200';

  return (
    <span className="inline-flex items-center gap-1.5" dir="rtl">
      {(['d', 'h', 'm', 's'] as const).map((k) => (
        <span key={k} className={`flex min-w-[42px] flex-col items-center rounded-lg px-1.5 py-1 ${box}`}>
          <b className="text-base leading-5 tabular-nums">{toFa(String(parts[k]).padStart(2, '0'))}</b>
          <small className="text-[10px] opacity-80">{t.festival.units[k]}</small>
        </span>
      ))}
    </span>
  );
}
