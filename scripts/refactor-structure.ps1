# Skrypt refaktoryzacji struktury backendu na feature-based

Write-Host "🚀 Rozpoczynam refaktoryzację struktury backendu..." -ForegroundColor Green

# Przenoszenie funkcjonalności AUTH
Write-Host "📁 Przenoszenie funkcjonalności AUTH..." -ForegroundColor Yellow
Copy-Item -Path "controllers/user/passwordController.js" -Destination "features/auth/controllers/" -Force
Copy-Item -Path "controllers/user/verificationController.js" -Destination "features/auth/controllers/" -Force
Copy-Item -Path "controllers/user/validationController.js" -Destination "features/auth/controllers/" -Force
Copy-Item -Path "middleware/auth/auth.js" -Destination "features/auth/middleware/" -Force
Copy-Item -Path "models/security/*" -Destination "features/auth/models/" -Recurse -Force

# Przenoszenie funkcjonalności USERS
Write-Host "📁 Przenoszenie funkcjonalności USERS..." -ForegroundColor Yellow
Copy-Item -Path "controllers/user/profileController.js" -Destination "features/users/controllers/" -Force
Copy-Item -Path "controllers/user/settingsController.js" -Destination "features/users/controllers/" -Force
Copy-Item -Path "controllers/user/favoritesController.js" -Destination "features/users/controllers/" -Force
Copy-Item -Path "controllers/user/userController.js" -Destination "features/users/controllers/" -Force
Copy-Item -Path "routes/user/userRoutes.js" -Destination "features/users/routes/" -Force
Copy-Item -Path "models/user.js" -Destination "features/users/models/" -Force
Copy-Item -Path "models/user/*" -Destination "features/users/models/" -Recurse -Force

# Przenoszenie funkcjonalności ADMIN
Write-Host "📁 Przenoszenie funkcjonalności ADMIN..." -ForegroundColor Yellow
Copy-Item -Path "admin/controllers/*" -Destination "features/admin/controllers/" -Recurse -Force
Copy-Item -Path "admin/routes/*" -Destination "features/admin/routes/" -Recurse -Force
Copy-Item -Path "admin/middleware/*" -Destination "features/admin/middleware/" -Recurse -Force
Copy-Item -Path "admin/models/*" -Destination "features/admin/models/" -Recurse -Force
Copy-Item -Path "admin/services/*" -Destination "features/admin/services/" -Recurse -Force

# Przenoszenie funkcjonalności LISTINGS
Write-Host "📁 Przenoszenie funkcjonalności LISTINGS..." -ForegroundColor Yellow
Copy-Item -Path "controllers/listings/*" -Destination "features/listings/controllers/" -Recurse -Force
Copy-Item -Path "routes/listings/*" -Destination "features/listings/routes/" -Recurse -Force
Copy-Item -Path "models/ad.js" -Destination "features/listings/models/" -Force
Copy-Item -Path "models/comment.js" -Destination "features/listings/models/" -Force
Copy-Item -Path "models/listings/*" -Destination "features/listings/models/" -Recurse -Force

# Przenoszenie funkcjonalności COMMUNICATION
Write-Host "📁 Przenoszenie funkcjonalności COMMUNICATION..." -ForegroundColor Yellow
Copy-Item -Path "controllers/communication/*" -Destination "features/communication/controllers/" -Recurse -Force
Copy-Item -Path "routes/communication/*" -Destination "features/communication/routes/" -Recurse -Force
Copy-Item -Path "models/message.js" -Destination "features/communication/models/" -Force
Copy-Item -Path "models/communication/*" -Destination "features/communication/models/" -Recurse -Force

# Przenoszenie funkcjonalności NOTIFICATIONS
Write-Host "📁 Przenoszenie funkcjonalności NOTIFICATIONS..." -ForegroundColor Yellow
Copy-Item -Path "controllers/notifications/*" -Destination "features/notifications/controllers/" -Recurse -Force
Copy-Item -Path "routes/notifications/*" -Destination "features/notifications/routes/" -Recurse -Force
Copy-Item -Path "models/notification.js" -Destination "features/notifications/models/" -Force

# Przenoszenie funkcjonalności PAYMENTS
Write-Host "📁 Przenoszenie funkcjonalności PAYMENTS..." -ForegroundColor Yellow
Copy-Item -Path "controllers/payments/*" -Destination "features/payments/controllers/" -Recurse -Force
Copy-Item -Path "routes/payments/*" -Destination "features/payments/routes/" -Recurse -Force
Copy-Item -Path "models/payment.js" -Destination "features/payments/models/" -Force
Copy-Item -Path "models/Transaction.js" -Destination "features/payments/models/" -Force
Copy-Item -Path "models/TransactionHistory.js" -Destination "features/payments/models/" -Force
Copy-Item -Path "models/payments/*" -Destination "features/payments/models/" -Recurse -Force

# Przenoszenie funkcjonalności MEDIA
Write-Host "📁 Przenoszenie funkcjonalności MEDIA..." -ForegroundColor Yellow
Copy-Item -Path "controllers/media/*" -Destination "features/media/controllers/" -Recurse -Force
Copy-Item -Path "routes/media/*" -Destination "features/media/routes/" -Recurse -Force
Copy-Item -Path "middleware/imageProcessor.js" -Destination "features/media/middleware/" -Force

# Przenoszenie testów
Write-Host "📁 Przenoszenie testów..." -ForegroundColor Yellow
if (Test-Path "tests/notificationData.test.js") {
    Copy-Item -Path "tests/notificationData.test.js" -Destination "features/notifications/tests/" -Force
}

Write-Host "✅ Refaktoryzacja struktury zakończona!" -ForegroundColor Green
Write-Host "Nastepne kroki:" -ForegroundColor Cyan
Write-Host "   1. Aktualizacja importow w plikach" -ForegroundColor White
Write-Host "   2. Utworzenie plikow index.js dla kazdej funkcjonalnosci" -ForegroundColor White
Write-Host "   3. Aktualizacja glownego pliku index.js" -ForegroundColor White
