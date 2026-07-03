import { z } from 'zod';
import { ProductType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { slugify } from '../lib/security';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  carModel: { include: { brand: true } },
  carVariant: true,
  part: { include: { category: true, images: true } },
};

function mapAdminProduct(p: {
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
  createdAt: Date;
  updatedAt: Date;
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
  carModel?: { id: string; name: string; slug: string; brand?: { id: string; name: string; slug: string } } | null;
  carVariant?: { id: string; trim: string; color: string; sku: string } | null;
  part?: {
    id: string;
    name: string;
    slug: string;
    partNumber: string;
    description: string | null;
    descriptionBn: string | null;
    compatibleBrands?: string[];
    compatibleModels?: string[];
    category?: { id: string; name: string; slug: string };
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
    thumbnailUrl: p.thumbnailUrl,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    carModelId: p.carModelId,
    carVariantId: p.carVariantId,
    partId: p.partId,
    images: p.images.map((i) => i.url),
    carModel: p.carModel,
    carVariant: p.carVariant,
    part: p.part
      ? {
          id: p.part.id,
          name: p.part.name,
          slug: p.part.slug,
          partNumber: p.part.partNumber,
          description: p.part.description,
          descriptionBn: p.part.descriptionBn,
          compatibleBrands: p.part.compatibleBrands,
          compatibleModels: p.part.compatibleModels,
          category: p.part.category,
        }
      : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function isValidImageRef(val: string) {
  if (val.startsWith('/uploads/')) return true;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

const imageRefSchema = z.string().refine(isValidImageRef, {
  message: 'Image must be a valid web URL or an image uploaded from the admin panel.',
});

const partMetaSchema = z.object({
  categoryId: z.string().uuid('Please select a valid part category.'),
  partNumber: z.string().min(2, 'Part number must be at least 2 characters.'),
  description: z.string().optional(),
  descriptionBn: z.string().optional(),
  compatibleBrands: z.array(z.string()).optional(),
  compatibleModels: z.array(z.string()).optional(),
  compatibleYearFrom: z.number().int().optional(),
  compatibleYearTo: z.number().int().optional(),
});

const createProductSchema = z.union([
  z.object({
    type: z.literal('CAR'),
    name: z.string().min(2, 'Product name is required.'),
    slug: z.string().optional(),
    sku: z.string().optional(),
    price: z.number().positive('Price must be greater than zero.'),
    compareAtPrice: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0, 'Stock cannot be negative.'),
    thumbnailUrl: imageRefSchema.optional().or(z.literal('')),
    imageUrls: z.array(imageRefSchema).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    carVariantId: z.string().uuid('Please select a car variant.'),
  }),
  z.object({
    type: z.literal('PART'),
    name: z.string().min(2, 'Product name is required.'),
    slug: z.string().optional(),
    sku: z.string().optional(),
    price: z.number().positive('Price must be greater than zero.'),
    compareAtPrice: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0, 'Stock cannot be negative.'),
    thumbnailUrl: imageRefSchema.optional().or(z.literal('')),
    imageUrls: z.array(imageRefSchema).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    partId: z.string().uuid().optional(),
    part: partMetaSchema.optional(),
  }),
]).superRefine((data, ctx) => {
  if (data.type === 'PART' && !data.partId && !data.part) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select an existing part or enter new part details.',
      path: ['partId'],
    });
  }
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  sku: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  thumbnailUrl: imageRefSchema.optional().or(z.literal('')).nullable(),
  imageUrls: z.array(imageRefSchema).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  carVariantId: z.string().uuid().optional(),
  part: partMetaSchema.partial().optional(),
});

function parseImages(thumbnailUrl?: string | null, imageUrls?: string[]) {
  const urls = [...(imageUrls || [])];
  if (thumbnailUrl && !urls.includes(thumbnailUrl)) {
    urls.unshift(thumbnailUrl);
  }
  return urls.filter(Boolean);
}

