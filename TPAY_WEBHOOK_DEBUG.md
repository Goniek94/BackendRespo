# 🔍 Debugowanie Webhooka Tpay - Dlaczego nie dociera?

**Problem:** Płatność przechodzi, ale webhook nie dociera do backendu

---

## ✅ Co już wiemy:

1. **Endpoint działa** - test lokalny zwraca 200 OK i "TRUE"
2. **URL w panelu Tpay** - zmieniony na `https://api.autosell.pl/api/transactions/webhook/tpay`
3. **Backend nasłuchuje** - routing jest poprawny
4. **Płatność przechodzi** - Tpay przyjmuje płatność

## ❌ Co nie działa:

- **Tpay nie wysyła webhooka** do naszego backendu
- Transakcja pozostaje w statusie PENDING
- Ogłoszenie nie jest aktywowane

---

## 🔍 Możliwe przyczyny:

### 1. **Webhook nie jest włączony w panelu Tpay**

**Sprawdź w panelu Tpay:**

- Ustawienia → Powiadomienia
- Czy jest zaznaczone "Włącz powiadomienia" lub "Enable notifications"?
- Czy jest zaznaczone "Wysyłaj powiadomienia o płatnościach"?

### 2. **Tpay wymaga weryfikacji SSL**

**Sprawdź:**

- Czy certyfikat SSL dla `api.autosell.pl` jest ważny?
- Czy Tpay może zweryfikować certyfikat?

**Test:**

```bash
curl -v https://api.autosell.pl/api/transactions/webhook/tpay
```

Szukaj w output:

- `SSL certificate verify ok` ✅
- `SSL certificate problem` ❌

### 3. **Firewall blokuje IP Tpay**

**IP Tpay które muszą mieć dostęp:**

- `195.149.229.109`
- `148.251.96.163`
- `178.32.201.77`
- `46.248.167.59`
- `46.29.19.106`

**Sprawdź na VPS:**

```bash
ssh root@185.25.151.239
# Sprawdź firewall
iptables -L -n | grep 195.149.229.109
# Lub
ufw status
```

### 4. **Nginx blokuje POST do /api/transactions/webhook/tpay**

**Sprawdź konfigurację nginx:**

```bash
ssh root@185.25.151.239
cat /etc/nginx/sites-available/default | grep -A 20 "api.autosell.pl"
```

Szukaj:

- Czy jest `location /api/` z `proxy_pass`?
- Czy nie ma `deny all` dla tego endpointu?

### 5. **Tpay wysyła webhook na stary URL**

**Możliwe że:**

- Zmiana URL w panelu nie została zapisana
- Tpay cache'uje stary URL
- Trzeba poczekać kilka minut na propagację

---

## 🧪 Kroki debugowania:

### Krok 1: Sprawdź historię webhooków w panelu Tpay

1. Zaloguj się do panelu Tpay
2. Znajdź sekcję **"Historia powiadomień"** lub **"Webhook logs"**
3. Sprawdź czy Tpay próbował wysłać webhook
4. Jeśli tak - jaki był status? (200, 404, 500, timeout?)

### Krok 2: Sprawdź logi nginx na VPS

```bash
ssh root@185.25.151.239
# Logi dostępu
tail -f /var/log/nginx/access.log | grep webhook

# Logi błędów
tail -f /var/log/nginx/error.log
```

Wykonaj testową płatność i obserwuj logi w czasie rzeczywistym.

### Krok 3: Sprawdź logi PM2

```bash
ssh root@185.25.151.239
pm2 logs marketplace-backend --lines 200 | grep -i webhook
```

### Krok 4: Test z zewnętrznego serwera

Użyj zewnętrznego serwisu do testowania webhooka:

- https://webhook.site/
- https://requestbin.com/

1. Stwórz tymczasowy URL
2. Wpisz go w panelu Tpay jako webhook URL
3. Wykonaj testową płatność
4. Sprawdź czy webhook dotarł do zewnętrznego serwisu

Jeśli TAK - problem jest w naszym backendzie/VPS
Jeśli NIE - problem jest w konfiguracji Tpay

---

## 🔧 Rozwiązania:

### Rozwiązanie 1: Włącz powiadomienia w panelu Tpay

W panelu Tpay:

1. Ustawienia → Powiadomienia
2. Zaznacz "Włącz powiadomienia"
3. Zaznacz "Powiadomienia o płatnościach"
4. Zapisz

### Rozwiązanie 2: Dodaj IP Tpay do whitelisty

```bash
ssh root@185.25.151.239

# Jeśli używasz ufw
sudo ufw allow from 195.149.229.109
sudo ufw allow from 148.251.96.163
sudo ufw allow from 178.32.201.77
sudo ufw allow from 46.248.167.59
sudo ufw allow from 46.29.19.106

# Jeśli używasz iptables
iptables -A INPUT -s 195.149.229.109 -j ACCEPT
iptables -A INPUT -s 148.251.96.163 -j ACCEPT
# itd...
```

### Rozwiązanie 3: Sprawdź konfigurację nginx

Upewnij się że nginx przekazuje requesty do backendu:

```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Rozwiązanie 4: Użyj alternatywnego endpointu

Jeśli webhook nie działa, możemy użyć **return URL** do aktywacji:

W `transactionController.js` metoda `handlePaymentReturn` już obsługuje to:

- Sprawdza status płatności
- Jeśli `tr_status === 'TRUE'` - aktywuje ogłoszenie
- Działa jako backup dla webhooka

---

## 📞 Kontakt do Tpay

Jeśli nic nie pomaga, skontaktuj się z Tpay:

**Email:** bok@tpay.com  
**Telefon:** +48 22 101 02 80

**Powiedz im:**

- "Webhook nie dociera do mojego serwera"
- "URL: https://api.autosell.pl/api/transactions/webhook/tpay"
- "Proszę o sprawdzenie czy są próby wysyłki i jakie błędy"
- "Merchant ID: 185476"

---

## 🎯 Następne kroki:

1. ☐ Sprawdź historię webhooków w panelu Tpay
2. ☐ Sprawdź czy powiadomienia są włączone
3. ☐ Sprawdź logi nginx na VPS
4. ☐ Przetestuj z webhook.site
5. ☐ Skontaktuj się z Tpay jeśli problem persystuje

---

## 💡 Tymczasowe rozwiązanie:

Jeśli webhook nie działa, możemy użyć **polling** - frontend będzie odpytywał backend co 2 sekundy przez minutę (już zaimplementowane w PaymentReturnPage).

Ale to nie jest idealne rozwiązanie - webhook powinien działać!
