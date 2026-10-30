param(
    # 1, 2, 3 o limpiar
    [Parameter(Mandatory = $true)][ValidateSet("1", "2", "3", "limpiar")][string]$Ciclo,
    # Borra antes los empleados G4- que quedaron de otros dias (usarlo el primer dia de cada ciclo)
    [switch]$Limpiar,
    # Ciclo 2, dias 2 y 3: vuelve a crear G4-Ana Prueba y g4.ess01 si la demo se reinicio
    [switch]$Base,
    # Para probar el script contra la instancia local en vez de la demo
    [switch]$Local
)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$raiz = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $raiz "logs"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
Start-Transcript -Path (Join-Path $logs "datos_ciclo$($Ciclo)_$stamp.log") | Out-Null

Set-Location (Join-Path $raiz "playwright")
if ($Local) { $env:TARGET = "local" } else { $env:TARGET = "demo" }
$opciones = @($Ciclo)
if ($Limpiar) { $opciones += "--limpiar" }
if ($Base) { $opciones += "--base" }
node tools/preparar_datos_ciclo.js @opciones
$codigo = $LASTEXITCODE
Stop-Transcript | Out-Null
if ($codigo -eq 0 -and $Ciclo -ne "limpiar") {
    Write-Host ""
    Write-Host "Mandar por chat el archivo de kit_ejecucion\datos\ (no la consola)."
}
exit $codigo
