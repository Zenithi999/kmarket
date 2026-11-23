'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { ProductSlider, HeroBanner, CategoryBar } from '@/components/home';
import type { CategoryBarItem } from '@/components/home/CategoryBar';
import { Product } from '@/types';

// Helper to map API response (_id) to frontend Product type (id)
function mapProduct(p: any): Product {
  return {
    id: p._id || p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    sale_price: p.sale_price,
    sku: p.sku || '',
    brand: p.brand,
    weight: p.weight,
    category_id: typeof p.category_id === 'object' ? p.category_id._id : p.category_id,
    category: p.category_id && typeof p.category_id === 'object' ? { id: p.category_id._id, name: p.category_id.name, slug: p.category_id.slug, is_active: true, created_at: '' } : undefined,
    images: p.images || [],
    sizes: p.sizes || [],
    stock: p.stock ?? 0,
    is_active: p.is_active ?? true,
    is_featured: p.is_featured ?? false,
    rating: p.rating ?? 0,
    review_count: p.review_count ?? 0,
    created_at: p.created_at || '',
    updated_at: p.updated_at || '',
  };
}

// Banner type
interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  mobile_image?: string;
  link?: string;
  bg_color: string;
  text_color: string;
}

// Category type
interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  order: number;
}

// Default main-category tiles (fallback until real categories load from the API) —
// all 8 are now real, admin-managed categories (same as the original 6).
const FALLBACK_MAIN_CATEGORIES: Category[] = [
  { _id: 'beauty', name: 'Beauty', slug: 'beauty', icon: '💄', order: 0 },
  { _id: 'fashion', name: 'Fashion', slug: 'fashion', icon: '👗', order: 1 },
  { _id: 'shoes', name: 'Shoes', slug: 'shoes', icon: '👟', order: 2 },
  { _id: 'dyson', name: 'Dyson', slug: 'dyson', icon: '💨', order: 3 },
  { _id: 'trendy', name: 'Trendy', slug: 'trendy', icon: '✨', order: 4 },
  { _id: 'best', name: 'Best Sellers', slug: 'best', icon: '🏆', order: 5 },
  { _id: 'sale', name: 'Sale', slug: 'sale', icon: '🏷️', order: 6 },
  { _id: 'others', name: 'Others', slug: 'others', icon: '🛍️', order: 7 },
];

// Per-category curated photo, used until the admin uploads a real product photo
// for that category — real macro/product photography (all free-license Unsplash
// shots) reads far more "tansag" (premium) than line icons or emoji.
const CATEGORY_STYLE: Record<string, { photo: string }> = {
  beauty: { photo: 'https://images.unsplash.com/photo-1532441807072-e075a14e3b69?w=300&q=80&fit=crop&auto=format' },
  fashion: { photo: 'https://images.unsplash.com/photo-1529636273736-fc88b31ea9d9?w=300&q=80&fit=crop&auto=format' },
  shoes: { photo: 'https://images.unsplash.com/photo-1670938258821-2956d4ce9c9b?w=300&q=80&fit=crop&auto=format' },
  dyson: { photo: 'https://images.unsplash.com/photo-1724271859348-bad4e179d65d?w=300&q=80&fit=crop&auto=format' },
  trendy: { photo: 'https://images.unsplash.com/photo-1655232105149-4923a5f6090a?w=300&q=80&fit=crop&auto=format' },
  best: { photo: 'https://images.unsplash.com/photo-1699364911273-99acc265181f?w=300&q=80&fit=crop&auto=format' },
  sale: { photo: 'https://images.unsplash.com/photo-1571907483086-3c0ea40cc16d?w=300&q=80&fit=crop&auto=format' },
  others: { photo: 'https://images.unsplash.com/photo-1513884923967-4b182ef167ab?w=300&q=80&fit=crop&auto=format' },
};

// Default Hero Banner Slides (fallback)
const defaultSlides: Banner[] = [
  {
    _id: '1',
    title: 'K-BEAUTY',
    subtitle: 'DEALS',
    description: 'Солонгос гоо сайхны бүтээгдэхүүн',
    link: '/products',
    bg_color: '#FBE1D0',
    text_color: '#212121',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
  },
  {
    _id: '2',
    title: 'NEW',
    subtitle: 'ARRIVALS',
    description: 'Шинэ ирсэн бүтээгдэхүүнүүд',
    link: '/products?new=true',
    bg_color: '#F2F0EC',
    text_color: '#212121',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
  },
];



