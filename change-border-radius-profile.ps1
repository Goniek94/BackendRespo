# Script to change rounded-sm to rounded-[6px] in profile listing cards

$basePath = "..\Programowanie i projekty\marketplace-frontend\Repotest\src\components\profil\listings"

$files = @(
    "$basePath\UserListingListItem.js",
    "$basePath\UserListingInfoCard.js",
    "$basePath\ListingCard.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw -Encoding UTF8
        $newContent = $content -replace 'rounded-sm', 'rounded-[6px]'
        Set-Content -Path $file -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "  Changed rounded-sm to rounded-[6px]"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host ""
Write-Host "Done! Changed border-radius in profile listing cards."
