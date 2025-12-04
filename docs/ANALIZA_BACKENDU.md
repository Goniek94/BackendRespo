# 🔧 Szczegółowa Analiza Backend - AutoSell Marketplace

---

## 📌 Informacje Ogólne

| Parametr           | Wartość                        |
| ------------------ | ------------------------------ |
| **Nazwa projektu** | AutoSell - Marketplace Backend |
| **Typ aplikacji**  | REST API + WebSocket           |
| **Framework**      | Express.js                     |
| **Baza danych**    | MongoDB (Mongoose ODM)         |
| **Autoryzacja**    | JWT + HttpOnly Cookies         |
| **Real-time**      | Socket.IO                      |
| **Storage**        | Supabase (zdjęcia)             |

---

## 🛠️ Stack Technologiczny

### Główne Technologie

| Technologia    | Wersja | Do czego służy                                    |
| -------------- | ------ | ------------------------------------------------- |
| **Express.js** | 4.17.1 | Framework webowy do budowy REST API               |
| **Mongoose**   | 8.13.1 | ODM dla MongoDB - modelowanie danych              |
| **Socket.IO**  | 4.8.1  | Komunikacja real-time (wiadomości, powiadomienia) |
| **JWT**        | 9.0.2  | Tokeny autoryzacyjne                              |
| **Argon2**     | 0.41.1 | Bezpieczne hashowanie haseł                       |
| **Bcrypt.js**  | 2.4.3  | Alternatywne hashowanie haseł                     |

### Bezpieczeństwo

| Biblioteka                 | Do czego służy                                 |
| -------------------------- | ---------------------------------------------- |
| **Helmet**                 | Zabezpieczenia nagłówków HTTP (CSP, HSTS, XSS) |
| **express-rate-limit**     | Ograniczanie liczby zapytań (DDoS protection)  |
| **express-mongo-sanitize** | Ochrona przed NoSQL injection                  |
| **express-validator**      | Walidacja danych wejściowych                   |
| **Joi**                    | Zaawansowana walidacja schematów               |
| **DOMPurify**              | Sanityzacja HTML (XSS protection)              |
| **validator**              | Walidacja stringów (email, URL, etc.)          |
| **cors**                   | Kontrola Cross-Origin Resource Sharing         |

### Komunikacja

| Biblioteka     | Do czego służy                                |
| -------------- | --------------------------------------------- |
| **Nodemailer** | Wysyłanie emaili (weryfikacja, powiadomienia) |
| **Resend**     | Alternatywny serwis email                     |
| **Twilio**     | Wysyłanie SMS (weryfikacja telefonu)          |
| **Axios**      | Zapytania HTTP do zewnętrznych API            |

### Przetwarzanie

| Biblioteka | Do czego służy                        |
| ---------- | ------------------------------------- |
| **Sharp**  | Przetwarzanie i optymalizacja obrazów |
| **Multer** | Upload plików (multipart/form-data)   |
| **PDFKit** | Generowanie dokumentów PDF (faktury)  |
| **QRCode** | Generowanie kodów QR                  |

### Integracje Zewnętrzne

| Serwis          | Do czego służy                 |
| --------------- | ------------------------------ |
| **Supabase**    | Przechowywanie zdjęć w chmurze |
| **Google Auth** | Logowanie przez Google         |
| **Twilio**      | Weryfikacja SMS                |
| **CEPIK**       | Sprawdzanie historii pojazdów  |

### Narzędzia

| Narzędzie     | Do czego służy                          |
| ------------- | --------------------------------------- |
| **Winston**   | Logowanie (pliki, konsola)              |
| **node-cron** | Zadania cykliczne (cleanup, statystyki) |
| **uuid**      | Generowanie unikalnych identyfikatorów  |
| **speakeasy** | Dwuskładnikowe uwierzytelnianie (2FA)   |

---

## 📁 Struktura Katalogów

```
marketplace-backend/
├── admin/                  → Panel administracyjny
│   ├── controllers/        → Kontrolery admina
│   ├── middleware/         → Middleware admina
│   ├── models/             → Modele admina
│   ├── routes/             → Routing admina
│   ├── services/           → Serwisy admina
│   └── validators/         → Walidatory admina
│
├── config/                 → Konfiguracja
│   ├── index.js            → Główna konfiguracja
│   ├── adminConfig.js      → Konfiguracja admina
│   ├── cookieConfig.js     → Konfiguracja cookies
│   ├── nodemailer.js       → Konfiguracja email
│   ├── security.js         → Konfiguracja bezpieczeństwa
│   ├── twilio.js           → Konfiguracja SMS
│   └── environments/       → Konfiguracje środowiskowe
│
├── controllers/            → Kontrolery API
│   ├── communication/      → Wiadomości
│   ├── listings/           → Ogłoszenia
│   ├── media/              → Obrazy
│   ├── payments/           → Płatności
│   └── user/               → Użytkownicy
│
├── middleware/             → Middleware
│   ├── auth.js             → Autoryzacja JWT
│   ├── rateLimiting.js     → Rate limiting
│   ├── sanitization.js     → Sanityzacja danych
│   ├── headerManager.js    → Zarządzanie nagłówkami
│   └── errors/             → Obsługa błędów
│
├── models/                 → Modele MongoDB
│   ├── user/               → Użytkownicy
│   ├── listings/           → Ogłoszenia
│   ├── communication/      → Wiadomości
│   ├── payments/           → Transakcje
│   ├── security/           → Bezpieczeństwo
│   └── verification/       → Weryfikacja
│
├── routes/                 → Routing API
│   ├── user/               → Trasy użytkowników
│   ├── listings/           → Trasy ogłoszeń
│   ├── communication/      → Trasy wiadomości
│   ├── payments/           → Trasy płatności
│   ├── notifications/      → Trasy powiadomień
│   ├── media/              → Trasy mediów
│   └── external/           → Trasy zewnętrzne (CEPIK)
│
├── services/               → Serwisy
│   ├── emailService.js     → Wysyłanie emaili
│   ├── notificationManager.js → Zarządzanie powiadomieniami
│   ├── socketService.js    → WebSocket
│   └── storage/            → Przechowywanie plików
│
├── utils/                  → Narzędzia
│   ├── logger.js           → Logowanie
│   ├── asyncHandler.js     → Obsługa async/await
│   ├── securityTokens.js   → Generowanie tokenów
│   └── scheduledTasks.js   → Zadania cykliczne
│
├── validationSchemas/      → Schematy walidacji
│   ├── adValidation.js     → Walidacja ogłoszeń
│   ├── userValidation.js   → Walidacja użytkowników
│   └── registrationValidation.js → Walidacja rejestracji
│
├── app.js                  → Konfiguracja Express
├── index.js                → Entry point (serwer)
└── package.json            → Zależności
```

