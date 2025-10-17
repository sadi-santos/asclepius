// tools/verify_project.mjs
// Node 18+ | Verifica backend + frontend, compila TS, (opcional) roda e2e,
// coleta mudanças do git e gera um relatório consolidado.

// ===== utils =====
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = "C:\\Projetos\\VidaPlus";
const backend = path.join(root, "asclepius-backend");
const frontend = path.join(root, "asclepius-frontend");
const outDir = path.join(root, "tools");
const outJson = path.join(outDir, "verify-output.json");
const outMd = path.join(outDir, "verify-report.md");

// Exec helper
function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return {
    ok: r.status === 0,
    code: r.status ?? -1,
    stdout: r.stdout?.trim() ?? "",
    stderr: r.stderr?.trim() ?? "",
  };
}

// Walk helper
async function walk(dir, exts, ignore = new Set(["node_modules", ".pnpm", "dist", "build", ".git"])) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignore.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, exts, ignore)));
    else if (exts.size === 0 || exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

// Simple hash (xxhash/crypto não necessário; MD5 é ok para diagnóstico local)
import crypto from "node:crypto";
async function fileHash(p) {
  const buf = await fs.readFile(p);
  return crypto.createHash("md5").update(buf).digest("hex");
}

// ===== main =====
async function main() {
  // 0) sanity
  await fs.mkdir(outDir, { recursive: true });

  // 1) git info
  const gitTop = sh("git", ["rev-parse", "--show-toplevel"], root);
  const gitBranch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"], root);
  const gitStatus = sh("git", ["status", "--porcelain"], root);
  const gitDiffStat = sh("git", ["diff", "--stat"], root);

  // 2) TypeScript checks
  const tscBackend = sh("pnpm", ["exec", "tsc", "--noEmit"], backend);
  const tscFrontend = sh("pnpm", ["exec", "tsc", "--noEmit"], frontend);

  // 3) (Opcional) e2e smoke. Habilite com env VERIFY_E2E=1
  let e2e = { ok: true, code: 0, stdout: "", stderr: "", skipped: true };
  if (process.env.VERIFY_E2E === "1") {
    e2e = sh("pnpm", ["run", "test:e2e", "-g", "login e navegação"], frontend);
    e2e.skipped = false;
  }

  // 4) Lint (se existir)
  const lintBackend = sh("pnpm", ["run", "lint"], backend);
  const lintFrontend = sh("pnpm", ["run", "lint"], frontend);

  // 5) Coleta de arquivos-chaves e hashes
  const exts = new Set([".ts", ".tsx", ".json", ".mjs", ".js", ".tsconfig", ".md", ".css", ".html"]);
  const filesBackend = await walk(backend, exts);
  const filesFrontend = await walk(frontend, exts);
  const pick = async (arr) =>
    Object.fromEntries(
      await Promise.all(
        arr.map(async (p) => {
          const rel = path.relative(root, p);
          let hash = "";
          try {
            hash = await fileHash(p);
          } catch {
            hash = "ERR_READ";
          }
          return [rel, hash];
        })
      )
    );

  const mapBackend = await pick(filesBackend);
  const mapFrontend = await pick(filesFrontend);

  // 6) Resumo
  const summary = {
    generatedAt: new Date().toISOString(),
    roots: { root, backend, frontend },
    git: {
      topLevel: gitTop.stdout || "(desconhecido)",
      branch: gitBranch.stdout || "(desconhecido)",
      porcelain: gitStatus.stdout,
      diffStat: gitDiffStat.stdout,
    },
    checks: {
      tsc: {
        backend: { ok: tscBackend.ok, code: tscBackend.code, stdout: tscBackend.stdout, stderr: tscBackend.stderr },
        frontend: { ok: tscFrontend.ok, code: tscFrontend.code, stdout: tscFrontend.stdout, stderr: tscFrontend.stderr },
      },
      lint: {
        backend: { ok: lintBackend.ok, code: lintBackend.code, stdout: lintBackend.stdout, stderr: lintBackend.stderr },
        frontend: { ok: lintFrontend.ok, code: lintFrontend.code, stdout: lintFrontend.stdout, stderr: lintFrontend.stderr },
      },
      e2e: {
        skipped: e2e.skipped,
        ok: e2e.ok,
        code: e2e.code,
        stdout: e2e.stdout,
        stderr: e2e.stderr,
      },
    },
    files: {
      backend: mapBackend,
      frontend: mapFrontend,
    },
    hints: [
      "Use este relatório para montar o patch do git add. Envie este JSON e o MD para eu preparar os comandos.",
      "Habilite e2e definindo VERIFY_E2E=1 ao rodar o script.",
    ],
  };

  // 7) Persistir JSON + MD
  await fs.writeFile(outJson, JSON.stringify(summary, null, 2), "utf8");

  const md = [
    "=== VERIFY PROJECT REPORT ===",
    `generatedAt: ${summary.generatedAt}`,
    "",
    "## Git",
    `branch: ${summary.git.branch}`,
    "### status --porcelain",
    "```",
    summary.git.porcelain || "(clean)",
    "```",
    "### diff --stat",
    "```",
    summary.git.diffStat || "(no diff)",
    "```",
    "",
    "## TypeScript",
    "### backend tsc",
    "```",
    tscBackend.ok ? "OK" : "FAIL",
    tscBackend.stdout || "",
    tscBackend.stderr || "",
    "```",
    "### frontend tsc",
    "```",
    tscFrontend.ok ? "OK" : "FAIL",
    tscFrontend.stdout || "",
    tscFrontend.stderr || "",
    "```",
    "",
    "## Lint",
    "### backend lint",
    "```",
    lintBackend.ok ? "OK" : "FAIL",
    lintBackend.stdout || "",
    lintBackend.stderr || "",
    "```",
    "### frontend lint",
    "```",
    lintFrontend.ok ? "OK" : "FAIL",
    lintFrontend.stdout || "",
    lintFrontend.stderr || "",
    "```",
    "",
    "## E2E",
    e2e.skipped ? "- skipped (set VERIFY_E2E=1 para rodar)" : e2e.ok ? "- OK" : "- FAIL",
    "```",
    e2e.stdout || "",
    e2e.stderr || "",
    "```",
    "",
    "## Files hashed (resumo)",
    `- backend: ${Object.keys(mapBackend).length} arquivos`,
    `- frontend: ${Object.keys(mapFrontend).length} arquivos`,
    "",
    "Salvo:",
    `- JSON: ${outJson}`,
    `- MD:   ${outMd}`,
    "",
  ].join("\n");
  await fs.writeFile(outMd, md, "utf8");

  // 8) Saída no console
  console.log("=== VERIFY DONE ===");
  console.log(`JSON: ${outJson}`);
  console.log(`MD:   ${outMd}`);
  console.log("");
  console.log("Resumo git status:");
  console.log(summary.git.porcelain || "(clean)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
