param(
  [switch]$ShowSecrets,
  [switch]$SkipAuthTest,
  [string]$Email,
  [string]$Password
)

$ErrorActionPreference = "Stop"
$summary = [ordered]@{}
$details = @{}

function Write-Head($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }

# 0) Descobrir paths do monorepo
$repo = (git rev-parse --show-toplevel 2>$null)
if(-not $repo){ $repo = (Get-Location).Path }

$backend = Join-Path $repo "asclepius-backend"
$frontend = Join-Path $repo "asclepius-frontend"

$summary.repoRoot   = $repo
$summary.backendDir = (Test-Path $backend)
$summary.frontDir   = (Test-Path $frontend)

# 1) Versões
Write-Head "Ferramentas"
try {
  $nodeV = node -v
  $pnpmV = pnpm -v
  $summary.node  = $nodeV
  $summary.pnpm  = $pnpmV
  Write-Host "Node: $nodeV"
  Write-Host "PNPM: $pnpmV"
} catch { $summary.toolsError = $_.Exception.Message }

# 2) .env do backend + parse DATABASE_URL
Write-Head ".env e DATABASE_URL"
$envPath = Join-Path $backend ".env"
if(Test-Path $envPath){
  $envText = Get-Content -Raw $envPath
  $dbLine = ($envText -split "`r?`n") | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if($dbLine){
    $dbUrl = ($dbLine -replace '^\s*DATABASE_URL\s*=\s*','').Trim('"','''')
    $summary.DATABASE_URL = if($ShowSecrets){ $dbUrl } else { "(oculta) — use -ShowSecrets para revelar" }
    $rx='^postgres(?:ql)?:\/\/(?<user>[^:\/\s]+):(?<pass>[^@\/\s]*)@(?<host>[^:\/\s]+):(?<port>\d+)\/(?<db>[^?\s]+)'
    $m=[regex]::Match($dbUrl,$rx)
    if($m.Success){
      $db = [ordered]@{
        user = $m.Groups['user'].Value
        pass = [System.Net.WebUtility]::UrlDecode($m.Groups['pass'].Value)
        host = $m.Groups['host'].Value
        port = [int]$m.Groups['port'].Value
        name = $m.Groups['db'].Value
      }
      if(-not $ShowSecrets){ $db.pass = "(oculta)" }
      $details.dbParsed = $db
      Write-Host ("Banco: {0}@{1}:{2}/{3}" -f $db.user,$db.host,$db.port,$db.name)
    } else {
      $summary.dbParseError = "Não consegui parsear a DATABASE_URL"
    }
  } else {
    $summary.noDbLine = "DATABASE_URL não encontrada no .env"
  }

  # JWTs (opcional)
  $jwt = [ordered]@{}
  foreach($k in "JWT_SECRET","JWT_EXPIRES_IN"){
    $line = ($envText -split "`r?`n") | Where-Object { $_ -match "^\s*$k\s*=" } | Select-Object -First 1
    if($line){
      $val = ($line -replace "^\s*$k\s*=\s*","").Trim('"','''')
      $jwt.$k = ($ShowSecrets ? $val : "(oculta)")
    }
  }
  $details.jwt = $jwt
} else {
  $summary.envMissing = "$envPath não encontrado"
}

# 3) Postgres: teste TCP e psql (se disponível)
Write-Head "Postgres (TCP & psql)"
if($details.dbParsed){
  $h=$details.dbParsed.host; $p=$details.dbParsed.port
  try{
    $tcp = New-Object Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect($h,$p,$null,$null)
    $ok = $iar.AsyncWaitHandle.WaitOne(2000,$false)
    if($ok -and $tcp.Connected){ $summary.pgTcp = "OK ($($h):$($p))" } else { $summary.pgTcp = "Falhou ($($h):$($p))" }
    $tcp.Close()
  } catch { $summary.pgTcp = "Erro: " + $_.Exception.Message }

  # psql
  try {
    $psqlPath = (Get-Command psql -ErrorAction Stop).Source
    $summary.psql = $psqlPath
    $pgpass = if($ShowSecrets){ $details.dbParsed.pass } else { $null } # só setamos se preciso
    if(-not $pgpass){ $pgpass = [System.Net.WebUtility]::UrlDecode(($m.Groups['pass'].Value)) }
    $env:PGPASSWORD = $pgpass
    $out = & $psqlPath -h $h -U $details.dbParsed.user -p $p -d $details.dbParsed.name -c "SELECT now(), current_user;" 2>&1
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    if($LASTEXITCODE -eq 0){ $summary.psqlQuery = "OK"; $details.psqlOut = $out } else { $summary.psqlQuery = "Falhou"; $details.psqlOut = $out }
  } catch { $summary.psql = "psql não encontrado"; $details.psqlError = $_.Exception.Message }
}

