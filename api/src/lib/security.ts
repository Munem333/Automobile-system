import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function signAccessToken(payload: { userId: string; email: string; role?: string }): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: { userId: string; tokenId: string }): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): { userId: string; email: string; role?: string } {
  return jwt.verify(token, config.jwt.accessSecret) as { userId: string; email: string; role?: string };
}

export function verifyRefreshToken(token: string): { userId: string; tokenId: string } {
  return jwt.verify(token, config.jwt.refreshSecret) as { userId: string; tokenId: string };
}

export function signChatSessionToken(sessionId: string): string {
  return jwt.sign({ sessionId, type: 'chat_session' }, config.jwt.accessSecret, {
    expiresIn: '7d',
  } as jwt.SignOptions);
}

export function verifyChatSessionToken(token: string, sessionId: string): boolean {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as {
      sessionId: string;
      type: string;
    };
    return payload.type === 'chat_session' && payload.sessionId === sessionId;
  } catch {
    return false;
  }
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AHB-${ymd}-${rand}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