export async function getProductFormOptions() {
  const [brands, partCategories, parts] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        models: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            variants: {
              where: { isActive: true },
              orderBy: { trim: 'asc' },
            },
          },
        },
      },
    }),
    prisma.partCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.part.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, partNumber: true, categoryId: true, price: true, stock: true },
      take: 200,
    }),
  ]);

  return {
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      models: b.models.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        variants: m.variants.map((v) => ({
          id: v.id,
          trim: v.trim,
          color: v.color,
          sku: v.sku,
          price: Number(v.price),
          stock: v.stock,
        })),
      })),
    })),
    partCategories,
    parts: parts.map((p) => ({ ...p, price: Number(p.price) })),
  };
}

export async function getAdminProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });
  if (!product) return null;
  return mapAdminProduct(product);
}

export async function createAdminProduct(input: unknown) {
  const data = createProductSchema.parse(input);
  const slug = slugify(data.slug || data.name);
  const sku = (data.sku || `PROD-${slug}`).toUpperCase();
  const thumbnailUrl = data.thumbnailUrl || null;
  const imageUrls = parseImages(thumbnailUrl, data.imageUrls);

  if (data.type === 'CAR') {
    const variant = await prisma.carVariant.findUnique({
      where: { id: data.carVariantId },
      include: { carModel: true },
    });
    if (!variant) {
      throw new Error('The selected car variant was not found. Please pick another variant.');
    }

    const product = await prisma.product.create({
      data: {
        type: ProductType.CAR,
        name: data.name,
        slug,
        sku,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        stock: data.stock,
        thumbnailUrl: thumbnailUrl || imageUrls[0] || null,
        isFeatured: data.isFeatured ?? false,
        isActive: data.isActive ?? true,
        carModelId: variant.carModelId,
        carVariantId: variant.id,
        images: imageUrls.length
          ? { create: imageUrls.map((url, i) => ({ url, alt: data.name, sortOrder: i })) }
          : undefined,
      },
      include: productInclude,
    });

    await prisma.carVariant.update({
      where: { id: variant.id },
      data: { price: data.price, stock: data.stock },
    });

    return mapAdminProduct(product);
  }

  let partId = data.partId;
  if (!partId && data.part) {
    const partSlug = slugify(data.name);
    const part = await prisma.part.create({
      data: {
        categoryId: data.part.categoryId,
        name: data.name,
        slug: partSlug,
        partNumber: data.part.partNumber,
        price: data.price,
        stock: data.stock,
        description: data.part.description,
        descriptionBn: data.part.descriptionBn,
        compatibleBrands: data.part.compatibleBrands || [],
        compatibleModels: data.part.compatibleModels || [],
        compatibleYearFrom: data.part.compatibleYearFrom,
        compatibleYearTo: data.part.compatibleYearTo,
        images: thumbnailUrl || imageUrls[0]
          ? { create: [{ url: thumbnailUrl || imageUrls[0], alt: data.name, sortOrder: 0 }] }
          : undefined,
      },
    });
    partId = part.id;
  }

  if (!partId) {
    throw new Error('Select an existing part or enter new part details.');
  }

  const existingPart = await prisma.part.findUnique({ where: { id: partId } });
  if (!existingPart) {
    throw new Error('The selected part was not found. Please pick another part.');
  }

  const product = await prisma.product.create({
    data: {
      type: ProductType.PART,
      name: data.name,
      slug,
      sku,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      stock: data.stock,
      thumbnailUrl: thumbnailUrl || imageUrls[0] || null,
      isFeatured: data.isFeatured ?? false,
      isActive: data.isActive ?? true,
      partId,
      images: imageUrls.length
        ? { create: imageUrls.map((url, i) => ({ url, alt: data.name, sortOrder: i })) }
        : undefined,
    },
    include: productInclude,
  });

  await prisma.part.update({
    where: { id: partId },
    data: { price: data.price, stock: data.stock, name: data.name },
  });

  return mapAdminProduct(product);
}

