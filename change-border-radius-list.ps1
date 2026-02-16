# Script to change rounded-sm to rounded-[6px] in list view

$basePath = "..\Programowanie i projekty\marketplace-frontend\Repotest\src\components"

$file = "$basePath\ListingsView\display\list\ListingListItem.js"

if (Test-Path $file) {
    Write-Host "Processing: $file"
    $content = Get-Content $file -Raw -Encoding UTF8
    $newContent = $content -replace 'rounded-sm', 'rounded-[6px]'
    Set-Content -Path $file -Value $newContent -NoNewline -Encoding UTF8
    Write-Host "  Changed rounded-sm to rounded-[6px]"
} else {
    Write-Host "  File not found: $file"
}

Write-Host ""
Write-Host "Done! Changed border-radius in list view."
