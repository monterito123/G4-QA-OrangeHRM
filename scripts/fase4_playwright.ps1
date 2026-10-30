param(
    # "todas" corre todas las etapas en orden; un numero (1 a 6) o "2b" corre solo esa etapa;
    # "final" corre solo la corrida final (etapas 5 y 6, con EVIDENCIA=1);
    # "ultima" solo actualiza evidencias\fase4\ultima (no corre pruebas)
    [string]$Etapa = "todas"
)
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
# Para que las tildes y simbolos de la salida de Playwright se vean bien en la consola
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
$pw = Join-Path $base "playwright"
$evid = Join-Path $base "evidencias\fase4"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
# Cada corrida final guarda su evidencia aparte: evidencias\fase4\corridas\<AAAA-MM-DD_HHmm>\<ambiente>\<navegador>
# Nunca se borra la evidencia de corridas anteriores (el 29/10 se perdio una captura por vaciar las carpetas)
$corridas = Join-Path $evid "corridas"
$carpetaCorrida = Join-Path $corridas $stamp
New-Item -ItemType Directory -Force -Path $logs | Out-Null
New-Item -ItemType Directory -Force -Path $corridas | Out-Null
Set-Location $pw

# evidencias\fase4\ultima\<ambiente> es un acceso directo (junction de Windows, no ocupa espacio) a la corrida
# mas reciente de ese ambiente. Se hace por ambiente porque se puede correr solo local o solo la demo.
function Actualizar-Ultima {
    $ultima = Join-Path $evid "ultima"
    New-Item -ItemType Directory -Force -Path $ultima | Out-Null
    foreach ($amb in @("local", "demo")) {
        # Los nombres AAAA-MM-DD_HHmm se ordenan igual que las fechas
        $reciente = Get-ChildItem -Path $corridas -Directory | Sort-Object Name -Descending | Where-Object { Test-Path (Join-Path $_.FullName $amb) } | Select-Object -First 1
        if (-not $reciente) { continue }
        $enlace = Join-Path $ultima $amb
        # Get-Item (y no Test-Path) para detectar tambien un acceso directo roto
        $item = Get-Item $enlace -Force -ErrorAction SilentlyContinue
        if ($item) {
            if ($item.LinkType -ne "Junction") {
                Write-Host "AVISO: $enlace no es un acceso directo; no se toca"
                continue
            }
            # rmdir sin /s quita solo el acceso directo, no la carpeta de la corrida
            cmd /c "rmdir ""$enlace""" | Out-Null
        }
        New-Item -ItemType Junction -Path $enlace -Target (Join-Path $reciente.FullName $amb) | Out-Null
        Write-Host ("ultima\{0} -> corridas\{1}\{0}" -f $amb, $reciente.Name)
    }
}

if ($Etapa -eq "ultima") {
    # Deja evidencia en logs\: el listado muestra cada acceso directo como <JUNCTION> con su destino
    Start-Transcript -Path (Join-Path $logs "fase4_ultima_$stamp.log") | Out-Null
    Actualizar-Ultima
    Write-Host ""
    Write-Host "===== evidencias\fase4\corridas ====="
    cmd /c "dir ""$corridas""" | Out-Host
    Write-Host "===== evidencias\fase4\ultima ====="
    cmd /c "dir ""$evid\ultima""" | Out-Host
    Stop-Transcript | Out-Null
    exit 0
}

