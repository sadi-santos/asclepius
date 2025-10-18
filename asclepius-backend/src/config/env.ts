import 'dotenv/config';

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error('Variavel de ambiente obrigatoria nao encontrada: ' + key);
  return value;
};

const parseIntSafe = (v: string | undefined, def: number): number => {
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) ? n : def;
};

const parseBool = (v: string | undefined, def: boolean): boolean => {
  if (v === undefined || v === null) return def;
  return /^true$/i.test(v);
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseIntSafe(process.env.PORT, 3001),

  JWT_SECRET: required('JWT_SECRET'),
  DATABASE_URL: required('DATABASE_URL'),

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: parseIntSafe(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: parseIntSafe(process.env.RATE_LIMIT_MAX, 100),

  // Novos flags tipados como boolean
  REQUEST_ACCEPT_CAMEL: parseBool(process.env.REQUEST_ACCEPT_CAMEL, true),
  RESPONSE_USE_CAMEL: parseBool(process.env.RESPONSE_USE_CAMEL, true),
};

export type Env = typeof env;
