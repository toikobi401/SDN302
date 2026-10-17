# Tắt MongoDB luyện tập ở cổng 27027 (dữ liệu vẫn giữ nguyên).
if (-not (Get-NetTCPConnection -LocalPort 27027 -State Listen -ErrorAction SilentlyContinue)) {
    Write-Host 'MongoDB ở cổng 27027 đang không chạy.'
    exit 0
}
mongosh --quiet mongodb://127.0.0.1:27027/admin --eval 'db.shutdownServer()' 2>$null | Out-Null
Write-Host 'Đã tắt MongoDB ở cổng 27027.'
