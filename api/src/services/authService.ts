import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSecureToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/security';
import { registerSchema, loginSchema, changePasswordSchema, formatZodError } from '../validators/auth';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

function isLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return lockedUntil > new Date();
}

async function getUserPermissions(userId: string): Promise<{ role: string | null; permissions: string[] }> {
  const adminUser = await prisma.adminUser.findUnique({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!adminUser) {
    return { role: null, permissions: [] };
  }

  return {
    role: adminUser.role.name,
    permissions: adminUser.role.permissions.map((rp) => rp.permission.key),
  };
}

async function issueTokens(userId: string, email: string) {
  const { role } = await getUserPermissions(userId);
  const accessToken = signAccessToken({ userId, email, role: role ?? undefined });
  const tokenId = uuidv4();
  const refreshToken = signRefreshToken({ userId, tokenId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function register(body: unknown) {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }

  const { email, password, fullName, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existing) {
    if (existing.email === normalizedEmail) {
      return {
        success: false as const,
        error: 'An account with this email already exists. Try signing in instead.',
      };
    }
    return {
      success: false as const,
      error: 'This phone number is already registered. Use a different number or sign in.',
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName: fullName.trim(),
      phone: phone || null,
      emailVerified: !config.isProduction(),
    },
  });

  const tokens = await issueTokens(user.id, user.email);

  return {
    success: true as const,
    data: {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: null,
        permissions: [],
      },
      ...tokens,
    },
    message: 'Account created successfully. Welcome to AutoHub BD!',
  };
}

export async function login(body: unknown) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return {
      success: false as const,
      error: 'No account found with this email. Check the spelling or create a new account.',
    };
  }

  if (!user.isActive) {
    return {
      success: false as const,
      error: 'Your account has been deactivated. Please contact customer care for help.',
    };
  }

  if (isLocked(user.lockedUntil)) {
    return {
      success: false as const,
      error: `Too many failed attempts. Your account is locked until ${user.lockedUntil!.toLocaleTimeString()}.`,
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    if (remaining <= 0) {
      return {
        success: false as const,
        error: `Too many failed attempts. Your account is locked for ${LOCK_DURATION_MINUTES} minutes.`,
      };
    }

    return {
      success: false as const,
      error: `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const { role, permissions } = await getUserPermissions(user.id);
  const tokens = await issueTokens(user.id, user.email);

  return {
    success: true as const,
    data: {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role,
        permissions,
        mustChangePassword: user.mustChangePassword,
      },
      ...tokens,
    },
  };
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) {
    return { success: false as const, error: 'Session expired. Please sign in again.' };
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return { success: false as const, error: 'Session expired. Please sign in again.' };
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueTokens(stored.userId, stored.user.email);
    return { success: true as const, data: tokens };
  } catch {
    return { success: false as const, error: 'Session expired. Please sign in again.' };
  }
}

export async function logout(refreshToken: string) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return { success: true as const, message: 'Signed out successfully.' };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false as const, error: 'Account not found.' };
  }

  const { role, permissions } = await getUserPermissions(userId);

  return {
    success: true as const,
    data: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role,
      permissions,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function changePassword(userId: string, body: unknown) {
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false as const, error: formatZodError(parsed.error) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false as const, error: 'Account not found.' };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return {
      success: false as const,
      error: 'Current password is incorrect. Please try again.',
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  return {
    success: true as const,
    message: 'Password updated successfully.',
  };
}

export async function lookupOrder(orderNumber: string, contact: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: { items: true },
  });

  if (!order) {
    return {
      success: false as const,
      error: 'No order found with this order number. Double-check the ID on your confirmation email or SMS.',
    };
  }

  const normalizedContact = contact.toLowerCase().trim();
  const matchesEmail = order.guestEmail?.toLowerCase() === normalizedContact;
  const matchesPhone = order.shippingPhone.replace(/\D/g, '') === normalizedContact.replace(/\D/g, '');

  if (!matchesEmail && !matchesPhone) {
    return {
      success: false as const,
      error: 'The phone or email does not match this order. Use the same contact details you used at checkout.',
    };
  }

  return {
    success: true as const,
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
      })),
    },
  };
}
