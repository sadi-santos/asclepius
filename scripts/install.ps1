#requires -Version 7.0
<#
    .SYNOPSIS
    Provisiona o ambiente de desenvolvimento completo do monorepo Asclepius.

    .DESCRIPTION
    - Valida a presenca do Node.js 20+ e do PNPM.
    - Instala dependencias de todos os workspaces.
    - Gera arquivos .env padrao para backend e frontend (se ainda nao existirem).
    - Executa as migracoes Prisma, gera o client e roda o seed opcionalmente.

    .EXAMPLE
    pwsh ./scripts/install.ps1

    .EXAMPLE
    pwsh ./scripts/install.ps1 -SkipDatabaseTasks
    Executa apenas as etapas de dependencias e arquivos .env.
#>
param (
    [switch]$SkipDatabaseTasks,
    [switch]$SkipSeeds
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "asclepius-backend"
$frontendDir = Join-Path $repoRoot "asclepius-frontend"

function Write-Section([string]$message) {
    Write-Host ""
    Write-Host "=== $message ===" -ForegroundColor Cyan
}

function Assert-Command([string]$command, [string]$installHint) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "O comando '$command' nao foi encontrado. Instale-o antes de prosseguir. Dica: $installHint"
    }
}

function Run-Step {
    param (
        [string]$Description,
        [scriptblock]$Action,
        [switch]$Optional
    )

    Write-Host "> $Description" -ForegroundColor Yellow
    try {
        & $Action
        Write-Host "  OK" -ForegroundColor Green
    }
    catch {
        Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
        if (-not $Optional) {
            throw
        }
    }
}

Write-Section "Validando pre-requisitos"

if (-not (Test-Path (Join-Path $repoRoot "pnpm-workspace.yaml"))) {
    throw "Execute este script a partir da raiz do repositorio clonando o monorepo completo."
}

Assert-Command -command "node" -installHint "https://nodejs.org/ (versao 20+)."
$nodeVersion = (& node --version).TrimStart('v')
if ([version]$nodeVersion -lt [version]"20.0.0") {
    throw "Node.js 20+ e necessario. Versao detectada: $nodeVersion"
}

Assert-Command -command "pnpm" -installHint "npm install -g pnpm"

Write-Section "Instalando dependencias"

Run-Step -Description "pnpm install -r (raiz)" -Action {
    Push-Location $repoRoot
    try { pnpm install -r }
    finally { Pop-Location }
}

Write-Section "Gerenciando arquivos .env"

$backendEnvPath = Join-Path $backendDir ".env"
if (-not (Test-Path $backendEnvPath)) {
    Run-Step -Description "Criando asclepius-backend/.env padrao" -Action {
        $backendEnv = @"
DATABASE_URL=postgresql://asclepius_user:asclepius_2024@localhost:5432/asclepius_dev?schema=public
JWT_SECRET=change-me-32-chars-min
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
REQUEST_ACCEPT_CAMEL=true
RESPONSE_USE_CAMEL=true
"@
        Set-Content -Encoding UTF8 -Path $backendEnvPath -Value $backendEnv.Trim()
    }
}
else {
    Write-Host "  asclepius-backend/.env ja existe - nenhuma alteracao." -ForegroundColor DarkGray
}

$frontendEnvPath = Join-Path $frontendDir ".env"
if (-not (Test-Path $frontendEnvPath)) {
    Run-Step -Description "Criando asclepius-frontend/.env padrao" -Action {
        $frontendEnv = @"
VITE_API_BASE_URL=http://localhost:3001
"@
        Set-Content -Encoding UTF8 -Path $frontendEnvPath -Value $frontendEnv.Trim()
    }
}
else {
    Write-Host "  asclepius-frontend/.env ja existe - nenhuma alteracao." -ForegroundColor DarkGray
}

if (-not $SkipDatabaseTasks) {
    Write-Section "Provisionando banco de dados"

    Run-Step -Description "pnpm --filter asclepius-backend prisma migrate deploy" -Action {
        Push-Location $repoRoot
        try { pnpm --filter asclepius-backend prisma migrate deploy }
        finally { Pop-Location }
    }

    Run-Step -Description "pnpm --filter asclepius-backend prisma generate" -Action {
        Push-Location $repoRoot
        try { pnpm --filter asclepius-backend prisma generate }
        finally { Pop-Location }
    }

    if (-not $SkipSeeds) {
        Run-Step -Description "pnpm --filter asclepius-backend prisma:seed" -Action {
            Push-Location $repoRoot
            try { pnpm --filter asclepius-backend prisma:seed }
            finally { Pop-Location }
        } -Optional
    }
    else {
        Write-Host "  Seed inicial pulado (--SkipSeeds informado)." -ForegroundColor DarkGray
    }
}
else {
    Write-Section "Tarefas de banco de dados foram puladas"
    Write-Host "Execute manualmente, se desejar:" -ForegroundColor DarkGray
    Write-Host "  pnpm --filter asclepius-backend prisma migrate deploy" -ForegroundColor DarkGray
    Write-Host "  pnpm --filter asclepius-backend prisma generate" -ForegroundColor DarkGray
    Write-Host "  pnpm --filter asclepius-backend prisma:seed" -ForegroundColor DarkGray
}

Write-Section "Configuracao concluida"
Write-Host "Para subir os servicos em desenvolvimento abra dois terminais e execute:" -ForegroundColor Green
Write-Host "  pnpm --filter asclepius-backend dev" -ForegroundColor Green
Write-Host "  pnpm --filter asclepius-frontend dev" -ForegroundColor Green
Write-Host ""
Write-Host "Revise os arquivos .env gerados para ajustar credenciais e URLs conforme o seu ambiente local." -ForegroundColor Yellow
