@echo off
echo Restartowanie frontendu z proxy...
cd ../marketplace-frontend
echo Zatrzymywanie istniejacego procesu...
taskkill /f /im node.exe 2>nul
timeout /t 2
echo Uruchamianie frontendu z proxy...
start cmd /k "npm start"
echo Frontend zostanie uruchomiony w nowym oknie z proxy na port 5000
pause
