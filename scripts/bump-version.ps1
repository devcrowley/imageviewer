# bump-version.ps1
# Reads the current patch version from tauri.conf.json, increments it by 1,
# and writes the new version back to both tauri.conf.json and package.json.
# Run before each production build so the installer filename reflects the version.
#
# Usage (from project root):
#   powershell -ExecutionPolicy Bypass -File scripts\bump-version.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root        = Split-Path $PSScriptRoot -Parent
$tauriConf   = Join-Path $root "src-tauri\tauri.conf.json"
$packageJson = Join-Path $root "package.json"

# ── Read current version from tauri.conf.json ───────────────────────────────
$tauri   = Get-Content $tauriConf -Raw | ConvertFrom-Json
$current = $tauri.version

if ($current -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Unexpected version format in tauri.conf.json: '$current'"
    exit 1
}

# ── Bump the patch segment ───────────────────────────────────────────────────
$parts    = $current -split '\.'
$newPatch = [int]$parts[2] + 1
$next     = "$($parts[0]).$($parts[1]).$newPatch"

# ── Update tauri.conf.json ───────────────────────────────────────────────────
# Use raw string replacement to avoid PowerShell re-formatting the JSON
$tauriRaw = Get-Content $tauriConf -Raw
$tauriRaw = $tauriRaw -replace ('"version"\s*:\s*"' + [regex]::Escape($current) + '"'), ('"version": "' + $next + '"')
Set-Content -Path $tauriConf -Value $tauriRaw -NoNewline

# ── Update package.json ──────────────────────────────────────────────────────
$pkgRaw = Get-Content $packageJson -Raw
$pkgRaw = $pkgRaw -replace ('"version"\s*:\s*"' + [regex]::Escape($current) + '"'), ('"version": "' + $next + '"')
Set-Content -Path $packageJson -Value $pkgRaw -NoNewline

Write-Host "Version bumped: $current -> $next" -ForegroundColor Green
