export function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g,"");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s=0; for (let i=0;i<9;i++) s+=parseInt(c[i])*(10-i);
  let d=11-(s%11); if (d>9) d=0; if (d!==parseInt(c[9])) return false;
  s=0; for (let i=0;i<10;i++) s+=parseInt(c[i])*(11-i);
  d=11-(s%11); if (d>9) d=0; return d===parseInt(c[10]);
}
export function validateEmail(e: string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
export function validatePhone(p: string){ const c=p.replace(/\D/g,""); return c.length===10||c.length===11; }
export function formatCPF(cpf: string){ const c=cpf.replace(/\D/g,""); return c.length===11? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4") : cpf; }
export function formatPhone(p: string){ const c=p.replace(/\D/g,""); if(c.length===11)return c.replace(/(\d{2})(\d{5})(\d{4})/,"($1) $2-$3"); if(c.length===10)return c.replace(/(\d{2})(\d{4})(\d{4})/,"($1) $2-$3"); return p; }