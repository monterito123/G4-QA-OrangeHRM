param(
    # URL del repositorio vacio que se creo en GitHub, por ejemplo https://github.com/usuario/G4-QA-OrangeHRM.git
    [Parameter(Mandatory = $true)][string]$Remoto
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
Start-Transcript -Path (Join-Path $logs "preparar_repo_$stamp.log") | Out-Null
Set-Location $base

Write-Host ""
Write-Host "===== 1. Git ====="
cmd /c "git --version"
if ($LASTEXITCODE -ne 0) { Write-Host "No esta instalado Git. Instalarlo y volver a correr."; Stop-Transcript | Out-Null; exit 1 }

Write-Host ""
Write-Host "===== 2. Claves de la base de datos fuera del docker-compose ====="
# Las claves pasan a docker\.env (que no se sube) y el docker-compose las lee de ahi.
# Son las mismas claves de hoy, asi que los contenedores y sus datos no cambian.
$envDocker = Join-Path $base "docker\.env"
$compose = Join-Path $base "docker\docker-compose.yml"
$texto = Get-Content $compose -Raw
if ($texto -match "MARIADB_ROOT_PASSWORD: (\S+)") {
    $root = $Matches[1]
    $null = $texto -match "MARIADB_PASSWORD: (\S+)"
    $usuario = $Matches[1]
    $actual = ""
    if (Test-Path $envDocker) { $actual = Get-Content $envDocker -Raw }
    $agregar = @()
    if ($actual -notmatch "MARIADB_ROOT_PASSWORD=") { $agregar += "MARIADB_ROOT_PASSWORD=$root" }
    if ($actual -notmatch "MARIADB_DATABASE=") { $agregar += "MARIADB_DATABASE=orangehrm" }
    if ($actual -notmatch "MARIADB_USER=") { $agregar += "MARIADB_USER=orangehrm" }
    if ($actual -notmatch "MARIADB_PASSWORD=") { $agregar += "MARIADB_PASSWORD=$usuario" }
    if ($agregar.Count -gt 0) { Add-Content -Path $envDocker -Value $agregar -Encoding ASCII }
    $texto = $texto -replace "MARIADB_ROOT_PASSWORD: \S+", 'MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}'
    $texto = $texto -replace "MARIADB_DATABASE: \S+", 'MARIADB_DATABASE: ${MARIADB_DATABASE}'
    $texto = $texto -replace "MARIADB_USER: \S+", 'MARIADB_USER: ${MARIADB_USER}'
    $texto = $texto -replace "MARIADB_PASSWORD: \S+", 'MARIADB_PASSWORD: ${MARIADB_PASSWORD}'
    Set-Content -Path $compose -Value $texto -Encoding UTF8 -NoNewline
    Write-Host "Listo: docker-compose.yml lee las claves de docker\.env"
} else {
    Write-Host "El docker-compose.yml ya no tiene claves escritas"
}
Push-Location (Join-Path $base "docker")
cmd /c "docker compose config --quiet 2>&1" | Out-Host
if ($LASTEXITCODE -ne 0) { Write-Host "AVISO: docker compose config dio error; revisar docker\.env" }
Pop-Location

Write-Host ""
Write-Host "===== 3. Repositorio local ====="
# El workflow se guarda en scripts\ y aqui se copia a .github\workflows (la carpeta .github no se puede escribir desde la nube)
$wf = Join-Path $base ".github\workflows"
New-Item -ItemType Directory -Force -Path $wf | Out-Null
Copy-Item (Join-Path $base "scripts\workflow_playwright.yml") (Join-Path $wf "playwright.yml") -Force
Write-Host "Workflow copiado a .github\workflows\playwright.yml"
if (-not (Test-Path (Join-Path $base ".git"))) {
    cmd /c "git init -b main"
}
cmd /c "git rm -r -q --cached --ignore-unmatch . 2>nul"
cmd /c "git add -A"

Write-Host ""
Write-Host "===== 4. Revision de claves antes de subir ====="
# Si alguna clave real quedo en un archivo que se va a subir, se detiene aqui
$prohibidas = @()
foreach ($linea in Get-Content (Join-Path $base "playwright\.env")) {
    if ($linea -match '^(LOCAL_ADMIN_PASS|DEMO_ADMIN_PASS)=(.+)$') { $prohibidas += $Matches[2].Trim() }
}
foreach ($linea in Get-Content $envDocker) {
    if ($linea -match '^MARIADB_(ROOT_)?PASSWORD=(.+)$') { $prohibidas += $Matches[2].Trim() }
}
$hallazgos = @()
foreach ($p in ($prohibidas | Where-Object { $_ -and $_ -ne "admin123" } | Select-Object -Unique)) {
    $r = cmd /c "git grep --cached -l -F ""$p"" 2>nul"
    if ($r) { $hallazgos += $r }
}
if ($hallazgos.Count -gt 0) {
    Write-Host "SE DETIENE: estos archivos tienen una clave y no se pueden subir:"
    $hallazgos | Select-Object -Unique | ForEach-Object { Write-Host "  $_" }
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "Ninguna clave real en los archivos que se suben"
cmd /c "git status --short" | Out-Host

Write-Host ""
Write-Host "===== 5. Commit y push ====="
cmd /c "git rev-parse --verify -q HEAD >nul 2>nul"
$hayCommit = ($LASTEXITCODE -eq 0)
cmd /c "git rev-parse --verify -q origin/main >nul 2>nul"
$yaSubido = ($LASTEXITCODE -eq 0)
if ($hayCommit -and -not $yaSubido) {
    # El commit anterior nunca se subio: se corrige en vez de crear otro
    cmd /c "git commit --amend --no-edit 2>&1" | Out-Host
} else {
    cmd /c "git commit -m ""Scripts de pruebas del Grupo 4: Playwright, JMeter, Docker y GitHub Actions"" 2>&1" | Out-Host
}
cmd /c "git remote remove origin 2>nul"
cmd /c "git remote add origin $Remoto"
cmd /c "git push -u origin main 2>&1" | Out-Host
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===== LISTO: el codigo esta en $Remoto ====="
    Write-Host "Falta agregar los secretos DEMO_ADMIN_USER y DEMO_ADMIN_PASS en GitHub (Settings > Secrets and variables > Actions)"
} else {
    Write-Host "El push fallo: revisar el usuario de GitHub o los permisos del repositorio"
}
Stop-Transcript | Out-Null
