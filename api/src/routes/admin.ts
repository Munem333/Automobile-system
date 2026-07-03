import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { productImageUpload } from '../middleware/upload';
import {
  createAdminProduct,
  deleteAdminProduct,
  formatProductError,
  getAdminProduct,
  getProductFormOptions,
  updateAdminProduct,
} from '../services/productAdminService';
import {
  createTeamMember,
  formatAdminUserError,
  listAssignableRoles,
  listTeamMembers,
  removeTeamMember,
  updateCustomer,
  updateTeamMember,
} from '../services/adminUserService';

const router = Router();

router.use(authenticate);

// GET /api/admin/dashboard
router.get('/dashboard', requirePermission('analytics.view'), async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    ordersToday,
    pendingAppointments,
    activeChats,
    openTickets,
    lowStockProducts,
    totalRevenue,
    revenueToday,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
    prisma.chatSession.count({ where: { isActive: true } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalOrders,
      ordersToday,
      pendingAppointments,
      activeChats,
      openTickets,
      lowStockProducts,
      totalRevenue: Number(totalRevenue._sum.total || 0),
      revenueToday: Number(revenueToday._sum.total || 0),
    },
  });
});

// GET /api/admin/analytics
router.get('/analytics', requirePermission('analytics.view'), async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
    select: { total: true, createdAt: true, items: { select: { productName: true } } },
  });

  const revenueByDay: Record<string, number> = {};
  orders.forEach((o) => {
    const day = o.createdAt.toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total);
  });

  const topProducts: Record<string, number> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      topProducts[item.productName] = (topProducts[item.productName] || 0) + 1;
    });
  });

  const sortedProducts = Object.entries(topProducts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  res.json({
    success: true,
    data: {
      revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
      topProducts: sortedProducts,
    },
  });
});

// GET /api/admin/orders
router.get('/orders', requirePermission('order.manage'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: 'desc' },
    include: { items: true, user: { select: { fullName: true, email: true } } },
    take: 50,
  });
  res.json({
    success: true,
    data: orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      total: Number(o.total),
      items: o.items.map((i) => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    })),
  });
});

const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
});

// PATCH /api/admin/orders/:id
router.patch('/orders/:id', requirePermission('order.manage'), asyncHandler(async (req, res) => {
  const parsed = orderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(' '),
    });
    return;
  }
  const order = await prisma.order.update({
    where: { id: String(req.params.id) },
    data: { status: parsed.data.status },
  });
  await writeAuditLog(req, 'order.status_update', 'order', order.id, {
    status: parsed.data.status,
  });
  res.json({ success: true, data: order });
}));

// POST /api/admin/uploads/image
router.post('/uploads/image', requirePermission('product.manage'), (req, res, next) => {
  productImageUpload.single('image')(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Could not upload image.';
      res.status(400).json({ success: false, error: message });
      return;
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'No image was selected. Please choose a JPG, PNG, WebP, or GIF file.',
    });
    return;
  }
  const url = `/uploads/products/${req.file.filename}`;
  await writeAuditLog(req, 'product.image_upload', 'upload', req.file.filename, { url });
  res.json({ success: true, data: { url } });
}));

// GET /api/admin/products/form-options
router.get('/products/form-options', requirePermission('product.manage'), async (_req, res) => {
  const data = await getProductFormOptions();
  res.json({ success: true, data });
});

// GET /api/admin/products
router.get('/products', requirePermission('product.manage'), async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  const type = req.query.type as string | undefined;
  const search = req.query.search as string | undefined;

  const where = {
    ...(type === 'CAR' || type === 'PART' ? { type: type as 'CAR' | 'PART' } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { carModel: { include: { brand: true } }, part: { include: { category: true } }, images: true },
    }),
    prisma.product.count({ where }),
  ]);
  res.json({
    success: true,
    data: {
      items: items.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price),
        stock: p.stock,
        thumbnailUrl: p.thumbnailUrl,
        isFeatured: p.isFeatured,
        isActive: p.isActive,
        carModel: p.carModel,
        part: p.part,
        images: p.images.map((i) => i.url),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// GET /api/admin/products/:id
router.get('/products/:id', requirePermission('product.manage'), async (req, res) => {
  const product = await getAdminProduct(String(req.params.id));
  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found.' });
    return;
  }
  res.json({ success: true, data: product });
});

// POST /api/admin/products
router.post('/products', requirePermission('product.manage'), async (req, res) => {
  try {
    const product = await createAdminProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: formatProductError(err) });
  }
});

