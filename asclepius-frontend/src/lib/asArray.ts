export function asArray<T = unknown>(payload: unknown): T[] {
  const p = payload as any;
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(p?.items)) return p.items as T[];
  if (Array.isArray(p?.data)) return p.data as T[];
  if (Array.isArray(p?.patients)) return p.patients as T[];
  if (Array.isArray(p?.professionals)) return p.professionals as T[];
  if (Array.isArray(p?.appointments)) return p.appointments as T[];
  return [];
}
