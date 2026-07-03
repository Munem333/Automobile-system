import { Router, Request, Response } from 'express';
import * as authService from '../services/authService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter, lookupLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(result.success ? 201 : 400).json(result);
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.status(result.success ? 200 : 401).json(result);
});

router.post('/refresh', authLimiter, async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authService.refresh(refreshToken);
  res.status(result.success ? 200 : 401).json(result);
});

router.post('/logout', authLimiter, async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authService.logout(refreshToken);
  res.json(result);
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const result = await authService.getMe(req.user!.userId);
  res.status(result.success ? 200 : 404).json(result);
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  const result = await authService.changePassword(req.user!.userId, req.body);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/order-lookup', lookupLimiter, async (req: Request, res: Response) => {
  const { orderNumber, contact } = req.body;
  if (!orderNumber || !contact) {
    res.status(400).json({
      success: false,
      error: 'Please enter both your order number and the phone or email used at checkout.',
    });
    return;
  }
  const result = await authService.lookupOrder(orderNumber, contact);
  res.status(result.success ? 200 : 404).json(result);
});

export default router;
