// Pequeno utilitário sem dependências: camelCase <-> snake_case
export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && Object.prototype.toString.call(v) === '[object Object]';

const toCamelKey = (k: string) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnakeKey = (k: string) =>
  k.replace(/([A-Z])/g, '_$1').replace(/__/g, '_').toLowerCase();

export function transformKeys<T = unknown>(
  input: T,
  keyFn: (k: string) => string
): T {
  if (Array.isArray(input)) return input.map((i) => transformKeys(i, keyFn)) as unknown as T;
  if (input instanceof Date || Buffer.isBuffer(input)) return input;
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[keyFn(k)] = transformKeys(v as unknown, keyFn);
    }
    return out as T;
  }
  return input;
}

export const toCamel = <T = unknown>(v: T) => transformKeys(v, toCamelKey);
export const toSnake = <T = unknown>(v: T) => transformKeys(v, toSnakeKey);
