$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dataDirectory = 'C:\Program Files\PostgreSQL\18\data'
$serviceName = 'postgresql-x64-18'
$psqlExe = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$createdbExe = 'C:\Program Files\PostgreSQL\18\bin\createdb.exe'
$hbaPath = Join-Path $dataDirectory 'pg_hba.conf'
$schemaPath = Join-Path $projectRoot 'database\schema.sql'
$seedPath = Join-Path $projectRoot 'database\seed.sql'
$environmentFile = Join-Path $projectRoot '.env'
$originalHbaBytes = $null
$serviceWasRunning = $false
$hbaTemporarilyChanged = $false
$password = $null

try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Run this script from an elevated PowerShell window.'
    }

    foreach ($path in @($psqlExe, $createdbExe, $hbaPath, $schemaPath, $seedPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Required PostgreSQL file not found: $path"
        }
    }

    $service = Get-Service -Name $serviceName
    $serviceWasRunning = $service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running
    if (-not $serviceWasRunning) {
        throw 'The PostgreSQL service must be running before resetting its password.'
    }

    $randomBytes = New-Object byte[] 48
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
        $password = [Convert]::ToBase64String($randomBytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
    }
    finally {
        $randomGenerator.Dispose()
        [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    }

    $environmentText = if (Test-Path -LiteralPath $environmentFile) {
        [IO.File]::ReadAllText($environmentFile)
    }
    else {
        ''
    }
    $passwordLine = "DB_PASSWORD=$password"
    if ($environmentText -match '(?m)^DB_PASSWORD=.*$') {
        $environmentText = [Regex]::Replace(
            $environmentText,
            '(?m)^DB_PASSWORD=.*$',
            $passwordLine,
            1
        )
    }
    else {
        $environmentText = $environmentText.TrimEnd() + "`r`n$passwordLine`r`n"
    }
    [IO.File]::WriteAllText($environmentFile, $environmentText, [Text.UTF8Encoding]::new($false))
    if ($environmentText -notmatch '(?m)^JWT_SECRET=.{32,}$') {
        $jwtBytes = New-Object byte[] 48
        $jwtGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $jwtGenerator.GetBytes($jwtBytes)
            $jwtSecret = [Convert]::ToBase64String($jwtBytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
        }
        finally {
            $jwtGenerator.Dispose()
            [Array]::Clear($jwtBytes, 0, $jwtBytes.Length)
        }

        $environmentText = [Regex]::Replace($environmentText, '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$jwtSecret", 1)
        if ($environmentText -notmatch '(?m)^JWT_SECRET=') {
            $environmentText = $environmentText.TrimEnd() + "`r`nJWT_SECRET=$jwtSecret`r`n"
        }
        [IO.File]::WriteAllText($environmentFile, $environmentText, [Text.UTF8Encoding]::new($false))
        $jwtSecret = $null
    }

    if ($environmentText -notmatch '(?m)^FACE_DATA_KEY=[\da-fA-F]{64}$') {
        $faceKeyBytes = New-Object byte[] 32
        $faceKeyGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try {
            $faceKeyGenerator.GetBytes($faceKeyBytes)
            $faceDataKey = [Convert]::ToHexString($faceKeyBytes).ToLowerInvariant()
        }
        finally {
            $faceKeyGenerator.Dispose()
            [Array]::Clear($faceKeyBytes, 0, $faceKeyBytes.Length)
        }

        if ($environmentText -match '(?m)^FACE_DATA_KEY=.*$') {
            $environmentText = [Regex]::Replace($environmentText, '(?m)^FACE_DATA_KEY=.*$', "FACE_DATA_KEY=$faceDataKey", 1)
        }
        else {
            $environmentText = $environmentText.TrimEnd() + "`r`nFACE_DATA_KEY=$faceDataKey`r`n"
        }
        [IO.File]::WriteAllText($environmentFile, $environmentText, [Text.UTF8Encoding]::new($false))
        $faceDataKey = $null
    }
    $environmentText = $null

    $originalHbaBytes = [IO.File]::ReadAllBytes($hbaPath)
    $originalHba = [Text.Encoding]::UTF8.GetString($originalHbaBytes)
    $modifiedHba = [Regex]::Replace(
        $originalHba,
        '(?m)^(\s*host\s+all\s+all\s+(?:127\.0\.0\.1/32|::1/128)\s+)scram-sha-256(\s*(?:#.*)?)$',
        '$1trust$2'
    )
    $originalHba = $null

    if ($modifiedHba -eq [Text.Encoding]::UTF8.GetString($originalHbaBytes)) {
        throw 'Could not find the expected loopback password-authentication rules.'
    }

    $serviceStopped = $false
    try {
        Stop-Service -Name $serviceName
        (Get-Service -Name $serviceName).WaitForStatus(
            [System.ServiceProcess.ServiceControllerStatus]::Stopped,
            [TimeSpan]::FromSeconds(30)
        )
        $serviceStopped = $true

        [IO.File]::WriteAllText($hbaPath, $modifiedHba, [Text.UTF8Encoding]::new($false))
        $hbaTemporarilyChanged = $true
        $modifiedHba = $null

        Start-Service -Name $serviceName
        (Get-Service -Name $serviceName).WaitForStatus(
            [System.ServiceProcess.ServiceControllerStatus]::Running,
            [TimeSpan]::FromSeconds(30)
        )

        $sql = "ALTER ROLE postgres WITH PASSWORD '$password';"
        $sql | & $psqlExe -w -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d postgres 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not set the local PostgreSQL password.'
        }
        $sql = $null

        $databaseExists = & $psqlExe -w -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d postgres -tA -c "SELECT 1 FROM pg_database WHERE datname = 'sigil_db'" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not verify the PostgreSQL connection.'
        }

        if (($databaseExists -join '').Trim() -ne '1') {
            & $createdbExe -w -h 127.0.0.1 -p 5432 -U postgres sigil_db 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw 'Could not create the sigil_db database.'
            }
        }

        & $psqlExe -w -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d sigil_db -f $schemaPath 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not apply the SIGIL.IA database schema.'
        }

        & $psqlExe -w -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d sigil_db -f $seedPath 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not apply the SIGIL.IA demo data seed.'
        }
    }
    finally {
        if ($hbaTemporarilyChanged) {
            if ((Get-Service -Name $serviceName).Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
                Stop-Service -Name $serviceName
                (Get-Service -Name $serviceName).WaitForStatus(
                    [System.ServiceProcess.ServiceControllerStatus]::Stopped,
                    [TimeSpan]::FromSeconds(30)
                )
                $serviceStopped = $true
            }

            [IO.File]::WriteAllBytes($hbaPath, $originalHbaBytes)
            $hbaTemporarilyChanged = $false
        }

        if ($serviceWasRunning -and $serviceStopped) {
            Start-Service -Name $serviceName
            (Get-Service -Name $serviceName).WaitForStatus(
                [System.ServiceProcess.ServiceControllerStatus]::Running,
                [TimeSpan]::FromSeconds(30)
            )
        }
    }

    $env:PGPASSWORD = $password
    & $psqlExe -w -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d sigil_db -tA -c 'SELECT current_database(), current_user' 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'The restored PostgreSQL authentication did not accept the saved local credentials.'
    }

    Write-Output 'PostgreSQL password reset, loopback authentication restored, and sigil_db schema plus demo data applied successfully.'
}
finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    $password = $null

    if ($hbaTemporarilyChanged -and $null -ne $originalHbaBytes) {
        if ((Get-Service -Name $serviceName).Status -eq [System.ServiceProcess.ServiceControllerStatus]::Running) {
            Stop-Service -Name $serviceName
            (Get-Service -Name $serviceName).WaitForStatus(
                [System.ServiceProcess.ServiceControllerStatus]::Stopped,
                [TimeSpan]::FromSeconds(30)
            )
        }

        [IO.File]::WriteAllBytes($hbaPath, $originalHbaBytes)
        $hbaTemporarilyChanged = $false
    }

    if ($serviceWasRunning -and (Get-Service -Name $serviceName).Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
        Start-Service -Name $serviceName
        (Get-Service -Name $serviceName).WaitForStatus(
            [System.ServiceProcess.ServiceControllerStatus]::Running,
            [TimeSpan]::FromSeconds(30)
        )
    }
    $originalHbaBytes = $null
}
