# Xoá sạch và nạp lại dữ liệu mẫu (dùng sau khi làm các bài insert/update/delete).
mongosh --quiet mongodb://127.0.0.1:27027 (Join-Path $PSScriptRoot 'seed.js')
