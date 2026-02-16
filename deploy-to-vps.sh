#!/bin/bash

# ============================================================================
# SKRYPT WDROŻENIA NA VPS - AutoSell Marketplace Backend
# ============================================================================
# Użycie: ./deploy-to-vps.sh
# Wymaga: git, npm, pm2
# ============================================================================

set -e  # Zatrzymaj przy błędzie

echo "🚀 =========================================="
echo "🚀 WDROŻENIE BACKEND NA VPS"
echo "🚀 =========================================="

# Kolory dla outputu
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguracja
PROJECT_DIR="/var/www/Marketplace-Backend"
REPO_URL="https://github.com/Goniek94/BackendRespo.git"
BRANCH="main"

echo -e "${YELLOW}📁 Katalog projektu: ${PROJECT_DIR}${NC}"
echo -e "${YELLOW}🌿 Branch: ${BRANCH}${NC}"
echo ""

# Sprawdź czy katalog istnieje
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📦 Katalog nie istnieje, klonowanie repozytorium...${NC}"
    sudo mkdir -p /var/www
    cd /var/www
    sudo git clone $REPO_URL
    sudo chown -R $USER:$USER $PROJECT_DIR
    cd $PROJECT_DIR
else
    echo -e "${GREEN}✅ Katalog istnieje${NC}"
    cd $PROJECT_DIR
fi

# Pobierz najnowsze zmiany
echo -e "${YELLOW}📥 Pobieranie najnowszych zmian z GitHub...${NC}"
git fetch origin
git reset --hard origin/$BRANCH
git pull origin $BRANCH

echo -e "${GREEN}✅ Kod zaktualizowany${NC}"

# Instalacja zależności
echo -e "${YELLOW}📦 Instalacja zależności (npm install --production)...${NC}"
npm install --production

echo -e "${GREEN}✅ Zależności zainstalowane${NC}"

# Sprawdź czy .env istnieje
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ BŁĄD: Plik .env nie istnieje!${NC}"
    echo -e "${YELLOW}Utwórz plik .env z odpowiednimi zmiennymi środowiskowymi.${NC}"
    echo -e "${YELLOW}Możesz skopiować .env.example i dostosować wartości.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Plik .env istnieje${NC}"

# Sprawdź czy PM2 jest zainstalowany
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 PM2 nie jest zainstalowany, instaluję globalnie...${NC}"
    sudo npm install -g pm2
fi

echo -e "${GREEN}✅ PM2 zainstalowany${NC}"

# Restart aplikacji przez PM2
echo -e "${YELLOW}🔄 Restart aplikacji przez PM2...${NC}"

if pm2 list | grep -q "marketplace-backend"; then
    echo -e "${YELLOW}Aplikacja już działa, wykonuję restart...${NC}"
    pm2 restart marketplace-backend
else
    echo -e "${YELLOW}Pierwsz uruchomienie aplikacji...${NC}"
    pm2 start npm --name "marketplace-backend" -- start
    pm2 save
    pm2 startup
fi

echo -e "${GREEN}✅ Aplikacja zrestartowana${NC}"

# Pokaż status
echo ""
echo -e "${YELLOW}📊 Status aplikacji:${NC}"
pm2 status marketplace-backend

# Pokaż logi (ostatnie 20 linii)
echo ""
echo -e "${YELLOW}📋 Ostatnie logi:${NC}"
pm2 logs marketplace-backend --lines 20 --nostream

echo ""
echo -e "${GREEN}🎉 =========================================="
echo -e "${GREEN}🎉 WDROŻENIE ZAKOŃCZONE POMYŚLNIE!"
echo -e "${GREEN}🎉 ==========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Następne kroki:${NC}"
echo "1. Sprawdź logi: pm2 logs marketplace-backend"
echo "2. Sprawdź status: pm2 status"
echo "3. Sprawdź API: curl https://api.autosell.pl/api/health"
echo "4. Skonfiguruj webhook w panelu Tpay:"
echo "   https://api.autosell.pl/api/transactions/webhook/tpay"
echo ""
echo -e "${YELLOW}🔧 Przydatne komendy:${NC}"
echo "pm2 restart marketplace-backend  - Restart aplikacji"
echo "pm2 stop marketplace-backend     - Zatrzymaj aplikację"
echo "pm2 logs marketplace-backend     - Zobacz logi"
echo "pm2 monit                        - Monitor w czasie rzeczywistym"
echo ""
