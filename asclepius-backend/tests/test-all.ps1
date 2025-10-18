#requires -Version 5.1
Set-StrictMode -Version 2
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Config
$BASE           = if ($env:ASCLEPIUS_BASE) { $env:ASCLEPIUS_BASE } else { "http://localhost:3001" }
$ADMIN_EMAIL    = if ($env:ASCLEPIUS_ADMIN_EMAIL) { $env:ASCLEPIUS_ADMIN_EMAIL } else { "admin@vidaplus.com" }
$ADMIN_PASSWORD = if ($env:ASCLEPIUS_ADMIN_PASSWORD) { $env:ASCLEPIUS_ADMIN_PASSWORD } else { "VidaPlus@2025" }
$DELAY_MS       = 750

function ToJson($o) { $o | ConvertTo-Json -Depth 12 -Compress }
function New-AuthHeaders([string]$token) { @{ "Authorization"="Bearer $token"; "Content-Type"="application/json" } }
function New-Digits([int]$n) { -join (1..$n | ForEach-Object { Get-Random -Minimum 0 -Maximum 9 }) }
function Get-Prop($o, [string]$snake, [string]$camel, $default=$null) {
  if ($null -eq $o) { return $default }
  $p = $o.PSObject.Properties
  if ($p.Match($snake).Count) { return $o.$snake }
  if ($p.Match($camel).Count) { return $o.$camel }
  return $default
}
function AsString($v, $fallback="") { if ($null -eq $v) { return $fallback } return [string]$v }
function Wait-Api([string]$url,[int]$timeoutSec=30){
  $sw=[Diagnostics.Stopwatch]::StartNew()
  while($sw.Elapsed.TotalSeconds -lt $timeoutSec){
    try{ Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2 | Out-Null; return }
    catch{ Start-Sleep -Milliseconds 500 }
  }
  throw "API indisponível: $url"
}
function Invoke-ApiRequest {
  param([string]$Uri,[string]$Method="Get",[hashtable]$Headers=@{},[string]$Body=$null,[int]$MaxRetries=3,[int]$RetryDelayMs=1500)
  $attempt=0
  while($attempt -lt $MaxRetries){
    try{
      $params=@{ Uri=$Uri; Method=$Method; Headers=$Headers }
      if($Body){ $params.Body=$Body }
      $result=Invoke-RestMethod @params
      Start-Sleep -Milliseconds $DELAY_MS
      return $result
    } catch {
      $statusCode=$null
      if ($_.Exception.Response){ $statusCode=$_.Exception.Response.StatusCode.value__ }
      if ($statusCode -eq 429){ $attempt++; if($attempt -lt $MaxRetries){ Start-Sleep -Milliseconds $RetryDelayMs; $RetryDelayMs*=2 } else { throw $_ } }
      else { throw $_ }
    }
  }
}

function Set-AppointmentStatus {
  param([string]$Id,[string]$Status,[string]$Note="")
  $action = switch ($Status) { "CONFIRMED" {"confirm"} "COMPLETED" {"complete"} "CANCELLED" {"cancel"} default {""} }

  # Tentativa 1: POST /:action
  if ($action -ne "") {
    try {
      $body = @{}
      if ($Status -eq "COMPLETED" -and $Note) { $body.notes = $Note }
      if ($Status -eq "CANCELLED" -and $Note) { $body.cancel_reason = $Note }
      return Invoke-ApiRequest -Uri "$BASE/appointments/$Id/$action" -Headers $script:H -Method Post -Body (ToJson $body)
    } catch { }
  }

  # Tentativa 2: PUT completo (sem PATCH)
  $appNow = Invoke-ApiRequest -Uri "$BASE/appointments/$Id" -Headers $script:H -Method Get
  $put = @{
    patient_id      = Get-Prop $appNow 'patient_id' 'patientId'
    professional_id = Get-Prop $appNow 'professional_id' 'professionalId'
    type            = Get-Prop $appNow 'type' 'type'
    scheduled_at    = AsString (Get-Prop $appNow 'scheduled_at' 'scheduledAt') ((Get-Date).AddHours(24).ToString("s") + "Z")
    reason          = AsString (Get-Prop $appNow 'reason' 'reason') ""
    notes           = if ($Status -eq "COMPLETED") { $Note } else { AsString (Get-Prop $appNow 'notes' 'notes') "" }
    cancel_reason   = if ($Status -eq "CANCELLED") { $Note } else { AsString (Get-Prop $appNow 'cancel_reason' 'cancelReason') "" }
    status          = $Status
  }
  return Invoke-ApiRequest -Uri "$BASE/appointments/$Id" -Headers $script:H -Method Put -Body (ToJson $put)
}

