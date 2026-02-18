# PowerShell script to check VPS logs for webhook activity
$VPS_IP = "185.25.151.239"
$VPS_USER = "root"
$VPS_PASSWORD = "6178zfi9HwOMewX9RP"

Write-Host "🔍 Sprawdzanie logów webhooka na VPS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Prepare SSH commands
$sshCommands = @"
cd /root/BackendRespo
echo '=== Ostatnie 50 linii logów PM2 ==='
pm2 logs marketplace-backend --lines 50 --nostream

echo ''
echo '=== Filtrowanie logów webhooka ==='
pm2 logs marketplace-backend --lines 200 --nostream | grep -i 'webhook\|notification' | tail -20

echo ''
echo '=== Sprawdzanie czy są logi z testowego webhooka ==='
pm2 logs marketplace-backend --lines 100 --nostream | grep -i 'test.*webhook' | tail -10
"@

# Save commands to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$sshCommands | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "Łączę się z VPS (wpisz hasło: $VPS_PASSWORD)" -ForegroundColor Yellow
Write-Host ""

# Run SSH
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "bash -s" < $tempScript

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Sprawdzanie zakończone" -ForegroundColor Green
