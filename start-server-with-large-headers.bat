@echo off
echo 🚀 Starting server with increased header limits...
echo ================================================

REM Set Node.js options for larger headers
set NODE_OPTIONS=--max-http-header-size=65536

REM Start the server
echo 🔧 NODE_OPTIONS: %NODE_OPTIONS%
echo 📡 Starting server...
node index.js

pause
