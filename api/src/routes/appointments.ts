import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00',
];

const bookSchema = z.object({
  serviceCenterId: z.string().uuid('Please select a valid service center.'),
  serviceType: z.enum([
    'CHECKUP', 'OIL_CHANGE', 'REPAIR', 'PART_INSTALLATION',
    'TIRE_SERVICE', 'AC_SERVICE', 'BODY_WORK',
  ], { errorMap: () => ({ message: 'Please select a service type.' }) }),
  carBrand: z.string().min(1, 'Please enter your car brand (e.g. Toyota).'),
  carModel: z.string().min(1, 'Please enter your car model (e.g. Corolla).'),
  carYear: z.number().int().min(1990).max(2030).optional(),
  issueDescription: z.string().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a valid date.'),
  preferredTime: z.string().min(1, 'Please select a time slot.'),
  contactName: z.string().min(2, 'Please enter your full name.'),
  contactPhone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'Please enter a valid Bangladesh mobile number.'),
  contactEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
});

// GET /api/appointments/service-centers
router.get('/service-centers', async (_req, res) => {
  const centers = await prisma.serviceCenter.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: centers });
});

// GET /api/appointments/slots?serviceCenterId=&date=
router.get('/slots', async (req, res) => {
  const centerId = String(req.query.serviceCenterId || '');
  const dateStr = String(req.query.date || '');

  if (!centerId || !dateStr) {
    res.status(400).json({
      success: false,
      error: 'Please select a service center and date to see available slots.',
    });
    return;
  }

  const booked = await prisma.appointment.findMany({
    where: {
      serviceCenterId: centerId,
      preferredDate: new Date(dateStr),
      status: { not: 'CANCELLED' },
    },
    select: { preferredTime: true },
  });

  const bookedSet = new Set(booked.map((b) => b.preferredTime));
  const slots = TIME_SLOTS.map((time) => ({
    time,
    available: !bookedSet.has(time),
  }));

  res.json({ success: true, data: slots });
});

// POST /api/appointments — book appointment
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const parsed = bookSchema.safeParse({
    ...req.body,
    carYear: req.body.carYear ? Number(req.body.carYear) : undefined,
  });

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(' '),
    });
    return;
  }

  const data = parsed.data;
  const preferredDate = new Date(data.preferredDate + 'T00:00:00');

  if (preferredDate < new Date(new Date().toDateString())) {
    res.status(400).json({
      success: false,
      error: 'Please choose a future date for your appointment.',
    });
    return;
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        userId: req.user?.userId,
        serviceCenterId: data.serviceCenterId,
        serviceType: data.serviceType,
        carBrand: data.carBrand,
        carModel: data.carModel,
        carYear: data.carYear,
        issueDescription: data.issueDescription,
        preferredDate,
        preferredTime: data.preferredTime,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail || null,
      },
      include: { serviceCenter: true },
    });

    res.status(201).json({
      success: true,
      data: {
        id: appointment.id,
        status: appointment.status,
        serviceType: appointment.serviceType,
        preferredDate: data.preferredDate,
        preferredTime: appointment.preferredTime,
        serviceCenter: appointment.serviceCenter,
      },
      message: 'Appointment booked! You will receive a confirmation SMS shortly.',
    });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'That time slot is already booked. Please choose a different time.',
      });
      return;
    }
    throw err;
  }
});

// GET /api/appointments/my — user's appointments
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { userId: req.user!.userId },
    orderBy: { preferredDate: 'desc' },
    include: { serviceCenter: true },
  });
  res.json({ success: true, data: appointments });
});

// Admin: list all appointments
router.get('/admin', authenticate, requirePermission('appointment.manage'), async (req, res) => {
  const status = req.query.status as string | undefined;
  const appointments = await prisma.appointment.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { preferredDate: 'desc' },
    include: { serviceCenter: true, user: { select: { fullName: true, email: true } } },
    take: 100,
  });
  res.json({ success: true, data: appointments });
});

// Admin: update appointment status
router.patch('/admin/:id', authenticate, requirePermission('appointment.manage'), async (req, res) => {
  const { status } = req.body;
  const valid = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!valid.includes(status)) {
    res.status(400).json({
      success: false,
      error: 'Invalid status. Use: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, or CANCELLED.',
    });
    return;
  }

  const appointment = await prisma.appointment.update({
    where: { id: String(req.params.id) },
    data: { status },
    include: { serviceCenter: true },
  });
  res.json({ success: true, data: appointment });
});

export default router;