---

## 🔐 System Bezpieczeństwa - Szczegółowa Analiza

### 📊 Poziom Bezpieczeństwa: WYSOKI (Enterprise-Grade)

System wykorzystuje wielowarstwowe zabezpieczenia stosowane w bankach i dużych platformach e-commerce.

---

### 1. 🔑 Autoryzacja JWT z HttpOnly Cookies

**Plik:** `middleware/auth.js`, `config/cookieConfig.js`

**Co to jest:**
System autoryzacji oparty na tokenach JWT (JSON Web Token) przechowywanych w bezpiecznych cookies.

**Jak działa:**

1. Użytkownik loguje się (email + hasło)
2. Serwer generuje 2 tokeny:
   - **Access Token** (krótki czas życia: 15 min) - do autoryzacji zapytań
   - **Refresh Token** (długi czas życia: 7 dni) - do odświeżania sesji
3. Tokeny zapisywane w **HttpOnly cookies** (niedostępne z JavaScript)
4. Przy każdym zapytaniu cookies wysyłane automatycznie
5. Gdy Access Token wygaśnie, automatyczne odświeżenie przez Refresh Token

**Przed czym chroni:**

| Zagrożenie                                   | Jak chroni                                                   | Dlaczego ważne                                                       |
| -------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Kradzież tokena przez XSS**                | HttpOnly cookies - JavaScript nie ma dostępu do tokenów      | Nawet jeśli haker wstrzyknie złośliwy skrypt, nie może ukraść tokena |
| **Przechwycenie tokena (Man-in-the-Middle)** | Secure: true - tokeny wysyłane tylko przez HTTPS             | Szyfrowane połączenie uniemożliwia podsłuchanie                      |
| **Atak CSRF**                                | SameSite: Strict - cookies wysyłane tylko z tej samej domeny | Złośliwa strona nie może wykonać zapytania w imieniu użytkownika     |
| **Długotrwałe sesje**                        | Krótki czas życia Access Token (15 min)                      | Nawet jeśli token wycieknie, szybko wygaśnie                         |

**Dlaczego to ważne dla klienta:**

- ✅ Dane użytkowników są bezpieczne nawet przy atakach XSS
- ✅ Sesje automatycznie wygasają, zmniejszając ryzyko nieautoryzowanego dostępu
- ✅ Standard stosowany przez banki i duże platformy

---

### 2. 🚫 Blacklista Tokenów

**Plik:** `models/security/TokenBlacklist.js`

**Co to jest:**
System unieważniania tokenów przed ich naturalnym wygaśnięciem.

**Jak działa:**

1. Przy wylogowaniu token trafia na blacklistę
2. Przy rotacji tokenów stary token jest unieważniany
3. Każde zapytanie sprawdza czy token nie jest na blackliście
4. Wygasłe tokeny automatycznie usuwane z blacklisty

**Przed czym chroni:**

| Zagrożenie                     | Jak chroni                                 | Dlaczego ważne                                                              |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| **Użycie skradzionego tokena** | Token na blackliście = odmowa dostępu      | Nawet jeśli haker zdobył token, nie może go użyć po wylogowaniu użytkownika |
| **Wielokrotne użycie tokena**  | Rotacja tokenów - stary token unieważniany | Każdy token może być użyty tylko raz do odświeżenia                         |
| **Sesje "zombie"**             | Automatyczne czyszczenie                   | Brak zalegających, potencjalnie niebezpiecznych tokenów                     |

**Dlaczego to ważne dla klienta:**

- ✅ Wylogowanie naprawdę kończy sesję (nie jak w wielu aplikacjach)
- ✅ Wykrycie podejrzanej aktywności = natychmiastowe unieważnienie wszystkich tokenów
- ✅ Pełna kontrola nad aktywnymi sesjami

---

### 3. ⏱️ Rate Limiting (Ograniczanie Zapytań)

**Plik:** `middleware/rateLimiting.js`

**Co to jest:**
System ograniczający liczbę zapytań z jednego adresu IP w określonym czasie.

**Limity:**