# Las credenciales viven solo en playwright\.env (no se sube a GitHub). Si no existe o tiene claves
# vacias, se piden una vez. Se hace antes de iniciar el log para que las claves no queden en el log.
$envFile = Join-Path $pw ".env"
$faltaEnv = -not (Test-Path $envFile)
if (-not $faltaEnv) {
    if ((Select-String -Path $envFile -Pattern '^LOCAL_ADMIN_PASS=\s*$' -Quiet) -or (Select-String -Path $envFile -Pattern '^DEMO_ADMIN_PASS=\s*$' -Quiet)) {
        $faltaEnv = $true
    }
}
if ($faltaEnv) {
    Write-Host "Falta playwright\.env o tiene claves vacias. Se crea ahora con los datos que escribas:"
    $lu = Read-Host "Usuario Admin de la instancia local [Enter = Admin]"
    if (-not $lu) { $lu = "Admin" }
    $lp = Read-Host "Clave del Admin de la instancia local"
    $du = Read-Host "Usuario de la demo publica, sale en su pagina de login [Enter = Admin]"
    if (-not $du) { $du = "Admin" }
    $dp = Read-Host "Clave de la demo publica, sale en su pagina de login"
    $contenido = @(
        "TARGET=local",
        "LOCAL_URL=http://127.0.0.1:8200",
        "LOCAL_ADMIN_USER=$lu",
        "LOCAL_ADMIN_PASS=$lp",
        "DEMO_URL=https://opensource-demo.orangehrmlive.com",
        "DEMO_ADMIN_USER=$du",
        "DEMO_ADMIN_PASS=$dp"
    )
    Set-Content -Path $envFile -Value $contenido -Encoding ASCII
    Write-Host "Listo: se creo playwright\.env"
}

Start-Transcript -Path (Join-Path $logs "fase4_$stamp.log") | Out-Null

Write-Host ""
Write-Host "===== 1. Dependencias ====="
cmd /c "npm install 2>&1" | Out-Host

Write-Host ""
Write-Host "===== 2. Instancia local de OrangeHRM ====="
function Local-Arriba {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8200/web/index.php/auth/login" -TimeoutSec 5
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}
if (-not (Local-Arriba)) {
    Write-Host "OrangeHRM local no responde: se levantan los contenedores"
    Push-Location (Join-Path $base "docker")
    cmd /c "docker compose up -d 2>&1" | Out-Host
    Pop-Location
    $intentos = 0
    while (-not (Local-Arriba) -and $intentos -lt 24) {
        Start-Sleep -Seconds 5
        $intentos++
    }
}
if (Local-Arriba) { Write-Host "OrangeHRM local responde en http://127.0.0.1:8200" } else { Write-Host "OrangeHRM local NO responde; las etapas locales van a fallar" }

# Avance incremental en Chromium contra local (modo desarrollo: trace y video solo si algo falla).
# La etapa 2b es la variante (d) de CP-011: valida lo que dice el Plan y OrangeHRM no lo cumple,
# asi que se espera que falle; por eso va aparte y no detiene la corrida.
# Las etapas 5 y 6 son la corrida final con EVIDENCIA=1 (trace y video de todo) en los 3 navegadores.
$etapas = @(
    @{ n = "1";  nombre = "CP-002 y CP-012 en Chromium";            ambiente = "local"; casos = "CP-002|CP-012";        invertir = "";      nav = "--project=chromium"; evidencia = $false; detener = $true },
    @{ n = "2";  nombre = "CP-010 y CP-011 (a, b, c) en Chromium";  ambiente = "local"; casos = "CP-010|CP-011";        invertir = "\(d\)"; nav = "--project=chromium"; evidencia = $false; detener = $true },
    @{ n = "2b"; nombre = "CP-011 (d) caracteres especiales";       ambiente = "local"; casos = "CP-011.*\(d\)";        invertir = "";      nav = "--project=chromium"; evidencia = $false; detener = $false },
    @{ n = "3";  nombre = "CP-008 en Chromium";                     ambiente = "local"; casos = "CP-008";               invertir = "";      nav = "--project=chromium"; evidencia = $false; detener = $true },
    @{ n = "4";  nombre = "CP-015, CP-016 y CP-017 en Chromium";    ambiente = "local"; casos = "CP-015|CP-016|CP-017"; invertir = "";      nav = "--project=chromium"; evidencia = $false; detener = $true },
    @{ n = "5";  nombre = "Corrida final en los 3 navegadores";     ambiente = "local"; casos = "@regresion";           invertir = "";      nav = "";                   evidencia = $true;  detener = $false },
    @{ n = "6";  nombre = "Corrida final en los 3 navegadores";     ambiente = "demo";  casos = "@regresion";           invertir = "";      nav = "";                   evidencia = $true;  detener = $false }
)

