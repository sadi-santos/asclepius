// tools/fix_cpf_consistency.mjs
import { promises as fs } from "node:fs";
import path from "node:path";
const root = "C:\\Projetos\\VidaPlus\\asclepius-frontend";

async function replaceInFile(p, pairs) {
  let s = await fs.readFile(p, "utf8");
  let t = s;
  for (const [from, to] of pairs) t = t.replace(from, to);
  if (t !== s) { await fs.writeFile(p, t, "utf8"); console.log("fix:", p); }
}

async function walk(dir, out=[]) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  // 1) troca imports para validateCPF
  for (const f of await walk(path.join(root, "src"))) {
    await replaceInFile(f, [
      [/\bfrom\s+["']@\/utils\/cpf["'];?/g, ` from "@/utils/cpf";`],
      [/\bisValidCPF\b/g, "validateCPF"],
    ]);
  }

  // 2) em listas/ações rápidas, force envio com dígitos
  const list = path.join(root, "src", "pages", "patients", "PatientsList.tsx");
  try {
    await replaceInFile(list, [
      [/(\bcpf\s*:\s*)(patient\.cpf|p\.cpf|item\.cpf)/g, `$1onlyDigits($2)`],
      [/from\s+["']@\/utils\/cpf["']/g, `from "@/utils/cpf"`],
      [/(api\.(post|put|patch)\([^,]+,\s*\{[^}]*cpf\s*:\s*)([^}]+)\}/g, `$1onlyDigits($3)}`],
    ]);
  } catch {}

  console.log("done.");
}

main().catch(e => { console.error(e); process.exit(1); });