| Endpoint                     | Limit   | Okno czasowe | Dlaczego taki limit             |
| ---------------------------- | ------- | ------------ | ------------------------------- |
| `/api/*` (ogólny)            | 100 req | 15 min       | Normalne użytkowanie            |
| `/api/auth/login`            | 5 req   | 15 min       | Ochrona przed brute-force       |
| `/api/auth/register`         | 3 req   | 1 godz       | Ochrona przed spam-botami       |
| `/api/users/forgot-password` | 3 req   | 1 godz       | Ochrona przed spamem email      |
| `/api/ads/add`               | 10 req  | 1 godz       | Ochrona przed spam ogłoszeniami |

**Przed czym chroni:**

| Zagrożenie           | Jak chroni                    | Dlaczego ważne                                     |
| -------------------- | ----------------------------- | -------------------------------------------------- |
| **Atak Brute-Force** | Max 5 prób logowania / 15 min | Haker nie może zgadywać haseł metodą prób i błędów |
| **Atak DDoS**        | Limit zapytań na IP           | Jeden użytkownik nie może przeciążyć serwera       |
| **Spam rejestracji** | Max 3 rejestracje / godz      | Boty nie mogą tworzyć tysięcy fałszywych kont      |
| **Spam ogłoszeń**    | Max 10 ogłoszeń / godz        | Ochrona przed zalewem fałszywych ogłoszeń          |

**Dlaczego to ważne dla klienta:**

- ✅ Serwer zawsze dostępny dla prawdziwych użytkowników
- ✅ Brak fałszywych kont i spam ogłoszeń
- ✅ Ochrona przed kosztownymi atakami DDoS

---

### 4. 🛡️ Helmet - Nagłówki Bezpieczeństwa HTTP

**Plik:** `app.js`

**Co to jest:**
Zestaw nagłówków HTTP chroniących przed różnymi atakami webowymi.

**Włączone zabezpieczenia:**

| Nagłówek                             | Co robi                                                       | Przed czym chroni                                                     |
| ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Content-Security-Policy (CSP)**    | Kontroluje skąd można ładować zasoby (skrypty, style, obrazy) | **XSS** - złośliwe skrypty z zewnętrznych źródeł nie zostaną wykonane |
| **Strict-Transport-Security (HSTS)** | Wymusza HTTPS przez 1 rok                                     | **Downgrade Attack** - haker nie może zmusić przeglądarki do HTTP     |
| **X-Frame-Options: DENY**            | Blokuje osadzanie strony w iframe                             | **Clickjacking** - użytkownik nie kliknie ukrytego przycisku          |
| **X-Content-Type-Options: nosniff**  | Blokuje zgadywanie typu pliku                                 | **MIME Sniffing** - przeglądarka nie wykona pliku jako skrypt         |
| **Referrer-Policy**                  | Kontroluje co wysyłane w nagłówku Referer                     | **Wyciek danych** - wrażliwe URL nie wyciekną do zewnętrznych stron   |

**Dlaczego to ważne dla klienta:**

- ✅ Ochrona przed najpopularniejszymi atakami webowymi
- ✅ Zgodność z wymogami bezpieczeństwa (OWASP Top 10)
- ✅ Lepszy ranking SEO (Google premiuje bezpieczne strony)

---

### 5. 🧹 Sanityzacja Danych (Ochrona przed Injection)

**Pliki:** `app.js`, `middleware/sanitization.js`

**Co to jest:**
Czyszczenie i walidacja wszystkich danych wejściowych od użytkownika.

**Biblioteki i ich funkcje:**

| Biblioteka                 | Co robi                                   | Przed czym chroni                                                    |
| -------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **express-mongo-sanitize** | Usuwa operatory MongoDB ($, .) z danych   | **NoSQL Injection** - haker nie może manipulować zapytaniami do bazy |
| **DOMPurify**              | Usuwa złośliwy HTML/JavaScript            | **XSS (Stored)** - złośliwy kod nie zostanie zapisany w bazie        |
| **validator**              | Waliduje format danych (email, URL, etc.) | **Nieprawidłowe dane** - tylko poprawne dane trafiają do systemu     |

**Przykład ataku NoSQL Injection (zablokowany):**

```javascript
// Haker próbuje zalogować się bez hasła:
{ "email": "admin@autosell.pl", "password": { "$ne": "" } }

// Po sanityzacji:
{ "email": "admin@autosell.pl", "password": { "_ne": "" } }
// Atak zablokowany - operator $ zamieniony na _
```

**Dlaczego to ważne dla klienta:**

- ✅ Baza danych bezpieczna przed manipulacją
- ✅ Brak możliwości wstrzyknięcia złośliwego kodu
- ✅ Ochrona danych wszystkich użytkowników

---

### 6. ✅ Walidacja Danych

**Pliki:** `validationSchemas/`, `middleware/validation/`

**Co to jest:**
Sprawdzanie poprawności wszystkich danych przed zapisaniem do bazy.

**Walidowane pola:**

| Pole        | Reguły walidacji                         | Dlaczego ważne                   |
| ----------- | ---------------------------------------- | -------------------------------- |
| **Email**   | Format RFC 5322, unikalność              | Zapobiega duplikatom kont, spam  |
| **Hasło**   | Min. 8 znaków, wielka/mała litera, cyfra | Silne hasła = bezpieczne konta   |
| **Telefon** | Format polski (+48 lub 9 cyfr)           | Poprawna weryfikacja SMS         |
| **VIN**     | 17 znaków, checksum                      | Prawdziwe numery VIN             |
| **Cena**    | Liczba dodatnia, max 99 999 999          | Brak absurdalnych cen            |
| **Zdjęcia** | JPEG/PNG/WebP, max 10MB                  | Ochrona przed złośliwymi plikami |

**Dlaczego to ważne dla klienta:**

