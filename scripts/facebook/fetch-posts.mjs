// Facebook пэйжийн бүх нийтлэгдсэн постыг ганц удаа татаж,
// facebook_export/posts.json болон facebook_export/images/ руу хадгална.
// Token-ыг .env.local / .env-ээс уншина, хэзээ ч хэвлэхгүй.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'facebook_export');
const IMG_DIR = path.join(OUT_DIR, 'images');
const API = 'https://graph.facebook.com/v21.0';

function loadEnv() {
  const env = {};
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const PAGE_ID = env.FB_PAGE_ID;
let TOKEN = env.FB_PAGE_TOKEN;
const ENV_TOKEN = TOKEN;
if (!PAGE_ID || !TOKEN) {
  console.error('FB_PAGE_ID эсвэл FB_PAGE_TOKEN .env-д алга.');
  process.exit(1);
}

// Алдааны мессежнээс token-уудыг арилгана
const scrub = (s) => String(s).split(ENV_TOKEN).join('***').split(TOKEN).join('***');

// .env дэх token нь User token байвал Page token-ыг санах ойд л авна
async function ensurePageToken() {
  const res = await fetch(`${API}/${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(TOKEN)}`);
  const body = await res.json();
  if (body.access_token) {
    TOKEN = body.access_token;
    console.log('User token-оос Page token авлаа (санах ойд л хадгалагдана).');
  } else if (body.error) {
    console.log(`Page token авах боломжгүй (${body.error.code}), .env token-ыг шууд ашиглана.`);
  }
}

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (body.error) {
        const e = body.error;
        throw new Error(`Graph API алдаа ${e.code}/${e.error_subcode ?? ''}: ${e.message}`);
      }
      return body;
    } catch (err) {
      if (attempt === 4) throw new Error(scrub(err.message));
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function collectImages(post) {
  const urls = [];
  const push = (u) => { if (u && !urls.includes(u)) urls.push(u); };
  for (const att of post.attachments?.data ?? []) {
    const subs = att.subattachments?.data ?? [];
    if (subs.length) subs.forEach((s) => push(s.media?.image?.src));
    else push(att.media?.image?.src);
  }
  if (!urls.length) push(post.full_picture);
  return urls;
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch (err) {
      if (attempt === 3) { console.error(`  зураг татаж чадсангүй: ${path.basename(dest)} (${err.message})`); return false; }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  await ensurePageToken();
  const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media,media_type,type,subattachments{media,type}}';
  const params = new URLSearchParams({ fields, limit: '100', access_token: TOKEN });
  let url = `${API}/${PAGE_ID}/published_posts?${params}`;

  // Сонголт: `node fetch-posts.mjs 100` → зөвхөн хамгийн сүүлийн 100 пост
  const MAX_POSTS = Number(process.argv[2]) || Infinity;
  const posts = [];
  let page = 0;
  while (url && posts.length < MAX_POSTS) {
    page++;
    const body = await getJson(url);
    posts.push(...(body.data ?? []));
    console.log(`Хуудас ${page}: +${body.data?.length ?? 0} (нийт ${posts.length})`);
    url = body.paging?.next ?? null; // next линк token агуулдаг — хадгалахгүй, хэвлэхгүй
  }
  posts.splice(MAX_POSTS);

  let imgTotal = 0, imgOk = 0, withImages = 0;
  for (const post of posts) {
    const imgs = collectImages(post);
    post.images = [];
    if (imgs.length) withImages++;
    for (let i = 0; i < imgs.length; i++) {
      imgTotal++;
      const file = `${post.id}_${i + 1}.jpg`;
      const ok = await download(imgs[i], path.join(IMG_DIR, file));
      if (ok) { imgOk++; post.images.push(`images/${file}`); }
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'posts.json'), JSON.stringify(posts, null, 2));

  const dates = posts.map((p) => p.created_time).sort();
  console.log('\n=== Тайлан ===');
  console.log(`Нийт пост: ${posts.length}`);
  console.log(`Зурагтай пост: ${withImages}`);
  console.log(`Нийт зураг: ${imgTotal} (амжилттай татсан ${imgOk})`);
  console.log(`Хамгийн хуучин: ${dates[0] ?? '-'}`);
  console.log(`Хамгийн шинэ: ${dates[dates.length - 1] ?? '-'}`);
}

main().catch((e) => { console.error(scrub(e.message)); process.exit(1); });