Wait-Api "$BASE/health" 30

Write-Host "Login..." -ForegroundColor Cyan
$login = Invoke-ApiRequest -Uri "$BASE/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body (ToJson @{ email=$ADMIN_EMAIL; password=$ADMIN_PASSWORD })
$TOKEN = Get-Prop $login 'token' 'access_token' ''
if (-not $TOKEN) { throw "Token não retornado por /auth/login" }
$H = New-AuthHeaders $TOKEN
Write-Host "OK login" -ForegroundColor Green

Write-Host "GET /auth/me" -ForegroundColor Cyan
$me = Invoke-ApiRequest -Uri "$BASE/auth/me" -Headers $H -Method Get
Write-Host "OK me: $(Get-Prop $me 'email' 'email')" -ForegroundColor Green

# ---------- PATIENTS ----------
$cpf = New-Digits 11
$patientCreate = @{
  full_name="Paciente Teste $(Get-Date -Format s)"; cpf=$cpf; birth_date="1988-03-15T00:00:00Z"
  email="pac.$cpf@test.local"; phone="(11) 90000-0000"; blood_type="O+"; notes="criado via tests"
}
Write-Host "POST /patients" -ForegroundColor Cyan
$patient = Invoke-ApiRequest -Uri "$BASE/patients" -Headers $H -Method Post -Body (ToJson $patientCreate)
$PATIENT_ID = Get-Prop $patient 'id' 'id'; if (-not $PATIENT_ID){ throw "POST /patients sem id" }
Write-Host "OK patient id $PATIENT_ID" -ForegroundColor Green

Write-Host "GET /patients/$PATIENT_ID" -ForegroundColor Cyan
$patientNow = Invoke-ApiRequest -Uri "$BASE/patients/$PATIENT_ID" -Headers $H -Method Get
Write-Host "OK get patient" -ForegroundColor Green

$patientPut = @{
  full_name  = AsString (Get-Prop $patientNow 'full_name' 'fullName') "Paciente Atualizado"
  cpf        = AsString (Get-Prop $patientNow 'cpf' 'cpf') $cpf
  birth_date = AsString (Get-Prop $patientNow 'birth_date' 'birthDate') "1988-03-15T00:00:00Z"
  email      = AsString (Get-Prop $patientNow 'email' 'email') "pac.$cpf@test.local"
  phone      = AsString (Get-Prop $patientNow 'phone' 'phone') "(11) 90000-0000"
  address    = AsString (Get-Prop $patientNow 'address' 'address') ""
  blood_type = AsString (Get-Prop $patientNow 'blood_type' 'bloodType') "O+"
  allergies  = AsString (Get-Prop $patientNow 'allergies' 'allergies') ""
  notes      = "atualizado $(Get-Date -Format s)"
  is_active  = $true
}
Write-Host "PUT /patients/$PATIENT_ID" -ForegroundColor Cyan
Invoke-ApiRequest -Uri "$BASE/patients/$PATIENT_ID" -Headers $H -Method Put -Body (ToJson $patientPut) | Out-Null
Write-Host "OK put patient" -ForegroundColor Green

