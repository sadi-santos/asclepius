# fix-round2.ps1
param([string]$Root = ".")

$ErrorActionPreference = "Stop"
$rootPath = Resolve-Path $Root
$utf8 = New-Object System.Text.UTF8Encoding($false)

# 0) Matar Node (evita EPERM)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 1) Corrigir chamadas ao auditLog e relations em includes
$tsFiles = Get-ChildItem -Path (Join-Path $rootPath "src") -Recurse -Include *.ts -File
$changed = 0
foreach ($f in $tsFiles) {
  $c = Get-Content $f.FullName -Raw

  $new = $c `
    -replace '\buser_id\s*:', 'userId:' `
    -replace '\bentity_id\s*:', 'entityId:' `
    -replace '\buser_agent\s*:', 'userAgent:' `
    -replace 'include:\s*{\s*patient\s*:', 'include: { patients:' `
    -replace 'include:\s*{\s*professional\s*:', 'include: { professionals:' `
    -replace '\bpatient\s*:\s*{', 'patients: {' `
    -replace '\bprofessional\s*:\s*{', 'professionals: {'

  if ($new -ne $c) {
    Copy-Item $f.FullName ($f.FullName + ".bak") -Force
    [System.IO.File]::WriteAllText($f.FullName, $new, $utf8)
    $changed++
  }
}
Write-Host "Arquivos atualizados: $changed"

# 2) Limpar engine preso e regenerar Prisma
Remove-Item -Recurse -Force (Join-Path $rootPath "node_modules\.prisma") 2>$null
Set-Location $rootPath
npx prisma generate

# 3) Checar TypeScript
npx tsc --noEmit

Write-Host "`nSe OK acima, subir a API com:" -ForegroundColor Yellow
Write-Host "  npm run dev"