- ✅ Czyste, spójne dane w systemie
- ✅ Brak fałszywych ogłoszeń z nieprawidłowymi danymi
- ✅ Lepsza jakość platformy

---

### 7. 🔒 Hashowanie Haseł (Argon2)

**Plik:** `controllers/user/auth/registerController.js`

**Co to jest:**
Bezpieczne przechowywanie haseł w formie nieodwracalnego skrótu (hash).

**Algorytm:** Argon2id (zwycięzca Password Hashing Competition 2015)

**Parametry:**

- Memory cost: 65536 KB (64 MB RAM na hash)
- Time cost: 3 iteracje
- Parallelism: 4 wątki

**Przed czym chroni:**

| Zagrożenie              | Jak chroni                                 | Dlaczego ważne                                    |
| ----------------------- | ------------------------------------------ | ------------------------------------------------- |
| **Wyciek bazy danych**  | Hasła są hashowane, nie można ich odczytać | Nawet jeśli haker zdobędzie bazę, nie pozna haseł |
| **Rainbow Tables**      | Każde hasło ma unikalną sól                | Gotowe tabele z hashami nie działają              |
| **Brute-Force offline** | 64 MB RAM na próbę = bardzo wolne          | Łamanie haseł jest nieopłacalne (lata obliczeń)   |
| **GPU/ASIC cracking**   | Argon2 wymaga dużo pamięci                 | Specjalistyczny sprzęt nie przyspiesza łamania    |

**Porównanie algorytmów:**

| Algorytm   | Bezpieczeństwo | Użycie w AutoSell |
| ---------- | -------------- | ----------------- |
| MD5        | ❌ Złamany     | Nie używamy       |
| SHA-256    | ⚠️ Za szybki   | Nie używamy       |
| bcrypt     | ✅ Dobry       | Backup            |
| **Argon2** | ✅✅ Najlepszy | **Główny**        |

**Dlaczego to ważne dla klienta:**

- ✅ Hasła użytkowników są bezpieczne nawet przy wycieku bazy
- ✅ Najnowszy standard bezpieczeństwa (2015+)
- ✅ Zgodność z RODO (odpowiednie środki techniczne)

---

### 8. 🌐 CORS (Cross-Origin Resource Sharing)

**Plik:** `app.js`

**Co to jest:**
Kontrola które domeny mogą komunikować się z API.

**Konfiguracja:**

```javascript
cors({
  origin: ["https://www.autosell.pl", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
```

**Przed czym chroni:**

| Zagrożenie              | Jak chroni                     | Dlaczego ważne                                                       |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------- |
| **Nieautoryzowane API** | Tylko dozwolone domeny         | Haker nie może stworzyć fałszywej strony korzystającej z naszego API |
| **Kradzież danych**     | Blokada zapytań z obcych domen | Dane użytkowników nie wyciekną do zewnętrznych stron                 |

**Dlaczego to ważne dla klienta:**

- ✅ API dostępne tylko dla oficjalnej strony
- ✅ Brak możliwości stworzenia fałszywej kopii serwisu

---

### 9. 📝 Logowanie i Monitoring

**Plik:** `utils/logger.js`

**Co to jest:**
System rejestrowania wszystkich zdarzeń w systemie.

**Logowane zdarzenia:**

- Próby logowania (udane i nieudane)
- Zmiany haseł
- Podejrzana aktywność
- Błędy systemu
- Operacje administracyjne

**Dlaczego to ważne dla klienta:**

- ✅ Możliwość wykrycia ataków
- ✅ Audyt bezpieczeństwa
- ✅ Zgodność z RODO (rejestrowanie dostępu do danych)

---

### 📋 Podsumowanie Zabezpieczeń

| Warstwa            | Zabezpieczenie               | Poziom       |
| ------------------ | ---------------------------- | ------------ |
| **Autoryzacja**    | JWT + HttpOnly Cookies       | 🟢 Wysoki    |
| **Sesje**          | Blacklista tokenów + Rotacja | 🟢 Wysoki    |
| **Dostęp**         | Rate Limiting                | 🟢 Wysoki    |
| **Nagłówki**       | Helmet (CSP, HSTS, etc.)     | 🟢 Wysoki    |
| **Dane wejściowe** | Sanityzacja + Walidacja      | 🟢 Wysoki    |
| **Hasła**          | Argon2                       | 🟢 Najwyższy |
| **API**            | CORS                         | 🟢 Wysoki    |
| **Monitoring**     | Winston Logger               | 🟢 Wysoki    |

**Ogólny poziom bezpieczeństwa: 🟢 WYSOKI (Enterprise-Grade)**

System spełnia wymagania:

- ✅ OWASP Top 10 (najczęstsze zagrożenia webowe)
- ✅ RODO (ochrona danych osobowych)
- ✅ PCI DSS (standardy płatności - przygotowany)

---

## 🌐 API Endpoints

### Użytkownicy (`/api/users`)

| Metoda | Endpoint           | Opis                           | Autoryzacja |
| ------ | ------------------ | ------------------------------ | ----------- |
| POST   | `/register`        | Rejestracja nowego użytkownika | ❌          |
| POST   | `/login`           | Logowanie                      | ❌          |
| POST   | `/logout`          | Wylogowanie                    | ✅          |
| GET    | `/check-auth`      | Sprawdzenie sesji              | ✅          |
| GET    | `/profile`         | Pobranie profilu               | ✅          |
| PUT    | `/profile`         | Aktualizacja profilu           | ✅          |
| POST   | `/forgot-password` | Reset hasła (email)            | ❌          |
| POST   | `/reset-password`  | Ustawienie nowego hasła        | ❌          |
| POST   | `/change-password` | Zmiana hasła                   | ✅          |
| GET    | `/dashboard`       | Dashboard użytkownika          | ✅          |
| GET    | `/settings`        | Ustawienia                     | ✅          |
| PUT    | `/settings`        | Aktualizacja ustawień          | ✅          |

