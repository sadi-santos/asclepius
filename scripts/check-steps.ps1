param(
  [switch]$VerboseOut  # mostra detalhes extras
)

$ErrorActionPreference = "Stop"

function Write-Ok($m){ Write-Host "✓ $m" -ForegroundColor Green }
function Write-Warn($m){ Write-Host "! $m" -ForegroundColor Yellow }
function Write-Err($m){ Write-Host "✗ $m" -ForegroundColor Red }
function Write-Info($m){ Write-Host "-- $m" -ForegroundColor DarkCyan }

function Get-Json($path){
  if(-not (Test-Path $path)){ return $null }
  try { return (Get-Content -Raw $path | ConvertFrom-Json) } catch { return $null }
}

function Test-WorkspaceYaml($path){
  $o = [ordered]@{ Exists=$false; HasBackend=$false; HasFrontend=$false }
  if(Test-Path $path){
    $o.Exists = $true
    $txt = Get-Content -Raw $path
    $o.HasBackend  = ($txt -match 'asclepius-backend')
    $o.HasFrontend = ($txt -match 'asclepius-frontend')
  }
  [pscustomobject]$o
}

function Test-ScriptIn($pkg, $name){
  if(-not $pkg){ return $false }
  try { return [bool]$pkg.scripts.$name } catch { return $false }
}

Write-Host "== Checagem dos passos 1, 2 e 3 ==" -ForegroundColor Cyan

# Caminhos
$root = Get-Location
$rootPkgPath = Join-Path $root "package.json"
$wsPath      = Join-Path $root "pnpm-workspace.yaml"
$bkPkgPath   = Join-Path $root "asclepius-backend\package.json"
$fePkgPath   = Join-Path $root "asclepius-frontend\package.json"

# Ler pacotes
$rootPkg = Get-Json $rootPkgPath
$bkPkg   = Get-Json $bkPkgPath
$fePkg   = Get-Json $fePkgPath
$wsInfo  = Test-WorkspaceYaml $wsPath

# -----------------------------
# PASSO 1 — package.json (raiz)
# -----------------------------
$needsStep1 = $false
$reasons1 = @()

if(-not $rootPkg){ $needsStep1 = $true; $reasons1 += "Root package.json inexistente."; }
else {
  if(-not $rootPkg.private){ $needsStep1 = $true; $reasons1 += "Campo 'private: true' ausente."; }
  if(-not $rootPkg.packageManager){ $needsStep1 = $true; $reasons1 += "Campo 'packageManager' ausente (ex.: pnpm@10.18.2)."; }
  if(-not $rootPkg.engines -or -not $rootPkg.engines.node -or -not $rootPkg.engines.pnpm){
    $needsStep1 = $true; $reasons1 += "Campo 'engines' (node/pnpm) ausente.";
  }
  foreach($s in @("dev","check","check:run","test","build","lint")){
    if(-not (Test-ScriptIn $rootPkg $s)){ $needsStep1 = $true; $reasons1 += "Script raiz '$s' ausente."; }
  }
}

# ---------------------------------------
# PASSO 2 — workspaces + typings no lugar
# ---------------------------------------
$needsStep2 = $false
$reasons2 = @()

# workspace yaml
if(-not $wsInfo.Exists){ $needsStep2 = $true; $reasons2 += "pnpm-workspace.yaml ausente."; }
else {
  if(-not $wsInfo.HasBackend){  $needsStep2 = $true; $reasons2 += "workspace não lista 'asclepius-backend'."; }
  if(-not $wsInfo.HasFrontend){ $needsStep2 = $true; $reasons2 += "workspace não lista 'asclepius-frontend'."; }
}

# typings lugar correto
$rootHasTypes = $false
$feHasTypes   = $false
if($rootPkg -and $rootPkg.devDependencies){
  if($rootPkg.devDependencies.'@types/react' -or $rootPkg.devDependencies.'@types/react-dom'){
    $rootHasTypes = $true
    $needsStep2 = $true
    $reasons2 += "@types/react* estão na RAIZ (devem estar no frontend)."
  }
}
if($fePkg -and $fePkg.devDependencies){
  if($fePkg.devDependencies.'@types/react' -and $fePkg.devDependencies.'@types/react-dom'){
    $feHasTypes = $true
  } else {
    $needsStep2 = $true
    $reasons2 += "Frontend sem @types/react e/ou @types/react-dom."
  }
} else {
  $needsStep2 = $true
  $reasons2 += "package.json do frontend ausente ou sem devDependencies."
}

# ---------------------------------------
# PASSO 3 — scripts nos apps e orquestração
# ---------------------------------------
$needsStep3 = $false
$reasons3 = @()

