const fs = require("fs");
const path = require("path");

function walk(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath, callback);
    else if (f.endsWith(".tsx")) callback(fullPath);
  });
}

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");

  // Remove qualquer linha com jsxDEV
  let modified = original.replace(/^.*jsxDEV.*$/gm, "");

  // Insere import React se necessário
  if (!/import\s+React\s+from\s+["']react["']/.test(modified)) {
    modified = `import React from "react";\n` + modified.trimStart();
  }

  if (modified !== original) {
    fs.writeFileSync(filePath, modified, "utf8");
    console.log(`✔ Corrigido: ${filePath}`);
  }
}

const baseDir = path.resolve(__dirname, "../src");
walk(baseDir, fixFile);
