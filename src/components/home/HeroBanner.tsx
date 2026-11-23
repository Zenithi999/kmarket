'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NEW_YEAR_DECOR } from '@/lib/seasonal';
import { CurtainLights, HangingOrnaments, Snowfall, SnowDrift } from './NewYearDecor';

export interface HeroBannerItem {
  _id: string;
  title: string;
  image: string;
  mobile_image?: string;
  link?: string;
  bg_color?: string;
}

const AUTOPLAY_MS = 5500;

export default function HeroBanner({ banners }: { banners: HeroBannerItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  // Admin can remove banners while the index points past the end.
  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [active, paused, count, go]);

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  if (count === 0) return null;

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-3 pt-3 lg:px-4 lg:pt-4">
        <div
          className="group relative aspect-[16/9] lg:aspect-[2000/848] overflow-hidden rounded-xl lg:rounded-2xl bg-gray-100"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
        >
          {banners.map((b, i) => {
            const on = i === active;
            return (
              <Link
                key={b._id}
                href={b.link || '/products'}
                aria-hidden={!on}
                tabIndex={on ? 0 : -1}
                className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                  on ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
                style={{ backgroundColor: b.bg_color }}
              >
                <div
                  className={`absolute inset-0 transition-transform duration-[1400ms] ease-out motion-reduce:transition-none ${
                    on ? 'scale-100' : 'scale-[1.03]'
                  }`}
                >
                  <Image
                    src={b.mobile_image || b.image}
                    alt={b.title}
                    fill
                    sizes="calc(100vw - 24px)"
                    className="object-cover lg:hidden"
                    priority={i === 0}
                  />
                  <Image
                    src={b.image}
                    alt={b.title}
                    fill
                    sizes="(min-width: 1280px) 1248px, 100vw"
                    className="hidden lg:block object-cover"
                    priority={i === 0}
                  />
                </div>
              </Link>
            );
          })}

          {NEW_YEAR_DECOR && (
            <>
              <CurtainLights />
              <HangingOrnaments />
              <Snowfall />
              <SnowDrift />
            </>
          )}

          {count > 1 && (
            <div className="absolute bottom-4 right-3 lg:bottom-7 lg:right-5 z-30 flex items-center rounded-full bg-black/35 text-white backdrop-blur-sm">
              <button
                onClick={() => go(active - 1)}
                aria-label="Өмнөх баннер"
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2.5 py-1 lg:px-1 text-[11px] lg:text-xs font-medium tabular-nums tracking-wide">
                {active + 1}
                <span className="mx-1 text-white/50">/</span>
                {count}
              </span>
              <button
                onClick={() => go(active + 1)}
                aria-label="Дараагийн баннер"
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
