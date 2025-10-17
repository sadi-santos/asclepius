# Ajuste os caminhos dos projetos aqui
$roots = @(
  "C:\Projetos\VidaPlus\asclepius-frontend",
  "C:\Projetos\VidaPlus\asclepius-backend"  # ajuste se o nome for outro
)

# Extensões incluídas
$exts = @(".ts",".tsx",".js",".jsx",".json",".yml",".yaml",".css",".scss",".html",".md",".sql",".prisma",".env.example")

# Pastas a excluir
$excludeRegex = '\\(node_modules|dist|build|coverage|playwright-report|test-results|\.next|\.turbo|\.git|\.cache|\.vite|out|target|\.gradle|__pycache__|\.venv|venv|\.idea|\.vscode)(\\|$)'

# Saída
$out = "codigo_full_dump.txt"
Set-Content -Path $out -Value "" -Encoding UTF8

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }

  Get-ChildItem -Path $root -Recurse -File -Force |
    Where-Object {
      ($exts -contains $_.Extension) -and
      ($_.FullName -notmatch $excludeRegex) -and
      ($_.Name -notmatch '^\.(env|env\..+)$')  # evita .env reais
    } |
    Sort-Object FullName |
    ForEach-Object {
      $file = $_.FullName
      Add-Content -Path $out -Value "`n`n===== FILE: $file =====" -Encoding UTF8
      Get-Content -Path $file -Raw -Encoding UTF8 | Add-Content -Path $out
    }
}

Write-Host "OK -> $out"