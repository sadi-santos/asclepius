param(
  [string]$FrontendPath = "..\asclepius-frontend",
  [string]$BackendPath  = "..\asclepius-backend",
  [string]$FrontUrl     = "http://localhost:5173",
  [string]$ApiUrl       = "http://localhost:3001",
  [switch]$Fix = $false,

  # Auth (use UM dos metodos)
  [string]$AuthToken = "",
  [PSCredential]$Credential,
  [string]$AuthEmail = "",
  [SecureString]$AuthPasswordSecure
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------- helpers ----------
function Write-Line([string]$msg,[string]$color="Gray"){
  # valida cor e faz fallback se vier lixo (ex.: "¦")
  $valid = [System.Enum]::GetNames([System.ConsoleColor])
  if (-not ($valid -contains $color)) { $color = "Gray" }
  try {
    Write-Host $msg -ForegroundColor ([System.ConsoleColor]::$color)
  } catch {
    Write-Host $msg -ForegroundColor Gray
  }
}
function Join-PathEx([string]$a,[string]$b){ Join-Path $a $b }
function Read-Json([string]$p){ if(Test-Path $p){ Get-Content $p -Raw | ConvertFrom-Json } else { $null } }
function Save-Text([string]$path,[string]$content){
  $dir = Split-Path $path
  if($dir){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $content | Set-Content -Encoding UTF8 $path
}
function PathPosix([string]$p){ ($p -replace "\\","/") }

$Report = New-Object System.Collections.Generic.List[pscustomobject]
function Add-ReportItem([string]$where,[string]$severity,[string]$message,[string]$hint=""){
  $Report.Add([pscustomobject]@{ Area=$where; Severity=$severity; Message=$message; Hint=$hint })
}

# ---------- auth ----------
function Convert-SecureStringToPlain([SecureString]$sec){
  if($null -eq $sec){ return "" }
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Get-TokenFromResponse($resp){
  if ($null -ne $resp) {
    if ($resp.PSObject.Properties.Name -contains 'token'        -and $resp.token)        { return [string]$resp.token }
    if ($resp.PSObject.Properties.Name -contains 'access_token' -and $resp.access_token) { return [string]$resp.access_token }
    if ($resp.PSObject.Properties.Name -contains 'accessToken'  -and $resp.accessToken)  { return [string]$resp.accessToken }
  }
  return ""
}
function Invoke-Login {
  param([string]$ApiUrl,[string]$Username,[SecureString]$PasswordSecure)
  $passwordPlain = Convert-SecureStringToPlain $PasswordSecure
  $candidates = @("/auth/login","/api/auth/login","/login")
  foreach($p in $candidates){
    foreach($shape in @("email","username")){
      try{
        $body = if($shape -eq "email"){ @{ email=$Username; password=$passwordPlain } } else { @{ username=$Username; password=$passwordPlain } }
        $json = $body | ConvertTo-Json
        $resp = Invoke-RestMethod -Method Post -Uri ($ApiUrl.TrimEnd('/')+$p) -ContentType "application/json" -Body $json
        $tok  = Get-TokenFromResponse $resp
        if($tok){ return @{ Authorization = "Bearer $tok" } }
      }catch{}
    }
  }
  @{}
}
function Get-AuthHeader {
  if($AuthToken){ return @{ Authorization="Bearer $AuthToken" } }
  if($Credential){ return Invoke-Login -ApiUrl $ApiUrl -Username $Credential.UserName -PasswordSecure $Credential.Password }
  if($AuthEmail -and $AuthPasswordSecure){ return Invoke-Login -ApiUrl $ApiUrl -Username $AuthEmail -PasswordSecure $AuthPasswordSecure }
  @{}
}

# ---------- visao de arvore ----------
function Get-TreeView([string]$root,[string]$title){
  Write-Line "== $title ==" "Green"
  if(-not (Test-Path $root)){ Write-Line "   (nao encontrado) $root" "Yellow"; return }
  $base = (Resolve-Path $root).Path
  Get-ChildItem -Path $root -Recurse -Depth 2 | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length).TrimStart('\','/')
    if(-not [string]::IsNullOrWhiteSpace($rel)){
      Write-Line ("  " + (PathPosix $rel)) "Gray"
    }
  }
}

# ---------- FRONTEND ----------
function Test-Frontend([string]$root){
  $pkgPath = Join-PathEx $root "package.json"
  $pkg = Read-Json $pkgPath
  if(-not $pkg){
    Add-ReportItem "frontend" "Error" "package.json nao encontrado" "Rode na pasta do frontend ou ajuste -FrontendPath."
    return
  }

  # scripts esperados
  $wantScripts = @("dev","build","preview","test:unit","test:unit:watch","test:diag:unit","test:e2e","test:e2e:ui","test:e2e:report")
  foreach($s in $wantScripts){
    if(-not $pkg.scripts.PSObject.Properties.Name.Contains($s)){
      Add-ReportItem "frontend/package.json" "Warn" "script '$s' ausente" "Adicionar script sugerido no package.json."
    }
  }

  # devDeps essenciais
  $mustDevDeps = @("@playwright/test","vitest","@vitejs/plugin-react","vite","vite-tsconfig-paths","typescript")
  foreach($d in $mustDevDeps){
    if(-not ($pkg.devDependencies.PSObject.Properties.Name -contains $d)){
      Add-ReportItem "frontend/package.json" "Warn" "devDependency '$d' ausente" "pnpm add -D $d"
    }
  }

  # tsconfig
  $tsPath = Join-PathEx $root "tsconfig.json"
  $ts = Read-Json $tsPath
  if(-not $ts){
    Add-ReportItem "frontend/tsconfig.json" "Error" "tsconfig.json nao encontrado" "Criar tsconfig e incluir 'vitest/globals' em compilerOptions.types."
  } else {
    $types = @()
    if($ts.compilerOptions -and $ts.compilerOptions.types){ $types = @($ts.compilerOptions.types) }
    if(-not ($types -contains "vitest/globals")){
      Add-ReportItem "frontend/tsconfig.json" "Warn" "types nao contem 'vitest/globals'" "Adicionar 'vitest/globals' em compilerOptions.types."
      if($Fix){ $ts.compilerOptions.types = (@($types) + "vitest/globals" | Select-Object -Unique) }
    }
    if($types -contains "@playwright/test"){
      Add-ReportItem "frontend/tsconfig.json" "Warn" "types contem '@playwright/test' (pode conflitar com Vitest)" "Remover '@playwright/test' de compilerOptions.types."
      if($Fix){ $ts.compilerOptions.types = (@($types | Where-Object { $_ -ne "@playwright/test" })) }
    }
    if($Fix){ ($ts | ConvertTo-Json -Depth 20) | Set-Content $tsPath -Encoding UTF8 }
  }

  # vitest env
  $vitestEnv = Join-PathEx $root "src/vitest-env.d.ts"
  if(-not (Test-Path $vitestEnv)){
    Add-ReportItem "frontend" "Warn" "src/vitest-env.d.ts ausente" "Criar arquivo com reference para vitest."
    if($Fix){ Save-Text $vitestEnv "/// <reference types=`"vitest`" />`r`n" }
  }

  # vitest.config.ts
  $vitestCfg = Join-PathEx $root "vitest.config.ts"
  if(-not (Test-Path $vitestCfg)){
    Add-ReportItem "frontend" "Warn" "vitest.config.ts ausente" "Criar config basico com jsdom e tsconfig paths."
    if($Fix){
      $cfg = @'
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    css: false
  }
});
'@
      Save-Text $vitestCfg $cfg
    }
  }

  # unit test cpf (aceita em tests/diagnostics/* OU tests/diagnostics/unit/*)
  $unitCandidates = @(
    Get-ChildItem -Path $root -Recurse -File -Include "cpf.test.ts","cpf.spec.ts" |
      Where-Object { $_.FullName -match "\\tests\\.*diagnostics" -or $_.FullName -match "/tests/.+diagnostics" }
  )
  if(@($unitCandidates).Count -eq 0){
    Add-ReportItem "frontend/tests" "Warn" "teste unitario de CPF nao encontrado" "Criar tests/diagnostics/unit/cpf.test.ts (ou manter cpf.spec.ts existente)."
    if($Fix){
      $unitPath = Join-PathEx $root "tests/diagnostics/unit/cpf.test.ts"
      $spec = @'
import { onlyDigits, formatCPFView, validateCPF } from "@/utils/cpf";

describe("utils/cpf (diagnostico)", () => {
  it("onlyDigits", () => {
    expect(onlyDigits("123.456.789-09")).toBe("12345678909");
    expect(onlyDigits("***.***.***-**")).toBe("");
    expect(onlyDigits("52998224725")).toBe("52998224725");
  });
  it("formatCPFView idempotente", () => {
    expect(formatCPFView("12345678909")).toBe("123.456.789-09");
    expect(formatCPFView("123.456.789-09")).toBe("123.456.789-09");
  });
  it("validateCPF validos conhecidos", () => {
    expect(validateCPF("52998224725")).toBe(true);
    expect(validateCPF("12345678909")).toBe(true);
  });
  it("validateCPF invalidos", () => {
    expect(validateCPF("11111111111")).toBe(false);
    expect(validateCPF("")).toBe(false);
    expect(validateCPF("123")).toBe(false);
  });
});
'@
      Save-Text $unitPath $spec
    }
  }

  # E2E playwright config & specs
  $e2eCfgCandidates = @(
    (Join-PathEx $root "tests/diagnostics/e2e/playwright.config.ts"),
    (Join-PathEx $root "tests/e2e/playwright.config.ts"),
    (Join-PathEx $root "tests/diagnostics/playwright.config.ts")
  )
  $e2eCfgPaths = @()
  foreach($p in $e2eCfgCandidates){ if(Test-Path $p){ $e2eCfgPaths += $p } }
  if(@($e2eCfgPaths).Count -eq 0){
    Add-ReportItem "frontend/e2e" "Warn" "playwright.config.ts de E2E nao encontrado" "Criar em tests/diagnostics/e2e/playwright.config.ts."
    if($Fix){
      $e2eCfg = Join-PathEx $root "tests/diagnostics/e2e/playwright.config.ts"
      $cfg = @'
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/diagnostics/e2e",
  testMatch: "**/*.e2e.spec.ts",
  reporter: "list",
  use: { baseURL: "http://localhost:5173" }
});
'@
      Save-Text $e2eCfg $cfg
    }
  }
  $e2eSpecs = @(
    Get-ChildItem -Path (Join-PathEx $root "tests") -Recurse -File -Include "*.e2e.spec.ts"
  )
  if(@($e2eSpecs).Count -eq 0){
    Add-ReportItem "frontend/e2e" "Warn" "nenhum *.e2e.spec.ts encontrado" "Criar spec para o fluxo de edicao sem tocar no CPF."
  }

  # utils/cpf.ts
  $utilsCandidates = @( Get-ChildItem -Recurse -File -Path $root -Filter "cpf.ts" )
  if(@($utilsCandidates).Count -eq 0){
    Add-ReportItem "frontend/utils" "Error" "src/utils/cpf.ts nao encontrado" "Crie o modulo com onlyDigits/formatCPFView/validateCPF."
  } else {
    $cpfTs = $utilsCandidates | Where-Object { (Select-String -Path $_.FullName -Pattern "export function validateCPF" -Quiet) } | Select-Object -First 1
    if(-not $cpfTs){
      Add-ReportItem "frontend/utils" "Error" "arquivo cpf.ts sem 'validateCPF' exportado" "Adicionar 'export function validateCPF(...)'."
    }
  }

  # PatientForm (validar CPF so quando alterado)
  $pathsToCheck = @(
    (Join-PathEx $root "src/pages/PatientForm.tsx"),
    (Join-PathEx $root "src/pages/patients/PatientForm.tsx")
  )
  $formPaths = @()
  foreach($p in $pathsToCheck){ if(Test-Path $p){ $formPaths += $p } }

  if(@($formPaths).Count -eq 0){
    Add-ReportItem "frontend/PatientForm" "Warn" "PatientForm.tsx nao encontrado" "Confirme o caminho do formulario."
  } else {
    $formPath = $formPaths[0]
    $txt = Get-Content $formPath -Raw
    $hasRef = ($txt -match "useRef<\s*string\s*>\s*\(") -or ($txt -match "originalCpfRef")
    $hasAlter = ($txt -match "cpfAlterado") -or ($txt -match "!==\s*original")
    $validOnChange = ($txt -match "if\s*\(\s*!\s*isEdit\s*\|\|\s*cpfAlterado\s*\)")
    if(-not $hasRef -or -not $hasAlter -or -not $validOnChange){
      Add-ReportItem "frontend/PatientForm" "Warn" "Regra 'validar CPF so quando alterado' nao detectada" "Aplicar patch do PatientForm."
    } else {
      Add-ReportItem "frontend/PatientForm" "Info" "Regra de validacao condicional de CPF detectada" ""
    }
  }
}

# ---------- BACKEND ----------
function Test-Backend([string]$root){
  if(-not (Test-Path $root)){ Add-ReportItem "backend" "Error" "Diretorio do backend nao encontrado" ""; return }

  $prisma = Join-PathEx $root "prisma/schema.prisma"
  if(-not (Test-Path $prisma)){ Add-ReportItem "backend/prisma" "Warn" "schema.prisma ausente" "" }

  # Checagem API rapida
  $headers = Get-AuthHeader
  try{
    $list = Invoke-RestMethod -Method GET -Uri "$ApiUrl/patients?page=1&size=1" -Headers $headers
    $items = @($list.items)
    if(@($items).Count -eq 0){
      Add-ReportItem "backend/api" "Warn" "GET /patients retornou vazio" "Cadastre um paciente para os testes."
      return
    }
    $id = $items[0].id
    $detail = Invoke-RestMethod -Method GET -Uri "$ApiUrl/patients/$id" -Headers $headers
    $cpf = [string]$detail.cpf
    $digits = ($cpf -replace "\D","").Length
    if($digits -ne 11){
      Add-ReportItem "backend/api" "Warn" "GET /patients/$id retorna CPF com $digits digitos" "Padronize o retorno do backend como 11 digitos."
    } else {
      Add-ReportItem "backend/api" "Info" "GET /patients/$id retorna CPF com 11 digitos" ""
    }
  } catch {
    Add-ReportItem "backend/api" "Error" "Falha ao consultar API: $($_.Exception.Message)" "Verifique se esta rodando em $ApiUrl"
  }
}

# ---------- EXECUCAO ----------
Write-Line "Pacote: Auditor de Projeto Asclepius" "Cyan"
Write-Line ("FrontendPath: " + (Resolve-Path $FrontendPath).Path) "Gray"
Write-Line ("BackendPath : " + (Resolve-Path $BackendPath ).Path) "Gray"
Write-Line ""

Get-TreeView $FrontendPath 'FRONTEND (nivel 2)'
Get-TreeView $BackendPath  'BACKEND (nivel 2)'
Write-Line ""

Test-Frontend $FrontendPath
Test-Backend  $BackendPath

# ---------- RELATORIO ----------
Write-Line "`n==== RELATORIO ====" "Cyan"
$errors = @($Report | Where-Object { $_.Severity -eq "Error" })
$warns  = @($Report | Where-Object { $_.Severity -eq "Warn" })
$infos  = @($Report | Where-Object { $_.Severity -eq "Info" })

Write-Line ("Erros:  " + $errors.Count) ("Red")
Write-Line ("Avisos: " + $warns.Count)  ("Yellow")
Write-Line ("Infos:  " + $infos.Count)  ("Gray")
Write-Line ""

foreach($row in $Report){
  $color = if($row.Severity -eq "Error"){"Red"} elseif($row.Severity -eq "Warn"){"Yellow"} else {"Gray"}
  Write-Line ("- [" + $row.Severity.ToUpper() + "] " + $row.Area + " :: " + $row.Message) $color
  if($row.Hint){ Write-Line ("        dica: " + $row.Hint) "DarkGray" }
}

# grava markdown (sem $() dentro de string)
$md = @()
$md += "# Auditoria Asclepius"
$md += ""
$md += "Frontend: " + (Resolve-Path $FrontendPath).Path
$md += "Backend : "  + (Resolve-Path $BackendPath ).Path
$md += ""
$md += "## Resumo"
$md += "- Erros: "  + $errors.Count
$md += "- Avisos: " + $warns.Count
$md += "- Infos: "  + $infos.Count
$md += ""
$md += "## Itens"
foreach($row in $Report){
  $line = "- **[" + $row.Severity + "]** *" + $row.Area + "* - " + $row.Message
  if($row.Hint -and $row.Hint.Trim().Length -gt 0){
    $line = $line + " - _" + $row.Hint + "_"
  }
  $md += $line
}
$outPath = ".\auditoria-asclepius.md"
$md -join "`r`n" | Set-Content -Encoding UTF8 $outPath
Write-Line ("`nRelatorio salvo em: " + (Resolve-Path $outPath).Path) "Green"

if($Fix){
  Write-Line "`nModo -Fix aplicado para itens simples (config/testes). Revise o diff no Git." "Yellow"
}
