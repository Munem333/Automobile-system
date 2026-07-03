import fs from 'fs';
import path from 'path';
import { v5 as uuidv5 } from 'uuid';
import { ProductType } from '@prisma/client';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD_HASH,
  BRANDS,
  CHAT_QUICK_REPLIES,
  COLORS,
  EV_COLORS,
  EV_TRIMS,
  FEATURED_MODEL_SLUGS,
  PART_CATEGORIES,
  PERMISSIONS,
  SERVICE_CENTERS,
  TRIMS,
  slugify,
} from '../data/seed-constants';
import {
  CAR_MODEL_DESCRIPTIONS,
  PARTS_CATALOG,
  carPhotoUrl,
  partPhotoUrl,
} from '../data/catalog';

const SEED_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const FIXED_STOCK = 3;
const NOW = '2026-07-03T00:00:00.000Z';

function uid(label: string): string {
  return uuidv5(label, SEED_NS);
}

function q(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function qNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'NULL';
  return String(value);
}

function qBool(value: boolean): string {
  return value ? 'TRUE' : 'FALSE';
}

function qTextArray(values: string[]): string {
  return `ARRAY[${values.map((v) => q(v)).join(', ')}]::text[]`;
}

function qTs(value: string): string {
  return `'${value}'::timestamp`;
}

function qDate(value: string): string {
  return `'${value}'::date`;
}

const lines: string[] = [];

function add(sql: string) {
  lines.push(sql);
}

