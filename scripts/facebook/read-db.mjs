// Зөвхөн унших: ангилал болон барааны тоо
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).map(l=>l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const { data: cats, error } = await sb.from('categories').select('id,name,slug,parent_id,filters,is_active,order').order('order');
if (error) { console.error(error.message); process.exit(1); }
fs.writeFileSync('facebook_export/categories.json', JSON.stringify(cats,null,2));
const { count } = await sb.from('products').select('id',{count:'exact',head:true});
const { data: sample } = await sb.from('products').select('name,slug,price,sale_price,images,colors,size_type,sizes,attributes,stock,brand,category_id').limit(3);
console.log('products:', count);
const byId = Object.fromEntries(cats.map(c=>[c.id,c]));
for (const c of cats) console.log((c.parent_id?'   └ ':'')+c.name, '|', c.slug, c.is_active?'':'(inactive)', c.filters?.length? 'filters:'+c.filters.map(f=>f.key||f.name).join(','):'' );
console.log(JSON.stringify(sample,null,1).slice(0,2500));
