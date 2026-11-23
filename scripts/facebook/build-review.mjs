// Шинжилгээний JSON-уудаас products_review.csv, uncertain.csv, skipped_posts.csv
// гаргаж, зургуудыг facebook_export/site_images/{slug}-{n}.jpg болгон бэлдэнэ.
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'facebook_export');
const posts = JSON.parse(fs.readFileSync(path.join(DIR, 'posts.json'), 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(DIR, 'categories.json'), 'utf8'));
const parts = ['analysis_0_39.json', 'analysis_40_99.json'].map((f) =>
  JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
);
const products = parts.flatMap((p) => p.products);
const skipped = parts.flatMap((p) => p.skipped);

// Сайтад байхгүй, санал болгож буй шинэ ангиллууд
const NEW_CATS = {
  __home: 'Гэр ахуй (ШИНЭ санал)',
  __phones: 'Утас, электрон (ШИНЭ санал)',
};
const OVERRIDE_CAT = { 'christmas-tree': '__home', 'apple-duo': '__phones', 'iphone-18-pro': '__phones' };

const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));
const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
function catLabel(slug) {
  if (NEW_CATS[slug]) return NEW_CATS[slug];
  const c = catBySlug[slug];
  if (!c) throw new Error(`Ангилал олдсонгүй: ${slug}`);
  return c.parent_id ? `${catById[c.parent_id].name} > ${c.name}` : c.name;
}

// Бүх пост хамрагдсан эсэхийг шалгах
const covered = new Map();
for (const p of products) for (const [i] of p.src) covered.set(i, (covered.get(i) || []).concat(p.key));
for (const [i] of skipped) covered.set(i, (covered.get(i) || []).concat('SKIP'));
const missing = posts.map((_, i) => i).filter((i) => !covered.has(i));
const bothSkipAndProduct = [...covered].filter(([, v]) => v.includes('SKIP') && v.length > 1);
if (missing.length) throw new Error(`Шинжлээгүй пост: ${missing.join(', ')}`);
if (bothSkipAndProduct.length) throw new Error(`Давхар ангилсан: ${JSON.stringify(bothSkipAndProduct)}`);

const keys = new Set();
for (const p of products) {
  if (keys.has(p.key)) throw new Error(`Давхардсан key: ${p.key}`);
  keys.add(p.key);
}

const csv = (rows) =>
  '﻿' +
  rows
    .map((r) => r.map((v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\r\n') + '\r\n';

const MAX_IMAGES = 12;
const outImg = path.join(DIR, 'site_images');
fs.rmSync(outImg, { recursive: true, force: true });
fs.mkdirSync(outImg, { recursive: true });

const reviewRows = [[
  'slug', 'name', 'price', 'old_price', 'category', 'category_name', 'brand', 'colors', 'sizes',
  'size_type', 'material', 'description', 'images', 'source_post_url', 'post_date',
]];
const uncertainRows = [['slug', 'name', 'price', 'reason', 'source_post_url']];

for (const p of products) {
  const cat = OVERRIDE_CAT[p.key] || p.cat;
  const srcPosts = p.src.map(([i, sel]) => ({ post: posts[i], sel }));
  const urls = srcPosts.map((s) => s.post.permalink_url);
  const date = srcPosts.map((s) => s.post.created_time).sort().pop().slice(0, 10);

  const imgs = [];
  for (const { post, sel } of srcPosts) {
    const list = sel === 'all' ? post.images : sel.map((n) => post.images[n - 1]).filter(Boolean);
    for (const rel of list) if (imgs.length < MAX_IMAGES) imgs.push(rel);
  }
  const names = imgs.map((rel, k) => {
    const name = `${p.key}-${k + 1}.jpg`;
    fs.copyFileSync(path.join(DIR, rel), path.join(outImg, name));
    return name;
  });

  reviewRows.push([
    p.key, p.name, p.price, p.old_price, cat, catLabel(cat), p.brand,
    p.colors.join(' | '), p.sizes.join(' | '), p.size_type, p.material, p.desc,
    names.join(' | '), urls.join(' | '), date,
  ]);

  const reasons = [];
  if (p.uncertain) reasons.push(p.uncertain);
  if (p.price == null && !(p.uncertain || '').includes('Үнэ')) reasons.push('Үнэ бичээгүй');
  if (NEW_CATS[cat] && !(p.uncertain || '').includes('ангилал')) reasons.push('Шинэ ангилал шаардлагатай');
  if (reasons.length) uncertainRows.push([p.key, p.name, p.price, reasons.join('; '), urls.join(' | ')]);
}

const skippedRows = [['post_date', 'reason', 'message_excerpt', 'source_post_url']];
for (const [i, reason] of skipped.sort((a, b) => a[0] - b[0])) {
  const post = posts[i];
  skippedRows.push([
    post.created_time.slice(0, 10), reason,
    (post.message || '').replace(/\s+/g, ' ').slice(0, 120), post.permalink_url,
  ]);
}

fs.writeFileSync(path.join(DIR, 'products_review.csv'), csv(reviewRows));
fs.writeFileSync(path.join(DIR, 'uncertain.csv'), csv(uncertainRows));
fs.writeFileSync(path.join(DIR, 'skipped_posts.csv'), csv(skippedRows));
fs.writeFileSync(path.join(DIR, 'progress.json'), JSON.stringify({
  total_posts: posts.length, analyzed_through_index: posts.length - 1, batches_done: 5,
  status: 'review_files_ready', updated: new Date().toISOString(),
}, null, 2));

console.log(`Пост: ${posts.length}`);
console.log(`Бараа: ${products.length}`);
console.log(`Эргэлзээтэй: ${uncertainRows.length - 1}`);
console.log(`Алгассан пост: ${skipped.length}`);
console.log(`Бэлдсэн зураг: ${fs.readdirSync(outImg).length}`);
