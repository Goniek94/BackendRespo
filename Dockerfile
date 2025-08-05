# DOCKERFILE FOR MARKETPLACE BACKEND
# 
# Multi-stage build dla optymalizacji rozmiaru obrazu
# Bazuje na oficjalnym obrazie Node.js Alpine dla bezpieczeństwa i rozmiaru

# ==================== STAGE 1: BUILD ====================
FROM node:18-alpine AS builder

# Metadane obrazu
LABEL maintainer="Marketplace Team"
LABEL version="1.0.0"
LABEL description="Backend aplikacji Marketplace"

# Instalacja zależności systemowych potrzebnych do budowania
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Utworzenie użytkownika aplikacji (bezpieczeństwo)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S marketplace -u 1001

# Ustawienie katalogu roboczego
WORKDIR /app

# Kopiowanie plików package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności produkcyjnych
RUN npm ci --only=production && npm cache clean --force

# ==================== STAGE 2: PRODUCTION ====================
FROM node:18-alpine AS production

# Instalacja tylko niezbędnych zależności systemowych
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    dumb-init

# Utworzenie użytkownika aplikacji
RUN addgroup -g 1001 -S nodejs && \
    adduser -S marketplace -u 1001

# Ustawienie katalogu roboczego
WORKDIR /app

# Kopiowanie zależności z etapu budowania
COPY --from=builder --chown=marketplace:nodejs /app/node_modules ./node_modules

# Kopiowanie kodu aplikacji
COPY --chown=marketplace:nodejs . .

# Utworzenie niezbędnych katalogów z odpowiednimi uprawnieniami
RUN mkdir -p uploads logs backups && \
    chown -R marketplace:nodejs uploads logs backups && \
    chmod 755 uploads logs backups

# Utworzenie katalogów dla różnych typów uploadów
RUN mkdir -p uploads/attachments uploads/comments && \
    chown -R marketplace:nodejs uploads/attachments uploads/comments && \
    chmod 755 uploads/attachments uploads/comments

# Ustawienie zmiennych środowiskowych
ENV NODE_ENV=production
ENV PORT=5000
ENV NODE_OPTIONS="--max-http-header-size=32768"

# Ekspozycja portu
EXPOSE 5000

# Przełączenie na użytkownika aplikacji (bezpieczeństwo)
USER marketplace

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: process.env.PORT || 5000, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) process.exit(0); \
        else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Uruchomienie aplikacji z dumb-init dla prawidłowego zarządzania sygnałami
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]

# ==================== DEVELOPMENT STAGE (opcjonalny) ====================
FROM node:18-alpine AS development

# Instalacja wszystkich zależności systemowych
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    git

# Utworzenie użytkownika
RUN addgroup -g 1001 -S nodejs && \
    adduser -S marketplace -u 1001

WORKDIR /app

# Kopiowanie package files
COPY package*.json ./

# Instalacja wszystkich zależności (włącznie z devDependencies)
RUN npm ci && npm cache clean --force

# Kopiowanie kodu
COPY --chown=marketplace:nodejs . .

# Utworzenie katalogów
RUN mkdir -p uploads logs backups tests/reports && \
    chown -R marketplace:nodejs uploads logs backups tests && \
    chmod 755 uploads logs backups tests

# Zmienne środowiskowe dla development
ENV NODE_ENV=development
ENV PORT=5000

EXPOSE 5000

USER marketplace

# Komenda dla development (z nodemon jeśli jest zainstalowany)
CMD ["npm", "run", "dev"]

# ==================== INSTRUKCJE UŻYCIA ====================
# 
# Budowanie obrazu produkcyjnego:
# docker build --target production -t marketplace-backend:latest .
# 
# Budowanie obrazu development:
# docker build --target development -t marketplace-backend:dev .
# 
# Uruchomienie kontenera produkcyjnego:
# docker run -d \
#   --name marketplace-backend \
#   -p 5000:5000 \
#   -e MONGODB_URI="your-mongodb-uri" \
#   -e JWT_SECRET="your-jwt-secret" \
#   -e FRONTEND_URL="https://your-frontend-domain.com" \
#   -v marketplace-uploads:/app/uploads \
#   -v marketplace-logs:/app/logs \
#   marketplace-backend:latest
# 
# Uruchomienie z docker-compose:
# Utwórz plik docker-compose.yml w katalogu głównym
# 
# Monitoring logów:
# docker logs -f marketplace-backend
# 
# Wejście do kontenera (debugging):
# docker exec -it marketplace-backend sh
