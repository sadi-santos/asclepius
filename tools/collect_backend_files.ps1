<# 
Coleta e empacota o conteúdo dos arquivos do backend (e 1 do frontend opcional)
em um único TXT com marcadores. Depois cole o TXT aqui que eu devolvo um patch completo.

Uso:
  powershell -ExecutionPolicy Bypass -File C:\Projetos\VidaPlus\tools\collect_backend_files.ps1
#>

$ErrorActionPreference = "Stop"

# --- DIRETÓRIOS DO PROJETO ---
$backendRoot  = "C:\Projetos\VidaPlus\asclepius-backend"
$frontendRoot = "C:\Projetos\VidaPlus\asclepius-frontend"
$outDir       = "C:\Projetos\VidaPlus\tools"

# --- ARQUIVOS-ALVO (ordem importa) ---
$targets = @(
  # backend
  "src\middleware\errorHandler.ts",
  "src\middleware\transform.ts",
  "src\schemas\patient.ts",
  "src\controllers\patients.ts",
  "src\routes\patients.routes.ts",
  "src\routes\index.ts",
  "src\lib\prisma.ts",
  "src\app.ts",
  "src\server.ts",

  # frontend opcional, para conferência do submit
  "..\asclepius-frontend\src\pages\patients\PatientForm.tsx"
)

# Resolve caminhos absolutos a partir do backendRoot
$resolved = @()
foreach ($rel in $targets) {
  $p = Join-Path $backendRoot $rel
  $resolved += $p
}

# Função hash
function Get-Sha256([string]$path) {
  if (Test-Path -LiteralPath $path) {
    $h = Get-FileHash -Path $path -Algorithm SHA256
    return $h.Hash
  }
  return ""
}

# StringBuilder de saída
$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("=== BUNDLE BACKEND/FRONT ===")
$null = $sb.AppendLine(("generatedAt: {0}" -f (Get-Date).ToString("O")))
$null = $sb.AppendLine(("backendRoot: {0}" -f $backendRoot))
$null = $sb.AppendLine(("frontendRoot: {0}" -f $frontendRoot))
$null = $sb.AppendLine("files:")

# Delimitadores seguros
$FILE_START = "-----8<----- FILE START -----"
$FILE_END   = "-----8<------ FILE END ------"
$FENCE      = '```'

foreach ($abs in $resolved) {
  $exists = Test-Path -LiteralPath $abs
  $hash = if ($exists) { Get-Sha256 $abs } else { "" }

  $status = if ($exists) { "OK" } else { "MISSING" }
  $null = $sb.AppendLine(("- {0}  {1}  {2}" -f $status, $abs, $hash))

  $null = $sb.AppendLine($FILE_START)
  $null = $sb.AppendLine(("PATH: {0}" -f $abs))
  $null = $sb.AppendLine($FENCE)

  if ($exists) {
    # Lê como UTF-8 sem alterar quebras
    $content = Get-Content -LiteralPath $abs -Raw -Encoding UTF8
    $null = $sb.Append($content)
  } else {
    # Usa comentário com # para evitar parsing do /
    $null = $sb.Append("# MISSING")
  }

  $null = $sb.AppendLine("")
  $null = $sb.AppendLine($FENCE)
  $null = $sb.AppendLine($FILE_END)
  $null = $sb.AppendLine("")
}

# Gera arquivo
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $outDir ("bundle_backend_{0}.txt" -f $ts)
[System.IO.File]::WriteAllText($outFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host "Bundle gerado:" $outFile
Write-Host "Diretório do backend:" $backendRoot
Write-Host "Diretório do frontend:" $frontendRoot
