import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { verifyAccessToken, verifyChatSessionToken } from '../lib/security';
import { ChatSenderType } from '@prisma/client';
import { MAX_CHAT_MESSAGE_LEN } from '../lib/chatConstants';
import { getChatbotResponse, createBotReply, shouldBotReply } from '../services/chatbot';

interface ChatSocket extends Socket {
  userId?: string;
  isAgent?: boolean;
  agentName?: string;
  chatSessionId?: string;
}

async function canAccessChatSession(socket: ChatSocket, sessionId: string): Promise<boolean> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || !session.isActive) return false;
  if (socket.isAgent) return true;
  if (socket.userId && session.userId === socket.userId) return true;
  const chatToken = socket.handshake.auth?.chatToken as string | undefined;
  if (chatToken && verifyChatSessionToken(chatToken, sessionId)) return true;
  return false;
}

export function setupChatSocket(io: Server) {
  io.use(async (socket: ChatSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next();
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      const admin = await prisma.adminUser.findUnique({
        where: { userId: payload.userId },
        include: { user: true, role: { include: { permissions: { include: { permission: true } } } } },
      });
      if (admin) {
        const perms = admin.role.permissions.map((p) => p.permission.key);
        if (perms.includes('chat.respond') || perms.includes('admin.full')) {
          socket.isAgent = true;
          socket.agentName = admin.user.fullName;
          socket.join('agents');
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: ChatSocket) => {
    socket.on('chat:join', async (sessionId: string) => {
      if (!sessionId) return;
      if (!(await canAccessChatSession(socket, sessionId))) return;
      socket.chatSessionId = sessionId;
      socket.join(`chat:${sessionId}`);
      if (socket.isAgent) socket.join('agents');
    });

    socket.on('chat:message', async (payload: { sessionId: string; content: string; senderName?: string }) => {
      if (!payload?.sessionId || !payload?.content?.trim()) return;
      const content = payload.content.trim().slice(0, MAX_CHAT_MESSAGE_LEN);
      if (!(await canAccessChatSession(socket, payload.sessionId))) return;

      const session = await prisma.chatSession.findUnique({ where: { id: payload.sessionId } });
      if (!session || !session.isActive) return;

      const senderType: ChatSenderType = socket.isAgent ? 'AGENT' : 'CUSTOMER';
      const senderName = socket.isAgent
        ? socket.agentName || 'Support Agent'
        : payload.senderName || session.guestName || 'Guest';

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: payload.sessionId,
          senderType,
          senderName,
          content,
        },
      });

      const msg = {
        id: message.id,
        sessionId: message.sessionId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      };

      io.to(`chat:${payload.sessionId}`).emit('chat:message', msg);
      if (senderType === 'CUSTOMER') {
        io.to('agents').emit('chat:new-message', { sessionId: payload.sessionId, message: msg });

        const canBotReply = await shouldBotReply(payload.sessionId);
        if (canBotReply) {
          io.to(`chat:${payload.sessionId}`).emit('chat:typing', {
            sessionId: payload.sessionId,
            isTyping: true,
            isAgent: true,
            isBot: true,
          });

          const botText = await getChatbotResponse(content);
          setTimeout(async () => {
            const botMessage = await createBotReply(payload.sessionId, botText);
            const botMsg = {
              id: botMessage.id,
              sessionId: botMessage.sessionId,
              senderType: botMessage.senderType,
              senderName: botMessage.senderName,
              content: botMessage.content,
              createdAt: botMessage.createdAt.toISOString(),
            };
            io.to(`chat:${payload.sessionId}`).emit('chat:typing', {
              sessionId: payload.sessionId,
              isTyping: false,
              isAgent: true,
              isBot: true,
            });
            io.to(`chat:${payload.sessionId}`).emit('chat:message', botMsg);
          }, 900);
        }
      }
    });

    socket.on('chat:typing', (payload: { sessionId: string; isTyping: boolean }) => {
      socket.to(`chat:${payload.sessionId}`).emit('chat:typing', {
        sessionId: payload.sessionId,
        isTyping: payload.isTyping,
        isAgent: !!socket.isAgent,
      });
    });

    socket.on('disconnect', () => {});
  });
}
