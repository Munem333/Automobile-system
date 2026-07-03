import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import { Prisma } from '@prisma/client';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { setupChatSocket } from './socket/chat';
import { AppError } from './lib/errors';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import chatRoutes from './routes/chat';
import appointmentRoutes from './routes/appointments';
import supportRoutes from './routes/support';
import adminRoutes from './routes/admin';

const app = express();
const server = http.createServer(app);

function corsOriginCheck(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (config.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  if (!config.isProduction()) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked for origin: ${origin}`));
}

const io = new SocketServer(server, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
});

setupChatSocket(io);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(requestId);
app.use(apiLimiter);

app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'autohub-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const rid = req.requestId || 'unknown';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) console.error(`[API ${rid}]`, err);
    res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Record not found.' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'A record with this value already exists.' });
      return;
    }
  }

  console.error(`[API ${rid}]`, err);
  res.status(500).json({
    success: false,
    error: 'Something went wrong on our end. Please try again in a moment.',
    requestId: rid,
  });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process and restart.`);
    process.exit(1);
  }
  throw err;
});

function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(config.port, '0.0.0.0', () => {
  console.log(`AutoHub BD API listening on http://0.0.0.0:${config.port}`);
});

export { app, io };
