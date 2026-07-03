import { Router, Request, Response } from 'express';
import { Prisma, ProductType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const router = Router();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function mapProduct(p: {
  id: string;
  type: ProductType;
  name: string;
  slug: string;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  stock: number;
  sku: string;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  carModelId: string | null;
  carVariantId: string | null;
  partId: string | null;
  images: { url: string; alt: string | null; sortOrder: number }[];
  carModel?: {
    id: string;
    name: string;
    slug: string;
    bodyType: string;
    heroImageUrl: string | null;
    videoUrl: string | null;
    model3dUrl: string | null;
    basePrice: Prisma.Decimal;
    description?: string | null;
    descriptionBn?: string | null;
    brand?: { id: string; name: string; slug: string; logoUrl: string | null };
  } | null;
  carVariant?: {
    id: string;
    trim: string;
    engine: string;
    transmission: string;
    fuelType: string;
    color: string;
    price: Prisma.Decimal;
    stock: number;
    sku: string;
  } | null;
  part?: {
    id: string;
    name: string;
    slug: string;
    partNumber: string;
    price: Prisma.Decimal;
    stock: number;
    description?: string | null;
    descriptionBn?: string | null;
    compatibleYearFrom?: number | null;
    compatibleYearTo?: number | null;
    category?: { id: string; name: string; slug: string };
    images: { url: string }[];
    compatibleBrands: string[];
    compatibleModels: string[];
  } | null;
}) {
  return {
    id: p.id,
    type: p.type,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    stock: p.stock,
    sku: p.sku,
    images: p.images.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url),
    thumbnailUrl: p.thumbnailUrl,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    carModel: p.carModel
      ? {
          id: p.carModel.id,
          name: p.carModel.name,
          slug: p.carModel.slug,
          bodyType: p.carModel.bodyType,
          heroImageUrl: p.carModel.heroImageUrl,
          videoUrl: p.carModel.videoUrl,
          model3dUrl: p.carModel.model3dUrl,
          basePrice: Number(p.carModel.basePrice),
          description: p.carModel.description,
          descriptionBn: p.carModel.descriptionBn,
          brand: p.carModel.brand,
        }
      : undefined,
    carVariant: p.carVariant
      ? {
          ...p.carVariant,
          price: Number(p.carVariant.price),
        }
      : undefined,
    part: p.part
      ? {
          id: p.part.id,
          name: p.part.name,
          slug: p.part.slug,
          partNumber: p.part.partNumber,
          price: Number(p.part.price),
          stock: p.part.stock,
          category: p.part.category,
          images: p.part.images.map((i) => i.url),
          compatibleBrands: p.part.compatibleBrands,
          compatibleModels: p.part.compatibleModels,
          description: p.part.description,
          descriptionBn: p.part.descriptionBn,
          compatibleYearFrom: p.part.compatibleYearFrom,
          compatibleYearTo: p.part.compatibleYearTo,
        }
      : undefined,
  };
}

const productInclude = {
  images: true,
  carModel: { include: { brand: true } },
  carVariant: true,
  part: { include: { category: true, images: true } },
} as const;

// GET /api/brands
router.get('/brands', async (_req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ success: true, data: brands });
});

// GET /api/brands/:slug
router.get('/brands/:slug', async (req: Request, res: Response) => {
  const brand = await prisma.brand.findUnique({
    where: { slug: param(req.params.slug) },
    include: {
      models: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!brand) {
    res.status(404).json({ success: false, error: 'Brand not found.' });
    return;
  }

  res.json({ success: true, data: brand });
});

// GET /api/cars — filter by brand, bodyType, price, fuel, transmission
router.get('/cars', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(48, Math.max(1, parseInt(String(req.query.pageSize || '12'), 10)));
  const brand = req.query.brand as string | undefined;
  const bodyType = req.query.bodyType as string | undefined;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  const fuelType = req.query.fuelType as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Prisma.ProductWhereInput = {
    type: 'CAR',
    isActive: true,
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(brand
      ? { carModel: { brand: { slug: brand } } }
      : {}),
    ...(bodyType ? { carModel: { bodyType: bodyType as never } } : {}),
    ...(fuelType ? { carVariant: { fuelType: fuelType as never } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { carModel: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map(mapProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// GET /api/cars/:brand/:model
router.get('/cars/:brand/:model', async (req: Request, res: Response) => {
  const carModel = await prisma.carModel.findFirst({
    where: {
      slug: param(req.params.model),
      brand: { slug: param(req.params.brand) },
      isActive: true,
    },
    include: {
      brand: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true } },
      products: {
        where: { isActive: true },
        include: productInclude,
      },
    },
  });

  if (!carModel) {
    res.status(404).json({
      success: false,
      error: 'Car model not found. Check the brand and model name in the URL.',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      ...carModel,
      basePrice: Number(carModel.basePrice),
      variants: carModel.variants.map((v: { price: Prisma.Decimal; [key: string]: unknown }) => ({
        ...v,
        price: Number(v.price),
      })),
      products: carModel.products.map((p) => mapProduct(p as Parameters<typeof mapProduct>[0])),
    },
  });
});

// GET /api/parts
router.get('/parts', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(48, Math.max(1, parseInt(String(req.query.pageSize || '12'), 10)));
  const category = req.query.category as string | undefined;
  const brand = req.query.brand as string | undefined;
  const model = req.query.model as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Prisma.ProductWhereInput = {
    type: 'PART',
    isActive: true,
    ...(category ? { part: { category: { slug: category } } } : {}),
    ...(brand ? { part: { compatibleBrands: { has: brand } } } : {}),
    ...(model ? { part: { compatibleModels: { has: model } } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { part: { partNumber: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map(mapProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// GET /api/part-categories
router.get('/part-categories', async (_req: Request, res: Response) => {
  const categories = await prisma.partCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { parts: true } } },
  });
  res.json({ success: true, data: categories });
});

// GET /api/products/featured
router.get('/products/featured', async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));

  const baseWhere: Prisma.ProductWhereInput = {
    isActive: true,
    ...(type ? { type: type as ProductType } : {}),
  };

  let products = await prisma.product.findMany({
    where: { ...baseWhere, isFeatured: true },
    include: productInclude,
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });

  if (type === 'CAR' && products.length < 3) {
    const fallback = await prisma.product.findMany({
      where: { ...baseWhere, type: 'CAR' },
      include: productInclude,
      take: limit,
      orderBy: [{ isFeatured: 'desc' }, { price: 'desc' }, { updatedAt: 'desc' }],
    });
    const seen = new Set<string>();
    const merged = [...products];
    for (const p of fallback) {
      const key = p.carModelId || p.id;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!merged.some((m) => m.id === p.id)) merged.push(p);
      if (merged.length >= limit) break;
    }
    products = merged.slice(0, limit);
  }

  res.json({ success: true, data: products.map(mapProduct) });
});

// GET /api/products/:slug
router.get('/products/:slug', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { slug: param(req.params.slug) },
    include: productInclude,
  });

  if (!product || !product.isActive) {
    res.status(404).json({
      success: false,
      error: 'Product not found or no longer available.',
    });
    return;
  }

  res.json({ success: true, data: mapProduct(product as Parameters<typeof mapProduct>[0]) });
});

export default router;
