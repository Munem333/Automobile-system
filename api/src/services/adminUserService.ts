import { z } from 'zod';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/security';

const ASSIGNABLE_ROLES = ['moderator', 'staff'] as const;

const createTeamMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional(),
  role: z.enum(ASSIGNABLE_ROLES, {
    errorMap: () => ({ message: 'Please select a valid role (moderator or staff).' }),
  }),
});

const updateTeamMemberSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().min(2).optional(),
});

const updateCustomerSchema = z.object({
  isActive: z.boolean(),
});

function mapTeamMember(adminUser: {
  id: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  };
  role: { id: string; name: string; description: string | null };
}) {
  return {
    id: adminUser.id,
    userId: adminUser.user.id,
    email: adminUser.user.email,
    fullName: adminUser.user.fullName,
    phone: adminUser.user.phone,
    isActive: adminUser.user.isActive,
    mustChangePassword: adminUser.user.mustChangePassword,
    lastLoginAt: adminUser.user.lastLoginAt,
    joinedAt: adminUser.user.createdAt,
    adminSince: adminUser.createdAt,
    role: adminUser.role.name,
    roleId: adminUser.role.id,
  };
}

async function countSuperAdmins(excludeUserId?: string) {
  return prisma.adminUser.count({
    where: {
      role: { name: 'super_admin' },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
  });
}

export async function listTeamMembers() {
  const members = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      role: { select: { id: true, name: true, description: true } },
    },
  });

  return members.map(mapTeamMember);
}

export async function listAssignableRoles() {
  return prisma.role.findMany({
    where: { name: { in: [...ASSIGNABLE_ROLES] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true },
  });
}

export async function createTeamMember(input: unknown) {
  const data = createTeamMemberSchema.parse(input);
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const hasAdmin = await prisma.adminUser.findUnique({ where: { userId: existing.id } });
    if (hasAdmin) {
      throw new Error('This email already belongs to an admin account. Use a different email.');
    }
    throw new Error('This email is already registered as a customer. Use a different email for the admin account.');
  }

  const role = await prisma.role.findUnique({ where: { name: data.role } });
  if (!role) {
    throw new Error('The selected role is not available. Please refresh and try again.');
  }

  const tempPassword = data.password || crypto.randomBytes(10).toString('base64url');
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || null,
      passwordHash,
      emailVerified: true,
      mustChangePassword: !data.password,
    },
  });

  const adminUser = await prisma.adminUser.create({
    data: { userId: user.id, roleId: role.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      role: { select: { id: true, name: true, description: true } },
    },
  });

  return {
    member: mapTeamMember(adminUser),
    temporaryPassword: data.password ? undefined : tempPassword,
  };
}

export async function updateTeamMember(
  adminUserId: string,
  input: unknown,
  actingUserId: string,
) {
  const data = updateTeamMemberSchema.parse(input);

  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: {
      user: true,
      role: true,
    },
  });

  if (!adminUser) {
    throw new Error('Team member not found. They may have been removed already.');
  }

  if (adminUser.role.name === 'super_admin') {
    throw new Error('Super admin accounts cannot be changed from here.');
  }

  if (adminUser.userId === actingUserId && data.isActive === false) {
    throw new Error('You cannot deactivate your own admin account.');
  }

  if (data.role) {
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) {
      throw new Error('The selected role is not available. Please refresh and try again.');
    }

    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: { roleId: role.id },
    });
  }

  if (data.isActive !== undefined || data.fullName !== undefined) {
    await prisma.user.update({
      where: { id: adminUser.userId },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
      },
    });
  }

  const updated = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      role: { select: { id: true, name: true, description: true } },
    },
  });

  if (!updated) {
    throw new Error('Team member not found after update.');
  }

  return mapTeamMember(updated);
}

export async function removeTeamMember(adminUserId: string, actingUserId: string) {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    include: { user: true, role: true },
  });

  if (!adminUser) {
    throw new Error('Team member not found. They may have been removed already.');
  }

  if (adminUser.role.name === 'super_admin') {
    throw new Error('Super admin accounts cannot be removed.');
  }

  if (adminUser.userId === actingUserId) {
    throw new Error('You cannot remove your own admin access.');
  }

  await prisma.adminUser.delete({ where: { id: adminUserId } });

  return {
    id: adminUser.id,
    email: adminUser.user.email,
    fullName: adminUser.user.fullName,
    role: adminUser.role.name,
  };
}

export async function updateCustomer(userId: string, input: unknown) {
  const data = updateCustomerSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { adminUser: true },
  });

  if (!user) {
    throw new Error('Customer not found.');
  }

  if (user.adminUser) {
    throw new Error('This account is an admin user. Manage it from the Team section instead.');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: data.isActive },
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

  return updated;
}

export function formatAdminUserError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.errors.map((e) => e.message).join(' ');
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return 'This email or phone number is already in use.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not complete the request. Please try again.';
}
