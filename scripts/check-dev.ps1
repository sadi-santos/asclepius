param(
  [switch]$Run,                 # Executa install/migrate/test/build com travas de segurança
  [switch]$Yes,                 # Não perguntar confirmação ao usar -Run
  [switch]$WithE2E,             # Instala browsers do Playwright no frontend (se houver)
  [switch]$SkipGitCleanCheck,   # Não avisar sobre working tree suja
  [switch]$SkipPSQL,            # Pular validação com psql (ainda testa TCP)
  [int]$BackendPortOverride,    # Força porta do backend (se não quiser usar .env/3001)
  [int]$FrontendPortOverride,   # Força porta do frontend (default 5173)
  [string]$BackendHealthPath = "/health"  # Caminho do health do backend
)

$ErrorActionPreference = "Stop"

function Write-Ok($msg){ Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info($msg){ Write-Host "-- $msg" -ForegroundColor DarkCyan }

function Require($cond, $msg){
  if(-not $cond){ Write-Err $msg; exit 1 }
}

function Convert-PathString($p){
  try {
    return ([System.IO.Path]::GetFullPath($p)).TrimEnd('\','/').ToLowerInvariant()
  } catch {
    return ($p.Trim()).TrimEnd('\','/').ToLowerInvariant()
  }
}

function Test-Port($TargetHost, [int]$TargetPort){
  $tnc = Get-Command Test-NetConnection -ErrorAction SilentlyContinue
  if ($tnc) {
    $r = Test-NetConnection -ComputerName $TargetHost -Port $TargetPort -WarningAction SilentlyContinue
    return ($r -and $r.TcpTestSucceeded)
  }
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($TargetHost, $TargetPort, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(3000, $false)
    if ($ok) { $client.EndConnect($iar) }
    $client.Close()
    return $ok
  } catch { return $false }
}

function Test-PackageScript($pkgJsonPath, $scriptName){
  if (-not (Test-Path $pkgJsonPath)) { return $false }
  try {
    $json = Get-Content -Raw $pkgJsonPath | ConvertFrom-Json
    return [bool]($json.scripts.$scriptName)
  } catch { return $false }
}

function Test-HttpStatus($url){
  try {
    $res = Invoke-WebRequest -Method Head -Uri $url -TimeoutSec 3 -ErrorAction Stop
    return $res.StatusCode
  } catch {
    return $null
  }
}

Write-Host "== Asclepius — Verificação do ambiente de desenvolvimento ==" -ForegroundColor Cyan
$rootPath = (Get-Location).Path
$backend = Join-Path $rootPath "asclepius-backend"
$frontend = Join-Path $rootPath "asclepius-frontend"

# 0) Git: está na raiz e working tree limpa?
if (Test-Path ".git") {
  $top = (& git rev-parse --show-toplevel) 2>$null
  if ($LASTEXITCODE -eq 0) {
    $topPath = $top.Trim()
    $rootN = Convert-PathString $rootPath
    $topN  = Convert-PathString $topPath
    Require ($topN -eq $rootN) ("Você não está na raiz do repositório Git: {0}" -f $topPath)
    if (-not $SkipGitCleanCheck) {
      $dirty = (& git status --porcelain) 2>$null
      if ($dirty) {
        Write-Warn "Há alterações não commitadas no Git. (Use -SkipGitCleanCheck para ignorar este aviso.)"
      } else {
        Write-Ok "Working tree limpa"
      }
    }
  }
} else {
  Write-Warn "Pasta não parece ser um repositório Git (.git ausente)."
}

# 1) Estrutura
Require (Test-Path $backend) "Pasta 'asclepius-backend' não encontrada."
Require (Test-Path $frontend) "Pasta 'asclepius-frontend' não encontrada."
Require (Test-Path (Join-Path $backend "prisma\schema.prisma")) "Arquivo 'asclepius-backend\prisma\schema.prisma' não encontrado."
Write-Ok "Estrutura de pastas OK"

# 2) Node / PNPM
$nodeVer = (& node --version) 2>$null
Require ($LASTEXITCODE -eq 0) "Node não encontrado. Instale Node 20+."
$nodeMajor = ($nodeVer -replace '[^0-9\.]','').Split('.')[0] -as [int]
Require ($nodeMajor -ge 20) "Node $nodeVer encontrado; requer >= 20.x."
Write-Ok "Node $nodeVer"

$pnpmVer = (& pnpm --version) 2>$null
Require ($LASTEXITCODE -eq 0) "PNPM não encontrado. Instale PNPM 9+."
$pnpmMajor = ($pnpmVer.Split('.')[0]) -as [int]
Require ($pnpmMajor -ge 9) "PNPM $pnpmVer encontrado; requer >= 9."
Write-Ok "PNPM $pnpmVer"

# 3) .env do backend
$envExample = Join-Path $backend ".env.example"
$envFile    = Join-Path $backend ".env"
Require (Test-Path $envExample) "Arquivo '.env.example' não encontrado em asclepius-backend."
if(-not (Test-Path $envFile)){
  Copy-Item $envExample $envFile
  Write-Warn "'.env' não existia; copiado de '.env.example'. Ajuste variáveis se necessário."
} else {
  Write-Ok ".env presente"
}

# 4) Ler NODE_ENV / DATABASE_URL / PORT do backend
$envText = Get-Content -Raw $envFile
$rxVal = '^\s*{0}\s*=\s*(?:"(?<v>[^"]*)"|''(?<v>[^'']*)''|(?<v>[^#\r\n]+))'

$NODE_ENV = ([regex]::Match($envText, ($rxVal -f 'NODE_ENV'), 'IgnoreCase, Multiline')).Groups['v'].Value.Trim()
if (-not $NODE_ENV) { $NODE_ENV = 'development' }

$matchDb = [regex]::Match($envText, ($rxVal -f 'DATABASE_URL'), 'IgnoreCase, Multiline')
Require $matchDb.Success "DATABASE_URL não encontrada em $($envFile)."
$DATABASE_URL = $matchDb.Groups['v'].Value.Trim()

$matchPort = [regex]::Match($envText, ($rxVal -f 'PORT'), 'IgnoreCase, Multiline')
$BackendPort = if ($BackendPortOverride) { $BackendPortOverride } elseif ($matchPort.Success) { [int]($matchPort.Groups['v'].Value.Trim()) } else { 3001 }
$FrontendPort = if ($FrontendPortOverride) { $FrontendPortOverride } else { 5173 }

# 5) Parse da DATABASE_URL
# postgresql://user:pass@host:port/dbname?params...
$rxDb = '^postgres(?:ql)?:\/\/(?<user>[^:\/\s]+):(?<pass>[^@\/\s]*)@(?<dbHost>[^:\/\s]+):(?<dbPort>\d+)\/(?<db>[^?\s]+)'
$m = [regex]::Match($DATABASE_URL, $rxDb)
Require $m.Success "DATABASE_URL inválida: $DATABASE_URL"
$user = $m.Groups['user'].Value
$pass = $m.Groups['pass'].Value
$dbHost = $m.Groups['dbHost'].Value
$dbPort = [int]$m.Groups['dbPort'].Value
$db   = $m.Groups['db'].Value
Write-Ok ("DATABASE_URL parseada: host={0} port={1} db={2} user={3}" -f $dbHost, $dbPort, $db, $user)

# 6) Guardas de segurança para -Run
if ($Run) {
  if ($NODE_ENV -match 'production') {
    Write-Err "NODE_ENV=production — abortando execução com -Run."
    exit 1
  }
  if ($dbHost -notin @('localhost','127.0.0.1')) {
    Write-Err "DATABASE_URL aponta para '$dbHost' (não é localhost) — abortando -Run."
    exit 1
  }
  if (-not $Yes) {
    $conf = Read-Host "Confirma executar install/migrate/test/build no AMBIENTE DE DESENVOLVIMENTO? Digite 'DEV' para continuar"
    if ($conf -ne 'DEV') {
      Write-Err "Abortado pelo usuário."
      exit 1
    }
  }
}

# 7) Teste de conectividade ao Postgres
if (Test-Port -TargetHost $dbHost -TargetPort $dbPort) {
  Write-Ok ("Conexão TCP ao Postgres OK ({0}:{1})" -f $dbHost, $dbPort)
} else {
  Require $false ("Não conectou em {0}:{1}. Postgres está rodando?" -f $dbHost, $dbPort)
}

# 8) psql opcional
if (-not $SkipPSQL) {
  $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($psqlCmd) {
    $env:PGPASSWORD = $pass
    & psql -h $dbHost -U $user -p $dbPort -d $db -c "SELECT 1;" | Out-Null
    if($LASTEXITCODE -ne 0){
      Write-Err "Falha conectando via psql ao DB '$db' (user '$user'). Verifique credenciais/permissões."
      exit 1
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    Write-Ok "Conexão ao Postgres validada via psql"
  } else {
    Write-Warn "psql não encontrado no PATH; validação limitada ao teste TCP."
  }
}

# 9) Status das PORTAS de DEV (backend 3001 / frontend 5173 por padrão)
Write-Host "== Portas de desenvolvimento ==" -ForegroundColor Cyan
$bkOpen = Test-Port -TargetHost '127.0.0.1' -TargetPort $BackendPort
$feOpen = Test-Port -TargetHost '127.0.0.1' -TargetPort $FrontendPort

if ($bkOpen) {
  Write-Ok ("Backend em execução (porta {0})" -f $BackendPort)
  $healthUrl = ("http://localhost:{0}{1}" -f $BackendPort, $BackendHealthPath)
  $status = Test-HttpStatus $healthUrl
  if ($status) {
    Write-Ok ("Health do backend respondeu {0} em {1}" -f $status, $healthUrl)
  } else {
    Write-Warn ("Não consegui obter status do health em {0}" -f $healthUrl)
  }
} else {
  Write-Warn ("Backend não está ouvindo na porta {0}. (URL esperado: http://localhost:{0})" -f $BackendPort)
}

if ($feOpen) {
  Write-Ok ("Frontend em execução (porta {0}) — http://localhost:{0}/" -f $FrontendPort)
} else {
  Write-Warn ("Frontend não está ouvindo na porta {0}. (URL esperado: http://localhost:{0}/)" -f $FrontendPort)
}

# 10) Execução opcional (install/migrate/test/build)
if ($Run) {
  Write-Host "== Executando install/migrate/test/build ==" -ForegroundColor Cyan

  Write-Info "pnpm install -r --force"
  pnpm install -r --force
  Require ($LASTEXITCODE -eq 0) "Falha em pnpm install."

  Write-Info "prisma migrate deploy (backend)"
  pnpm --filter asclepius-backend prisma migrate deploy
  Require ($LASTEXITCODE -eq 0) "Falha em prisma migrate deploy."

  Write-Info "prisma generate (backend)"
  pnpm --filter asclepius-backend prisma generate
  Require ($LASTEXITCODE -eq 0) "Falha em prisma generate."

  # Backend tests (se existir script "test")
  $bkPkg = Join-Path $backend "package.json"
  if (Test-PackageScript $bkPkg "test") {
    Write-Info "pnpm --filter asclepius-backend test"
    pnpm --filter asclepius-backend test
    Require ($LASTEXITCODE -eq 0) "Testes do backend falharam."
  } else {
    Write-Warn "Script 'test' não encontrado no backend; pulando testes do backend."
  }

  Write-Info "pnpm --filter asclepius-backend build"
  pnpm --filter asclepius-backend build
  Require ($LASTEXITCODE -eq 0) "Build do backend falhou."

  # Frontend E2E browsers (opcional)
  if ($WithE2E) {
    Write-Info "Instalando browsers do Playwright (frontend)"
    pnpm --filter asclepius-frontend exec playwright install --with-deps
    if ($LASTEXITCODE -ne 0) { Write-Warn "Playwright browsers não instalados; verifique devDependencies." }
  }

  # Frontend tests (se existir script "test")
  $fePkg = Join-Path $frontend "package.json"
  if (Test-PackageScript $fePkg "test") {
    Write-Info "pnpm --filter asclepius-frontend test"
    pnpm --filter asclepius-frontend test
    if ($LASTEXITCODE -ne 0) { Write-Err "Testes do frontend falharam."; exit 1 }
  } else {
    Write-Warn "Script 'test' não encontrado no frontend; pulando testes do frontend."
  }

  Write-Info "pnpm --filter asclepius-frontend build"
  pnpm --filter asclepius-frontend build
  Require ($LASTEXITCODE -eq 0) "Build do frontend falhou."

  Write-Ok "Install/Migrate/Test/Build concluídos com sucesso."
} else {
  Write-Warn "Modo verificação apenas. Para executar install/migrate/test/build, rode com: -Run (e -Yes para pular confirmação)."
}

Write-Host "`nTudo pronto ✅" -ForegroundColor Green
