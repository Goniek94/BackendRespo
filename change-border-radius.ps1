# Script to change rounded-xl to rounded-[6px] in listing cards

$basePath = "..\Programowanie i projekty\marketplace-frontend\Repotest\src\components"

$files = @(
    "$basePath\ListingsView\display\grid\ListingCard.js",
    "$basePath\FeaturedListings\SmallListingCard.js",
    "$basePath\listings\GridListingCard.js",
    "$basePath\listings\CardGridItem.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw -Encoding UTF8
        $newContent = $content -replace 'rounded-xl', 'rounded-[6px]'
        Set-Content -Path $file -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  Changed rounded-xl to rounded-[6px]"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host ""
Write-Host "Done! Changed border-radius in all listing cards."
