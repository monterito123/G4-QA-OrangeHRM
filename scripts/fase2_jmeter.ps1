param(
    [int]$Usuarios = 50,
    [int]$Rampup = 30,
    [int]$Iteraciones = 15
)
$ErrorActionPreference = "Continue"

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
$jdir = Join-Path $base "jmeter"
$plan = Join-Path $jdir "G4_carga_login_dashboard.jmx"
$jmeter = "C:\Herramientas\apache-jmeter-5.6.3\bin\jmeter.bat"
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
Start-Transcript -Path (Join-Path $logs "fase2_$stamp.log") | Out-Null
Set-Location $jdir

function Correr-Prueba($nombre, $u, $r, $i) {
    $out = Join-Path $jdir "resultados\$stamp`_$nombre"
    New-Item -ItemType Directory -Force -Path $out | Out-Null
    Remove-Item -Recurse -Force (Join-Path $out "*") -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "===== $nombre : $u usuarios, rampa de $r s, $i iteraciones ====="
    cmd /c """$jmeter"" -n -t ""$plan"" -l ""$out\resultados.jtl"" -j ""$out\jmeter.log"" -e -o ""$out\reporte"" -Jusuarios=$u -Jrampup=$r -Jiteraciones=$i -Jclave=""$clave"" -Jjmeter.reportgenerator.apdex_satisfied_threshold=3000 -Jjmeter.reportgenerator.apdex_tolerated_threshold=6000 2>&1" | Out-Host
    $statsFile = Join-Path $out "reporte\statistics.json"
    if (Test-Path $statsFile) {
        $stats = Get-Content $statsFile -Raw | ConvertFrom-Json
        Write-Host ""
        Write-Host ("{0,-32} {1,8} {2,8} {3,10} {4,10} {5,10}" -f "Transaccion / peticion", "Total", "Error %", "Prom ms", "P90 ms", "Max ms")
        foreach ($p in $stats.PSObject.Properties) {
            $s = $p.Value
            Write-Host ("{0,-32} {1,8} {2,8:N2} {3,10:N0} {4,10:N0} {5,10:N0}" -f $s.transaction, $s.sampleCount, $s.errorPct, $s.meanResTime, $s.pct1ResTime, $s.maxResTime)
        }
        $maxActivos = (Import-Csv (Join-Path $out "resultados.jtl") | Measure-Object -Property allThreads -Maximum).Maximum
        Write-Host ""
        Write-Host "Maximo de usuarios activos al mismo tiempo: $maxActivos"
        Write-Host "Reporte HTML: $out\reporte\index.html"
        return $stats.Total.errorPct
    } else {
        Write-Host "No se genero el reporte. Revisar $out\jmeter.log"
        return 100
    }
}

$errorHumo = Correr-Prueba "humo" 1 1 1
if ($errorHumo -eq 0) {
    Write-Host ""
    Write-Host "La prueba de humo paso sin errores: se lanza la prueba de carga"
    Correr-Prueba "carga" $Usuarios $Rampup $Iteraciones | Out-Null
} else {
    Write-Host ""
    Write-Host "La prueba de humo tuvo errores ($errorHumo %). No se lanza la carga hasta corregir el script."
}

Write-Host ""
Write-Host "===== Capturas de los reportes de carga ====="
$evid = Join-Path $base "evidencias\fase2"
New-Item -ItemType Directory -Force -Path $evid | Out-Null
$pw = Join-Path $base "playwright"
Push-Location $pw
foreach ($d in Get-ChildItem -Path (Join-Path $jdir "resultados") -Directory -Filter "*_carga") {
    $reporte = Join-Path $d.FullName "reporte"
    $yaHay = Get-ChildItem -Path $evid -Filter "reporte_$($d.Name)_*" -ErrorAction SilentlyContinue
    if ((Test-Path (Join-Path $reporte "index.html")) -and -not $yaHay) {
        cmd /c "node tools\capturar_reporte_jmeter.js ""$reporte"" ""$evid"" reporte_$($d.Name) 2>&1" | Out-Host
    }
}
Pop-Location

Write-Host ""
Write-Host "===== Fin de la fase 2 ====="
Stop-Transcript | Out-Null
