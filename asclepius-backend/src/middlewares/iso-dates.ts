// src/middlewares/iso-dates.ts
import type { NextFunction, Request, Response } from 'express';

/**
 * Normaliza campos de data conhecidos para ISO-8601 string.
 * Não altera se já vier ISO.
 */
export function normalizeIsoDates() {
  const dateKeys = new Set(['birth_date', 'scheduled_at', 'created_at', 'updated_at']);

  const normalize = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v == null) continue;
      if (dateKeys.has(k)) {
        if (typeof v === 'string') {
          // aceita "YYYY-MM-DD" e já-ISO
          const isOnlyDate = /^\d{4}-\d{2}-\d{2}$/.test(v);
          obj[k] = isOnlyDate ? new Date(v + 'T00:00:00.000Z').toISOString() : v;
        } else if (v instanceof Date) {
          obj[k] = v.toISOString();
        }
      } else if (typeof v === 'object') {
        normalize(v);
      }
    }
    return obj;
  };

  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') req.body = normalize(req.body);
    next();
  };
}
