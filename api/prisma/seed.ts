import { PrismaClient, BodyType, FuelType, TransmissionType, ProductType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  PARTS_CATALOG,
  CAR_MODEL_DESCRIPTIONS,
  carPhotoUrl,
  partPhotoUrl,
} from './data/catalog';

const prisma = new PrismaClient();

const FEATURED_MODEL_SLUGS = new Set([
  'corolla-cross',
  'tucson',
  'x-trail',
  'fortuner',
  'creta',
  'pony',
  'eu5',
]);

const PERMISSIONS = [
  { key: 'product.manage', description: 'Manage products, cars, and parts' },
  { key: 'order.manage', description: 'Manage orders and payments' },
  { key: 'appointment.manage', description: 'Manage service appointments' },
  { key: 'chat.respond', description: 'Respond to live chat' },
  { key: 'support.manage', description: 'Manage support tickets' },
  { key: 'user.manage', description: 'Manage customers' },
  { key: 'analytics.view', description: 'View analytics dashboard' },
  { key: 'admin.full', description: 'Full admin access' },
];

const PART_CATEGORIES = [
  { name: 'Engine', slug: 'engine', icon: 'engine' },
  { name: 'Brakes', slug: 'brakes', icon: 'brake' },
  { name: 'Suspension', slug: 'suspension', icon: 'suspension' },
  { name: 'Electronics', slug: 'electronics', icon: 'chip' },
  { name: 'Interior', slug: 'interior', icon: 'seat' },
  { name: 'Exterior', slug: 'exterior', icon: 'body' },
  { name: 'Wheels & Tires', slug: 'wheels-tires', icon: 'wheel' },
  { name: 'Lubricants', slug: 'lubricants', icon: 'oil' },
  { name: 'EV & Electric', slug: 'ev', icon: 'bolt' },
];