### Weryfikacja (`/api/users/verification`)

| Metoda | Endpoint             | Opis                   | Autoryzacja |
| ------ | -------------------- | ---------------------- | ----------- |
| POST   | `/send-email-code`   | Wysłanie kodu email    | ❌          |
| POST   | `/verify-email-code` | Weryfikacja kodu email | ❌          |
| POST   | `/send-phone-code`   | Wysłanie kodu SMS      | ❌          |
| POST   | `/verify-phone-code` | Weryfikacja kodu SMS   | ❌          |

### Ogłoszenia (`/api/ads`)

| Metoda | Endpoint         | Opis                    | Autoryzacja     |
| ------ | ---------------- | ----------------------- | --------------- |
| GET    | `/`              | Lista ogłoszeń          | ❌              |
| GET    | `/search`        | Wyszukiwanie z filtrami | ❌              |
| GET    | `/featured`      | Wyróżnione ogłoszenia   | ❌              |
| GET    | `/rotated`       | Rotowane ogłoszenia     | ❌              |
| GET    | `/:id`           | Szczegóły ogłoszenia    | ❌              |
| POST   | `/add`           | Dodanie ogłoszenia      | ✅              |
| PUT    | `/:id`           | Edycja ogłoszenia       | ✅ (właściciel) |
| DELETE | `/:id`           | Usunięcie ogłoszenia    | ✅ (właściciel) |
| GET    | `/user/listings` | Ogłoszenia użytkownika  | ✅              |
| POST   | `/:id/renew`     | Przedłużenie ogłoszenia | ✅              |
| PUT    | `/:id/status`    | Zmiana statusu          | ✅              |
| GET    | `/brands`        | Lista marek             | ❌              |
| GET    | `/models`        | Lista modeli            | ❌              |
| GET    | `/count`         | Liczba ogłoszeń         | ❌              |
| GET    | `/filter-counts` | Liczniki filtrów        | ❌              |

### Ulubione (`/api/favorites`)

| Metoda | Endpoint      | Opis                     | Autoryzacja |
| ------ | ------------- | ------------------------ | ----------- |
| GET    | `/`           | Lista ulubionych         | ✅          |
| POST   | `/add/:id`    | Dodanie do ulubionych    | ✅          |
| DELETE | `/remove/:id` | Usunięcie z ulubionych   | ✅          |
| GET    | `/check/:id`  | Sprawdzenie czy ulubione | ✅          |

### Wiadomości (`/api/messages`)

| Metoda | Endpoint            | Opis                        | Autoryzacja |
| ------ | ------------------- | --------------------------- | ----------- |
| GET    | `/conversations`    | Lista konwersacji           | ✅          |
| GET    | `/conversation/:id` | Wiadomości w konwersacji    | ✅          |
| POST   | `/send`             | Wysłanie wiadomości         | ✅          |
| PUT    | `/:id/read`         | Oznaczenie jako przeczytane | ✅          |
| DELETE | `/:id`              | Usunięcie wiadomości        | ✅          |
| GET    | `/unread-count`     | Liczba nieprzeczytanych     | ✅          |

### Powiadomienia (`/api/notifications`)

| Metoda | Endpoint        | Opis                        | Autoryzacja |
| ------ | --------------- | --------------------------- | ----------- |
| GET    | `/`             | Lista powiadomień           | ✅          |
| PUT    | `/:id/read`     | Oznaczenie jako przeczytane | ✅          |
| PUT    | `/read-all`     | Oznaczenie wszystkich       | ✅          |
| DELETE | `/:id`          | Usunięcie powiadomienia     | ✅          |
| GET    | `/unread-count` | Liczba nieprzeczytanych     | ✅          |
| GET    | `/preferences`  | Preferencje powiadomień     | ✅          |
| PUT    | `/preferences`  | Aktualizacja preferencji    | ✅          |

### Transakcje (`/api/transactions`)

| Metoda | Endpoint  | Opis                  | Autoryzacja |
| ------ | --------- | --------------------- | ----------- |
| GET    | `/`       | Historia transakcji   | ✅          |
| GET    | `/:id`    | Szczegóły transakcji  | ✅          |
| POST   | `/create` | Utworzenie transakcji | ✅          |
| GET    | `/stats`  | Statystyki transakcji | ✅          |

### Płatności (`/api/payments`)

| Metoda | Endpoint      | Opis                    | Autoryzacja |
| ------ | ------------- | ----------------------- | ----------- |
| POST   | `/process`    | Przetworzenie płatności | ✅          |
| GET    | `/status/:id` | Status płatności        | ✅          |
| POST   | `/webhook`    | Webhook płatności       | ❌          |

### Kody Promocyjne (`/api/promo-codes`)

| Metoda | Endpoint    | Opis              | Autoryzacja |
| ------ | ----------- | ----------------- | ----------- |
| POST   | `/validate` | Walidacja kodu    | ✅          |
| POST   | `/apply`    | Zastosowanie kodu | ✅          |

### Komentarze (`/api/comments`)

| Metoda | Endpoint | Opis                     | Autoryzacja |
| ------ | -------- | ------------------------ | ----------- |
| GET    | `/:adId` | Komentarze do ogłoszenia | ❌          |
| POST   | `/:adId` | Dodanie komentarza       | ✅          |
| DELETE | `/:id`   | Usunięcie komentarza     | ✅          |

