// src/middlewares/validate.ts
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export function validate(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err: any) {
      const details = err?.issues ?? undefined;
      next({
        status: 400,
        error: 'validation_error',
        message: 'Erro de validação',
        details,
      });
    }
  };
}