# ---------- PROFESSIONALS ----------
$lic = "CRM-" + (New-Digits 6)
$profCreate = @{
  full_name="Prof Teste $(Get-Date -Format s)"; role="DOCTOR"; specialty="Clínica"
  license_number=$lic; email="prof.$lic@test.local"; phone="(11) 90000-0001"
}
Write-Host "POST /professionals" -ForegroundColor Cyan
$prof = Invoke-ApiRequest -Uri "$BASE/professionals" -Headers $H -Method Post -Body (ToJson $profCreate)
$PROF_ID = Get-Prop $prof 'id' 'id'; if (-not $PROF_ID){ throw "POST /professionals sem id" }
Write-Host "OK professional id $PROF_ID" -ForegroundColor Green

Write-Host "GET /professionals/$PROF_ID" -ForegroundColor Cyan
$profNow = Invoke-ApiRequest -Uri "$BASE/professionals/$PROF_ID" -Headers $H -Method Get
Write-Host "OK get professional" -ForegroundColor Green

$profPut = @{
  full_name      = AsString (Get-Prop $profNow 'full_name' 'fullName') "Prof Atualizado"
  role           = AsString (Get-Prop $profNow 'role' 'role') "DOCTOR"
  specialty      = "Cardiologia"
  license_number = AsString (Get-Prop $profNow 'license_number' 'licenseNumber') $lic
  email          = AsString (Get-Prop $profNow 'email' 'email') "prof.$lic@test.local"
  phone          = AsString (Get-Prop $profNow 'phone' 'phone') "(11) 90000-0001"
  is_active      = $true
}
Write-Host "PUT /professionals/$PROF_ID" -ForegroundColor Cyan
Invoke-ApiRequest -Uri "$BASE/professionals/$PROF_ID" -Headers $H -Method Put -Body (ToJson $profPut) | Out-Null
Write-Host "OK put professional" -ForegroundColor Green

# ---------- APPOINTMENTS ----------
$when = (Get-Date).AddHours(24).ToString("s") + "Z"
$appCreate = @{
  patient_id=$PATIENT_ID; professional_id=$PROF_ID; type="CONSULTATION"; scheduled_at=$when; reason="Consulta teste"
}
Write-Host "POST /appointments" -ForegroundColor Cyan
$app = Invoke-ApiRequest -Uri "$BASE/appointments" -Headers $H -Method Post -Body (ToJson $appCreate)
$APP_ID = Get-Prop $app 'id' 'id'; if (-not $APP_ID){ throw "POST /appointments sem id" }
Write-Host "OK appointment id $APP_ID" -ForegroundColor Green

Write-Host "CONFIRM appointment" -ForegroundColor Cyan
Set-AppointmentStatus -Id $APP_ID -Status "CONFIRMED" | Out-Null
Write-Host "OK confirm" -ForegroundColor Green

Write-Host "COMPLETE appointment" -ForegroundColor Cyan
Set-AppointmentStatus -Id $APP_ID -Status "COMPLETED" -Note "finalizado" | Out-Null
Write-Host "OK complete" -ForegroundColor Green

Write-Host "DELETE /appointments/$APP_ID" -ForegroundColor Cyan
Invoke-ApiRequest -Uri "$BASE/appointments/$APP_ID" -Headers $H -Method Delete | Out-Null
Write-Host "OK delete appointment" -ForegroundColor Green

Write-Host "DELETE /professionals/$PROF_ID" -ForegroundColor Cyan
Invoke-ApiRequest -Uri "$BASE/professionals/$PROF_ID" -Headers $H -Method Delete | Out-Null
Write-Host "OK delete professional" -ForegroundColor Green

Write-Host "DELETE /patients/$PATIENT_ID" -ForegroundColor Cyan
Invoke-ApiRequest -Uri "$BASE/patients/$PATIENT_ID" -Headers $H -Method Delete | Out-Null
Write-Host "OK delete patient" -ForegroundColor Green

Write-Host "`nSUCESSO: fluxo completo OK." -ForegroundColor Green
