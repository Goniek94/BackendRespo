# Script to remove BOM (Byte Order Mark) from files
$frontendPath = "../Programowanie i projekty/marketplace-frontend/Repotest/src"

Write-Host "Removing BOM from files..." -ForegroundColor Green
Write-Host ""

$filesFixed = 0

# Get all JS, JSX files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.js,*.jsx

foreach ($file in $files) {
    # Read file as bytes
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    
    # Check if file starts with UTF-8 BOM (EF BB BF)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        # Remove BOM (skip first 3 bytes)
        $contentWithoutBOM = $bytes[3..($bytes.Length-1)]
        
        # Write back without BOM
        [System.IO.File]::WriteAllBytes($file.FullName, $contentWithoutBOM)
        
        $filesFixed++
        Write-Host "[OK] Fixed: $($file.Name)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "BOM removal completed!" -ForegroundColor Green
Write-Host "Files fixed: $filesFixed" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
