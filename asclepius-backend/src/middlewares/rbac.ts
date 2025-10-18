import { Request, Response, NextFunction } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Requer permissao: ' + allowedRoles.join(' ou ')
      });
    }

    return next();
  };
};
