// facebook_export/products_review.csv-г уншаад барааг Supabase-д НООРОГ (is_active=false)
// төлөвтэй нэмнэ. Зургийг Cloudinary-ийн kmarket/products руу байршуулна.
// Бичихээс өмнө products, categories хүснэгтийг facebook_export/backup/ руу нөөцөлнө.
// Одоо байгаа бараа, ангиллыг өөрчлөхгүй; ижил slug-тай бараа байвал алгасна.
//   node scripts/facebook/import-products.mjs          → бодитоор нэмнэ
//   node scripts/facebook/import-products.mjs --dry    → юу хийхийг л харуулна
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
const DIR = path.join(ROOT, 'facebook_export');

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
  if (!env[k]) { console.error(`${k} .env.local-д алга`); process.exit(1); }
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });

// ---------- CSV ----------
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((v) => v !== '')) rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}
const list = (s) => (s ? s.split('|').map((x) => x.trim()).filter(Boolean) : []);
const num = (s) => {
  if (!s) return null;
  const n = Number(String(s).replace(/[,\s₮]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : NaN;
};

// ---------- Өнгө → hex (admin-ий COMMON_COLORS-той нийцүүлсэн) ----------
const HEX = {
  'Хар': '#000000', 'Цагаан': '#FFFFFF', 'Хүрэн': '#92400E', 'Саарал': '#6B7280', 'Ногоон': '#22C55E',
  'Улбар шар': '#F97316', 'Шар': '#EAB308', 'Улаан': '#EF4444', 'Ягаан': '#EC4899',
  'Хар хүрэн': '#4A2C1D', 'Шаргал': '#C68E4E', 'Бор саарал': '#A39382', 'Цайвар': '#F5F0E6',
  'Хар хөх': '#1E3A5F', 'Хар ногоон': '#1F3B2D', 'Цайвар шаргал': '#D9B98C', 'Цайвар бор': '#C8B49A',
  'Хүрэн/Цагаан': '#8B5E3C', 'Цайвар/Хүрэн': '#EDE4D3', 'Шаргал хүрэн': '#A0703C',
  'Burgundy': '#6D1F2F', 'Silver': '#C0C0C0', 'Black': '#111111', 'Blue': '#6B8FB5', 'Gold/Gold': '#D4AF37',
  'White/Sky blue': '#DCE9F5', 'Sky blue/Ivory': '#A7C7E7', 'Black/Gray': '#3F3F46', 'Charcoal/Black': '#36454F',
  'Natural': '#E8DCC4', 'Snow white': '#FAFAF7', 'Ash': '#B2A99A', 'Carbon black': '#1C1C1C', 'G/Khaki': '#8A9A7B',
  'Gray beige': '#C9C0B1', 'Gray navy': '#4B5A75', 'Khaki': '#6B6B47', 'Light grey': '#D1D5DB', 'Ice grey': '#E3E6E8',
  'Brown': '#6F4E37', '0.5N Natural': '#E9CBB0', '001 Crystal Pink': '#F4B6C2', 'Chocolate': '#5C3A21',
  'Sand': '#D8C3A5', 'Chestnut': '#A0612B', 'Cream': '#FFFDD0',
};

// Санал болгосон шинэ ангиллууд — идэвхгүй төлөвтэй үүсгэнэ
const NEW_CATS = { __home: { name: 'Гэр ахуй', slug: 'home' }, __phones: { name: 'Утас, электрон', slug: 'phones' } };
const SIZE_TYPES = new Set(['none', 'clothing', 'shoes', 'bags', 'ring', 'custom']);

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

async function upload(file, publicId) {
  for (let a = 1; a <= 3; a++) {
    try {
      const r = await cloudinary.uploader.upload(file, {
        folder: 'kmarket/products', public_id: publicId, overwrite: false, unique_filename: false,
        transformation: [{ width: 800, height: 800, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
      });
      return r.secure_url;
    } catch (e) {
      if (a === 3) throw new Error(e?.message || e?.error?.message || String(e));
      await new Promise((r) => setTimeout(r, 1500 * a));
    }
  }
}

async function main() {
  const rows = parseCsv(fs.readFileSync(path.join(DIR, 'products_review.csv'), 'utf8'));
  console.log(`CSV: ${rows.length} мөр${DRY ? ' (DRY RUN)' : ''}`);

  const { data: cats, error: ce } = await sb.from('categories').select('*');
  if (ce) throw ce;
  const { data: existing, error: pe } = await sb.from('products').select('*');
  if (pe) throw pe;

  // 1) Нөөц хуулбар
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(DIR, 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `db-backup-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ taken_at: new Date().toISOString(), categories: cats, products: existing }, null, 2));
  console.log(`Нөөц: ${path.relative(ROOT, backupFile)} (ангилал ${cats.length}, бараа ${existing.length})`);

  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));
  const existingSlugs = new Set(existing.map((p) => p.slug));

  // 2) Мөр бүрийг шалгах
  const plan = []; const skipped = []; const failed = [];
  for (const r of rows) {
    const why = [];
    const price = num(r.price); const old = num(r.old_price);
    if (price == null) { skipped.push({ slug: r.slug, name: r.name, reason: 'Үнэ хоосон' }); continue; }
    if (Number.isNaN(price) || Number.isNaN(old)) why.push('үнэ тоо биш');
    if (!r.slug || !r.name) why.push('slug/name хоосон');
    if (existingSlugs.has(r.slug)) { skipped.push({ slug: r.slug, name: r.name, reason: 'Ийм slug-тай бараа сайтад аль хэдийн байна' }); continue; }
    if (!catBySlug[r.category] && !NEW_CATS[r.category]) why.push(`ангилал олдсонгүй: ${r.category}`);
    const st = r.size_type || 'none';
    if (!SIZE_TYPES.has(st)) why.push(`size_type буруу: ${st}`);
    const colorNames = list(r.colors);
    const unknown = colorNames.filter((c) => !HEX[c]);
    const images = list(r.images);
    const missingImg = images.filter((f) => !fs.existsSync(path.join(DIR, 'site_images', f)));
    if (missingImg.length) why.push(`зураг олдсонгүй: ${missingImg.join(', ')}`);
    if (why.length) { failed.push({ slug: r.slug, name: r.name, error: why.join('; ') }); continue; }

    // Хуучин үнэтэй бол: price = хуучин үнэ, sale_price = хямдарсан үнэ (сайтын ProductCard-ийн дүрэм)
    const hasDiscount = old && old > price;
    // Нэг өнгө давхар hex-тэй бол admin маягт дээр устгахад асуудал гарах тул hex-ийг ялгана
    const used = new Set();
    const colors = colorNames.map((name) => {
      let hex = HEX[name] || '#9CA3AF';
      while (used.has(hex.toLowerCase())) hex = '#' + ((parseInt(hex.slice(1), 16) + 1) % 0xffffff).toString(16).padStart(6, '0').toUpperCase();
      used.add(hex.toLowerCase());
      return { name, hex };
    });
    plan.push({
      row: r, images, unknownColors: unknown,
      record: {
        name: r.name, slug: r.slug, description: r.description || null,
        price: hasDiscount ? old : price, sale_price: hasDiscount ? price : null,
        colors, size_type: st, sizes: list(r.sizes), brand: r.brand || null,
        attributes: r.material ? { material: r.material } : {},
        stock: 0, is_active: false, is_new: true, is_featured: false,
      },
    });
  }

  console.log(`Нэмэх: ${plan.length}, алгасах: ${skipped.length}, алдаатай: ${failed.length}`);
  for (const p of plan) if (p.unknownColors.length) console.log(`  ! ${p.row.slug}: hex-гүй өнгө → саарал: ${p.unknownColors.join(', ')}`);
  if (DRY) {
    for (const p of plan) console.log(`  + ${p.row.slug} | ${p.record.price}${p.record.sale_price ? ' → ' + p.record.sale_price : ''} | ${p.row.category} | ${p.images.length} зураг`);
    for (const s of skipped) console.log(`  - ${s.slug}: ${s.reason}`);
    for (const f of failed) console.log(`  x ${f.slug}: ${f.error}`);
    return;
  }

  // 3) Шаардлагатай шинэ ангиллыг идэвхгүй төлөвтэй үүсгэх
  const createdCats = [];
  for (const key of new Set(plan.map((p) => p.row.category).filter((c) => NEW_CATS[c]))) {
    const def = NEW_CATS[key];
    if (catBySlug[def.slug]) { catBySlug[key] = catBySlug[def.slug]; continue; }
    const { data, error } = await sb.from('categories').insert({ name: def.name, slug: def.slug, is_active: false }).select().single();
    if (error) throw new Error(`Ангилал үүсгэж чадсангүй: ${error.message}`);
    catBySlug[key] = data; catBySlug[def.slug] = data; createdCats.push(data);
    console.log(`Шинэ ангилал (идэвхгүй): ${def.name} / ${def.slug}`);
  }

  // 4) Зураг байршуулж, бараа нэмэх
  const added = [];
  for (const [n, p] of plan.entries()) {
    const r = p.row;
    try {
      const urls = await pool(p.images, 4, (f) => upload(path.join(DIR, 'site_images', f), `fb-${path.parse(f).name}`));
      const cat = catBySlug[r.category];
      const record = {
        ...p.record, images: urls,
        category_id: cat.parent_id || cat.id,
        subcategory_id: cat.parent_id ? cat.id : null,
      };
      const { data, error } = await sb.from('products').insert(record).select('id, slug').single();
      if (error) throw new Error(error.message);
      added.push({ id: data.id, slug: data.slug, name: r.name, images: urls.length });
      console.log(`[${n + 1}/${plan.length}] ✓ ${r.slug} (${urls.length} зураг)`);
    } catch (e) {
      failed.push({ slug: r.slug, name: r.name, error: e.message });
      console.log(`[${n + 1}/${plan.length}] ✗ ${r.slug}: ${e.message}`);
    }
  }

  const result = { finished_at: new Date().toISOString(), backup: path.relative(ROOT, backupFile), created_categories: createdCats.map((c) => ({ id: c.id, name: c.name, slug: c.slug })), added, skipped, failed };
  fs.writeFileSync(path.join(DIR, 'import_result.json'), JSON.stringify(result, null, 2));
  console.log(`\n=== Дүн ===\nНэмэгдсэн: ${added.length}\nАлгассан: ${skipped.length}\nАлдаатай: ${failed.length}`);
}

main().catch((e) => { console.error('Алдаа:', e.message); process.exit(1); });
