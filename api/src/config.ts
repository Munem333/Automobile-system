import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_SEED_EMAIL: z.string().email().default('admin@autohub.bd'),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  ALLOW_DEV_VERIFICATION_CODE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  parsed.error.errors.forEach((e) => console.error(`  - ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

if (isProduction) {
  const weakSecrets = [
    env.JWT_ACCESS_SECRET.includes('dev-access'),
    env.JWT_REFRESH_SECRET.includes('dev-refresh'),
  ];
  if (weakSecrets.some(Boolean)) {
    console.error('❌ Production requires strong JWT secrets. Do not use dev defaults.');
    process.exit(1);
  }
  if (!env.CORS_ORIGIN) {
    console.error('❌ CORS_ORIGIN is required in production.');
    process.exit(1);
  }
}

function parseCorsOrigins(): string[] {
  if (!env.CORS_ORIGIN) return DEFAULT_DEV_ORIGINS;
  return env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
}

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  corsOrigins: parseCorsOrigins(),
  corsOrigin: parseCorsOrigins()[0] || DEFAULT_DEV_ORIGINS[1],
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  isProduction: () => isProduction,
  allowDevVerificationCode: env.ALLOW_DEV_VERIFICATION_CODE === 'true',
  adminSeedEmail: env.ADMIN_SEED_EMAIL,
  adminSeedPassword: env.ADMIN_SEED_PASSWORD,
};
