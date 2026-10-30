$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
Start-Transcript -Path (Join-Path $logs "fase0b_$stamp.log") | Out-Null

Write-Host ""
Write-Host "===== 1. Navegadores para compatibilidad ====="
cmd /c "winget list --id Mozilla.Firefox -e 2>&1" | Out-String | Set-Variable ff
if ($ff -match "Mozilla.Firefox") {
    Write-Host "Firefox ya esta instalado"
} else {
    Write-Host "Instalando Firefox..."
    cmd /c "winget install --id Mozilla.Firefox -e 2>&1"
}
cmd /c "winget list --id Mozilla.Firefox -e 2>&1"
cmd /c "winget list --id Microsoft.Edge -e 2>&1"
cmd /c "winget list --id Google.Chrome -e 2>&1"

Write-Host ""
Write-Host "===== 2. Proyecto de Playwright ====="
$pw = Join-Path $base "playwright"
New-Item -ItemType Directory -Force -Path $pw | Out-Null
Set-Location $pw
if (-not (Test-Path (Join-Path $pw "package.json"))) {
    cmd /c "npm init playwright@latest -- --quiet --lang=js --browser=chromium --browser=firefox 2>&1"
} else {
    Write-Host "El proyecto ya existia, se reinstalan dependencias"
    cmd /c "npm install 2>&1"
    cmd /c "npx playwright install chromium firefox 2>&1"
}

$plantillas = Join-Path $PSScriptRoot "plantillas"
Copy-Item -Path (Join-Path $plantillas "playwright.config.js") -Destination (Join-Path $pw "playwright.config.js") -Force
$tests = Join-Path $pw "tests"
New-Item -ItemType Directory -Force -Path $tests | Out-Null
Get-ChildItem -Path $tests -Filter "example*.spec.js" -ErrorAction SilentlyContinue | Remove-Item -Force
$ejemplos = Join-Path $pw "tests-examples"
if (Test-Path $ejemplos) { Remove-Item -Recurse -Force $ejemplos }
Copy-Item -Path (Join-Path $plantillas "cp-001-login-valido.spec.js") -Destination $tests -Force

cmd /c "npx playwright --version 2>&1"

Write-Host ""
Write-Host "===== 3. Primera ejecucion: CP-001 en Chrome, Firefox y Edge ====="
cmd /c "npx playwright test 2>&1"
Write-Host "Codigo de salida de Playwright: $LASTEXITCODE (0 = todo paso)"
Write-Host "Reporte HTML: $pw\playwright-report\index.html"

Write-Host ""
Write-Host "===== Fin de la fase 0b ====="
Stop-Transcript | Out-Null
