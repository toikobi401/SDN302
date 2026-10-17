# Bật MongoDB luyện tập ở 127.0.0.1:27027 (tách riêng khỏi service MongoDB mặc định ở 27017).
# Dữ liệu nằm ngoài OneDrive (OneDrive sync hay khoá file của MongoDB).
$ErrorActionPreference = 'Stop'

$mongod = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe'
$root   = Join-Path $env:LOCALAPPDATA 'sdn302-mongo'
$data   = Join-Path $root 'data'
$log    = Join-Path $root 'mongod.log'
$seed   = Join-Path $PSScriptRoot 'seed.js'
$uri    = 'mongodb://127.0.0.1:27027'

function Test-Port { [bool](Get-NetTCPConnection -LocalPort 27027 -State Listen -ErrorAction SilentlyContinue) }

if (Test-Port) {
    Write-Host "MongoDB đã chạy sẵn ở $uri"
    exit 0
}

$firstRun = -not (Test-Path (Join-Path $data 'WiredTiger'))
New-Item -ItemType Directory -Force $data | Out-Null

Start-Process -FilePath $mongod -WindowStyle Hidden -ArgumentList @(
    '--port', '27027', '--bind_ip', '127.0.0.1',
    '--dbpath', "`"$data`"", '--logpath', "`"$log`"", '--logappend'
)

for ($i = 0; $i -lt 20 -and -not (Test-Port); $i++) { Start-Sleep -Milliseconds 500 }
if (-not (Test-Port)) { throw "mongod không khởi động được, xem log: $log" }
Write-Host "Đã bật MongoDB ở $uri (data: $data)"

if ($firstRun) {
    Write-Host 'Lần chạy đầu tiên, đang nạp dữ liệu mẫu...'
    mongosh --quiet $uri $seed
}
