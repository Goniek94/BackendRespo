# 🔧 Konfiguracja Webhooka z ngrok (Testy Lokalne)

## Problem

Tpay wymaga publicznego URL do webhooka, ale Twój backend działa lokalnie na `localhost:5000`.

## Rozwiązanie: ngrok

### Krok 1: Zainstaluj ngrok

```bash
# Pobierz z https://ngrok.com/download
# Lub zainstaluj przez npm:
npm install -g ngrok
```

### Krok 2: Uruchom backend lokalnie

```bash
cd C:\Users\Mateu\Desktop\Marketplace-Backend
npm start
```

### Krok 3: Uruchom ngrok

```bash
ngrok http 5000
```

Zobaczysz coś takiego:

```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

### Krok 4: Skopiuj URL ngrok

Skopiuj URL (np. `https://abc123.ngrok.io`)

### Krok 5: Ustaw w panelu Tpay

W panelu Tpay ustaw:

```
https://abc123.ngrok.io/api/transactions/webhook/tpay
```

### Krok 6: Zapisz

Kliknij "WYSŁANO" - teraz powinno zadziałać!

---

## ⚠️ WAŻNE

- ngrok URL zmienia się przy każdym uruchomieniu (wersja darmowa)
- Musisz aktualizować URL w panelu Tpay za każdym razem
- To rozwiązanie TYLKO do testów lokalnych
- W produkcji użyj prawdziwego URL: `https://api.autosell.pl/api/transactions/webhook/tpay`

---

## Opcja 2: Wdróż na serwer produkcyjny

Jeśli masz już serwer:

1. Wdróż backend na `https://api.autosell.pl`
2. Upewnij się, że SSL działa
3. Użyj URL: `https://api.autosell.pl/api/transactions/webhook/tpay`

---

## Testowanie

Po ustawieniu webhooka:

1. Wykonaj testową płatność
2. Sprawdź logi backendu:

   ```bash
   # Jeśli używasz ngrok
   npm start

   # Szukaj w logach:
   🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY
   ```

Powodzenia! 🚀
