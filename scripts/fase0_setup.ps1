$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$env:WSL_UTF8 = "1"

$base = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $base "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
Start-Transcript -Path (Join-Path $logs "fase0_$stamp.log") | Out-Null

Write-Host ""
Write-Host "===== 1. Versiones de las herramientas ====="
cmd /c "node -v 2>&1"
cmd /c "npm -v 2>&1"
cmd /c "git --version 2>&1"
cmd /c "java -version 2>&1"
cmd /c "wsl --version 2>&1"
cmd /c "docker --version 2>&1"
cmd /c "docker compose version 2>&1"
cmd /c "docker info --format ""Engine {{.ServerVersion}} - {{.OperatingSystem}} - CPUs {{.NCPU}} - RAM {{.MemTotal}}"" 2>&1"

Write-Host ""
Write-Host "===== 2. Apache JMeter ====="
$tools = "C:\Herramientas"
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$existing = Get-ChildItem -Path $tools -Directory -Filter "apache-jmeter-*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    Write-Host "JMeter ya estaba instalado en $($existing.FullName)"
    $jmeterHome = $existing.FullName
} else {
    $page = Invoke-WebRequest -UseBasicParsing -Uri "https://jmeter.apache.org/download_jmeter.cgi"
    $m = [regex]::Match($page.Content, "apache-jmeter-([0-9]+\.[0-9]+(\.[0-9]+)?)\.zip")
    $ver = $m.Groups[1].Value
    Write-Host "Version publicada en jmeter.apache.org: $ver"
    $url = "https://dlcdn.apache.org/jmeter/binaries/apache-jmeter-$ver.zip"
    $zip = Join-Path $tools "apache-jmeter-$ver.zip"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip
    $shaText = (Invoke-WebRequest -UseBasicParsing -Uri "$url.sha512").Content
    if ($shaText -is [byte[]]) { $shaText = [System.Text.Encoding]::ASCII.GetString($shaText) }
    $expected = ($shaText.Trim() -split "\s+")[0].ToLower()
    $actual = (Get-FileHash -Path $zip -Algorithm SHA512).Hash.ToLower()
    if ($expected -eq $actual) {
        Write-Host "SHA512 verificado: el archivo descargado es el oficial"
        Expand-Archive -Path $zip -DestinationPath $tools -Force
        Remove-Item $zip
        $jmeterHome = Join-Path $tools "apache-jmeter-$ver"
    } else {
        Write-Host "ERROR: el SHA512 no coincide, no se instala JMeter"
        Write-Host "Esperado: $expected"
        Write-Host "Obtenido: $actual"
    }
}
if ($jmeterHome) {
    [Environment]::SetEnvironmentVariable("JMETER_HOME", $jmeterHome, "User")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $jmeterBin = Join-Path $jmeterHome "bin"
    if ($userPath -notlike "*$jmeterBin*") {
        [Environment]::SetEnvironmentVariable("Path", "$userPath;$jmeterBin", "User")
        Write-Host "Agregado al PATH del usuario: $jmeterBin"
    }
    cmd /c """$jmeterBin\jmeter.bat"" --version 2>&1"
}

Write-Host ""
Write-Host "===== 3. OrangeHRM local en Docker ====="
$compose = Join-Path $base "docker\docker-compose.yml"
$tag = "latest"
foreach ($t in @("5.9", "5.8")) {
    cmd /c "docker pull orangehrm/orangehrm:$t >nul 2>&1"
    if ($LASTEXITCODE -eq 0) { $tag = $t; break }
    Write-Host "La etiqueta $t no existe en Docker Hub"
}
if ($tag -eq "latest") { cmd /c "docker pull orangehrm/orangehrm:latest 2>&1" }
Write-Host "Imagen de OrangeHRM usada: orangehrm/orangehrm:$tag"
$env:OHRM_TAG = $tag
Set-Content -Path (Join-Path $base "docker\.env") -Value "OHRM_TAG=$tag" -Encoding ASCII

cmd /c "docker compose -f ""$compose"" up -d 2>&1"
Write-Host "Esperando a que la base de datos y la app arranquen..."
Start-Sleep -Seconds 45
cmd /c "docker compose -f ""$compose"" ps 2>&1"

try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8200" -MaximumRedirection 5 -TimeoutSec 30
    Write-Host "http://localhost:8200 responde con codigo $($r.StatusCode)"
    Write-Host "URL final: $($r.BaseResponse.ResponseUri)"
} catch {
    Write-Host "http://localhost:8200 todavia no responde: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "===== Fin de la fase 0 ====="
Stop-Transcript | Out-Null
