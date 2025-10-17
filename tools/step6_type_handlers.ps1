#requires -Version 5
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Set-TextInFile {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)] [string] $File,
    [Parameter(Mandatory)] [string] $Pattern,
    [Parameter(Mandatory)] [string] $Replacement
  )
  if (-not (Test-Path -LiteralPath $File)) { return }
  $orig = Get-Content -Raw -LiteralPath $File
  $new  = [System.Text.RegularExpressions.Regex]::Replace($orig, $Pattern, $Replacement, 'IgnoreCase, Multiline')
  if ($new -ne $orig) { Set-Content -LiteralPath $File -Value $new -Encoding UTF8; Write-Host "Atualizado:" $File }
}

# 1) main.tsx: usar import default para ErrorBoundary
$main = "C:\Projetos\VidaPlus\asclepius-frontend\src\main.tsx"
Set-TextInFile -File $main `
  -Pattern 'import\s*\{\s*ErrorBoundary\s*\}\s*from\s*"\.\/components\/ErrorBoundary";' `
  -Replacement 'import ErrorBoundary from "./components/ErrorBoundary";'

# 2) AppointmentsList.tsx: tipagem no indexador dos mapas
$apptList = "C:\Projetos\VidaPlus\asclepius-frontend\src\pages\appointments\AppointmentsList.tsx"
Set-TextInFile -File $apptList `
  -Pattern '\{TYPE_PT\[\s*a\.type\s*\]\}' `
  -Replacement '{(TYPE_PT as any)[a.type as any]}'
Set-TextInFile -File $apptList `
  -Pattern '\{STATUS_PT\[\s*a\.status\s*\]\}' `
  -Replacement '{(STATUS_PT as any)[a.status as any]}'

Write-Host "Concluído."
