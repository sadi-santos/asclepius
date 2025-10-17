export function pickArray<T = unknown>(payload: unknown): T[] {
  const seen = new Set<any>();

  function scan(v: any): T[] | null {
    if (v == null || seen.has(v)) return null;
    if (Array.isArray(v)) return v as T[];

    if (typeof v === "object") {
      seen.add(v);

      // chaves comuns
      const keys = [
        "items","data","rows","list","results",
        "patients","professionals","appointments"
      ];
      for (const k of keys) {
        if (Array.isArray((v as any)[k])) return (v as any)[k] as T[];
      }

      // vasculhar recursivamente
      for (const val of Object.values(v)) {
        const r = scan(val);
        if (r) return r;
      }
    }
    return null;
  }

  return scan(payload) ?? [];
}
