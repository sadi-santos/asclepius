// src/utils/cpf.ts
export function onlyDigits(v: string): string {
  return (v || "").replace(/\D+/g, "");
}

export function validateCPF(cpf: string): boolean {
  const c = onlyDigits(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let d = 11 - (s % 11);
  if (d > 9) d = 0;
  if (d !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  d = 11 - (s % 11);
  if (d > 9) d = 0;
  return d === parseInt(c[10]);
}

export function formatCPFView(digits: string): string {
  const c = onlyDigits(digits);
  return c.length === 11 ? c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : digits;
}
