// src/middlewares/error.ts
import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = Number(err?.status) || 500;
  const payload = {
    error: err?.error || (status === 500 ? 'internal_error' : 'error'),
    message: err?.message || 'Erro interno',
    details: err?.details,
  };
  if (status >= 500) {
    // log mínimo
    // eslint-disable-next-line no-console
    console.error('ERROR:', err);
  }
  res.status(status).json(payload);
};
