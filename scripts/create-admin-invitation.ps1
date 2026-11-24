param(
    [Parameter(Mandatory = $true)] [string]$Database,
    [Parameter(Mandatory = $true)] [string]$User,
    [Parameter(Mandatory = $true)] [string]$Email,
    [Parameter(Mandatory = $true)] [string]$Company,
    [string]$FrontendUrl = "http://localhost:3000",
    [int]$ExpiresMinutes = 30,
    [string]$PaymentReference = ""
)

$ErrorActionPreference = "Stop"

function Quote-Sql([string]$Value) {
    return "'" + $Value.Replace("'", "''") + "'"
}

$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$token = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
$sha = [Security.Cryptography.SHA256]::Create()
$hash = [Convert]::ToHexString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($token))).ToLowerInvariant()
$id = [guid]::NewGuid().ToString()

$sql = @"
INSERT INTO admin_invitations
    (id, email, empresa, role, token_hash, payment_reference, created_by, expires_at)
VALUES
    ($(Quote-Sql $id), $(Quote-Sql $Email.Trim().ToLowerInvariant()), $(Quote-Sql $Company.Trim()), 'admin',
     $(Quote-Sql $hash), $(Quote-Sql $PaymentReference), 'SIGILIA_SUPPORT',
     NOW() + ($(Quote-Sql "$ExpiresMinutes minutes")::interval));
"@

& psql -U $User -d $Database -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { throw "No fue posible crear la invitación en PostgreSQL." }

$base = $FrontendUrl.TrimEnd('/')
Write-Host "Invitación creada correctamente." -ForegroundColor Green
Write-Host "Correo autorizado: $Email"
Write-Host "Empresa: $Company"
Write-Host "Expira en: $ExpiresMinutes minutos"
Write-Host "Código de un solo uso: $token"
Write-Host "Enlace para el usuario: $base/login?invite=$token"
Write-Host "Entrega este código o enlace únicamente al correo corporativo validado."