### Obrazy (`/api/images`)

| Metoda | Endpoint  | Opis             | Autoryzacja |
| ------ | --------- | ---------------- | ----------- |
| POST   | `/upload` | Upload obrazu    | ✅          |
| DELETE | `/:id`    | Usunięcie obrazu | ✅          |

### CEPIK (`/api/cepik`)

| Metoda | Endpoint        | Opis             | Autoryzacja |
| ------ | --------------- | ---------------- | ----------- |
| GET    | `/vehicle/:vin` | Historia pojazdu | ✅          |

---

## 🔌 Panel Administracyjny (`/api/admin-panel`)

### Dashboard

| Metoda | Endpoint                     | Opis               |
| ------ | ---------------------------- | ------------------ |
| GET    | `/dashboard/stats`           | Statystyki ogólne  |
| GET    | `/dashboard/recent-activity` | Ostatnia aktywność |

### Użytkownicy

| Metoda | Endpoint            | Opis                       |
| ------ | ------------------- | -------------------------- |
| GET    | `/users`            | Lista użytkowników         |
| GET    | `/users/:id`        | Szczegóły użytkownika      |
| PUT    | `/users/:id`        | Edycja użytkownika         |
| PUT    | `/users/:id/status` | Zmiana statusu (ban/unban) |
| DELETE | `/users/:id`        | Usunięcie użytkownika      |

### Ogłoszenia

| Metoda | Endpoint                | Opis                   |
| ------ | ----------------------- | ---------------------- |
| GET    | `/listings`             | Lista ogłoszeń         |
| GET    | `/listings/:id`         | Szczegóły ogłoszenia   |
| PUT    | `/listings/:id/status`  | Zmiana statusu         |
| PUT    | `/listings/:id/feature` | Wyróżnienie ogłoszenia |
| DELETE | `/listings/:id`         | Usunięcie ogłoszenia   |

### Płatności

| Metoda | Endpoint               | Opis                |
| ------ | ---------------------- | ------------------- |
| GET    | `/payments`            | Lista płatności     |
| GET    | `/payments/:id`        | Szczegóły płatności |
| PUT    | `/payments/:id/status` | Zmiana statusu      |

### Promocje

| Metoda | Endpoint          | Opis                     |
| ------ | ----------------- | ------------------------ |
| GET    | `/promotions`     | Lista kodów promocyjnych |
| POST   | `/promotions`     | Utworzenie kodu          |
| PUT    | `/promotions/:id` | Edycja kodu              |
| DELETE | `/promotions/:id` | Usunięcie kodu           |

### Raporty

| Metoda | Endpoint              | Opis                      |
| ------ | --------------------- | ------------------------- |
| GET    | `/reports`            | Lista zgłoszeń            |
| PUT    | `/reports/:id/status` | Zmiana statusu zgłoszenia |

### Ustawienia

| Metoda | Endpoint                | Opis                  |
| ------ | ----------------------- | --------------------- |
| GET    | `/settings`             | Ustawienia systemu    |
| PUT    | `/settings`             | Aktualizacja ustawień |
| PUT    | `/settings/maintenance` | Tryb konserwacji      |

### Statystyki

| Metoda | Endpoint               | Opis                    |
| ------ | ---------------------- | ----------------------- |
| GET    | `/statistics/users`    | Statystyki użytkowników |
| GET    | `/statistics/listings` | Statystyki ogłoszeń     |
| GET    | `/statistics/revenue`  | Statystyki przychodów   |

---

## 📊 Modele Danych (MongoDB)

### User (`models/user/user.js`)

```javascript
{
  email: String,           // Email (unikalny)
  password: String,        // Hasło (hashowane Argon2)
  name: String,            // Imię
  lastName: String,        // Nazwisko
  phone: String,           // Telefon
  dob: Date,               // Data urodzenia
  role: String,            // 'user' | 'moderator' | 'admin'
  status: String,          // 'active' | 'suspended' | 'banned'
  emailVerified: Boolean,  // Czy email zweryfikowany
  phoneVerified: Boolean,  // Czy telefon zweryfikowany
  avatar: String,          // URL avatara
  lastActivity: Date,      // Ostatnia aktywność
  lastIP: String,          // Ostatnie IP
  createdAt: Date,         // Data rejestracji
  updatedAt: Date          // Data aktualizacji
}
```

### Ad (`models/listings/ad.js`)

```javascript
{
  userId: ObjectId,        // Właściciel ogłoszenia
  title: String,           // Tytuł
  brand: String,           // Marka
  model: String,           // Model
  generation: String,      // Generacja
  year: Number,            // Rok produkcji
  mileage: Number,         // Przebieg
  price: Number,           // Cena
  currency: String,        // Waluta (PLN/EUR)
  fuelType: String,        // Rodzaj paliwa
  transmission: String,    // Skrzynia biegów
  driveType: String,       // Napęd
  engineCapacity: Number,  // Pojemność silnika
  enginePower: Number,     // Moc silnika
  bodyType: String,        // Typ nadwozia
  color: String,           // Kolor
  doors: Number,           // Liczba drzwi
  seats: Number,           // Liczba miejsc
  vin: String,             // Numer VIN
  description: String,     // Opis
  images: [String],        // URL zdjęć
  location: {
    voivodeship: String,   // Województwo
    city: String           // Miasto
  },
  status: String,          // 'pending' | 'active' | 'sold' | 'archived'
  featured: Boolean,       // Czy wyróżnione
  featuredUntil: Date,     // Do kiedy wyróżnione
  views: Number,           // Liczba wyświetleń
  expiresAt: Date,         // Data wygaśnięcia
  createdAt: Date,
  updatedAt: Date
}
```

