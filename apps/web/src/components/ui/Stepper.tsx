import Icon from './Icon';
import { toFa } from '@/lib/format';

export default function Stepper({
  value, onChange, max = 99, min = 1, small = false,
}: { value: number; onChange: (n: number) => void; max?: number; min?: number; small?: boolean }) {
  const h = small ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white">
      <button type="button" className={`${h} grid place-items-center text-ink-soft hover:text-pink-600 disabled:opacity-30`}
        onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="یکی بیشتر">
        <Icon name="plus" className="h-4 w-4" />
      </button>
      <span className="w-7 text-center text-sm font-bold">{toFa(value)}</span>
      <button type="button" className={`${h} grid place-items-center text-ink-soft hover:text-pink-600 disabled:opacity-30`}
        onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="یکی کمتر">
        <Icon name="minus" className="h-4 w-4" />
      </button>
    </div>
  );
}
