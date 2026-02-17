# 🔒 RAPORT BEZPIECZEŃSTWA VPS - AutoSell Marketplace

**Data audytu:** 16 lutego 2026, 16:46  
**Serwer:** 185.25.151.239 (vps33421214)  
**System:** AlmaLinux 8.10 (Cerulean Leopard)  
**Audytor:** Automatyczna analiza bezpieczeństwa

---

## 📊 PODSUMOWANIE WYKONAWCZE

### ✅ MOCNE STRONY (Co działa dobrze)

1. **Firewall aktywny** - firewalld działa i jest skonfigurowany
2. **Fail2ban aktywny** - 31,226 zbanowanych IP, 8 obecnie zablokowanych
3. **Nginx działa poprawnie** - reverse proxy skonfigurowany
4. **SSL dla API** - Certyfikat api.autosell.pl ważny do 13.05.2026 (85 dni)
5. **Backend zaktualizowany** - Najnowsza wersja z repozytorium (commit 1871bcf)
6. **Backup utworzony** - BackendRespo*backup* z 16.02.2026

### ⚠️ KRYTYCZNE PROBLEMY (Wymagają natychmiastowej uwagi)

#### 🔴 PRIORYTET 1 - KRYTYCZNE

1. **Certyfikat SSL wygasł dla autosell.pl**
   - Status: EXPIRED (wygasł 13.11.2025)
   - Wpływ: Użytkownicy widzą ostrzeżenie o niezabezpieczonym połączeniu
   - Akcja: Odnowienie w trakcie (certbot renew uruchomiony)

2. **Port 5000 otwarty publicznie**
   - Backend Node.js nasłuchuje na `:::5000` (wszystkie interfejsy)
   - Powinien nasłuchiwać tylko na `127.0.0.1:5000`
   - Ryzyko: Bezpośredni dostęp do backendu z pominięciem nginx

3. **Plik .env ma zbyt szerokie uprawnienia**
   - Aktualne: `-rw-r--r--` (644) - readable by all users
   - Powinno być: `-rw-------` (600) - tylko root
   - Ryzyko: Inne procesy mogą odczytać sekrety (JWT, API keys, hasła DB)

#### 🟠 PRIORYTET 2 - WYSOKIE RYZYKO

4. **SSH: PermitRootLogin = yes**
   - Umożliwia bezpośrednie logowanie jako root
   - Powinno być: `PermitRootLogin no` lub `PermitRootLogin prohibit-password`
   - Ryzyko: Ataki brute-force na konto root (213,177 prób!)

5. **SSH: PasswordAuthentication = yes**
   - Umożliwia logowanie hasłem zamiast kluczy SSH
   - Powinno być: `PasswordAuthentication no` (tylko klucze SSH)
   - Ryzyko: Słabe hasła mogą być złamane

#### 🟡 PRIORYTET 3 - ŚREDNIE RYZYKO

6. **Dostępne aktualizacje systemu**
   - Wykryto aktualizacje dla: NetworkManager, bash, bind-libs, etc.
   - Rekomendacja: Regularne aktualizacje bezpieczeństwa

7. **Node.js v18.20.8**
   - Ostrzeżenia o niekompatybilnych pakietach (wymagają Node 20+)
   - Pakiety: axios-cookiejar-support, http-cookie-agent
   - Rekomendacja: Aktualizacja do Node.js 20 LTS

---

## 🔍 SZCZEGÓŁOWA ANALIZA

### 1. FIREWALL (firewalld)

```
Status: ✅ AKTYWNY
Otwarte porty:
- 22 (SSH) - zabezpieczony fail2ban
- 80 (HTTP) - przekierowanie na HTTPS
- 443 (HTTPS) - nginx
- cockpit, dhcpv6-client

Zablokowane IP (8):
- 189.89.20.45, 2.57.121.25, 92.205.56.196
- 103.124.92.110, 80.94.92.186, 91.202.233.33
- 176.120.22.13, 2.57.122.210
```