### Message (`models/communication/message.js`)

```javascript
{
  conversationId: ObjectId,  // ID konwersacji
  senderId: ObjectId,        // Nadawca
  receiverId: ObjectId,      // Odbiorca
  adId: ObjectId,            // Powiązane ogłoszenie
  content: String,           // Treść wiadomości
  attachments: [String],     // Załączniki
  read: Boolean,             // Czy przeczytana
  readAt: Date,              // Kiedy przeczytana
  createdAt: Date
}
```

### Transaction (`models/payments/transaction.js`)

```javascript
{
  userId: ObjectId,          // Użytkownik
  adId: ObjectId,            // Ogłoszenie
  type: String,              // 'listing' | 'feature' | 'renewal'
  amount: Number,            // Kwota
  currency: String,          // Waluta
  status: String,            // 'pending' | 'completed' | 'failed'
  paymentMethod: String,     // Metoda płatności
  promoCode: String,         // Użyty kod promocyjny
  discount: Number,          // Zniżka
  createdAt: Date
}
```

### Notification (`models/user/notification.js`)

```javascript
{
  userId: ObjectId,          // Odbiorca
  type: String,              // Typ powiadomienia
  title: String,             // Tytuł
  message: String,           // Treść
  data: Object,              // Dodatkowe dane
  read: Boolean,             // Czy przeczytane
  readAt: Date,              // Kiedy przeczytane
  createdAt: Date
}
```

### TokenBlacklist (`models/security/TokenBlacklist.js`)

```javascript
{
  token: String,             // Token (hash)
  reason: String,            // Powód unieważnienia
  userId: ObjectId,          // Użytkownik
  ip: String,                // IP
  expiresAt: Date,           // Wygaśnięcie
  createdAt: Date
}
```

---

## 🔄 Komunikacja Frontend ↔ Backend

### Przepływ Autoryzacji

```
┌─────────────┐                    ┌─────────────┐
│   FRONTEND  │                    │   BACKEND   │
└─────────────┘                    └─────────────┘
       │                                  │
       │  1. POST /api/users/login        │
       │  { email, password }             │
       │ ─────────────────────────────────>
       │                                  │
       │                    2. Weryfikacja hasła (Argon2)
       │                    3. Generowanie tokenów JWT
       │                    4. Ustawienie HttpOnly cookies
       │                                  │
       │  Set-Cookie: token=xxx; HttpOnly │
       │  Set-Cookie: refreshToken=xxx    │
       │ <─────────────────────────────────
       │                                  │
       │  5. GET /api/users/profile       │
       │  Cookie: token=xxx               │
       │ ─────────────────────────────────>
       │                                  │
       │                    6. Weryfikacja tokena
       │                    7. Sprawdzenie blacklisty
       │                    8. Pobranie danych użytkownika
       │                                  │
       │  { user: {...} }                 │
       │ <─────────────────────────────────
```

### Przepływ Odświeżania Tokena

```
┌─────────────┐                    ┌─────────────┐
│   FRONTEND  │                    │   BACKEND   │
└─────────────┘                    └─────────────┘
       │                                  │
       │  GET /api/ads (token wygasł)     │
       │ ─────────────────────────────────>
       │                                  │
       │                    1. Token wygasł (401)
       │                    2. Sprawdzenie refreshToken
       │                    3. Generowanie nowych tokenów
       │                    4. Blacklista starego refreshToken
       │                                  │
       │  Set-Cookie: token=NEW           │
       │  Set-Cookie: refreshToken=NEW    │
       │  { data: [...] }                 │
       │ <─────────────────────────────────
```

### Konfiguracja Axios (Frontend)

