import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { auditLog } from '../services/audit';
import { auth } from '../middlewares/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX),
  message: { error: 'too_many_requests', message: 'Muitas tentativas' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.is_active) {
    await auditLog({ action: 'LOGIN_FAIL', entity: 'User', ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined });
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    await auditLog({ action: 'LOGIN_FAIL', entity: 'User', userId: user.id, ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined });
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  await auditLog({ action: 'LOGIN_SUCCESS', entity: 'User', userId: user.id, ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined });

  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

router.get('/me', auth, async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      role: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
    },
  });

  if (!u) return res.status(404).json({ error: 'not_found' });

  // MantÃ©m camelCase na resposta pÃºblica
  res.json({
    id: u.id,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  });
});

export default router;
