param(
    # El ZIP que mandó Ignacio o Andrés (o la carpeta ya descomprimida)
    [Parameter(Mandatory = $true)][string]$Entrega,
    # Ciclos que trae la entrega: 1,2 (Ignacio) o 3 (Andrés)
    [Parameter(Mandatory = $true)][int[]]$Ciclos,
    # Solo revisa, no copia nada a evidencias
    [switch]$SoloRevisar
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$base = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force -Path (Join-Path $base "logs") | Out-Null
Start-Transcript -Path (Join-Path $base "logs\revisar_evidencias_$stamp.log") | Out-Null

# 1. Descomprimir si es un ZIP
$carpeta = $Entrega
if ($Entrega.ToLower().EndsWith(".zip")) {
    $carpeta = Join-Path $env:TEMP ("g4_entrega_" + $stamp)
    Expand-Archive -Path $Entrega -DestinationPath $carpeta -Force
}
$esperadas = Get-Content (Join-Path $base "kit_ejecucion\capturas_esperadas.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$lista = @($esperadas.PSObject.Properties | Where-Object { $Ciclos -contains $_.Value.ciclo })
$imagenes = @(Get-ChildItem -Path $carpeta -Recurse -Include *.png, *.jpg, *.jpeg)
$excel = @(Get-ChildItem -Path $carpeta -Recurse -Include *.xlsx)

# 2. Comparar nombres
$faltan = @()
$encontradas = @{}
foreach ($e in $lista) {
    $archivo = $imagenes | Where-Object { $_.BaseName -ieq $e.Name } | Select-Object -First 1
    if ($archivo) { $encontradas[$e.Name] = $archivo } else { $faltan += $e }
}
$sobran = @($imagenes | Where-Object { -not ($lista.Name -contains $_.BaseName) })

Write-Host ""
Write-Host "===== Revision de la entrega (ciclos $($Ciclos -join ', ')) ====="
Write-Host ("Capturas esperadas: " + $lista.Count + " | encontradas: " + $encontradas.Count + " | faltan: " + $faltan.Count + " | con nombre que no corresponde: " + $sobran.Count)
Write-Host ("Excel: " + $excel.Count + " archivo(s) " + (($excel | ForEach-Object { $_.Name }) -join ", "))
if ($faltan.Count -gt 0) {
    Write-Host ""
    Write-Host "FALTAN (pedirlas o confirmar que el caso quedo bloqueado):"
    $faltan | ForEach-Object { Write-Host ("  " + $_.Name + "  -> " + $_.Value.que) }
}
if ($sobran.Count -gt 0) {
    Write-Host ""
    Write-Host "NOMBRE QUE NO CORRESPONDE (revisarlas a mano y renombrar):"
    $sobran | ForEach-Object { Write-Host ("  " + $_.Name) }
}

# 3. Copiar a evidencias\fase3 con el nombre de la regla (fecha y hora de la captura)
if (-not $SoloRevisar) {
    $filas = @()
    foreach ($nombre in ($encontradas.Keys | Sort-Object)) {
        $archivo = $encontradas[$nombre]
        $e = $esperadas.$nombre
        $que = ($e.que -replace '[^\p{L}\p{N} ]', '' -replace '\s+', '-').ToLower()
        $destinoCarpeta = Join-Path $base ("evidencias\fase3\ciclo" + $e.ciclo)
        New-Item -ItemType Directory -Force -Path $destinoCarpeta | Out-Null
        $fecha = $archivo.LastWriteTime.ToString("yyyy-MM-dd_HHmm")
        $destino = Join-Path $destinoCarpeta ($fecha + "_" + $nombre + "_" + $que + $archivo.Extension.ToLower())
        Copy-Item $archivo.FullName $destino -Force
        $filas += ("| ``fase3/ciclo" + $e.ciclo + "/" + (Split-Path $destino -Leaf) + "`` | " + $e.caso + ": " + $e.que + " |")
    }
    $registros = Join-Path $base "evidencias\fase3\registros"
    New-Item -ItemType Directory -Force -Path $registros | Out-Null
    foreach ($x in $excel) { Copy-Item $x.FullName (Join-Path $registros ($stamp + "_" + $x.Name)) -Force }
    $indice = Join-Path $base ("logs\indice_fase3_" + $stamp + ".md")
    $filas | Set-Content -Path $indice -Encoding UTF8
    Write-Host ""
    Write-Host ("Copiadas " + $filas.Count + " capturas a evidencias\fase3 y el Excel a evidencias\fase3\registros.")
    Write-Host ("Filas para el INDICE en " + $indice + " (Claude las agrega al indice).")
}
Stop-Transcript | Out-Null
