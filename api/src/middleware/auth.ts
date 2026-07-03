import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/security';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
    permissions: string[];
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Please sign in to continue. Your session may have expired.',
    });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: payload.userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const permissions =
      adminUser?.role.permissions.map((rp) => rp.permission.key) ?? [];

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: adminUser?.role.name,
      permissions,
    };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Your session has expired. Please sign in again.',
    });
  }
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  authenticate(req, res, next).catch(next);
}

export function requirePermission(...required: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Please sign in to access the admin panel.',
      });
      return;
    }

    const hasAll = required.every(
      (p) =>
        req.user!.permissions.includes(p) ||
        req.user!.permissions.includes('admin.full'),
    );

    if (!hasAll) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user?.role) {
    res.status(403).json({
      success: false,
      error: 'Admin access required. Please sign in with an admin account.',
    });
    return;
  }
  next();
}
