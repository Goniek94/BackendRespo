# Script to restore original color from #36af4d back to #35530A
$frontendPath = "../Programowanie i projekty/marketplace-frontend/Repotest/src"

Write-Host "Restoring original colors in frontend project..." -ForegroundColor Green
Write-Host "New color: #36af4d -> Original color: #35530A" -ForegroundColor Yellow
Write-Host "New gradient: #4dc95f -> Original gradient: #4a6b0f" -ForegroundColor Yellow
Write-Host ""

$filesChanged = 0
$totalReplacements = 0

# Get all JS, JSX, CSS files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.js,*.jsx,*.css,*.scss

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Replace #36af4d back to #35530A (case insensitive)
    $content = $content -replace '#36af4d', '#35530A'
    $content = $content -replace '#36AF4D', '#35530A'
    
    # Replace #4dc95f back to #4a6b0f (case insensitive)
    $content = $content -replace '#4dc95f', '#4a6b0f'
    $content = $content -replace '#4DC95F', '#4a6b0f'
    
    # Replace #2b8c3e back to #2a4208 (darker shade)
    $content = $content -replace '#2b8c3e', '#2a4208'
    
    # Replace #5fd96f back to #5d8416 (lighter gradient)
    $content = $content -replace '#5fd96f', '#5d8416'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $filesChanged++
        $replacements = ([regex]::Matches($originalContent, '#36af4d|#4dc95f|#2b8c3e|#5fd96f')).Count
        $totalReplacements += $replacements
        Write-Host "[OK] Restored: $($file.Name) - $replacements replacements" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Original color restored!" -ForegroundColor Green
Write-Host "Files changed: $filesChanged" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Original color scheme restored:" -ForegroundColor Magenta
Write-Host "  Primary: #35530A (dark green)" -ForegroundColor DarkGreen
Write-Host "  Gradient: #4a6b0f (medium green)" -ForegroundColor Green
Write-Host "  Dark: #2a4208" -ForegroundColor DarkGreen
Write-Host "  Light: #5d8416" -ForegroundColor Green
