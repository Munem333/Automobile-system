import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address (e.g. name@example.com).'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must include at least one number.'),
  fullName: z
    .string()
    .min(2, 'Please enter your full name (at least 2 characters).')
    .max(100, 'Name is too long. Please use 100 characters or fewer.'),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, 'Please enter a valid Bangladesh mobile number (e.g. 01712345678).')
    .optional()
    .or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter the email address you registered with.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Please enter your current password.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'New password must include at least one uppercase letter.')
    .regex(/[a-z]/, 'New password must include at least one lowercase letter.')
    .regex(/[0-9]/, 'New password must include at least one number.'),
});

export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join(' ');
}
