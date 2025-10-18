param(
  [string]$Root = ".",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$rootPath = Resolve-Path $Root

# pastas-alvo
$targets = @("src","scripts") | ForEach-Object { Join-Path $rootPath $_ } | Where-Object { Test-Path $_ }

# mapa camelCase -> snake_case (BD/Prisma)
$map = @(
  @{from='isActive';         to='is_active'},
  @{from='createdAt';        to='created_at'},
  @{from='updatedAt';        to='updated_at'},
  @{from='lastLoginAt';      to='last_login_at'},
  @{from='passwordHash';     to='password_hash'},
  @{from='userId';           to='user_id'},
  @{from='entityId';         to='entity_id'},
  @{from='userAgent';        to='user_agent'},
  @{from='fullName';         to='full_name'},
  @{from='birthDate';        to='birth_date'},
  @{from='licenseNumber';    to='license_number'},
  @{from='bloodType';        to='blood_type'},
  @{from='cancelReason';     to='cancel_reason'},
  @{from='scheduledAt';      to='scheduled_at'},
  @{from='patientId';        to='patient_id'},
  @{from='professionalId';   to='professional_id'}
)

# arquivos .ts
$files = @()
foreach($t in $targets){
  $files += Get-ChildItem -Path $t -Recurse -Include *.ts -File
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$changed = 0

foreach($f in $files){
  $content = Get-Content -LiteralPath $f.FullName -Raw
  $orig = $content

  foreach($m in $map){
    $from = [regex]::Escape($m.from)
    $to   = $m.to

    # 1) Acesso por ponto:   .isActive  -> .is_active
    $content = [regex]::Replace($content, "\.$from\b", ".$to")

    # 2) Acesso por colchetes: ["isActive"] -> ["is_active"]
    $content = [regex]::Replace($content, "\[\s*`"$from`"\s*\]", "[`"$to`"]")

    # 3) Chave string em objetos: "isActive": -> "is_active":
    $content = [regex]::Replace($content, "`"$from`"\s*:", "`"$to`":")
    
    # 4) Chave nua em objetos: isActive: -> is_active:
    $content = [regex]::Replace($content, "(?<=^|[{\s,])$from(?=\s*:)", $to, 'IgnoreCase, Multiline')
  }

  if($content -ne $orig){
    $changed++
    if(-not $DryRun){
      Copy-Item -LiteralPath $f.FullName -Destination ($f.FullName + ".bak") -Force
      [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
    }
  }
}

Write-Host "Arquivos alterados: $changed de $($files.Count)"

if(-not $DryRun){
  Write-Host "`nPróximos passos:" -ForegroundColor Yellow
  Write-Host "  npx prisma generate"
  Write-Host "  npx tsc --noEmit"
  Write-Host "  npm run dev"
}
