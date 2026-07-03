import { BodyType, FuelType, TransmissionType } from '@prisma/client';

export const FEATURED_MODEL_SLUGS = new Set([
  'corolla-cross',
  'tucson',
  'x-trail',
  'fortuner',
  'creta',
  'pony',
  'eu5',
]);

export const PERMISSIONS = [
  { key: 'product.manage', description: 'Manage products, cars, and parts' },
  { key: 'order.manage', description: 'Manage orders and payments' },
  { key: 'appointment.manage', description: 'Manage service appointments' },
  { key: 'chat.respond', description: 'Respond to live chat' },
  { key: 'support.manage', description: 'Manage support tickets' },
  { key: 'user.manage', description: 'Manage customers' },
  { key: 'analytics.view', description: 'View analytics dashboard' },
  { key: 'admin.full', description: 'Full admin access' },
];

export const PART_CATEGORIES = [
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

export const BRANDS = [
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

export const TRIMS = [
  { trim: 'Base', engine: '1.5L 4-Cyl', transmission: 'MANUAL' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 0 },
  { trim: 'G', engine: '1.8L 4-Cyl', transmission: 'CVT' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 250000 },
  { trim: 'S', engine: '2.0L 4-Cyl', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'PETROL' as FuelType, priceMod: 450000 },
  { trim: 'Hybrid', engine: '1.8L Hybrid', transmission: 'CVT' as TransmissionType, fuel: 'HYBRID' as FuelType, priceMod: 800000 },
];

export const EV_TRIMS = [
  { trim: 'Standard Range', engine: '60 kW Motor', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'ELECTRIC' as FuelType, priceMod: 0 },
  { trim: 'Long Range', engine: '100 kW Motor', transmission: 'AUTOMATIC' as TransmissionType, fuel: 'ELECTRIC' as FuelType, priceMod: 350000 },
];

export const EV_COLORS = [
  { name: 'Arctic White', hex: '#F8FAFC' },
  { name: 'Midnight Blue', hex: '#1E3A5F' },
  { name: 'Eco Green', hex: '#059669' },
];

export const COLORS = [
  { name: 'Pearl White', hex: '#F5F5F5' },
  { name: 'Midnight Black', hex: '#1A1A1A' },
  { name: 'Silver Metallic', hex: '#C0C0C0' },
  { name: 'Crimson Red', hex: '#8B0000' },
];

export const SERVICE_CENTERS = [
  { name: 'AutoHub Gulshan', address: 'Road 90, Gulshan-2', city: 'Dhaka', phone: '01711111111', lat: 23.7925, lng: 90.4078 },
  { name: 'AutoHub Chittagong', address: 'Agrabad C/A', city: 'Chittagong', phone: '01722222222', lat: 22.3569, lng: 91.7832 },
  { name: 'AutoHub Sylhet', address: 'Zindabazar', city: 'Sylhet', phone: '01733333333', lat: 24.8949, lng: 91.8687 },
];

export const CHAT_QUICK_REPLIES = [
  { title: 'Delivery time', content: 'Parts: 2-7 business days depending on location. Cars: schedule a handover appointment after payment confirmation.' },
  { title: 'Part availability', content: 'Let me check stock for you. Please share the part number or your car model and year.' },
  { title: 'Service booking', content: 'You can book a service appointment at autohub.bd/service or I can help you schedule one now.' },
];

export const ADMIN_EMAIL = 'admin@autohub.bd';
export const ADMIN_PASSWORD_HASH = '$2a$12$cnL2jXXtn8AB.cEi8g8u9.kEKQJQf5GK4.T2WdOfy0TwNl7OrH4Gi';

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