// PATCH /api/admin/products/:id
router.patch('/products/:id', requirePermission('product.manage'), async (req, res) => {
  try {
    const product = await updateAdminProduct(String(req.params.id), req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    const message = formatProductError(err);
    res.status(message.includes('not found') ? 404 : 400).json({ success: false, error: message });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', requirePermission('product.manage'), async (req, res) => {
  try {
    const hard = req.query.hard === 'true';
    const result = await deleteAdminProduct(String(req.params.id), hard);
    res.json({
      success: true,
      data: result,
      message: result.removed
        ? 'Product permanently removed.'
        : 'Product deactivated. It will no longer appear in the store.',
    });
  } catch (err) {
    const message = formatProductError(err);
    res.status(message.includes('not found') ? 404 : 400).json({ success: false, error: message });
  }
});

// GET /api/admin/team
router.get('/team', requirePermission('admin.full'), asyncHandler(async (_req, res) => {
  const members = await listTeamMembers();
  res.json({ success: true, data: members });
}));

// GET /api/admin/team/roles
router.get('/team/roles', requirePermission('admin.full'), asyncHandler(async (_req, res) => {
  const roles = await listAssignableRoles();
  res.json({ success: true, data: roles });
}));

// POST /api/admin/team
router.post('/team', requirePermission('admin.full'), asyncHandler(async (req, res) => {
  try {
    const result = await createTeamMember(req.body);
    await writeAuditLog(req, 'admin.team.create', 'admin_user', result.member.id, {
      email: result.member.email,
      role: result.member.role,
    });
    res.status(201).json({
      success: true,
      data: result.member,
      temporaryPassword: result.temporaryPassword,
      message: result.temporaryPassword
        ? 'Team member created. Share the temporary password — they must change it on first login.'
        : 'Team member created successfully.',
    });
  } catch (err) {
    res.status(400).json({ success: false, error: formatAdminUserError(err) });
  }
}));

// PATCH /api/admin/team/:id
router.patch('/team/:id', requirePermission('admin.full'), asyncHandler(async (req: AuthRequest, res) => {
  try {
    const member = await updateTeamMember(String(req.params.id), req.body, req.user!.userId);
    await writeAuditLog(req, 'admin.team.update', 'admin_user', member.id, req.body);
    res.json({ success: true, data: member });
  } catch (err) {
    const message = formatAdminUserError(err);
    res.status(message.includes('not found') ? 404 : 400).json({ success: false, error: message });
  }
}));

// DELETE /api/admin/team/:id
router.delete('/team/:id', requirePermission('admin.full'), asyncHandler(async (req: AuthRequest, res) => {
  try {
    const removed = await removeTeamMember(String(req.params.id), req.user!.userId);
    await writeAuditLog(req, 'admin.team.remove', 'admin_user', removed.id, {
      email: removed.email,
      role: removed.role,
    });
    res.json({
      success: true,
      data: removed,
      message: 'Admin access removed. The user account still exists but can no longer access the admin panel.',
    });
  } catch (err) {
    const message = formatAdminUserError(err);
    res.status(message.includes('not found') ? 404 : 400).json({ success: false, error: message });
  }
}));

// GET /api/admin/customers
router.get('/customers', requirePermission('user.manage'), async (req, res) => {
  const search = String(req.query.search || '').trim();
  const users = await prisma.user.findMany({
    where: {
      adminUser: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  res.json({ success: true, data: users });
});

// PATCH /api/admin/customers/:id
router.patch('/customers/:id', requirePermission('user.manage'), asyncHandler(async (req, res) => {
  try {
    const customer = await updateCustomer(String(req.params.id), req.body);
    await writeAuditLog(req, 'customer.update', 'user', customer.id, req.body);
    res.json({
      success: true,
      data: customer,
      message: customer.isActive ? 'Customer account activated.' : 'Customer account deactivated.',
    });
  } catch (err) {
    const message = formatAdminUserError(err);
    res.status(message.includes('not found') ? 404 : 400).json({ success: false, error: message });
  }
}));

export default router;
