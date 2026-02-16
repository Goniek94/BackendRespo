# Script to change color from #35530A to #2E7D32 (Material Design Green)
$frontendPath = "../Programowanie i projekty/marketplace-frontend/Repotest/src"

Write-Host "Changing colors to Material Design Green (#2E7D32)..." -ForegroundColor Green
Write-Host "Old color: #35530A -> New color: #2E7D32" -ForegroundColor Yellow
Write-Host ""

$filesChanged = 0
$totalReplacements = 0

# Get all JS, JSX, CSS files
$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.js,*.jsx,*.css,*.scss

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Replace #35530A with #2E7D32 (case insensitive)
        $content = $content -replace '#35530A', '#2E7D32'
        $content = $content -replace '#35530a', '#2E7D32'
        
        # Replace #4a6b0f with #43A047 (lighter Material Green)
        $content = $content -replace '#4a6b0f', '#43A047'
        $content = $content -replace '#4a6b0F', '#43A047'
        
        # Replace #2a4208 (darker shade) with #1B5E20 (Material Green 900)
        $content = $content -replace '#2a4208', '#1B5E20'
        
        # Replace #5d8416 with #66BB6A (Material Green 400)
        $content = $content -replace '#5d8416', '#66BB6A'
        
        if ($content -ne $originalContent) {
            # Write without BOM
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
            
            $filesChanged++
            $replacements = ([regex]::Matches($originalContent, '#35530A|#4a6b0f|#2a4208|#5d8416')).Count
            $totalReplacements += $replacements
            Write-Host "[OK] Updated: $($file.Name) - $replacements replacements" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "[ERROR] Failed to process: $($file.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Color change completed!" -ForegroundColor Green
Write-Host "Files changed: $filesChanged" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "New Material Design Green color scheme:" -ForegroundColor Magenta
Write-Host "  Primary: #2E7D32 (Material Green 800)" -ForegroundColor Green
Write-Host "  Light: #43A047 (Material Green 600)" -ForegroundColor Green
Write-Host "  Dark: #1B5E20 (Material Green 900)" -ForegroundColor DarkGreen
Write-Host "  Lighter: #66BB6A (Material Green 400)" -ForegroundColor Green
