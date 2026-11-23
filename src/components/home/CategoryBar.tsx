'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';
import { NEW_YEAR_DECOR } from '@/lib/seasonal';
import { SnowCap } from './NewYearDecor';

export interface CategoryBarItem {
  key: string;
  href: string;
  name: string;
  photo: string;
}

// Cloudinary on-the-fly square crop so tiles stay sharp and light.
function thumb(url: string, size: number) {
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${size},h_${size}/`);
  }
  return url;
}

const MAX_TILES = 8;

const tileBox =
  'relative w-[64px] sm:w-[76px] lg:w-[92px] aspect-square overflow-hidden rounded-[18px] lg:rounded-[22px] bg-gray-50';

export default function CategoryBar({ items }: { items: CategoryBarItem[] }) {
  // More than 8 → show 7 + an "all" tile so the row never wraps unevenly.
  const overflow = items.length > MAX_TILES;
  const tiles = overflow ? items.slice(0, MAX_TILES - 1) : items.slice(0, MAX_TILES);

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-3 lg:px-4 pt-5 pb-6 lg:pt-8 lg:pb-9">
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-x-2 gap-y-5">
          {tiles.map((t) => (
            <Link key={t.key} href={t.href} className="group flex flex-col items-center">
              <div className="relative">
                {NEW_YEAR_DECOR && <SnowCap />}
                <div className={tileBox}>
                  <Image
                    src={thumb(t.photo, 200)}
                    alt={t.name}
                    fill
                    sizes="92px"
                    unoptimized={t.photo.includes('res.cloudinary.com')}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/[0.06]" />
                </div>
              </div>
              <span className="mt-2 lg:mt-2.5 max-w-full px-1 text-center text-xs lg:text-[13px] text-gray-800 line-clamp-1">
                {t.name}
              </span>
            </Link>
          ))}

          {overflow && (
            <Link href="/products" className="group flex flex-col items-center">
              <div className={`${tileBox} flex items-center justify-center transition-colors duration-300 group-hover:bg-gray-100`}>
                <LayoutGrid className="h-6 w-6 text-gray-500" strokeWidth={1.5} />
              </div>
              <span className="mt-2 lg:mt-2.5 text-xs lg:text-[13px] text-gray-800">Бүгд</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
