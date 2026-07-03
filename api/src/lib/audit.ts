import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { AuthRequest } from '../middleware/auth';

export async function writeAuditLog(
  req: Request | AuthRequest,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const userId = (req as AuthRequest).user?.userId;
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resourceType,
        resourceId: resourceId || null,
        details: details ? (details as Prisma.InputJsonValue) : undefined,
        ipAddress: req.ip || req.socket.remoteAddress || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog]', action, err);
  }
}
