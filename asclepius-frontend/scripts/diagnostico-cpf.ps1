# scripts/diagnostico-cpf.ps1
param(
  [string]$FrontUrl = "http://localhost:5173",
  [string]$ApiUrl   = "http://localhost:3001",
  [string]$PatientId = "",
  [string]$ApiHealthPath = "/health",
  [string]$FrontProbePath = "/",
  # Auth: use UM dos métodos -> -AuthToken  OU  -Credential  OU  -AuthEmail + -AuthPasswordSecure
  [string]$AuthToken = "",
  [PSCredential]$Credential,
  [string]$AuthEmail = "",
  [SecureString]$AuthPasswordSecure,
  # (opcional) chave do localStorage do front
  [string]$FrontTokenKey = "token"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Exec([string]$cmd) {
  Write-Host "`n> $cmd" -ForegroundColor Cyan
  cmd /c $cmd
}
function Which($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }
function Get-PkgMgr {
  if (Which "pnpm") { "pnpm" }
  elseif (Which "yarn") { "yarn" }
  else { "npm" }
}
function Read-PackageJson {
  if (-not (Test-Path "package.json")) { throw "package.json não encontrado. Rode na raiz do frontend." }
  Get-Content package.json -Raw | ConvertFrom-Json
}
function Test-Url([string]$url,[int]$t=3){
  try { Invoke-WebRequest -Method Head -Uri $url -TimeoutSec $t -ErrorAction Stop | Out-Null; return $true }
  catch {
    try { Invoke-WebRequest -Method Get -Uri $url -TimeoutSec $t -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
  }
}
function Install-DevDependency([string]$dep){
  $pkg = Read-PackageJson
  $has = (($null -ne $pkg.devDependencies.$dep) -or ($null -ne $pkg.dependencies.$dep))
  if (-not $has) {
    $pm = Get-PkgMgr
    Write-Host "Instalando devDependency: $dep ($pm)..." -ForegroundColor Yellow
    if ($pm -eq "pnpm") { Exec "pnpm add -D $dep" }
    elseif ($pm -eq "yarn") { Exec "yarn add -D $dep" }
    else { Exec "npm i -D $dep" }
  }
}
function Install-PlaywrightSupport {
  Install-DevDependency "@playwright/test"
  Write-Host "Instalando browsers do Playwright (se necessário)..." -ForegroundColor Yellow
  Exec "npx playwright install"
}
function Find-CpfUtilsPath{
  $candidates = @(
    Get-ChildItem -Recurse -File -Filter "cpf.ts" | Where-Object {
      try { Select-String -Path $_.FullName -Pattern "validateCPF" -Quiet } catch { $false }
    }
  )
  if ($candidates.Count -eq 0) { throw "Não encontrei src/**/cpf.ts contendo 'validateCPF'." }
  ($candidates | Sort-Object { $_.FullName.Length } | Select-Object -First 1).FullName
}
function New-RelImportPath($fromDir,$toTsPath){
  $relAbs = (Resolve-Path $toTsPath).Path
  $rel = [IO.Path]::GetRelativePath($fromDir, $relAbs) -replace "\\","/"
  $relNoExt = $rel -replace "\.ts$",""
  if ($relNoExt -notmatch "^\.\.") { $relNoExt = "./$relNoExt" }
  $relNoExt
}
function Convert-SecureStringToPlain([SecureString]$sec){
  if ($null -eq $sec) { return "" }
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Get-TokenFromResponse($resp){
  if ($null -ne $resp) {
    if ($null -ne $resp.token -and -not [string]::IsNullOrWhiteSpace($resp.token)) { return [string]$resp.token }
    if ($null -ne $resp.access_token -and -not [string]::IsNullOrWhiteSpace($resp.access_token)) { return [string]$resp.access_token }
    if ($null -ne $resp.accessToken -and -not [string]::IsNullOrWhiteSpace($resp.accessToken)) { return [string]$resp.accessToken }
  }
  return ""
}
function Invoke-Login {
  param([string]$ApiUrl,[string]$Username,[SecureString]$PasswordSecure)
  $passwordPlain = Convert-SecureStringToPlain $PasswordSecure
  $loginUris = @("/auth/login","/api/auth/login","/login")
  foreach($p in $loginUris){
    try{
      $body1 = @{ email=$Username; password=$passwordPlain } | ConvertTo-Json
      $resp1 = Invoke-RestMethod -Method Post -Uri ($ApiUrl.TrimEnd('/')+$p) -ContentType "application/json" -Body $body1
      $tok1  = Get-TokenFromResponse $resp1
      if (-not [string]::IsNullOrWhiteSpace($tok1)) { return @{ Authorization = "Bearer $tok1" } }
    }catch{}
    try{
      $body2 = @{ username=$Username; password=$passwordPlain } | ConvertTo-Json
      $resp2 = Invoke-RestMethod -Method Post -Uri ($ApiUrl.TrimEnd('/')+$p) -ContentType "application/json" -Body $body2
      $tok2  = Get-TokenFromResponse $resp2
      if (-not [string]::IsNullOrWhiteSpace($tok2)) { return @{ Authorization = "Bearer $tok2" } }
    }catch{}
  }
  Write-Host "Falha no login automático (tentativas: $($loginUris -join ', ')). Informe -AuthToken ou ajuste sua rota." -ForegroundColor Yellow
  @{}
}
function Get-AuthHeader {
  param([string]$ApiUrl,[string]$AuthToken,[PSCredential]$Credential,[string]$AuthEmail,[SecureString]$AuthPasswordSecure)
  if (-not [string]::IsNullOrWhiteSpace($AuthToken)) { return @{ Authorization = "Bearer $AuthToken" } }
  if ($Credential) {
    $credUser = $Credential.UserName
    $credPass = $Credential.Password    # SecureString
    return (Invoke-Login -ApiUrl $ApiUrl -Username $credUser -PasswordSecure $credPass)
  }
  if (-not [string]::IsNullOrWhiteSpace($AuthEmail) -and $AuthPasswordSecure) {
    return (Invoke-Login -ApiUrl $ApiUrl -Username $AuthEmail -PasswordSecure $AuthPasswordSecure)
  }
  Write-Host "Sem token/credenciais. Passo A pode retornar 401. Dica: -Credential (Get-Credential) ou -AuthToken." -ForegroundColor Yellow
  @{}
}

# ---------- PROBES ----------
$apiProbe   = ($ApiUrl.TrimEnd('/')   + $ApiHealthPath)
$frontProbe = ($FrontUrl.TrimEnd('/') + $FrontProbePath)
$apiUp   = Test-Url $apiProbe
$frontUp = Test-Url $frontProbe
$Headers = Get-AuthHeader -ApiUrl $ApiUrl -AuthToken $AuthToken -Credential $Credential -AuthEmail $AuthEmail -AuthPasswordSecure $AuthPasswordSecure

# --- Passo A: Checagem direta via API ---
Write-Host "== Passo A: Checando API ($ApiUrl) ==" -ForegroundColor Green
if (-not $apiUp) {
  Write-Host "API fora do ar (falhou em $apiProbe). Pulei Passo A." -ForegroundColor Yellow
} else {
  try {
    if ([string]::IsNullOrEmpty($PatientId)) {
      $list = Invoke-RestMethod -Method GET -Uri "$ApiUrl/patients?page=1&size=1" -Headers $Headers
      if ($null -eq $list -or $null -eq $list.items -or $list.items.Count -eq 0) { throw "Não há pacientes para testar (GET /patients)." }
      $PatientId = $list.items[0].id
    }
    Write-Host "Paciente alvo: $PatientId" -ForegroundColor Gray
    $detail = Invoke-RestMethod -Method GET -Uri "$ApiUrl/patients/$PatientId" -Headers $Headers
    $cpf = ($detail.cpf | Out-String).Trim()
    $cpfDigits = ($cpf -replace "\D","")
    Write-Host "CPF do detalhe: '$cpf'  | dígitos: $($cpfDigits.Length)" -ForegroundColor Gray
    if ($cpfDigits.Length -ne 11) {
      Write-Host "ALERTA: Detalhe do paciente NÃO retorna 11 dígitos. Isso explica 'CPF inválido' no front sem editar o campo." -ForegroundColor Yellow
    } else {
      Write-Host "OK: Detalhe retorna 11 dígitos." -ForegroundColor Green
    }
  } catch {
    Write-Host "Falha ao consultar API: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# --- Passo B: Teste unitário dos utils (Vitest/Jest) ---
Write-Host "`n== Passo B: Teste unitário dos utils/cpf ==" -ForegroundColor Green
$unitDir = Join-Path "tests" "diagnostics"
New-Item -ItemType Directory -Force -Path $unitDir | Out-Null

try {
  $cpfTs = Find-CpfUtilsPath
  $importRel = New-RelImportPath (Resolve-Path $unitDir) $cpfTs

  $unitSpecPath = Join-Path $unitDir "cpf.spec.ts"
@"
import { onlyDigits, formatCPFView, validateCPF } from "$importRel";

describe("utils/cpf (diagnóstico)", () => {
  it("onlyDigits", () => {
    expect(onlyDigits("123.456.789-09")).toBe("12345678909");
    expect(onlyDigits("***.***.***-**")).toBe("");
    expect(onlyDigits("52998224725")).toBe("52998224725");
  });
  it("formatCPFView idempotente", () => {
    expect(formatCPFView("12345678909")).toBe("123.456.789-09");
    expect(formatCPFView("123.456.789-09")).toBe("123.456.789-09");
  });
  it("validateCPF válidos conhecidos", () => {
    expect(validateCPF("52998224725")).toBe(true);
    expect(validateCPF("12345678909")).toBe(true);
  });
  it("validateCPF inválidos", () => {
    expect(validateCPF("11111111111")).toBe(false);
    expect(validateCPF("")).toBe(false);
    expect(validateCPF("123")).toBe(false);
  });
});
"@ | Set-Content -Encoding UTF8 $unitSpecPath

  $pkg = Read-PackageJson
  $runner = $null
  if ($pkg.devDependencies.vitest -or $pkg.scripts.vitest -match "vitest") { $runner = "vitest" }
  elseif ($pkg.devDependencies.jest -or $pkg.scripts.test -match "jest") { $runner = "jest" }

  if ($runner -eq "vitest") { Install-DevDependency "vitest"; Exec "npx vitest run $unitSpecPath" }
  elseif ($runner -eq "jest") { Install-DevDependency "jest"; Write-Host "ATENÇÃO: Jest em TS pode precisar de ts-jest/babel-jest. Tentando..." -ForegroundColor Yellow; Exec "npx jest $unitSpecPath" }
  else { Write-Host "Nenhum runner detectado (Vitest/Jest). Pulei o teste unitário." -ForegroundColor Yellow }
}
catch { Write-Host "Falha ao preparar/rodar teste unitário: $($_.Exception.Message)" -ForegroundColor Red }

# --- Passo C: Playwright E2E ---
Write-Host "`n== Passo C: Playwright E2E (edição sem alterar CPF) ==" -ForegroundColor Green
if (-not $frontUp) {
  Write-Host "Front fora do ar ($FrontUrl). Pulei Passo C." -ForegroundColor Yellow
} else {
  Install-PlaywrightSupport

  # Diretórios/arquivos (normaliza para POSIX no config do Playwright)
  $pwDirFs   = (Resolve-Path $unitDir).Path
  $pwDirPosix = ($pwDirFs -replace "\\","/")
  $pwCfgFs   = Join-Path $unitDir "playwright.config.ts"
  $pwSpecFs  = Join-Path $unitDir "patients-edit-cpf.spec.ts"

  # prepara localStorage tokens (sem assignments inline)
  $bearer = ""
  if ($Headers.ContainsKey("Authorization")) { $bearer = $Headers.Authorization }
  $tokenNoBearer = ""
  if (-not [string]::IsNullOrWhiteSpace($bearer)) { $tokenNoBearer = ($bearer -replace '^Bearer\s+','') }
  if ([string]::IsNullOrWhiteSpace($tokenNoBearer)) {
    $localStorageEntries = "[]"
  } else {
    $localStorageEntries = "[{ key: '$FrontTokenKey', value: '$tokenNoBearer' }]"
  }

@"
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '$pwDirPosix',
  reporter: 'list',
  use: {
    baseURL: '$FrontUrl',
    storageState: {
      origins: [{
        origin: '$FrontUrl',
        localStorage: $localStorageEntries
      }]
    }
  }
});
"@ | Set-Content -Encoding UTF8 $pwCfgFs

@"
import { test, expect } from '@playwright/test';

test('Salvar edição sem tocar no CPF não deve acusar CPF inválido', async ({ page }) => {
  await page.goto('/patients');

  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor();
  await firstRow.locator('td').first().locator('button, a').first().click();

  const nome = page.getByLabel(/Nome completo \*/i);
  await expect(nome).toBeVisible();
  const antigo = await nome.inputValue();
  await nome.fill((antigo || 'Paciente') + ' Teste');

  const salvar = page.getByRole('button', { name: /salvar|criar/i });
  await salvar.click();

  await expect(page.locator('text=CPF inválido')).toHaveCount(0);
  await expect(page).toHaveURL(/\/patients$/);
});

test('Detalhe deve retornar CPF com 11 dígitos (via interceptação)', async ({ page }) => {
  let gotDetail:any;
  page.on('response', async (resp) => {
    if (resp.request().method() === 'GET' && /\/patients\/[^/?]+$/.test(resp.url())) {
      try { gotDetail = await resp.json(); } catch {}
    }
  });

  await page.goto('/patients');
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor();
  await firstRow.locator('td').first().locator('button, a').first().click();

  expect(gotDetail).toBeTruthy();
  const cpf = String(gotDetail?.cpf ?? '').replace(/\D+/g, '');
  expect(cpf.length).toBe(11);
});
"@ | Set-Content -Encoding UTF8 $pwSpecFs

  # roda pelo testDir do config (evita regex/path no Windows)
  Exec "npx playwright test --config=`"$pwCfgFs`""
}

Write-Host "`nConcluído. Resumo:" -ForegroundColor Green
Write-Host " - API up? $apiUp  | Front up? $frontUp" -ForegroundColor Gray
Write-Host " - Passo A usa Authorization se você passar -AuthToken OU -Credential/-AuthEmail+SecurePassword." -ForegroundColor Gray
Write-Host " - Passo C injeta token no localStorage ('$FrontTokenKey') se houver token e normaliza caminhos para POSIX." -ForegroundColor Gray
Write-Host " - Se Passo A mostrar CPF < 11, ajuste o GET /patients/:id para retornar dígitos." -ForegroundColor Gray
Write-Host " - Se E2E acusar 'CPF inválido' sem tocar no campo, valide no submit apenas quando CPF for alterado." -ForegroundColor Gray
