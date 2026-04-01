@echo off
:: build.bat — bump version then build the Tauri app
:: Run this instead of "yarn tauri build" directly.
::
:: Output installer will be at:
::   src-tauri\target\release\bundle\nsis\Image Viewer_<version>_x64-setup.exe

setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo  Step 1/2 — Bumping patch version
echo ============================================================
powershell -ExecutionPolicy Bypass -File scripts\bump-version.ps1
if errorlevel 1 (
    echo [ERROR] Version bump failed.  Aborting build.
    exit /b 1
)

echo.
echo ============================================================
echo  Step 2/2 — Building Tauri app
echo ============================================================
yarn tauri build
if errorlevel 1 (
    echo [ERROR] Build failed.
    exit /b 1
)

echo.
echo Build complete.  Installer is in src-tauri\target\release\bundle\
endlocal
