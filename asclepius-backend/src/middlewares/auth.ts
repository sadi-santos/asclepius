import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env'; // tem JWT_SECRET

type JWTPayload = {
  sub: string; // user id
  role: string;
  email: string;
  iat?: number;
  exp?: number;
};

export function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const secret = env?.JWT_SECRET ?? process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'server_misconfigured' });

    const payload = jwt.verify(token, secret) as JWTPayload;

    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

// Ex.: requireRole('ADMIN', 'NURSE')
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}
