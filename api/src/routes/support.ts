import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

const ticketSchema = z.object({
  name: z.string().min(2, 'Please enter your name.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  message: z.string().min(20, 'Please describe your issue in at least 20 characters so we can help you better.'),
});

// GET /api/support/faq
router.get('/faq', async (_req, res) => {
  const categories = await prisma.faqCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });
  res.json({ success: true, data: categories });
});

// POST /api/support/tickets
router.post('/tickets', optionalAuth, async (req: AuthRequest, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(' '),
    });
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user?.userId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });

  res.status(201).json({
    success: true,
    data: { id: ticket.id, status: ticket.status },
    message: 'Your support ticket has been submitted. We will respond within 24 hours.',
  });
});

// Admin: list tickets
router.get('/admin/tickets', authenticate, requirePermission('support.manage'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { fullName: true } } },
  });
  res.json({ success: true, data: tickets });
});

// Admin: update ticket
router.patch('/admin/tickets/:id', authenticate, requirePermission('support.manage'), async (req, res) => {
  const { status, priority } = req.body;
  const data: { status?: never; priority?: never } = {};
  if (status) data.status = status;
  if (priority) data.priority = priority;

  const ticket = await prisma.supportTicket.update({
    where: { id: String(req.params.id) },
    data,
  });
  res.json({ success: true, data: ticket });
});

export default router;
