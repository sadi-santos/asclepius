param(
  [switch]$StartDev,      # opcional: inicia pnpm run dev ao final (bloqueia o terminal)
  [switch]$Yes,           # pula confirmações
  [switch]$NoCheck        # não roda pnpm run check ao final
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

# --- Verificações iniciais ---
$root = Get-Location
$rootPkgPath = Join-Path $root "package.json"
$wsPath      = Join-Path $root "pnpm-workspace.yaml"
$backendDir  = Join-Path $root "asclepius-backend"
$frontendDir = Join-Path $root "asclepius-frontend"

if(-not (Test-Path ".git")){
  Write-Warn "Repositório Git não detectado na raiz ('.git' ausente). Prosseguindo mesmo assim."
}

if(-not (Test-Path $backendDir) -or -not (Test-Path $frontendDir)){
  Write-Err "Pastas 'asclepius-backend' e/ou 'asclepius-frontend' não encontradas na raiz."
  exit 1
}

# Confirmação
if(-not $Yes){
  $c = Read-Host "Este script vai ajustar package.json (raiz), criar pnpm-workspace.yaml e mover typings p/ o frontend. Digite 'OK' para continuar"
  if($c -ne 'OK'){ Write-Err "Abortado pelo usuário."; exit 1 }
}

# --- Passo 1: package.json orquestrador na RAIZ ---
$orchestratorJson = @'
{
  "name": "asclepius",
  "private": true,
  "description": "Monorepo: backend (porta 3001) + frontend (http://localhost:5173/)",
  "packageManager": "pnpm@10.18.2",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "check": "pwsh -File ./scripts/check-dev.ps1",
    "check:run": "pwsh -File ./scripts/check-dev.ps1 -Run -Yes",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  }
}
'@

$backupMade = $false
if(Test-Path $rootPkgPath){
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$($rootPkgPath).backup-$stamp"
  Copy-Item $rootPkgPath $backup -Force
  $backupMade = $true
  Write-Info "Backup criado: $backup"
}
$orchestratorJson | Out-File -Encoding UTF8 $rootPkgPath
Write-Ok "package.json (raiz) escrito como orquestrador"

# --- Passo 2: pnpm-workspace.yaml ---
$wsContent = @'
packages:
  - "asclepius-backend"
  - "asclepius-frontend"
'@
if(Test-Path $wsPath){
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $wsBackup = "$($wsPath).backup-$stamp"
  Copy-Item $wsPath $wsBackup -Force
  Write-Info "Backup criado: $wsBackup"
}
$wsContent | Out-File -Encoding UTF8 $wsPath
Write-Ok "pnpm-workspace.yaml criado/atualizado"

# --- Passo 3: mover typings para o frontend ---
$rootPkgOld = Get-Json $rootPkgPath
$rootHadTypes = $false
try {
  if($rootPkgOld -and $rootPkgOld.devDependencies){
    if($rootPkgOld.devDependencies.'@types/react' -or $rootPkgOld.devDependencies.'@types/react-dom'){
      $rootHadTypes = $true
    }
  }
} catch {}

if($rootHadTypes){
  Write-Info "Removendo typings da RAIZ (@types/react, @types/react-dom)"
  pnpm remove -D @types/react @types/react-dom 2>$null
  if($LASTEXITCODE -ne 0){ Write-Warn "pnpm remove retornou erro (possivelmente já não existiam). Seguindo." }
} else {
  Write-Info "Nenhuma typing @types/react* encontrada na RAIZ (ok)."
}

Write-Info "Garantindo typings no FRONTEND"
pnpm --filter asclepius-frontend add -D @types/react@^19.2.2 @types/react-dom@^19.2.2
if($LASTEXITCODE -ne 0){
  Write-Err "Falha ao adicionar typings no frontend."
  exit 1
}

# --- Instalar no workspace ---
Write-Info "pnpm install -r"
pnpm install -r
if($LASTEXITCODE -ne 0){
  Write-Err "Falha em pnpm install -r."
  exit 1
}
Write-Ok "Dependências instaladas em todos os pacotes"

# --- Rodar checagem (scripts/check-dev.ps1) ---
if(-not $NoCheck){
  if(Test-Path ".\scripts\check-dev.ps1"){
    Write-Info "Rodando verificação de ambiente: pnpm run check"
    pnpm run check
    if($LASTEXITCODE -ne 0){ Write-Warn "pnpm run check retornou código != 0. Verifique os avisos acima." }
  } else {
    Write-Warn "scripts/check-dev.ps1 não encontrado. Pulei a verificação final."
  }
}

# --- Iniciar dev (opcional) ---
if($StartDev){
  Write-Info "Iniciando pnpm run dev (isso vai ocupar o terminal atual)..."
  pnpm run dev
} else {
  Write-Ok "Concluído. Você pode iniciar os serviços com: pnpm run dev"
}

if($backupMade){
  Write-Warn "Um backup do antigo package.json foi criado (veja acima)."
}