const BRANDS = [
  {
    name: 'Toyota',
    slug: 'toyota',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1699000000/brands/toyota-logo.png',
    heroVideoUrl: 'https://customer-abc123.cloudflarestream.com/toyota-hero/manifest/video.m3u8',
    description: 'Toyota — reliability, innovation, and the widest service network in Bangladesh.',
    descriptionBn: 'টয়োটা — নির্ভরযোগ্যতা, উদ্ভাবন এবং বাংলাদেশে সবচেয়ে বড় সার্ভিস নেটওয়ার্ক।',
    models: [
      { name: 'Corolla Cross', slug: 'corolla-cross', yearFrom: 2021, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 4850000, has3d: true },
      { name: 'Allion', slug: 'allion', yearFrom: 2018, yearTo: 2024, bodyType: 'SEDAN' as BodyType, basePrice: 3200000, has3d: true },
      { name: 'Premio', slug: 'premio', yearFrom: 2017, yearTo: 2023, bodyType: 'SEDAN' as BodyType, basePrice: 2950000, has3d: false },
      { name: 'Fortuner', slug: 'fortuner', yearFrom: 2020, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 7200000, has3d: true },
      { name: 'Rush', slug: 'rush', yearFrom: 2019, yearTo: 2024, bodyType: 'SUV' as BodyType, basePrice: 3650000, has3d: false },
      { name: 'Axio', slug: 'axio', yearFrom: 2016, yearTo: 2022, bodyType: 'SEDAN' as BodyType, basePrice: 2100000, has3d: false },
    ],
  },
  {
    name: 'Hyundai',
    slug: 'hyundai',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1699000000/brands/hyundai-logo.png',
    heroVideoUrl: 'https://customer-abc123.cloudflarestream.com/hyundai-hero/manifest/video.m3u8',
    description: 'Hyundai — bold design, advanced tech, and outstanding value.',
    descriptionBn: 'হুন্দাই — আধুনিক ডিজাইন, প্রযুক্তি এবং অসাধারণ মূল্য।',
    models: [
      { name: 'Tucson', slug: 'tucson', yearFrom: 2022, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 5500000, has3d: true },
      { name: 'Creta', slug: 'creta', yearFrom: 2021, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 4200000, has3d: true },
      { name: 'Elantra', slug: 'elantra', yearFrom: 2020, yearTo: 2024, bodyType: 'SEDAN' as BodyType, basePrice: 3800000, has3d: false },
      { name: 'Sonata', slug: 'sonata', yearFrom: 2019, yearTo: 2023, bodyType: 'SEDAN' as BodyType, basePrice: 4500000, has3d: false },
      { name: 'Santa Fe', slug: 'santa-fe', yearFrom: 2021, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 6800000, has3d: true },
      { name: 'i10', slug: 'i10', yearFrom: 2018, yearTo: 2023, bodyType: 'HATCHBACK' as BodyType, basePrice: 1650000, has3d: false },
    ],
  },
  {
    name: 'Nissan',
    slug: 'nissan',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1699000000/brands/nissan-logo.png',
    heroVideoUrl: 'https://customer-abc123.cloudflarestream.com/nissan-hero/manifest/video.m3u8',
    description: 'Nissan — performance, comfort, and iconic models for every driver.',
    descriptionBn: 'নিসান — পারফরম্যান্স, আরাম এবং প্রতিটি চালকের জন্য আইকনিক মডেল।',
    models: [
      { name: 'X-Trail', slug: 'x-trail', yearFrom: 2021, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 5800000, has3d: true },
      { name: 'Sunny', slug: 'sunny', yearFrom: 2018, yearTo: 2023, bodyType: 'SEDAN' as BodyType, basePrice: 2400000, has3d: false },
      { name: 'Navara', slug: 'navara', yearFrom: 2020, yearTo: 2025, bodyType: 'PICKUP' as BodyType, basePrice: 5200000, has3d: true },
      { name: 'Kicks', slug: 'kicks', yearFrom: 2021, yearTo: 2024, bodyType: 'SUV' as BodyType, basePrice: 3900000, has3d: false },
      { name: 'Teana', slug: 'teana', yearFrom: 2017, yearTo: 2022, bodyType: 'SEDAN' as BodyType, basePrice: 3500000, has3d: false },
      { name: 'Magnite', slug: 'magnite', yearFrom: 2022, yearTo: 2025, bodyType: 'SUV' as BodyType, basePrice: 2800000, has3d: false },
    ],
  },
  {
    name: 'BAW',
    slug: 'baw',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1699000000/brands/baw-logo.png',
    heroVideoUrl: 'https://customer-abc123.cloudflarestream.com/baw-hero/manifest/video.m3u8',
    description: 'BAW — affordable electric mobility for Bangladesh. City EVs, sedans, SUVs, and commercial vans with zero emissions.',
    descriptionBn: 'BAW — বাংলাদেশের জন্য সাশ্রয়ী ইলেকট্রিক গাড়ি। শূন্য নির্গমন, কম চলানো খরচ।',
    isEv: true,
    models: [
      { name: 'Pony', slug: 'pony', yearFrom: 2023, yearTo: 2026, bodyType: 'HATCHBACK' as BodyType, basePrice: 1850000, has3d: true },
      { name: 'EC3', slug: 'ec3', yearFrom: 2023, yearTo: 2026, bodyType: 'SEDAN' as BodyType, basePrice: 2450000, has3d: true },
      { name: 'EU5', slug: 'eu5', yearFrom: 2024, yearTo: 2026, bodyType: 'SUV' as BodyType, basePrice: 3200000, has3d: true },
      { name: 'EV6 Cargo', slug: 'ev6-cargo', yearFrom: 2023, yearTo: 2026, bodyType: 'VAN' as BodyType, basePrice: 2650000, has3d: false },
    ],
  },
];

const TRIMS = [
  { trim: 'Base', engine: '1.5L 4-Cyl', transmission: 'MANUAL' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 0 },
  { trim: 'G', engine: '1.8L 4-Cyl', transmission: 'CVT' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 250000 },
  { trim: 'S', engine: '2.0L 4-Cyl', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 450000 },
  { trim: 'Hybrid', engine: '1.8L Hybrid', transmission: 'CVT' as TransmissionType, fuel: 'HYBRID' as FuelType, priceMod: 800000 },
];