**Ocena:** ✅ Dobrze skonfigurowany

---

### 2. FAIL2BAN

```
Status: ✅ AKTYWNY (działa od 05.11.2025)
Jail: sshd
- Obecnie nieudane próby: 2
- Całkowite nieudane próby: 213,177
- Obecnie zbanowane IP: 8
- Całkowicie zbanowane IP: 31,226
```

**Ocena:** ✅ Działa doskonale - chroni przed atakami brute-force

---

### 3. NGINX

```
Status: ✅ AKTYWNY
Konfiguracja:
- Reverse proxy dla api.autosell.pl → localhost:5000
- Przekierowanie HTTP → HTTPS
- WebSocket support (Socket.IO)
- Kompatybilność ze starymi ścieżkami API
```

**Ocena:** ✅ Poprawnie skonfigurowany

---

### 4. CERTYFIKATY SSL

```
api.autosell.pl:
  ✅ WAŻNY do 2026-05-13 (85 dni)
  Ścieżka: /etc/letsencrypt/live/api.autosell.pl/

autosell.pl:
  ❌ WYGASŁ 2025-11-13 (94 dni temu!)
  Ścieżka: /etc/letsencrypt/live/autosell.pl/
  Akcja: Odnowienie w trakcie
```

**Ocena:** ⚠️ Wymaga natychmiastowego odnowienia

---

### 5. SSH CONFIGURATION

```
PermitRootLogin: yes ❌
PasswordAuthentication: yes ❌
Port: 22 (domyślny)
PubkeyAuthentication: (prawdopodobnie yes)
```

**Ocena:** ⚠️ Wymaga zaostrzenia polityki

---

### 6. UPRAWNIENIA PLIKÓW

```
/root/BackendRespo/.env: -rw-r--r-- (644) ❌
Zawiera:
- JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET
- MONGODB_URI (z hasłem)
- TPAY_SECRET, TPAY_SECURITY_CODE
- GOOGLE_CLIENT_SECRET
- SMSAPI_TOKEN
- RESEND_API_KEY
```

**Ocena:** ⚠️ KRYTYCZNE - sekrety dostępne dla wszystkich użytkowników

---

### 7. OTWARTE PORTY

```
22   - SSH (zabezpieczony)
80   - HTTP → HTTPS redirect
443  - HTTPS (nginx)
5000 - Node.js Backend ❌ PUBLICZNIE DOSTĘPNY
```

**Ocena:** ⚠️ Port 5000 nie powinien być dostępny publicznie

---

### 8. BACKEND APPLICATION

```
Status: ✅ ONLINE (PM2)
Wersja: 1871bcf (Production ready: Fixed loops, added deployment script)
Uptime: ~1 minuta (po restarcie)
Memory: 125.4 MB
Restarts: 4
Environment: production
```

**Ocena:** ✅ Działa poprawnie

---

## 🛠️ REKOMENDACJE NAPRAWCZE

### NATYCHMIASTOWE (Do wykonania dziś)

#### 1. Napraw uprawnienia pliku .env

```bash
ssh root@185.25.151.239
chmod 600 /root/BackendRespo/.env
ls -la /root/BackendRespo/.env  # Weryfikacja
```

#### 2. Zablokuj port 5000 w firewall

```bash
# Backend powinien nasłuchiwać tylko na localhost
# Sprawdź czy firewall blokuje port 5000
firewall-cmd --list-all
# Jeśli port 5000 jest otwarty, usuń go
firewall-cmd --permanent --remove-port=5000/tcp
firewall-cmd --reload
```

#### 3. Skonfiguruj backend do nasłuchiwania tylko na localhost

W pliku `/root/BackendRespo/.env` upewnij się:

```
HOST=127.0.0.1  # NIE 0.0.0.0
PORT=5000
```

Następnie restart: `pm2 restart marketplace-backend`

#### 4. Poczekaj na odnowienie certyfikatu SSL