```javascript
// services/api/client.js
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // KRYTYCZNE: wysyła cookies
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor dla błędów autoryzacji
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token wygasł - przekieruj do logowania
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### Konfiguracja CORS (Backend)

```javascript
// app.js
app.use(
  cors({
    origin: ["https://www.autosell.pl", "http://localhost:3001"],
    credentials: true, // KRYTYCZNE: akceptuje cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  })
);
```

---

## 📡 WebSocket (Socket.IO)

### Serwer (`services/socketService.js`)

**Wydarzenia:**

- `connection` - nowe połączenie
- `disconnect` - rozłączenie
- `join_room` - dołączenie do pokoju (konwersacja)
- `leave_room` - opuszczenie pokoju
- `new_message` - nowa wiadomość
- `message_read` - wiadomość przeczytana
- `notification` - nowe powiadomienie

### Klient (Frontend)

```javascript
// contexts/SocketContext.js
const socket = io(API_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

socket.on("new_message", (message) => {
  // Aktualizacja UI
});

socket.on("notification", (notification) => {
  // Wyświetlenie powiadomienia
});
```

---

## 📧 Serwisy Zewnętrzne

### Email (Nodemailer)

**Plik:** `services/emailService.js`

**Szablony:**

- Weryfikacja email
- Reset hasła
- Potwierdzenie rejestracji
- Powiadomienie o nowej wiadomości
- Powiadomienie o wygasającym ogłoszeniu

### SMS (Twilio)

**Plik:** `config/twilio.js`

**Funkcje:**

- Wysyłanie kodów weryfikacyjnych SMS
- Weryfikacja numeru telefonu podczas rejestracji

**Dlaczego to ważne:**

- ✅ Potwierdzenie tożsamości użytkownika
- ✅ Ochrona przed fałszywymi kontami
- ✅ Bezpieczna komunikacja z kupującymi

### Storage (Supabase)

**Plik:** `services/storage/supabase.js`

**Funkcje:**

- Upload zdjęć ogłoszeń do chmury
- Automatyczna optymalizacja obrazów
- Generowanie publicznych URL
- Usuwanie zdjęć przy usunięciu ogłoszenia

**Dlaczego to ważne:**

- ✅ Szybkie ładowanie zdjęć (CDN)
- ✅ Nieograniczona przestrzeń na zdjęcia
- ✅ Backup danych w chmurze

### CEPIK (Historia Pojazdów)

**Plik:** `routes/external/cepikRoutes.js`

**Funkcje:**

- Sprawdzanie historii pojazdu po VIN
- Weryfikacja danych technicznych
- Informacje o przeglądach i ubezpieczeniu

**Dlaczego to ważne:**

- ✅ Wiarygodność ogłoszeń
- ✅ Ochrona kupujących przed oszustwami
- ✅ Transparentność transakcji

---

## ⏰ Zadania Cykliczne

**Plik:** `utils/scheduledTasks.js`

| Zadanie               | Częstotliwość | Opis                                              |
| --------------------- | ------------- | ------------------------------------------------- |
| Cleanup tokenów       | Co 1 godz     | Usuwanie wygasłych tokenów z blacklisty           |
| Cleanup weryfikacji   | Co 1 godz     | Usuwanie wygasłych kodów weryfikacyjnych          |
| Archiwizacja ogłoszeń | Codziennie    | Archiwizacja wygasłych ogłoszeń                   |
| Statystyki            | Codziennie    | Generowanie statystyk dziennych                   |
| Powiadomienia         | Co 1 godz     | Wysyłanie powiadomień o wygasających ogłoszeniach |

---

## 📝 Logowanie

**Plik:** `utils/logger.js`

**Biblioteka:** Winston

**Poziomy logowania:**

| Poziom  | Opis                  | Przykład                      |
| ------- | --------------------- | ----------------------------- |
| `error` | Błędy krytyczne       | Błąd połączenia z bazą danych |
| `warn`  | Ostrzeżenia           | Nieudana próba logowania      |
| `info`  | Informacje ogólne     | Użytkownik zalogowany         |
| `debug` | Szczegóły debugowania | Zapytanie do bazy danych      |

**Wyjścia:**

- Konsola (development) - kolorowe logi
- Pliki (production): `logs/error.log`, `logs/combined.log`

---

## 🧪 Testowanie

**Framework:** Jest + Supertest

**Typy testów:**

| Katalog              | Opis                   |
| -------------------- | ---------------------- |
| `tests/security/`    | Testy bezpieczeństwa   |
| `tests/models/`      | Testy modeli MongoDB   |
| `tests/controllers/` | Testy kontrolerów API  |
| `tests/validation/`  | Testy walidacji danych |

**Uruchamianie:**

```bash
npm test              # Wszystkie testy
npm run test:security # Tylko testy bezpieczeństwa
npm run test:models   # Tylko testy modeli
```

---

## 🚀 Deployment

### Zmienne Środowiskowe

**Plik:** `.env.example`

```env
# Serwer
NODE_ENV=production
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=https://www.autosell.pl

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key
SUPABASE_BUCKET=images
```

### Docker

**Plik:** `Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
```

---

## 🎯 Podsumowanie Funkcjonalności

### ✅ Zaimplementowane Funkcje

| Moduł              | Funkcje                                            | Status |
| ------------------ | -------------------------------------------------- | ------ |
| **Autoryzacja**    | Rejestracja, logowanie, JWT, weryfikacja email/SMS | ✅     |
| **Bezpieczeństwo** | Helmet, Rate Limiting, Sanityzacja, Argon2         | ✅     |
| **Ogłoszenia**     | CRUD, wyszukiwanie, filtry, wyróżnianie            | ✅     |
| **Zdjęcia**        | Upload do Supabase, optymalizacja, usuwanie        | ✅     |
| **Wiadomości**     | Konwersacje, real-time (Socket.IO), załączniki     | ✅     |
| **Powiadomienia**  | Systemowe, email, real-time                        | ✅     |
| **Płatności**      | Transakcje, kody promocyjne, historia              | ✅     |
| **Admin Panel**    | Dashboard, zarządzanie użytkownikami/ogłoszeniami  | ✅     |

### 📊 Statystyki Projektu

| Metryka              | Wartość |
| -------------------- | ------- |
| **Pliki JavaScript** | ~150    |
| **Endpointy API**    | ~80     |
| **Modele MongoDB**   | ~15     |
| **Middleware**       | ~20     |
| **Testy**            | ~50     |

### 🔒 Poziom Bezpieczeństwa

| Standard         | Status | Opis                                        |
| ---------------- | ------ | ------------------------------------------- |
| **OWASP Top 10** | ✅     | Ochrona przed 10 najczęstszymi zagrożeniami |
| **RODO**         | ✅     | Zgodność z ochroną danych osobowych         |
| **PCI DSS**      | 🟡     | Przygotowany (wymaga certyfikacji)          |

---

## 📚 Dokumentacja Dodatkowa

- `docs/API_TRANSACTIONS.md` - Dokumentacja API transakcji
- `docs/TRANSACTION_SYSTEM_SUMMARY.md` - Podsumowanie systemu transakcji
- `README.md` - Instrukcja uruchomienia projektu

---

**Autor dokumentacji:** Cline AI Assistant  
**Data utworzenia:** Grudzień 2025  
**Wersja:** 1.0
