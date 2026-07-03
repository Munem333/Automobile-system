import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { createBotWelcomeMessage } from '../services/chatbot';
import { signChatSessionToken } from '../lib/security';
import { ensureChatSessionAccess } from '../lib/chatAccess';

const router = Router();

const guestInfoSchema = z.object({
  guestName: z.string().min(2, 'Please enter your name (at least 2 characters).'),
  guestPhone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'Please enter a valid Bangladesh mobile number (e.g. 01712345678).'),
});

function mapMessage(m: {
  id: string;
  sessionId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    sessionId: m.sessionId,
    senderType: m.senderType,
    senderName: m.senderName,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

function mapSessionResponse(sessionId: string, guestName?: string | null, isActive?: boolean) {
  return {
    id: sessionId,
    guestName,
    isActive: isActive ?? true,
    chatToken: signChatSessionToken(sessionId),
  };
}

async function sessionWithMessages(sessionId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  return {
    session: mapSessionResponse(sessionId, session?.guestName, session?.isActive),
    messages: messages.map(mapMessage),
  };
}

router.post('/sessions', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.userId) {
    const existing = await prisma.chatSession.findFirst({
      where: { userId: req.user.userId, isActive: true },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (existing) {
      res.json({
        success: true,
        data: {
          session: mapSessionResponse(existing.id, existing.guestName, existing.isActive),
          messages: existing.messages.map(mapMessage),
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.userId,
        guestName: user?.fullName,
        guestPhone: user?.phone,
      },
    });
    await createBotWelcomeMessage(session.id);
    const data = await sessionWithMessages(session.id);
    res.status(201).json({ success: true, data });
    return;
  }

  const parsed = guestInfoSchema.safeParse(req.body);
  const hasGuestInfo = parsed.success;

  const session = await prisma.chatSession.create({
    data: hasGuestInfo
      ? { guestName: parsed.data.guestName.trim(), guestPhone: parsed.data.guestPhone }
      : { guestName: 'Visitor' },
  });

  await createBotWelcomeMessage(session.id);
  const data = await sessionWithMessages(session.id);
  res.status(201).json({ success: true, data });
}));

router.patch('/sessions/:id/guest-info', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessionId = String(req.params.id);
  if (!(await ensureChatSessionAccess(req, sessionId, res))) return;

  const parsed = guestInfoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(' '),
    });
    return;
  }

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      guestName: parsed.data.guestName.trim(),
      guestPhone: parsed.data.guestPhone,
    },
  });

  await prisma.chatMessage.create({
    data: {
      sessionId,
      senderType: 'SYSTEM',
      senderName: 'AutoHub Assistant',
      content: `Thanks ${parsed.data.guestName.trim()}! A support agent will join shortly. You can keep chatting here in the meantime.`,
    },
  });

  const data = await sessionWithMessages(sessionId);
  res.json({ success: true, data });
}));

router.get('/sessions/:id/messages', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessionId = String(req.params.id);
  if (!(await ensureChatSessionAccess(req, sessionId, res))) return;

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  res.json({ success: true, data: messages.map(mapMessage) });
}));

router.get('/quick-replies', asyncHandler(async (_req, res) => {
  const replies = await prisma.chatQuickReply.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ success: true, data: replies });
}));

router.get('/admin/sessions', authenticate, requirePermission('chat.respond'), asyncHandler(async (_req, res) => {
  const sessions = await prisma.chatSession.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      user: { select: { fullName: true, email: true, phone: true } },
    },
  });

  res.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      guestName: s.guestName || s.user?.fullName,
      guestPhone: s.guestPhone || s.user?.phone,
      email: s.user?.email,
      isActive: s.isActive,
      lastMessage: s.messages[0] ? mapMessage(s.messages[0]) : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}));

router.patch('/admin/sessions/:id/close', authenticate, requirePermission('chat.respond'), asyncHandler(async (req, res) => {
  const session = await prisma.chatSession.update({
    where: { id: String(req.params.id) },
    data: { isActive: false },
  });
  res.json({ success: true, data: { id: session.id, isActive: false } });
}));

export default router;
