import { Response } from 'express';
import { prisma } from './prisma';
import { verifyChatSessionToken } from './security';
import { AuthRequest } from '../middleware/auth';
import { forbidden, notFound } from './errors';

export async function ensureChatSessionAccess(
  req: AuthRequest,
  sessionId: string,
  res: Response,
): Promise<boolean> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    res.status(404).json({ success: false, error: notFound('Chat session not found.').message });
    return false;
  }
  if (!session.isActive) {
    res.status(404).json({ success: false, error: 'Chat session has ended.' });
    return false;
  }

  const isAgent = req.user?.permissions?.includes('chat.respond')
    || req.user?.permissions?.includes('admin.full');
  if (isAgent) return true;

  if (req.user?.userId && session.userId === req.user.userId) return true;

  const chatToken = req.headers['x-chat-token'] as string | undefined;
  if (chatToken && verifyChatSessionToken(chatToken, sessionId)) return true;

  res.status(403).json({
    success: false,
    error: forbidden('You do not have access to this chat session.').message,
  });
  return false;
}