Proces `certbot renew` jest w trakcie. Po zakończeniu:

```bash
systemctl reload nginx
certbot certificates  # Weryfikacja
```

---

### KRÓTKOTERMINOWE (W ciągu tygodnia)

#### 5. Zaostrzenie konfiguracji SSH

```bash
# Edytuj /etc/ssh/sshd_config
nano /etc/ssh/sshd_config

# Zmień:
PermitRootLogin no  # lub prohibit-password
PasswordAuthentication no  # tylko klucze SSH

# Restart SSH
systemctl restart sshd
```

⚠️ **UWAGA:** Przed wyłączeniem PasswordAuthentication upewnij się, że masz skonfigurowane klucze SSH!

#### 6. Aktualizacja systemu

```bash
yum update -y
reboot  # Jeśli zaktualizowano kernel
```

---

### DŁUGOTERMINOWE (W ciągu miesiąca)

#### 7. Aktualizacja Node.js do v20 LTS

```bash
# Zainstaluj Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Weryfikacja
node --version  # Powinno być v20.x

# Reinstalacja zależności
cd /root/BackendRespo
npm install --production
pm2 restart marketplace-backend
```

#### 8. Automatyczne odnowienie certyfikatów

```bash
# Sprawdź czy cron job istnieje
systemctl status certbot-renew.timer

# Jeśli nie, dodaj:
crontab -e
# Dodaj linię:
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

#### 9. Monitoring i alerty

Rozważ instalację:

- **Monit** - monitoring procesów
- **Logwatch** - analiza logów
- **OSSEC** - wykrywanie intruzów

#### 10. Backup automatyczny

```bash
# Skrypt backup w cron
0 2 * * * /usr/local/bin/backup-backend.sh
```

---

## 📈 OCENA OGÓLNA

### Poziom bezpieczeństwa: 🟡 ŚREDNI (6/10)

**Pozytywne:**

- ✅ Podstawowe zabezpieczenia działają (firewall, fail2ban)
- ✅ SSL dla API
- ✅ Nginx poprawnie skonfigurowany
- ✅ Backend zaktualizowany

**Negatywne:**

- ❌ Wygasły certyfikat SSL (główna strona)
- ❌ Zbyt szerokie uprawnienia .env
- ❌ Port 5000 otwarty publicznie
- ❌ Słaba konfiguracja SSH

---

## ✅ CHECKLIST PRODUKCYJNY

- [x] Firewall aktywny
- [x] Fail2ban aktywny
- [x] Nginx działa
- [ ] **SSL ważny dla wszystkich domen** ⚠️
- [ ] **Uprawnienia .env: 600** ⚠️
- [ ] **Port 5000 zamknięty publicznie** ⚠️
- [ ] **SSH: PermitRootLogin no** ⚠️
- [ ] **SSH: PasswordAuthentication no** ⚠️
- [x] Backend zaktualizowany
- [x] Backup utworzony
- [ ] Aktualizacje systemu zainstalowane
- [ ] Node.js 20 LTS
- [ ] Automatyczne odnowienie SSL
- [ ] Monitoring skonfigurowany

**Status produkcyjny:** 🟡 CZĘŚCIOWO GOTOWY  
**Wymaga naprawy:** 6 krytycznych problemów

---

## 📞 NASTĘPNE KROKI

1. ✅ **WYKONANE:** Deployment backendu
2. ⏳ **W TRAKCIE:** Odnowienie certyfikatu SSL
3. 🔴 **PILNE:** Naprawa uprawnień .env (5 min)
4. 🔴 **PILNE:** Zamknięcie portu 5000 (10 min)
5. 🟠 **WAŻNE:** Zaostrzenie SSH (30 min)
6. 🟡 **PLANOWANE:** Aktualizacja systemu (1h)
7. 🟡 **PLANOWANE:** Aktualizacja Node.js (1h)

---

**Raport wygenerowany automatycznie**  
**Ostatnia aktualizacja:** 2026-02-16 16:46:00 CET
