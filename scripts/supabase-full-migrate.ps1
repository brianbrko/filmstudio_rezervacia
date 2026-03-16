param(
    [string]$EnvFile = ".env.migration.local"
)

$ErrorActionPreference = "Stop"

function Load-EnvFile {
    param([string]$Path)

    if (!(Test-Path $Path)) {
        throw "Env file not found: $Path"
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (!$line -or $line.StartsWith('#')) {
            return
        }

        $parts = $line -split '=', 2
        if ($parts.Length -ne 2) {
            return
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Command '$Name' not found in PATH. Install PostgreSQL client tools first."
    }
}

Load-EnvFile -Path $EnvFile

$requiredVars = @(
    'SOURCE_DB_URL',
    'TARGET_DB_URL'
)

foreach ($varName in $requiredVars) {
    $envValue = [Environment]::GetEnvironmentVariable($varName, 'Process')
    if ([string]::IsNullOrWhiteSpace($envValue)) {
        throw "Missing required environment variable: $varName"
    }
}

if ($env:COPY_STORAGE -eq 'true') {
    $storageVars = @(
        'SOURCE_PROJECT_URL',
        'SOURCE_SERVICE_ROLE_KEY',
        'TARGET_PROJECT_URL',
        'TARGET_SERVICE_ROLE_KEY'
    )

    foreach ($varName in $storageVars) {
        $envValue = [Environment]::GetEnvironmentVariable($varName, 'Process')
        if ([string]::IsNullOrWhiteSpace($envValue)) {
            throw "Missing required environment variable for storage copy: $varName"
        }
    }
}

Require-Command -Name 'supabase'
Require-Command -Name 'psql'
Require-Command -Name 'node'

$backupDir = Join-Path $PSScriptRoot '..\migration-backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$rolesFile = Join-Path $backupDir 'roles.sql'
$schemaFile = Join-Path $backupDir 'schema.sql'
$dataFile = Join-Path $backupDir 'data.sql'

Write-Host 'Dumping database roles...'
supabase db dump --db-url "$env:SOURCE_DB_URL" -f "$rolesFile" --role-only
if ($LASTEXITCODE -ne 0) { throw 'Failed to dump roles.' }

Write-Host 'Dumping database schema...'
supabase db dump --db-url "$env:SOURCE_DB_URL" -f "$schemaFile"
if ($LASTEXITCODE -ne 0) { throw 'Failed to dump schema.' }

Write-Host 'Dumping database data...'
supabase db dump --db-url "$env:SOURCE_DB_URL" -f "$dataFile" --use-copy --data-only
if ($LASTEXITCODE -ne 0) { throw 'Failed to dump data.' }

Write-Host 'Restoring into target project...'
psql --single-transaction --variable ON_ERROR_STOP=1 --file "$rolesFile" --file "$schemaFile" --command "SET session_replication_role = replica" --file "$dataFile" --dbname "$env:TARGET_DB_URL"
if ($LASTEXITCODE -ne 0) { throw 'Failed to restore database.' }

if ($env:COPY_STORAGE -eq 'true') {
    Write-Host 'Copying storage objects...'
    node (Join-Path $PSScriptRoot 'copy-storage.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Failed to copy storage objects.' }
}

Write-Host ''
Write-Host 'Migration finished.'
Write-Host 'Manual check still needed for:'
Write-Host '- Auth settings (providers, SMTP, redirects, email templates)'
Write-Host '- JWT secret if you want old sessions to stay valid'
Write-Host '- Edge Functions'
Write-Host '- Realtime / project-level settings'
