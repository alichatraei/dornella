import { price, percentOff, toFa } from '@/lib/format';

/** قیمت محصول با در نظر گرفتن حراج جشنواره یا قیمت قبل از تخفیف */
export default function Price({
  base, final, compareAt, size = 'md',
}: { base: number; final: number; compareAt?: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const strike = final < base ? base : compareAt && compareAt > final ? compareAt : 0;
  const off = strike ? percentOff(strike, final) : 0;
  const big = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-[15px]';

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className={`${big} font-extrabold text-ink`}>
        {price(final)} <span className="text-xs font-medium text-ink-muted">تومان</span>
      </span>
      {strike > 0 && (
        <>
          <span className={`${size === 'lg' ? 'text-sm' : 'text-xs'} text-ink-muted line-through decoration-pink-400/70`}>{price(strike)}</span>
          <span className="chip bg-pink-500 px-2 text-white">{toFa(off)}٪</span>
        </>
      )}
    </div>
  );
}
