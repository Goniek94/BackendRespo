# Script to change color from #35530A to #36af4d and #4a6b0f to #4dc95f
$frontendPath = "../Programowanie i projekty/marketplace-frontend/Repotest/src"

Write-Host "Changing colors in frontend project..." -ForegroundColor Green
Write-Host "Old color: #35530A -> New color: #36af4d" -ForegroundColor Yellow
Write-Host "Old gradient: #4a6b0f -> New gradient: #4dc95f" -ForegroundColor Yellow
Write-Host ""

$filesChanged = 0
$totalReplacements = 0

# Get all JS, JSX, CSS files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.js,*.jsx,*.css,*.scss

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Replace #35530A with #36af4d (case insensitive)
    $content = $content -replace '#35530A', '#36af4d'
    $content = $content -replace '#35530a', '#36af4d'
    
    # Replace #4a6b0f with #4dc95f (case insensitive)
    $content = $content -replace '#4a6b0f', '#4dc95f'
    $content = $content -replace '#4a6b0F', '#4dc95f'
    
    # Replace #2a4208 (darker shade) with #2b8c3e
    $content = $content -replace '#2a4208', '#2b8c3e'
    
    # Replace #5d8416 with #5fd96f (lighter gradient)
    $content = $content -replace '#5d8416', '#5fd96f'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $filesChanged++
        $replacements = ([regex]::Matches($originalContent, '#35530A|#4a6b0f|#2a4208|#5d8416')).Count
        $totalReplacements += $replacements
        Write-Host "[OK] Updated: $($file.Name) - $replacements replacements" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Color change completed!" -ForegroundColor Green
Write-Host "Files changed: $filesChanged" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "New color scheme:" -ForegroundColor Magenta
Write-Host "  Primary: #36af4d (bright green)" -ForegroundColor Green
Write-Host "  Gradient: #4dc95f (lighter green)" -ForegroundColor Green
Write-Host "  Dark: #2b8c3e" -ForegroundColor DarkGreen
Write-Host "  Light: #5fd96f" -ForegroundColor Green
