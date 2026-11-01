$dbDir = Join-Path $PSScriptRoot "test-db"
if (-not (Test-Path $dbDir)) {
    New-Item -ItemType Directory -Path $dbDir | Out-Null
}

Write-Host "Starting mongod on 127.0.0.1:27017..."
$mongoProc = Start-Process -FilePath "mongod.exe" -ArgumentList "--dbpath `"$dbDir`" --port 27017 --bind_ip 127.0.0.1" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

try {
    node (Join-Path $PSScriptRoot "smoke-test.js")
} finally {
    Write-Host "Stopping mongod..."
    Stop-Process -Id $mongoProc.Id -Force -ErrorAction SilentlyContinue
}

