param(
    # Sin parametros: deja todo listo para la demo (Docker, OrangeHRM, JMeter y el reporte de la corrida 2).
    # -Humo: ademas corre la prueba de humo por consola (1 usuario) para confirmar que todo funciona.
    # -SinAbrir: no abre JMeter ni el reporte (sirve para probar solo Docker y OrangeHRM).
    # -Reporte5s: regenera el reporte HTML de la corrida 2 con los mismos datos (resultados.jtl), pero con
    #   graficas cada 5 s en vez de cada minuto, en jmeter\resultados\2026-10-28_2131_carga\reporte_5s.
    [switch]$Humo,
    [switch]$SinAbrir,
    [switch]$Reporte5s
)
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
$docker = Join-Path $base "docker"
$jdir = Join-Path $base "jmeter"
$planDemo = Join-Path $jdir "G4_demo_humo_gui.jmx"
$planCarga = Join-Path $jdir "G4_carga_login_dashboard.jmx"
$jmeter = "C:\Herramientas\apache-jmeter-5.6.3\bin\jmeter.bat"
$reporteCorrida2 = Join-Path $jdir "resultados\2026-10-28_2131_carga\reporte\index.html"
$urlLogin = "http://localhost:8200/web/index.php/auth/login"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"

# La clave del Admin local no va dentro del .jmx (el plan se sube a GitHub): se lee de playwright\.env
function Leer-ClaveLocal {
    $archivo = Join-Path $base "playwright\.env"
    if (Test-Path $archivo) {
        foreach ($linea in Get-Content $archivo) {
            if ($linea -match '^LOCAL_ADMIN_PASS=(.*)$') { return $Matches[1].Trim() }
        }
    }
    return ""
}
$clave = Leer-ClaveLocal
New-Item -ItemType Directory -Force -Path $logs | Out-Null
# JMeter crea su carpeta temporal del reporte en la carpeta actual: si PowerShell esta en System32 falla
Set-Location $jdir
Start-Transcript -Path (Join-Path $logs "pr02_demo_$stamp.log") | Out-Null

$listo = $true
function Marcar($ok, $texto) {
    if ($ok) {
        Write-Host ("[OK]    " + $texto)
    } else {
        Write-Host ("[FALLA] " + $texto)
        $script:listo = $false
    }
}

Write-Host ""
Write-Host "===== 1. Docker Desktop ====="
cmd /c "docker info >nul 2>&1"
if ($LASTEXITCODE -ne 0) {
    $exe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $exe) {
        Write-Host "Docker no responde: se abre Docker Desktop y se espera hasta 2 minutos"
        Start-Process $exe
        $intentos = 0
        do {
            Start-Sleep -Seconds 5
            cmd /c "docker info >nul 2>&1"
            $intentos++
        } while ($LASTEXITCODE -ne 0 -and $intentos -lt 24)
    }
}
cmd /c "docker info >nul 2>&1"
Marcar ($LASTEXITCODE -eq 0) "Docker responde"

Write-Host ""
Write-Host "===== 2. Contenedores de OrangeHRM ====="
Push-Location $docker
# "start" enciende los contenedores que ya existen, con los datos que ya tienen.
# Si no existen (por ejemplo, se borraron), "up -d" los crea de nuevo.
cmd /c "docker compose start 2>&1" | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se pudieron encender: se crean con docker compose up -d"
    cmd /c "docker compose up -d 2>&1" | Out-Host
}
cmd /c "docker compose ps 2>&1" | Out-Host
Pop-Location

Write-Host ""
Write-Host "===== 3. OrangeHRM en localhost:8200 ====="
function Login-Responde {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $urlLogin -TimeoutSec 5
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}
$intentos = 0
while (-not (Login-Responde) -and $intentos -lt 24) {
    Start-Sleep -Seconds 5
    $intentos++
}
Marcar (Login-Responde) "La pagina de login responde 200 en $urlLogin"

Write-Host ""
Write-Host "===== 4. Archivos de la demo ====="
Marcar (Test-Path $jmeter) "JMeter 5.6.3 en $jmeter"
Marcar (Test-Path $planDemo) "Plan de la demo: jmeter\G4_demo_humo_gui.jmx (1 usuario, con listeners)"
Marcar (Test-Path $planCarga) "Plan de carga original: jmeter\G4_carga_login_dashboard.jmx"
Marcar (Test-Path $reporteCorrida2) "Reporte HTML de la corrida 2 (28/10 21:31)"
Marcar ($clave -ne "") "Clave del Admin local leida de playwright\.env (LOCAL_ADMIN_PASS)"

if ($Humo -and $listo) {
    Write-Host ""
    Write-Host "===== 5. Prueba de humo por consola (1 usuario, 1 iteracion) ====="
    $out = Join-Path $jdir "resultados\$stamp`_demo_humo"
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    cmd /c """$jmeter"" -n -t ""$planCarga"" -l ""$out\resultados.jtl"" -j ""$out\jmeter.log"" -e -o ""$out\reporte"" -Jusuarios=1 -Jrampup=1 -Jiteraciones=1 -Jclave=""$clave"" -Jjmeter.reportgenerator.apdex_satisfied_threshold=3000 -Jjmeter.reportgenerator.apdex_tolerated_threshold=6000 2>&1" | Out-Host
    $statsFile = Join-Path $out "reporte\statistics.json"
    if (Test-Path $statsFile) {
        $stats = Get-Content $statsFile -Raw | ConvertFrom-Json
        Marcar ($stats.Total.errorPct -eq 0) ("Prueba de humo: {0} muestras, {1} % de error" -f $stats.Total.sampleCount, $stats.Total.errorPct)
    } else {
        Marcar $false "La prueba de humo no genero reporte (ver $out\jmeter.log)"
    }
}

if ($Reporte5s) {
    Write-Host ""
    Write-Host "===== Reporte de la corrida 2 con graficas cada 5 s ====="
    $c2 = Join-Path $jdir "resultados\2026-10-28_2131_carga"
    $out5 = Join-Path $c2 "reporte_5s"
    if (Test-Path (Join-Path $out5 "index.html")) {
        Marcar $true "Ya existe: $out5"
    } else {
        cmd /c """$jmeter"" -g ""$c2\resultados.jtl"" -o ""$out5"" -j ""$c2\jmeter_reporte_5s.log"" -Jjmeter.reportgenerator.overall_granularity=5000 -Jjmeter.reportgenerator.apdex_satisfied_threshold=3000 -Jjmeter.reportgenerator.apdex_tolerated_threshold=6000 2>&1" | Out-Host
        Marcar (Test-Path (Join-Path $out5 "index.html")) "Reporte con graficas cada 5 s en $out5"
    }
}

if (-not $SinAbrir) {
    Write-Host ""
    Write-Host "===== Abriendo JMeter con el plan de la demo y el reporte de la corrida 2 ====="
    if (Test-Path $jmeter) {
        Start-Process -FilePath $jmeter -ArgumentList "-t", """$planDemo""", "-Jclave=$clave" -WorkingDirectory $jdir
    }
    if (Test-Path $reporteCorrida2) {
        Invoke-Item $reporteCorrida2
    }
}

Write-Host ""
if ($listo) {
    Write-Host "===== LISTO PARA LA DEMO ====="
} else {
    Write-Host "===== REVISAR: algo marco FALLA arriba. Si no se resuelve, usar el plan B (video) ====="
}
Stop-Transcript | Out-Null