# 4) Prisma & build info (não altera nada)
Write-Head "Prisma & Build"
try {
  $prismaV = pnpm -C $backend exec prisma --version
  $summary.prisma = ($prismaV -join " ").Trim()
} catch { $summary.prisma = "Erro: " + $_.Exception.Message }
try {
  $pkg = Get-Content -Raw (Join-Path $backend "package.json") | ConvertFrom-Json
  $summary.backendScripts = $pkg.scripts | ConvertTo-Json -Depth 20
} catch { $summary.backendScripts = "Erro lendo package.json: " + $_.Exception.Message }

# 5) Health do backend
Write-Head "Health do backend"
$healthUrl = "http://localhost:3001/health"
try{
  $resp = Invoke-RestMethod -Uri $healthUrl -Method GET -TimeoutSec 3
  $summary.health = "OK"
  $details.health = $resp
  Write-Host "Health OK"
} catch {
  $summary.health = "Falhou"
  $details.healthError = $_.Exception.Message
  Write-Host "Health falhou: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6) Teste /auth/login (opcional)
if(-not $SkipAuthTest){
  Write-Head "Teste /auth/login"
  $loginUrl = "http://localhost:3001/auth/login"
  $payload = [ordered]@{}
  if($Email){ $payload.email = $Email }
  if($Password){ $payload.password = $Password }

  if(-not $payload.email -or -not $payload.password){
    Write-Host "Sem Email/Password — envio payload vazio apenas para status (não recomendado)." -ForegroundColor Yellow
  }

  try{
    $body = ($payload | ConvertTo-Json -Depth 5)
  } catch {
    $body = "{}"
  }

  try{
    $res = Invoke-WebRequest -Uri $loginUrl -Method POST -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    $summary.authLogin = "HTTP " + [int]$res.StatusCode
    $details.authLoginBody = $res.Content
    Write-Host "Auth respondeu: $([int]$res.StatusCode)"
  } catch {
    $we = $_.Exception
    $status = $null
    if($we.Response){ $status = [int]$we.Response.StatusCode }
    $summary.authLogin = "Falhou" + ($(if($status){" (HTTP $status)"}else{""}))
    $details.authLoginError = $we.Message
    if($we.Response){
      try{
        $reader = New-Object IO.StreamReader($we.Response.GetResponseStream())
        $details.authLoginResponseBody = $reader.ReadToEnd()
        $reader.Close()
      }catch{}
    }
    Write-Host "Auth falhou: $($summary.authLogin)" -ForegroundColor Yellow
  }
} else {
  $summary.authLogin = "Pulado (-SkipAuthTest)"
}

# 7) Ordem de middlewares (checagem estática simples)
Write-Head "Checagem estática de app.ts"
$appPath = Join-Path $backend "src\app.ts"
if(Test-Path $appPath){
  $appSrc = Get-Content -Raw $appPath
  $summary.hasExpressJson = ($appSrc -match 'express\.json\(')
  $summary.hasRoutes      = ($appSrc -match '\.use\(\s*["'']/api')
} else {
  $summary.hasExpressJson = $false
  $summary.hasRoutes = $false
}

# 8) Salvar resultado
$result = [ordered]@{
  Summary = $summary
  Details = $details
}
$outFile = Join-Path (Split-Path $PSCommandPath -Parent) "_diagnose-auth.json"
$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $outFile

Write-Host "`n==== RESUMO ====" -ForegroundColor Green
$summary.GetEnumerator() | ForEach-Object { "{0,-18} : {1}" -f $_.Key,$_.Value } | Write-Host
Write-Host "`nArquivo detalhado: $outFile"
