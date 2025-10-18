// src/middlewares/case-mapping.ts
import type { NextFunction, Request, Response } from 'express';

// util: limpa qualquer CPF para apenas dígitos
function cleanCpfValue(v: unknown): unknown {
  if (typeof v === 'string') return v.replace(/\D+/g, '');
  return v;
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_m, g1) => g1.toUpperCase());
}

function mapKeysDeep<T = any>(obj: any, keyMapper: (k: string) => string, valueMapper?: (v: any, k: string) => any): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((it) => mapKeysDeep(it, keyMapper, valueMapper)) as any;
  if (obj instanceof Date) return obj as T;
  if (typeof obj !== 'object') return obj as T;

  const out: any = {};
  for (const k of Object.keys(obj)) {
    const nk = keyMapper(k);
    const v = obj[k];
    const vv = valueMapper ? valueMapper(v, nk) : v;
    out[nk] = mapKeysDeep(vv, keyMapper, valueMapper);
  }
  return out as T;
}

/**
 * Aceita camelCase no body/query e converte para snake_case.
 * Também normaliza CPF para só dígitos ANTES da validação.
 */
export function acceptCamelOnRequest() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      // primeiro: limpar cpf no shape original
      if ('cpf' in req.body) req.body.cpf = cleanCpfValue((req.body as any).cpf);
      // depois: converter camel -> snake
      req.body = mapKeysDeep(req.body, toSnake, (v, k) => (k === 'cpf' ? cleanCpfValue(v) : v));
    }
    if (req.query && Object.keys(req.query).length) {
      req.query = mapKeysDeep(req.query, toSnake);
      if ('cpf' in req.query) (req.query as any).cpf = cleanCpfValue((req.query as any).cpf);
    }
    next();
  };
}

/** Converte respostas de snake_case para camelCase ao enviar JSON */
export function respondCamelOnJson() {
  return (_req: Request, res: Response, next: NextFunction) => {
    const original = res.json.bind(res);
    res.json = (data: any) => {
      const converted = mapKeysDeep(data, toCamel);
      return original(converted);
    };
    next();
  };
}
