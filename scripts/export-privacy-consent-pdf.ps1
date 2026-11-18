param(
    [string]$Database = "postgres",
    [string]$User = "postgres",
    [string]$OutputDirectory = (Get-Location).Path,
    [string]$PsqlPath = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $projectRoot "servidor\models\base-datos\export-privacy-consent-audit-html.sql"
$outputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$htmlFile = Join-Path $outputDirectory "sigilia-privacy-consent-audit.html"
$pdfFile = Join-Path $outputDirectory "sigilia-privacy-consent-audit.pdf"

if ([string]::IsNullOrWhiteSpace($PsqlPath)) {
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCommand) {
        $PsqlPath = $psqlCommand.Source
    } else {
        $psqlCandidates = @(
            Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue
            Get-ChildItem "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue
        ) | Sort-Object FullName -Descending
        if ($psqlCandidates.Count -gt 0) {
            $PsqlPath = $psqlCandidates[0].FullName
        }
    }
}

if ([string]::IsNullOrWhiteSpace($PsqlPath) -or -not (Test-Path $PsqlPath)) {
    throw "No se encontró psql.exe. Instala PostgreSQL o indica su ruta con -PsqlPath, por ejemplo: -PsqlPath 'C:\Program Files\PostgreSQL\18\bin\psql.exe'."
}

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

Push-Location $outputDirectory
try {
    & $PsqlPath -U $User -d $Database -f $sqlFile
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $htmlFile)) {
        throw "No fue posible generar el archivo HTML desde PostgreSQL."
    }
}
finally {
    Pop-Location
}

$browserCandidates = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
$browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
    Write-Warning "No se encontró Edge ni Chrome. El HTML ya fue generado en: $htmlFile"
    Write-Output "Ábrelo manualmente y selecciona Imprimir > Guardar como PDF."
    exit 0
}

$fileUri = ([System.Uri]$htmlFile).AbsoluteUri
Start-Process -FilePath $browser -WindowStyle Hidden -Wait -ArgumentList @(
    "--headless",
    "--disable-gpu",
    "--print-to-pdf=$pdfFile",
    $fileUri
)

if (-not (Test-Path $pdfFile)) {
    throw "Edge no generó el archivo PDF esperado."
}

Write-Output "PDF generado: $pdfFile"
