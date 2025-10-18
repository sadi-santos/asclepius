export function toSnakeKeys<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    out[snake] = v;
  }
  return out;
}