function buildSeedSql(): void {
  add('-- AutoHub BD seed data (deterministic IDs)');
  add('BEGIN;');

  for (const p of PERMISSIONS) {
    const id = uid(`permission:${p.key}`);
    add(
      `INSERT INTO permissions (id, key, description) VALUES (${q(id)}, ${q(p.key)}, ${q(p.description)}) ON CONFLICT (key) DO NOTHING;`,
    );
  }

  const superAdminRoleId = uid('role:super_admin');
  const staffRoleId = uid('role:staff');
  const moderatorRoleId = uid('role:moderator');

  add(`INSERT INTO roles (id, name, description, created_at) VALUES (${q(superAdminRoleId)}, 'super_admin', 'Full platform access', ${qTs(NOW)}) ON CONFLICT (name) DO NOTHING;`);
  add(`INSERT INTO roles (id, name, description, created_at) VALUES (${q(staffRoleId)}, 'staff', 'Limited staff access', ${qTs(NOW)}) ON CONFLICT (name) DO NOTHING;`);
  add(`INSERT INTO roles (id, name, description, created_at) VALUES (${q(moderatorRoleId)}, 'moderator', 'Product catalog management', ${qTs(NOW)}) ON CONFLICT (name) DO NOTHING;`);

  for (const p of PERMISSIONS) {
    const permId = uid(`permission:${p.key}`);
    add(`INSERT INTO role_permissions (role_id, permission_id) VALUES (${q(superAdminRoleId)}, ${q(permId)}) ON CONFLICT DO NOTHING;`);
  }

  const staffPermKeys = ['order.manage', 'chat.respond', 'appointment.manage', 'support.manage'];
  for (const key of staffPermKeys) {
    add(`INSERT INTO role_permissions (role_id, permission_id) VALUES (${q(staffRoleId)}, ${q(uid(`permission:${key}`))}) ON CONFLICT DO NOTHING;`);
  }
  add(`INSERT INTO role_permissions (role_id, permission_id) VALUES (${q(moderatorRoleId)}, ${q(uid('permission:product.manage'))}) ON CONFLICT DO NOTHING;`);

  const adminUserId = uid('user:admin');
  add(
    `INSERT INTO users (id, email, phone, password_hash, full_name, email_verified, phone_verified, is_active, must_change_password, failed_login_attempts, created_at, updated_at) VALUES (${q(adminUserId)}, ${q(ADMIN_EMAIL)}, '01700000000', ${q(ADMIN_PASSWORD_HASH)}, 'AutoHub Admin', TRUE, FALSE, TRUE, FALSE, 0, ${qTs(NOW)}, ${qTs(NOW)}) ON CONFLICT (email) DO NOTHING;`,
  );
  add(`INSERT INTO admin_users (id, user_id, role_id, created_at) VALUES (${q(uid('admin-user:main'))}, ${q(adminUserId)}, ${q(superAdminRoleId)}, ${qTs(NOW)}) ON CONFLICT (user_id) DO NOTHING;`);

  for (let i = 0; i < PART_CATEGORIES.length; i++) {
    const cat = PART_CATEGORIES[i];
    add(
      `INSERT INTO part_categories (id, name, slug, icon, sort_order) VALUES (${q(uid(`part-category:${cat.slug}`))}, ${q(cat.name)}, ${q(cat.slug)}, ${q(cat.icon)}, ${i}) ON CONFLICT (slug) DO NOTHING;`,
    );
  }

  for (let bi = 0; bi < BRANDS.length; bi++) {
    const b = BRANDS[bi];
    const brandId = uid(`brand:${b.slug}`);
    add(
      `INSERT INTO brands (id, name, slug, logo_url, hero_video_url, description, description_bn, is_active, sort_order, created_at) VALUES (${q(brandId)}, ${q(b.name)}, ${q(b.slug)}, ${q(b.logoUrl)}, ${q(b.heroVideoUrl)}, ${q(b.description)}, ${q(b.descriptionBn)}, TRUE, ${bi}, ${qTs(NOW)}) ON CONFLICT (slug) DO NOTHING;`,
    );

    for (const m of b.models) {
      const modelId = uid(`car-model:${b.slug}:${m.slug}`);
      const modelDesc = CAR_MODEL_DESCRIPTIONS[m.slug] || {
        description: `${m.name} — premium ${m.bodyType.toLowerCase()} from ${b.name}.`,
        descriptionBn: `${m.name} — ${b.name} এর প্রিমিয়াম ${m.bodyType}।`,
      };
      const heroImage = carPhotoUrl(b.slug, m.slug);
      const videoUrl = `https://customer-abc123.cloudflarestream.com/${b.slug}-${m.slug}/manifest/video.m3u8`;
      const model3dUrl = m.has3d
        ? `https://res.cloudinary.com/demo/raw/upload/v1699000000/models/${b.slug}-${m.slug}.glb`
        : null;

      add(
        `INSERT INTO car_models (id, brand_id, name, slug, year_from, year_to, body_type, hero_image_url, video_url, model_3d_url, base_price, description, description_bn, is_active, created_at) VALUES (${q(modelId)}, ${q(brandId)}, ${q(m.name)}, ${q(m.slug)}, ${m.yearFrom}, ${qNum(m.yearTo)}, '${m.bodyType}', ${q(heroImage)}, ${q(videoUrl)}, ${model3dUrl ? q(model3dUrl) : 'NULL'}, ${m.basePrice}, ${q(modelDesc.description)}, ${q(modelDesc.descriptionBn)}, TRUE, ${qTs(NOW)}) ON CONFLICT (brand_id, slug) DO NOTHING;`,
      );

      for (let i = 0; i < 3; i++) {
        const imageUrl = carPhotoUrl(b.slug, m.slug);
        add(
          `INSERT INTO car_model_images (id, car_model_id, url, alt, sort_order) VALUES (${q(uid(`car-model-image:${b.slug}:${m.slug}:${i}`))}, ${q(modelId)}, ${q(imageUrl)}, ${q(`${m.name} view ${i + 1}`)}, ${i}) ON CONFLICT DO NOTHING;`,
        );
      }

      const trims = (b as { isEv?: boolean }).isEv ? EV_TRIMS : TRIMS.slice(0, 2);
      const colors = (b as { isEv?: boolean }).isEv ? EV_COLORS.slice(0, 2) : COLORS.slice(0, 2);

      for (const t of trims) {
        for (const c of colors) {
          const sku = `CAR-${b.slug.toUpperCase().slice(0, 3)}-${m.slug}-${slugify(t.trim)}-${slugify(c.name)}`.toUpperCase();
          const price = m.basePrice + t.priceMod;
          const variantId = uid(`car-variant:${sku}`);
          const productSlug = `${b.slug}-${m.slug}-${slugify(t.trim)}-${slugify(c.name)}`;
          const productId = uid(`product:${productSlug}`);
          const thumbUrl = carPhotoUrl(b.slug, m.slug);
          const isFeatured = FEATURED_MODEL_SLUGS.has(m.slug)
            && (t.trim === 'G' || t.trim === 'Long Range' || t.trim === 'Standard');

          add(
            `INSERT INTO car_variants (id, car_model_id, trim, engine, transmission, fuel_type, color, color_hex, price, stock, sku, is_active) VALUES (${q(variantId)}, ${q(modelId)}, ${q(t.trim)}, ${q(t.engine)}, '${t.transmission}', '${t.fuel}', ${q(c.name)}, ${q(c.hex)}, ${price}, ${FIXED_STOCK}, ${q(sku)}, TRUE) ON CONFLICT (sku) DO NOTHING;`,
          );
          add(
            `INSERT INTO products (id, type, name, slug, price, compare_at_price, stock, sku, thumbnail_url, is_featured, is_active, car_model_id, car_variant_id, part_id, created_at, updated_at) VALUES (${q(productId)}, '${ProductType.CAR}', ${q(`${b.name} ${m.name} ${t.trim} — ${c.name}`)}, ${q(productSlug)}, ${price}, NULL, ${FIXED_STOCK}, ${q(`PROD-${sku}`)}, ${q(thumbUrl)}, ${qBool(isFeatured)}, TRUE, ${q(modelId)}, ${q(variantId)}, NULL, ${qTs(NOW)}, ${qTs(NOW)}) ON CONFLICT (slug) DO NOTHING;`,
          );
          add(
            `INSERT INTO product_images (id, product_id, url, alt, sort_order) VALUES (${q(uid(`product-image:${productSlug}`))}, ${q(productId)}, ${q(thumbUrl)}, ${q(`${b.name} ${m.name} ${t.trim} — ${c.name}`)}, 0) ON CONFLICT DO NOTHING;`,
          );
        }
      }
    }
  }

  let partIndex = 0;
  for (const item of PARTS_CATALOG) {
    const categoryId = uid(`part-category:${item.category}`);
    const imageUrl = partPhotoUrl(item.category, item.photoIndex ?? partIndex, item.slug);
    const productSlug = `part-${item.slug}`;
    const partId = uid(`part:${item.slug}`);
    const productId = uid(`product:${productSlug}`);

    add(
      `INSERT INTO parts (id, category_id, name, slug, part_number, price, stock, description, description_bn, compatible_brands, compatible_models, compatible_year_from, compatible_year_to, is_active, created_at) VALUES (${q(partId)}, ${q(categoryId)}, ${q(item.name)}, ${q(item.slug)}, ${q(item.partNumber)}, ${item.price}, ${item.stock}, ${q(item.description)}, ${q(item.descriptionBn)}, ${qTextArray(item.compatibleBrands)}, ${qTextArray(item.compatibleModels)}, ${qNum(item.compatibleYearFrom ?? null)}, ${qNum(item.compatibleYearTo ?? null)}, TRUE, ${qTs(NOW)}) ON CONFLICT (slug) DO NOTHING;`,
    );
    add(
      `INSERT INTO part_images (id, part_id, url, alt, sort_order) VALUES (${q(uid(`part-image:${item.slug}`))}, ${q(partId)}, ${q(imageUrl)}, ${q(item.name)}, 0) ON CONFLICT DO NOTHING;`,
    );
    add(
      `INSERT INTO products (id, type, name, slug, price, compare_at_price, stock, sku, thumbnail_url, is_featured, is_active, car_model_id, car_variant_id, part_id, created_at, updated_at) VALUES (${q(productId)}, '${ProductType.PART}', ${q(item.name)}, ${q(productSlug)}, ${item.price}, NULL, ${item.stock}, ${q(`PROD-${item.partNumber}`)}, ${q(imageUrl)}, ${qBool(!!item.isFeatured)}, TRUE, NULL, NULL, ${q(partId)}, ${qTs(NOW)}, ${qTs(NOW)}) ON CONFLICT (slug) DO NOTHING;`,
    );
    add(
      `INSERT INTO product_images (id, product_id, url, alt, sort_order) VALUES (${q(uid(`product-image:${productSlug}`))}, ${q(productId)}, ${q(imageUrl)}, ${q(item.name)}, 0) ON CONFLICT DO NOTHING;`,
    );
    partIndex++;
  }

  for (const c of SERVICE_CENTERS) {
    const centerId = uid(`service-center:${c.name}`);
    add(
      `INSERT INTO service_centers (id, name, address, city, phone, lat, lng, is_active) VALUES (${q(centerId)}, ${q(c.name)}, ${q(c.address)}, ${q(c.city)}, ${q(c.phone)}, ${c.lat}, ${c.lng}, TRUE) ON CONFLICT DO NOTHING;`,
    );
  }

  const faqCatId = uid('faq-category:orders');
  add(
    `INSERT INTO faq_categories (id, name, name_bn, sort_order) VALUES (${q(faqCatId)}, 'Orders & Delivery', 'অর্ডার ও ডেলিভারি', 0) ON CONFLICT DO NOTHING;`,
  );
  add(
    `INSERT INTO faq_items (id, category_id, question, question_bn, answer, answer_bn, sort_order) VALUES (${q(uid('faq-item:delivery'))}, ${q(faqCatId)}, 'How long does delivery take?', 'ডেলিভারি কত দিনে হয়?', 'Dhaka: 2-3 business days. Outside Dhaka: 5-7 business days. Cars require appointment for handover.', 'ঢাকা: ২-৩ কর্মদিবস। ঢাকার বাইরে: ৫-৭ কর্মদিবস। গাড়ির জন্য হ্যান্ডওভার অ্যাপয়েন্টমেন্ট প্রয়োজন।', 0) ON CONFLICT DO NOTHING;`,
  );
  add(
    `INSERT INTO faq_items (id, category_id, question, question_bn, answer, answer_bn, sort_order) VALUES (${q(uid('faq-item:payment'))}, ${q(faqCatId)}, 'What payment methods do you accept?', 'কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?', 'We accept bKash, Nagad, SSLCommerz (cards/mobile banking), and Cash on Delivery for parts under ৳50,000.', 'আমরা বিকাশ, নগদ, SSLCommerz (কার্ড/মোবাইল ব্যাংকিং) এবং ৳৫০,০০০ এর নিচে পার্টসের জন্য ক্যাশ অন ডেলিভারি গ্রহণ করি।', 1) ON CONFLICT DO NOTHING;`,
  );

  for (let i = 0; i < CHAT_QUICK_REPLIES.length; i++) {
    const reply = CHAT_QUICK_REPLIES[i];
    add(
      `INSERT INTO chat_quick_replies (id, title, content, sort_order, is_active) VALUES (${q(uid(`chat-quick-reply:${i}`))}, ${q(reply.title)}, ${q(reply.content)}, ${i}, TRUE) ON CONFLICT DO NOTHING;`,
    );
  }

  add(
    `INSERT INTO coupons (id, code, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at, is_active) VALUES (${q(uid('coupon:welcome10'))}, 'WELCOME10', 'PERCENT', 10, 5000, 1000, 0, ${qDate('2026-12-31')}, TRUE) ON CONFLICT (code) DO NOTHING;`,
  );

  add('COMMIT;');
}

function main() {
  const migrationPath = path.join(__dirname, '../migrations/20260702185231_init/migration.sql');
  const outPath = path.join(__dirname, '../database/autohub_bd.sql');
  const schema = fs.readFileSync(migrationPath, 'utf8');

  buildSeedSql();

  const header = `-- AutoHub BD PostgreSQL database (schema + seed data)
-- Generated: ${new Date().toISOString()}
-- Restore on a fresh database:
--   npm run db:restore
--
-- Default admin login:
--   Email:    admin@autohub.bd
--   Password: AutoHub@Admin2026
--
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${header}\n${schema}\n\n${lines.join('\n')}\n`, 'utf8');

  const sizeKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`✅ Wrote ${outPath} (${sizeKb} KB)`);
}

main();
