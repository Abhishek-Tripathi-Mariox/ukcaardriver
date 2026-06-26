# UKCAAR Driver — Release APK builder
# -----------------------------------------------------------------------------
# Builds a signed, compressed release APK ready to share with the team.
# The APK points at the production backend (https://backend.ukcaar.com/api/v1)
# because src/services/api.ts uses PRODUCTION_URL whenever __DEV__ is false,
# which is automatically the case for any release build.
#
# Run this from the project root (c:\PRojects\UKKAAR\ukcaar-driver\UkcaarDriver):
#
#   # Normal incremental build (fast, 1–3 min):
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1
#
#   # Deep clean (only if a prior build crashed mid-CMake; ~15 min):
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-release-apk.ps1 -DeepClean
# -----------------------------------------------------------------------------

param(
    [switch]$DeepClean
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "[ukcaar-driver] Building release APK from $ProjectRoot" -ForegroundColor Cyan
Write-Host ""

# 1) JS deps (skip if node_modules already present and you're confident).
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/4] npm install" -ForegroundColor Yellow
    npm install
}
else {
    Write-Host "[1/4] node_modules present — skipping npm install" -ForegroundColor DarkGray
}

# 2) Clean. By default we let Gradle handle incremental rebuilds. With
#    -DeepClean we wipe every native-codegen / CMake / .cxx folder under
#    android/ — needed only when a prior build crashed mid-CMake and
#    "installation package was faulty and references files it does not
#    provide" appears.
Set-Location "$ProjectRoot\android"
if ($DeepClean) {
    Write-Host "[2/4] Deep clean (gradle daemons + transforms cache + .cxx + build)" -ForegroundColor Yellow

    # 2a) Stop any running daemon — it holds locks on the cache files we're
    # about to delete, so we must shut it down first.
    .\gradlew.bat --stop
    Get-Process -Name 'java' -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_ | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Seconds 2

    # 2b) Wipe the global Gradle transforms cache. This is the actual fix for
    # the "Imported target 'ReactAndroid::jsi' includes non-existent path"
    # CMake error: react-android's prefab AAR is unpacked under
    # ~/.gradle/caches/9.3.1/transforms/<hash>/workspace/transformed/...
    # and a previous failed build left dangling metadata pointing at
    # headers that no longer exist on disk.
    $gradleHome = Join-Path $env:USERPROFILE '.gradle'
    foreach ($p in @(
        (Join-Path $gradleHome 'caches\9.3.1\transforms'),
        (Join-Path $gradleHome 'caches\transforms-3'),
        (Join-Path $gradleHome 'caches\modules-2\files-2.1\com.facebook.react'),
        (Join-Path $gradleHome 'caches\modules-2\metadata-2.106\descriptors\com.facebook.react')
    )) {
        if (Test-Path $p) {
            Write-Host "  removing $p" -ForegroundColor DarkGray
            Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    # 2c) Wipe per-project + per-module CMake / build outputs.
    Get-ChildItem -Path "$ProjectRoot\android" -Recurse -Force `
        -Include @('.cxx', 'build', '.gradle', 'generated') -Directory `
        -ErrorAction SilentlyContinue |
      ForEach-Object {
        Write-Host "  removing $($_.FullName)" -ForegroundColor DarkGray
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }

    Get-ChildItem -Path "$ProjectRoot\node_modules" -Recurse -Force `
        -Include @('.cxx') -Directory `
        -ErrorAction SilentlyContinue |
      ForEach-Object {
        Write-Host "  removing $($_.FullName)" -ForegroundColor DarkGray
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }

    .\gradlew.bat clean --refresh-dependencies
}
else {
    Write-Host "[2/4] Skipping clean — pass -DeepClean if 'installation package was faulty' / 'Imported target ReactAndroid::jsi' errors appear" -ForegroundColor DarkGray
}

# 3) Build the release APK. The React Gradle plugin runs Metro to bundle JS
#    + assets into android/app/src/main/assets/index.android.bundle.
$buildLabel = if ($DeepClean) { "assembleRelease (cold build, ~15 min)" } else { "assembleRelease (incremental, 1–3 min)" }
Write-Host "[3/4] $buildLabel" -ForegroundColor Yellow
.\gradlew.bat assembleRelease

# 4) Surface the resulting APK + size + SHA256 so the team can verify the file
#    they downloaded matches what was built.
$ApkPath = "$ProjectRoot\android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $ApkPath)) {
    Write-Host ""
    Write-Host "Build finished but APK not found at expected path:" -ForegroundColor Red
    Write-Host "  $ApkPath" -ForegroundColor Red
    exit 1
}

$ApkInfo = Get-Item $ApkPath
$Hash = (Get-FileHash $ApkPath -Algorithm SHA256).Hash
$SizeMb = [math]::Round($ApkInfo.Length / 1MB, 2)

Set-Location $ProjectRoot

Write-Host ""
Write-Host "[4/4] Done." -ForegroundColor Green
Write-Host ""
Write-Host "APK : $ApkPath"
Write-Host "Size: $SizeMb MB"
Write-Host "SHA : $Hash"
Write-Host ""
Write-Host "Backend baked into this build: https://backend.ukcaar.com/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Share `app-release.apk` with the team." -ForegroundColor Cyan
Write-Host "Testers: enable 'Install unknown apps' for the file manager / browser they're using, then tap the APK to install." -ForegroundColor DarkGray
Write-Host ""
