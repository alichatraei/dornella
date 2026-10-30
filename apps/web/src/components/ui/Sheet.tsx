'use client';

import { useEffect } from 'react';
import Icon from './Icon';

/** پنجره‌ای که در موبایل از پایین و در دسکتاپ وسط صفحه باز می‌شود */
export default function Sheet({
  open, onClose, title, children, wide = false,
}: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-pop animate-slide-up sm:rounded-3xl sm:animate-fade-in ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mb-3 flex items-center justify-between gap-4">
          {title ? <h2 className="text-base font-extrabold">{title}</h2> : <span />}
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-pink-50" aria-label="بستن">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