const EV_TRIMS = [
  { trim: 'Standard Range', engine: '60 kW Motor', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'ELECTRIC' as FuelType, priceMod: 0 },
  { trim: 'Long Range', engine: '100 kW Motor', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'ELECTRIC' as FuelType, priceMod: 350000 },
];

const EV_COLORS = [
  { name: 'Arctic White', hex: '#F8FAFC' },
  { name: 'Midnight Blue', hex: '#1E3A5F' },
  { name: 'Eco Green', hex: '#059669' },
];

const COLORS = [
  { name: 'Pearl White', hex: '#F5F5F5' },
  { name: 'Midnight Black', hex: '#1A1A1A' },
  { name: 'Silver Metallic', hex: '#C0C0C0' },
  { name: 'Crimson Red', hex: '#8B0000' },
];


function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}


async function main() {
  console.log('🌱 Seeding AutoHub BD database...\n');

  // Permissions & roles
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  const allPerms = await prisma.permission.findMany();
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: { name: 'super_admin', description: 'Full platform access' },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff', description: 'Limited staff access' },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: { name: 'moderator', description: 'Product catalog management' },
  });

  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  const staffPermKeys = ['order.manage', 'chat.respond', 'appointment.manage', 'support.manage'];
  for (const perm of allPerms.filter((p) => staffPermKeys.includes(p.key))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: staffRole.id, permissionId: perm.id },
    });
  }

  const productPerm = allPerms.find((p) => p.key === 'product.manage');
  if (productPerm) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: moderatorRole.id, permissionId: productPerm.id } },
      update: {},
      create: { roleId: moderatorRole.id, permissionId: productPerm.id },
    });
  }

  // Secure admin — random password, must change on first login
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(12).toString('base64url');
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@autohub.bd';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      mustChangePassword: !process.env.ADMIN_SEED_PASSWORD,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'AutoHub Admin',
      phone: '01700000000',
      emailVerified: true,
      mustChangePassword: !process.env.ADMIN_SEED_PASSWORD,
    },
  });

  await prisma.adminUser.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole.id },
  });

  console.log('═══════════════════════════════════════════');
  console.log('  ADMIN CREDENTIALS (save these now!)');
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('  ⚠️  Must change password on first login');
  console.log('═══════════════════════════════════════════\n');

  // Part categories
  const categoryMap: Record<string, string> = {};
  for (let i = 0; i < PART_CATEGORIES.length; i++) {
    const cat = PART_CATEGORIES[i];
    const created = await prisma.partCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, sortOrder: i },
    });
    categoryMap[cat.slug] = created.id;
  }

  // Brands, models, variants, car products
  let productCount = 0;

  for (let bi = 0; bi < BRANDS.length; bi++) {
    const b = BRANDS[bi];
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        heroVideoUrl: b.heroVideoUrl,
        description: b.description,
        descriptionBn: b.descriptionBn,
        sortOrder: bi,
      },
    });

    for (const m of b.models) {
      const modelDesc = CAR_MODEL_DESCRIPTIONS[m.slug] || {
        description: `${m.name} — premium ${m.bodyType.toLowerCase()} from ${b.name}.`,
        descriptionBn: `${m.name} — ${b.name} এর প্রিমিয়াম ${m.bodyType}।`,
      };
      const heroImage = carPhotoUrl(b.slug, m.slug);

      const carModel = await prisma.carModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: m.slug } },
        update: {
          description: modelDesc.description,
          descriptionBn: modelDesc.descriptionBn,
          heroImageUrl: heroImage,
          basePrice: m.basePrice,
        },
        create: {
          brandId: brand.id,
          name: m.name,
          slug: m.slug,
          yearFrom: m.yearFrom,
          yearTo: m.yearTo,
          bodyType: m.bodyType,
          basePrice: m.basePrice,
          heroImageUrl: heroImage,
          videoUrl: `https://customer-abc123.cloudflarestream.com/${b.slug}-${m.slug}/manifest/video.m3u8`,
          model3dUrl: m.has3d
            ? `https://res.cloudinary.com/demo/raw/upload/v1699000000/models/${b.slug}-${m.slug}.glb`
            : null,
          description: modelDesc.description,
          descriptionBn: modelDesc.descriptionBn,
        },
      });

      for (let i = 0; i < 3; i++) {
        const imageUrl = carPhotoUrl(b.slug, m.slug);
        await prisma.carModelImage.create({
          data: {
            carModelId: carModel.id,
            url: imageUrl,
            alt: `${m.name} view ${i + 1}`,
            sortOrder: i,
          },
        }).catch(() => {});
      }

      for (const t of ((b as { isEv?: boolean }).isEv ? EV_TRIMS : TRIMS.slice(0, 2))) {
        for (const c of ((b as { isEv?: boolean }).isEv ? EV_COLORS.slice(0, 2) : COLORS.slice(0, 2))) {
          const sku = `CAR-${b.slug.toUpperCase().slice(0, 3)}-${m.slug}-${slugify(t.trim)}-${slugify(c.name)}`.toUpperCase();
          const price = m.basePrice + t.priceMod;
          const stock = Math.floor(Math.random() * 5) + 1;

          const variant = await prisma.carVariant.upsert({
            where: { sku },
            update: { price, stock, carModelId: carModel.id },
            create: {
              carModelId: carModel.id,
              trim: t.trim,
              engine: t.engine,
              transmission: t.transmission,
              fuelType: t.fuel,
              color: c.name,
              colorHex: c.hex,
              price,
              stock,
              sku,
            },
          });

          const productSlug = `${b.slug}-${m.slug}-${slugify(t.trim)}-${slugify(c.name)}`;
          const thumbUrl = carPhotoUrl(b.slug, m.slug);
          const product = await prisma.product.upsert({
            where: { slug: productSlug },
            update: {
              price,
              stock: variant.stock,
              thumbnailUrl: thumbUrl,
              isFeatured: FEATURED_MODEL_SLUGS.has(m.slug)
                && (t.trim === 'G' || t.trim === 'Long Range' || t.trim === 'Standard'),
              carModelId: carModel.id,
              carVariantId: variant.id,
            },
            create: {
              type: ProductType.CAR,
              name: `${b.name} ${m.name} ${t.trim} — ${c.name}`,
              slug: productSlug,
              price,
              stock: variant.stock,
              sku: `PROD-${sku}`,
              thumbnailUrl: thumbUrl,
              isFeatured: FEATURED_MODEL_SLUGS.has(m.slug)
                && (t.trim === 'G' || t.trim === 'Long Range' || t.trim === 'Standard'),
              carModelId: carModel.id,
              carVariantId: variant.id,
            },
          });

          await prisma.productImage.deleteMany({ where: { productId: product.id } });
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: thumbUrl,
              alt: product.name,
              sortOrder: 0,
            },
          });

          productCount++;
        }
      }
    }
  }

  // Parts products — 56 items with 4K images & detailed descriptions
  let partIndex = 0;
  for (const item of PARTS_CATALOG) {
    const categoryId = categoryMap[item.category];
    if (!categoryId) continue;

    const imageUrl = partPhotoUrl(item.category, item.photoIndex ?? partIndex, item.slug);
    const productSlug = `part-${item.slug}`;

    const part = await prisma.part.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        price: item.price,
        stock: item.stock,
        description: item.description,
        descriptionBn: item.descriptionBn,
        compatibleBrands: item.compatibleBrands,
        compatibleModels: item.compatibleModels,
        compatibleYearFrom: item.compatibleYearFrom,
        compatibleYearTo: item.compatibleYearTo,
      },
      create: {
        categoryId,
        name: item.name,
        slug: item.slug,
        partNumber: item.partNumber,
        price: item.price,
        stock: item.stock,
        description: item.description,
        descriptionBn: item.descriptionBn,
        compatibleBrands: item.compatibleBrands,
        compatibleModels: item.compatibleModels,
        compatibleYearFrom: item.compatibleYearFrom,
        compatibleYearTo: item.compatibleYearTo,
      },
    });

    await prisma.partImage.deleteMany({ where: { partId: part.id } });
    await prisma.partImage.create({
      data: {
        partId: part.id,
        url: imageUrl,
        alt: item.name,
        sortOrder: 0,
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: productSlug },
      update: {
        name: item.name,
        price: item.price,
        stock: item.stock,
        thumbnailUrl: imageUrl,
        isFeatured: !!item.isFeatured,
      },
      create: {
        type: ProductType.PART,
        name: item.name,
        slug: productSlug,
        price: item.price,
        stock: item.stock,
        sku: `PROD-${item.partNumber}`,
        thumbnailUrl: imageUrl,
        isFeatured: !!item.isFeatured,
        partId: part.id,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        alt: item.name,
        sortOrder: 0,
      },
    });

    productCount++;
    partIndex++;
  }

  // Service centers
  const centers = [
    { name: 'AutoHub Gulshan', address: 'Road 90, Gulshan-2', city: 'Dhaka', phone: '01711111111', lat: 23.7925, lng: 90.4078 },
    { name: 'AutoHub Chittagong', address: 'Agrabad C/A', city: 'Chittagong', phone: '01722222222', lat: 22.3569, lng: 91.7832 },
    { name: 'AutoHub Sylhet', address: 'Zindabazar', city: 'Sylhet', phone: '01733333333', lat: 24.8949, lng: 91.8687 },
  ];

  for (const c of centers) {
    await prisma.serviceCenter.create({ data: c }).catch(() => {});
  }

  // FAQ
  const faqCat = await prisma.faqCategory.create({
    data: {
      name: 'Orders & Delivery',
      nameBn: 'অর্ডার ও ডেলিভারি',
      items: {
        create: [
          {
            question: 'How long does delivery take?',
            questionBn: 'ডেলিভারি কত দিনে হয়?',
            answer: 'Dhaka: 2-3 business days. Outside Dhaka: 5-7 business days. Cars require appointment for handover.',
            answerBn: 'ঢাকা: ২-৩ কর্মদিবস। ঢাকার বাইরে: ৫-৭ কর্মদিবস। গাড়ির জন্য হ্যান্ডওভার অ্যাপয়েন্টমেন্ট প্রয়োজন।',
            sortOrder: 0,
          },
          {
            question: 'What payment methods do you accept?',
            questionBn: 'কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?',
            answer: 'We accept bKash, Nagad, SSLCommerz (cards/mobile banking), and Cash on Delivery for parts under ৳50,000.',
            answerBn: 'আমরা বিকাশ, নগদ, SSLCommerz (কার্ড/মোবাইল ব্যাংকিং) এবং ৳৫০,০০০ এর নিচে পার্টসের জন্য ক্যাশ অন ডেলিভারি গ্রহণ করি।',
            sortOrder: 1,
          },
        ],
      },
    },
  });

  // Chat quick replies
  const quickReplies = [
    { title: 'Delivery time', content: 'Parts: 2-7 business days depending on location. Cars: schedule a handover appointment after payment confirmation.' },
    { title: 'Part availability', content: 'Let me check stock for you. Please share the part number or your car model and year.' },
    { title: 'Service booking', content: 'You can book a service appointment at autohub.bd/service or I can help you schedule one now.' },
  ];

  for (let i = 0; i < quickReplies.length; i++) {
    await prisma.chatQuickReply.create({ data: { ...quickReplies[i], sortOrder: i } });
  }

  // Sample coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderValue: 5000,
      maxUses: 1000,
      expiresAt: new Date('2026-12-31'),
    },
  });

  console.log(`✅ Seeded ${productCount} products (${PARTS_CATALOG.length} parts) across ${BRANDS.length} brands`);
  console.log(`✅ ${PART_CATEGORIES.length} part categories`);
  console.log(`✅ ${centers.length} service centers`);
  console.log(`✅ FAQ category: ${faqCat.name}`);
  console.log('\n🚀 Run: npm run dev');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
