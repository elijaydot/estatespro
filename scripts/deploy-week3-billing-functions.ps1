param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseAccessToken,

  [string]$ProjectRef = "zuwpvevqijwkkucmpkkr"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/supabase/cli/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match "windows_amd64\.tar\.gz$" } | Select-Object -First 1

if (-not $asset) {
  throw "Could not find a Windows x64 Supabase CLI release asset."
}

$workDir = Join-Path $env:TEMP "supabase-cli-week3"
$archivePath = Join-Path $workDir "supabase-cli.tar.gz"
$extractDir = Join-Path $workDir "extract"

if (Test-Path $workDir) {
  Remove-Item -Recurse -Force $workDir
}

New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

Write-Host "Downloading Supabase CLI from $($asset.browser_download_url)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archivePath

tar -xzf $archivePath -C $extractDir

$cliPath = Get-ChildItem -Path $extractDir -Recurse -Filter "supabase.exe" | Select-Object -First 1 -ExpandProperty FullName
if (-not $cliPath) {
  throw "supabase.exe was not found after extraction."
}

$env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken

Write-Host "Using CLI: $cliPath"
& $cliPath --version

Write-Host "Deploying function: saas-subscription-checkout"
& $cliPath functions deploy saas-subscription-checkout --project-ref $ProjectRef

Write-Host "Deploying function: saas-verify-subscription-payment"
& $cliPath functions deploy saas-verify-subscription-payment --project-ref $ProjectRef

Write-Host "Deploying function: run-subscription-renewals"
& $cliPath functions deploy run-subscription-renewals --project-ref $ProjectRef

Write-Host "Deploy complete for project $ProjectRef"
