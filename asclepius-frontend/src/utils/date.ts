export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("pt-BR");
}
export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("pt-BR");
}
// yyyy-MM-ddTHH:mm (local) a partir de ISO (ou agora+1h)
export function toLocalInputValue(iso?: string): string {
  const base = iso ? new Date(iso) : new Date(Date.now() + 3600000);
  const pad = (n: number) => String(n).padStart(2,"0");
  const y = base.getFullYear(), m = pad(base.getMonth()+1), d = pad(base.getDate());
  const h = pad(base.getHours()), min = pad(base.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}
// Converte "local datetime" para ISO preservando horário local
export function toIsoFromLocal(local: string): string {
  if (!local) return new Date().toISOString();
  const d = new Date(local);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
}
export function getAge(birthDate: string): number {
  const t = new Date(), b = new Date(birthDate);
  let age = t.getFullYear()-b.getFullYear();
  const md = t.getMonth()-b.getMonth();
  if (md < 0 || (md===0 && t.getDate() < b.getDate())) age--;
  return age;
}