export async function updateAdminProduct(id: string, input: unknown) {
  const data = updateProductSchema.parse(input);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { part: true, carVariant: true },
  });
  if (!existing) {
    throw new Error('Product not found. It may have been removed already.');
  }

  const slug = data.slug ? slugify(data.slug) : undefined;
  const thumbnailUrl = data.thumbnailUrl === '' ? null : data.thumbnailUrl;
  const imageUrls = data.imageUrls ? parseImages(thumbnailUrl ?? existing.thumbnailUrl, data.imageUrls) : null;

  let carModelId = existing.carModelId;
  let carVariantId = existing.carVariantId;

  if (data.carVariantId && existing.type === ProductType.CAR) {
    const variant = await prisma.carVariant.findUnique({ where: { id: data.carVariantId } });
    if (!variant) {
      throw new Error('The selected car variant was not found.');
    }
    carModelId = variant.carModelId;
    carVariantId = variant.id;
  }

  const product = await prisma.$transaction(async (tx) => {
    if (imageUrls) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imageUrls.length) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, i) => ({
            productId: id,
            url,
            alt: data.name || existing.name,
            sortOrder: i,
          })),
        });
      }
    }

    const updated = await tx.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(data.sku !== undefined ? { sku: data.sku.toUpperCase() } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.compareAtPrice !== undefined ? { compareAtPrice: data.compareAtPrice } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl: thumbnailUrl || imageUrls?.[0] || null } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(carModelId !== undefined ? { carModelId } : {}),
        ...(carVariantId !== undefined ? { carVariantId } : {}),
      },
      include: productInclude,
    });

    if (existing.type === ProductType.PART && existing.partId) {
      await tx.part.update({
        where: { id: existing.partId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.stock !== undefined ? { stock: data.stock } : {}),
          ...(data.part?.categoryId ? { categoryId: data.part.categoryId } : {}),
          ...(data.part?.partNumber ? { partNumber: data.part.partNumber } : {}),
          ...(data.part?.description !== undefined ? { description: data.part.description } : {}),
          ...(data.part?.descriptionBn !== undefined ? { descriptionBn: data.part.descriptionBn } : {}),
          ...(data.part?.compatibleBrands ? { compatibleBrands: data.part.compatibleBrands } : {}),
          ...(data.part?.compatibleModels ? { compatibleModels: data.part.compatibleModels } : {}),
        },
      });
    }

    if (existing.type === ProductType.CAR && (existing.carVariantId || carVariantId)) {
      const variantId = carVariantId || existing.carVariantId;
      if (variantId) {
        await tx.carVariant.update({
          where: { id: variantId },
          data: {
            ...(data.price !== undefined ? { price: data.price } : {}),
            ...(data.stock !== undefined ? { stock: data.stock } : {}),
          },
        });
      }
    }

    return updated;
  });

  return mapAdminProduct(product);
}

export async function deleteAdminProduct(id: string, hard = false) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true, cartItems: true } } },
  });
  if (!existing) {
    throw new Error('Product not found. It may have been removed already.');
  }

  const hasOrders = existing._count.orderItems > 0;

  if (!hard || hasOrders) {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: productInclude,
    });
    return { product: mapAdminProduct(product), removed: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.wishlistItem.deleteMany({ where: { productId: id } });
    await tx.cartItem.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  return { product: { id, name: existing.name }, removed: true };
}

export function formatProductError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.errors.map((e) => e.message).join(' ');
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      if (field.includes('slug')) return 'This product URL slug is already used. Choose a different name or slug.';
      if (field.includes('sku')) return 'This SKU is already used by another product.';
      if (field.includes('part_number')) return 'This part number is already used.';
      return 'A product with this value already exists. Check SKU, slug, or part number.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not save the product. Please check your inputs and try again.';
}