# scripts raiz principais
foreach($s in @("dev","check","check:run")){
  if(-not (Test-ScriptIn $rootPkg $s)){ $needsStep3 = $true; $reasons3 += "Script raiz '$s' ausente."; }
}

# backend deve ter dev/build (test opcional)
if(-not (Test-ScriptIn $bkPkg "dev"))   { $needsStep3 = $true; $reasons3 += "Backend sem script 'dev'."; }
if(-not (Test-ScriptIn $bkPkg "build")) { $needsStep3 = $true; $reasons3 += "Backend sem script 'build'."; }

# frontend deve ter dev/build (test opcional)
if(-not (Test-ScriptIn $fePkg "dev"))   { $needsStep3 = $true; $reasons3 += "Frontend sem script 'dev'."; }
if(-not (Test-ScriptIn $fePkg "build")) { $needsStep3 = $true; $reasons3 += "Frontend sem script 'build'."; }

# ---- RESULTADOS ----
Write-Host ""
if(-not $needsStep1){ Write-Ok "Passo 1 — package.json (raiz) OK" } else { Write-Warn "Passo 1 — ajustes necessários:"; $reasons1 | ForEach-Object { Write-Host "  - $_" } }
if(-not $needsStep2){ Write-Ok "Passo 2 — workspaces + typings OK" } else { Write-Warn "Passo 2 — ajustes necessários:"; $reasons2 | ForEach-Object { Write-Host "  - $_" } }
if(-not $needsStep3){ Write-Ok "Passo 3 — scripts de orquestração/apps OK" } else { Write-Warn "Passo 3 — ajustes necessários:"; $reasons3 | ForEach-Object { Write-Host "  - $_" } }

Write-Host ""

# Sugestões de comandos
if($needsStep1){
  Write-Info "Sugestão (Passo 1): substituir o package.json da RAIZ por um orquestrador:"
  @"
{
  "name": "asclepius",
  "private": true,
  "description": "Monorepo: backend (porta 3001) + frontend (http://localhost:5173/)",
  "packageManager": "pnpm@10.18.2",
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "check": "pwsh -File ./scripts/check-dev.ps1",
    "check:run": "pwsh -File ./scripts/check-dev.ps1 -Run -Yes",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  }
}
"@ | Write-Host
}

if($needsStep2){
  Write-Info "Sugestões (Passo 2):"
  if(-not $wsInfo.Exists){
    Write-Host '  - Criar pnpm-workspace.yaml com:'
    @"
packages:
  - "asclepius-backend"
  - "asclepius-frontend"
"@ | Write-Host
  } elseif(-not $wsInfo.HasBackend -or -not $wsInfo.HasFrontend){
    Write-Host '  - Completar pnpm-workspace.yaml para incluir backend e frontend (veja bloco acima).'
  }

  if($rootHasTypes){
    Write-Host "  - Remover typings da RAIZ:"
    Write-Host "      pnpm remove -D @types/react @types/react-dom"
  }
  if(-not $feHasTypes){
    Write-Host "  - Adicionar typings no FRONTEND:"
    Write-Host "      pnpm --filter asclepius-frontend add -D @types/react @types/react-dom"
  }
}

if($needsStep3){
  Write-Info "Sugestões (Passo 3):"
  if(-not (Test-ScriptIn $rootPkg "dev"))      { Write-Host "  - Adicionar script raiz 'dev': pnpm -r --parallel dev" }
  if(-not (Test-ScriptIn $rootPkg "check"))    { Write-Host "  - Adicionar script raiz 'check': pwsh -File ./scripts/check-dev.ps1" }
  if(-not (Test-ScriptIn $rootPkg "check:run")){ Write-Host "  - Adicionar script raiz 'check:run': pwsh -File ./scripts/check-dev.ps1 -Run -Yes" }
  if(-not (Test-ScriptIn $bkPkg "dev"))        { Write-Host "  - Backend: criar script 'dev' (porta 3001)" }
  if(-not (Test-ScriptIn $bkPkg "build"))      { Write-Host "  - Backend: criar script 'build'" }
  if(-not (Test-ScriptIn $fePkg "dev"))        { Write-Host "  - Frontend: criar script 'dev' (Vite 5173)" }
  if(-not (Test-ScriptIn $fePkg "build"))      { Write-Host "  - Frontend: criar script 'build'" }
}

if(-not ($needsStep1 -or $needsStep2 -or $needsStep3)){
  Write-Ok "Tudo certo: você NÃO precisa executar os passos 1, 2 e 3."
} else {
  Write-Warn "Existem ajustes recomendados acima. Depois de aplicar, rode:"
  Write-Host "  pnpm install -r"
  Write-Host "  pnpm run dev   # backend:3001 e frontend:5173"
}
