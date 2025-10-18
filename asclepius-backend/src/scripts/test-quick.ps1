# 1) Estar na raiz do projeto
Set-Location C:\Projetos\VidaPlus\asclepius-backend

# 2) Garantir pasta e criar o script completo
New-Item -ItemType Directory -Path .\scripts -Force | Out-Null

@'
param(
  [string]$BASE_URL = "http://localhost:3001",
  [string]$EMAIL    = "admin@vidaplus.com",
  [string]$PASSWORD = "VidaPlus@2025"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Invoke-Json {
  param([string]$Method,[string]$Path,[hashtable]$Headers,[hashtable]$Body)
  $uri = "$BASE_URL$Path"
  $params = @{ Method = $Method; Uri = $uri; Headers = $Headers }
  if ($Body) { $params.ContentType = "application/json"; $params.Body = ($Body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod @params
}

function Ok   { param([string]$m) Write-Host "[OK]  $m"  -ForegroundColor Green }
function Warn { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Fail { param([string]$m) Write-Host "[ERR] $m"  -ForegroundColor Red; throw $m }

try { Invoke-RestMethod -Method GET -Uri "$BASE_URL/health" | Out-Null; Ok "health" } catch { Fail "health: $($_.Exception.Message)" }

try {
  $login = Invoke-RestMethod -Method POST -Uri "$BASE_URL/auth/login" -ContentType "application/json" -Body (@{ email=$EMAIL; password=$PASSWORD } | ConvertTo-Json)
  $jwt = if ($login.token) { $login.token } elseif ($login.access_token) { $login.access_token } else { "" }
  if (-not $jwt) { Fail "login sem token" }
  $H = @{ Authorization = "Bearer $jwt" }
  Ok "login"
} catch { Fail "login: $($_.Exception.Message)" }

$cpf   = (Get-Random -Minimum 10000000000 -Maximum 99999999999).ToString()
$lic   = "CRM-" + (Get-Random -Minimum 10000 -Maximum 99999)
$nowUtc = [DateTime]::UtcNow

try {
  $pCreate = @{
    full_name  = "Paciente Teste $cpf"; cpf = $cpf
    birth_date = ($nowUtc.AddYears(-35)).ToString("o")
    email = "pac.$cpf@example.com"; phone = "(11) 90000-0000"
    address = "Rua de Teste, 123"; blood_type = "O+"; is_active = $true
  }
  $p = Invoke-Json POST "/patients" $H $pCreate
  $patientId = $p.id; if (-not $patientId) { Fail "patients POST sem id" }
  Ok "patients POST"

  $pGet = Invoke-Json GET "/patients/$patientId" $H @{}
  if ($pGet.id -ne $patientId) { Fail "patients GET/id inconsistente" }
  Ok "patients GET/id"

  $nameIn = if ($pGet.full_name) { $pGet.full_name } elseif ($pGet.fullName) { $pGet.fullName } else { "Paciente Teste" }
  $pUpdate = @{
    full_name="$nameIn Atualizado"; cpf=$cpf
    birth_date=($nowUtc.AddYears(-34)).ToString("o")
    email="pac.$cpf+upd@example.com"; phone="(11) 90000-1111"
    address="Rua de Teste, 456"; blood_type="A+"; is_active=$true
  }
  $null = Invoke-Json PUT "/patients/$patientId" $H $pUpdate
  Ok "patients PUT/id"
} catch { Fail "patients: $($_.Exception.Message)" }

try {
  $profCreate = @{
    full_name="Prof Teste $lic"; role="DOCTOR"; specialty="Clínica"
    license_number=$lic; email="prof.$lic@example.com"; phone="(11) 95555-0000"; is_active=$true
  }
  $prof = Invoke-Json POST "/professionals" $H $profCreate
  $professionalId = $prof.id; if (-not $professionalId) { Fail "professionals POST sem id" }
  Ok "professionals POST"

  $profGet = Invoke-Json GET "/professionals/$professionalId" $H @{}
  if ($profGet.id -ne $professionalId) { Fail "professionals GET/id inconsistente" }
  Ok "professionals GET/id"

  $profNameIn = if ($profGet.full_name) { $profGet.full_name } elseif ($profGet.fullName) { $profGet.fullName } else { "Prof Teste" }
  $profUpdate = @{
    full_name="$profNameIn Atualizado"; role="DOCTOR"; specialty="Cardiologia"
    license_number=$lic; email="prof.$lic+upd@example.com"; phone="(11) 95555-1111"; is_active=$true
  }
  $null = Invoke-Json PUT "/professionals/$professionalId" $H $profUpdate
  Ok "professionals PUT/id"
} catch { Fail "professionals: $($_.Exception.Message)" }

try {
  $apptCreate = @{
    patient_id=$patientId; professional_id=$professionalId
    type="CONSULTATION"; status="SCHEDULED"
    scheduled_at=($nowUtc.AddHours(24)).ToString("o")
    reason="Teste inicial"; notes="Criado pelo script"
  }
  $appt = Invoke-Json POST "/appointments" $H $apptCreate
  $appointmentId = $appt.id; if (-not $appointmentId) { Fail "appointments POST sem id" }
  Ok "appointments POST"

  try { $null = Invoke-Json POST "/appointments/$appointmentId/confirm"  $H @{}; Ok "appointments confirm"  } catch { Warn "confirm indisponível" }
  try { $null = Invoke-Json POST "/appointments/$appointmentId/complete" $H @{}; Ok "appointments complete" } catch { Warn "complete indisponível" }

  $apptGet = Invoke-Json GET "/appointments/$appointmentId" $H @{}
  if ($apptGet.id -ne $appointmentId) { Fail "appointments GET/id inconsistente" }
  Ok "appointments GET/id"

  $apptUpdate = @{
    patient_id=$patientId; professional_id=$professionalId
    type="CONSULTATION"; status="CONFIRMED"
    scheduled_at=($nowUtc.AddHours(25)).ToString("o")
    reason="Teste atualizado"; notes="Atualizado pelo script"
  }
  $null = Invoke-Json PUT "/appointments/$appointmentId" $H $apptUpdate
  Ok "appointments PUT/id"
} catch { Fail "appointments: $($_.Exception.Message)" }

$errs=@()
try { Invoke-Json DELETE "/appointments/$appointmentId"  $H @{} | Out-Null; Ok "appointments DELETE/id" } catch { $errs += "del appt: $($_.Exception.Message)" }
try { Invoke-Json DELETE "/professionals/$professionalId" $H @{} | Out-Null; Ok "professionals DELETE/id" } catch { $errs += "del prof: $($_.Exception.Message)" }
try { Invoke-Json DELETE "/patients/$patientId"           $H @{} | Out-Null; Ok "patients DELETE/id" } catch { $errs += "del patient: $($_.Exception.Message)" }

if ($errs.Count -gt 0) { Warn ("cleanup parcial: " + ($errs -join '; ')) }
Write-Host "Fluxo CRUD básico OK." -ForegroundColor Green
'@ | Set-Content -Path .\scripts\test-quick.ps1 -Encoding UTF8

# 3) Validar existência
Get-Item .\scripts\test-quick.ps1
