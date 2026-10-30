'use client';

import { useRef, useState } from 'react';
import { mediaUrl } from '@/lib/api';
import type { ProductImage } from '@/lib/types';

export default function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const list = images.length ? images : [{ url: '' }];
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="lg:sticky lg:top-32">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-pink-50">
        <div ref={scroller} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
          }}>
          {list.map((img, i) => (
            <img key={i} src={mediaUrl(img.url)} alt={img.alt || title} loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        {list.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
            {list.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />)}
          </div>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-3 hidden grid-cols-5 gap-2 lg:grid">
          {list.map((img, i) => (
            <button key={i} type="button" onClick={() => {
              setIndex(i);
              scroller.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
              className={`aspect-[3/4] overflow-hidden rounded-xl ring-2 transition ${i === index ? 'ring-pink-500' : 'ring-transparent hover:ring-pink-200'}`}>
              <img src={mediaUrl(img.url)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
