@echo off
echo.
echo ========================================
echo   RESTART SERWERA - DEVELOPMENT MINIMAL
echo   HTTP 431 FIX - Marketplace Backend
echo ========================================
echo.

echo 🔄 Zatrzymywanie istniejacych procesow Node.js...
taskkill /f /im node.exe >nul 2>&1

echo ⏳ Czekanie 3 sekundy...
timeout /t 3 /nobreak >nul

echo 🔧 Ustawianie NODE_ENV na development...
set NODE_ENV=development

echo 🚀 Uruchamianie serwera z minimalnymi naglowkami...
echo.
echo 📋 Zmiany wprowadzone:
echo    ✅ NODE_ENV=development (minimalna konfiguracja)
echo    ✅ Wylaczony helmet (CSP)
echo    ✅ Minimalna konfiguracja development
echo    ✅ Naprawione duplikowane cookies
echo    ✅ Zoptymalizowane tokeny JWT
echo.
echo 🌐 Serwer bedzie dostepny na: http://localhost:5000
echo 🔐 Panel admin: http://localhost:3000/admin
echo.

npm start