export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>(defaultSlides);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Fetch banners, categories, and products from API
  useEffect(() => {
    // ── Hydrate categories instantly from localStorage cache (instant icons on revisit) ──
    try {
      const cached = localStorage.getItem('km:categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.data) && Date.now() - parsed.t < 24 * 3600 * 1000) {
          setCategories(parsed.data);
        }
      }
    } catch {}

    const fetchBanners = async () => {
      try {
        const res = await fetch('/api/banners');
        const data = await res.json();
        if (data.banners && data.banners.length > 0) {
          setBanners(data.banners);
        }
      } catch (error) {
        console.log('Using default banners');
      }
    };
    
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
          try {
            localStorage.setItem('km:categories', JSON.stringify({ t: Date.now(), data }));
          } catch {}
        }
      } catch (error) {
        console.log('Failed to fetch categories');
      }
    };

    const fetchProducts = async () => {
      try {
        // Fetch featured products
        const [featuredRes, newRes, saleRes, allRes] = await Promise.all([
          fetch('/api/products?featured=true&limit=8'),
          fetch('/api/products?new=true&limit=6'),
          fetch('/api/products?sale=true&limit=8'),
          fetch('/api/products?limit=12'),
        ]);

        const [featuredData, newData, saleData, allData] = await Promise.all([
          featuredRes.json(),
          newRes.json(),
          saleRes.json(),
          allRes.json(),
        ]);

        if (featuredData.products) setFeaturedProducts(featuredData.products.map(mapProduct));
        if (newData.products) setNewProducts(newData.products.map(mapProduct));
        if (saleData.products) setSaleProducts(saleData.products.map(mapProduct));
        if (allData.products) setAllProducts(allData.products.map(mapProduct));
      } catch (error) {
        console.log('Failed to fetch products');
      }
    };
    
    fetchBanners();
    fetchCategories();
    fetchProducts();
  }, []);

  // ── Main categories for the floating category card under the hero ──
  const mainCategories = categories.length > 0 ? categories : FALLBACK_MAIN_CATEGORIES;
  const categoryTiles: CategoryBarItem[] = mainCategories.map((cat) => {
    const hasPhoto = cat.image || (cat.icon && cat.icon.startsWith('http'));
    return {
      key: cat.slug,
      href: `/category/${cat.slug}`,
      name: cat.name,
      photo: hasPhoto
        ? ((cat.image || cat.icon) as string)
        : CATEGORY_STYLE[cat.slug]?.photo ||
          'https://images.unsplash.com/photo-1513884923967-4b182ef167ab?w=300&q=80&fit=crop&auto=format',
    };
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <HeroBanner banners={banners} />
      <CategoryBar items={categoryTiles} />

      {/* ── FEATURED / TRENDING ── */}
      {featuredProducts.length > 0 && (
        <div className="mt-2">
          <ProductSlider
            title="Trending Now"
            subtitle="Одоо эрэлттэй байгаа"
            products={featuredProducts}
            viewAllLink="/products?featured=true"
          />
        </div>
      )}

      {/* ── NEW ARRIVALS ── */}
      {newProducts.length > 0 && (
        <div className="mt-2">
          <ProductSlider
            title="New Arrivals"
            subtitle="Шинэ ирсэн"
            products={newProducts}
            viewAllLink="/products?new=true"
          />
        </div>
      )}

      {/* ── ALL PRODUCTS FALLBACK ── */}
      {featuredProducts.length === 0 && saleProducts.length === 0 && allProducts.length > 0 && (
        <div className="mt-2">
          <ProductSlider
            title="Бүтээгдэхүүн"
            subtitle="Бүх бараанууд"
            products={allProducts}
            viewAllLink="/products"
          />
        </div>
      )}

      {/* ── EMPTY STATE (no products at all) ── */}
      {featuredProducts.length === 0 && saleProducts.length === 0 && allProducts.length === 0 && categories.length === 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-md mx-auto text-center px-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Бараа байхгүй байна</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Дэлгүүр одоохондоо хоосон байна.<br />Админ хэсгээс ангилал болон бараа нэмнэ үү.
            </p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-brand"
            >
              <Package className="w-5 h-5" />
              Бараа нэмэх
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