$resumen = @()
$ultimoReporte = $null
foreach ($e in $etapas) {
    if ($Etapa -eq "final") {
        if ($e.n -ne "5" -and $e.n -ne "6") { continue }
    } elseif ($Etapa -ne "todas" -and $Etapa -ne $e.n) {
        continue
    }

    Write-Host ""
    Write-Host ("===== Etapa {0}: {1} ({2}) =====" -f $e.n, $e.nombre, $e.ambiente)
    $env:TARGET = $e.ambiente
    $carpetaAmbiente = Join-Path $carpetaCorrida $e.ambiente
    if ($e.evidencia) {
        $env:EVIDENCIA = "1"
        # helpers\evidencia.js copia aqui las capturas por paso, en una subcarpeta por navegador
        $env:G4_CARPETA_EVIDENCIA = $carpetaAmbiente
        New-Item -ItemType Directory -Force -Path $carpetaAmbiente | Out-Null
        Write-Host "Modo EVIDENCIA=1: trace y video de todas las pruebas; capturas por paso en evidencias\fase4\corridas\$stamp\$($e.ambiente)\<navegador>"
    } else {
        Remove-Item Env:\EVIDENCIA -ErrorAction SilentlyContinue
        Remove-Item Env:\G4_CARPETA_EVIDENCIA -ErrorAction SilentlyContinue
    }

    $extra = ""
    if ($e.invertir) { $extra = "--grep-invert ""$($e.invertir)""" }
    $inicio = Get-Date
    cmd /c "npx playwright test --grep ""$($e.casos)"" $extra $($e.nav) 2>&1" | Out-Host
    $codigo = $LASTEXITCODE
    $minutos = [math]::Round(((Get-Date) - $inicio).TotalMinutes, 1)
    Write-Host ("Etapa {0} termino con codigo {1} (0 = todo paso) en {2} min" -f $e.n, $codigo, $minutos)
    $resumen += ("Etapa {0} ({1}, {2}): codigo {3}, {4} min" -f $e.n, $e.nombre, $e.ambiente, $codigo, $minutos)

    # Respaldo de resultados: el JSON para armar la tabla y el indice
    $json = Join-Path $pw ("resultados\" + $e.ambiente + ".json")
    if (Test-Path $json) { Copy-Item $json (Join-Path $logs ("fase4_{0}_etapa{1}_{2}.json" -f $stamp, $e.n, $e.ambiente)) -Force }

    # En la corrida final, el reporte HTML (con capturas, traces y videos) va a la carpeta de la corrida
    # (corridas\<AAAA-MM-DD_HHmm>\<ambiente>\reporte) junto con una captura del resumen
    if ($e.evidencia) {
        $reporte = Join-Path $pw ("playwright-report\" + $e.ambiente)
        $destino = Join-Path $carpetaAmbiente "reporte"
        if (Test-Path $reporte) {
            Copy-Item -Recurse $reporte $destino
            cmd /c "node tools\capturar_reporte_playwright.js ""$destino"" ""$carpetaAmbiente\resumen_$($e.ambiente).png"" 2>&1" | Out-Host
            $ultimoReporte = Join-Path $destino "index.html"
        }
        Remove-Item Env:\EVIDENCIA -ErrorAction SilentlyContinue
        Remove-Item Env:\G4_CARPETA_EVIDENCIA -ErrorAction SilentlyContinue
        Actualizar-Ultima
    }

    if ($codigo -ne 0 -and $e.detener -and $Etapa -eq "todas") {
        Write-Host ""
        Write-Host "Se detiene aqui: la etapa $($e.n) tuvo fallos. Revisar antes de seguir con la siguiente."
        break
    }
}

Write-Host ""
Write-Host "===== Resumen ====="
foreach ($linea in $resumen) { Write-Host $linea }
if (Test-Path $carpetaCorrida) {
    Write-Host "Evidencia de esta corrida: evidencias\fase4\corridas\$stamp (acceso directo en evidencias\fase4\ultima)"
}

if ($ultimoReporte) {
    Write-Host ""
    Write-Host "Abriendo el ultimo reporte: $ultimoReporte"
    Invoke-Item $ultimoReporte
}

Write-Host ""
Write-Host "===== Fin de la fase 4 ====="
Stop-Transcript | Out-Null
