# 🐛 LISTA PROBLEMÓW DO NAPRAWY

**Data:** 2026-01-07

---

## 🔴 PROBLEM #1: Błąd w panelu admina

**Objawy:**

- Błąd JavaScript w panelu admina: "Cannot read properties of undefined (reading 'error')"
- Lokalizacja: `http://localhost:3000/static/js/src_components_admin_AdminPanel_js.chunk.js:27467:13`
- Panel działa, ale wyświetla błąd w konsoli

**Możliwe przyczyny:**

- Brak obsługi błędów w komponencie React
- Próba odczytu `error` z undefined obiektu
- Problem z response z API

**Priorytet:** 🟡 ŚREDNI (panel działa, ale błąd jest widoczny)

**Do sprawdzenia:**

- Frontend: `src/components/admin/AdminPanel.js` (linia ~27467)
- Sprawdzić obsługę błędów w komponentach admina
- Dodać optional chaining (`?.`) lub sprawdzenie `if (error)`

---

## 🔴 PROBLEM #2: Możliwość rejestracji z tym samym numerem telefonu

**Objawy:**

- Użytkownik może zarejestrować konto z numerem telefonu, który już istnieje w bazie
- Mimo że model ma `phoneNumber: { unique: true }`

**Przyczyna:**

- Różne formaty numeru telefonu omijają walidację unique w MongoDB
- Przykład:
  - W bazie: `+48123456789`
  - Nowa rejestracja: `48123456789` lub `123456789` lub `0123456789`
  - MongoDB traktuje to jako różne wartości!

**Lokalizacja:**

- Model: `models/user/user.js` (linia 43) - `phoneNumber: { unique: true }`
- Kontroler: `controllers/user/auth/registerController.js` (linie 189-203)

**Obecna walidacja:**

```javascript
// Linie 189-203 w registerController.js
const existingUser = await User.findOne({
  $or: [{ email: email.toLowerCase().trim() }, { phoneNumber: formattedPhone }],
});
```

**Problem:**

- Walidacja sprawdza tylko `formattedPhone` (po normalizacji)
- Ale jeśli użytkownik poda telefon w innym formacie, może ominąć sprawdzenie
- MongoDB unique index też nie zadziała, bo formaty są różne

**Rozwiązanie:**

1. **Normalizacja przed zapisem:**

   - Zawsze zapisywać telefon w formacie `+48XXXXXXXXX`
   - Usunąć wszystkie spacje, myślniki, nawiasy
   - Dodać prefix +48 jeśli brakuje

2. **Lepsza walidacja przy rejestracji:**

   ```javascript
   // Normalizuj wszystkie możliwe formaty
   const normalizePhone = (phone) => {
     let normalized = phone.replace(/[\s\-\(\)]/g, ""); // Usuń spacje, myślniki, nawiasy
     if (normalized.startsWith("0")) normalized = normalized.substring(1); // Usuń 0 na początku
     if (!normalized.startsWith("+")) {
       if (normalized.startsWith("48")) {
         normalized = "+" + normalized;
       } else {
         normalized = "+48" + normalized;
       }
     }
     return normalized;
   };

   // Sprawdź wszystkie możliwe warianty
   const phoneVariants = [
     normalizePhone(phone),
     phone,
     "+48" + phone.replace(/^0+/, ""),
     phone.replace(/^0+/, ""),
   ];

   const existingUser = await User.findOne({
     $or: [
       { email: email.toLowerCase().trim() },
       { phoneNumber: { $in: phoneVariants } },
     ],
   });
   ```

3. **Middleware w modelu:**
   ```javascript
   // W models/user/user.js
   userSchema.pre("save", function (next) {
     if (this.isModified("phoneNumber")) {
       this.phoneNumber = normalizePhone(this.phoneNumber);
     }
     next();
   });
   ```

**Priorytet:** 🔴 WYSOKI (problem bezpieczeństwa - duplikaty w bazie)

**Pliki do modyfikacji:**

- `models/user/user.js` - dodać middleware normalizacji
- `controllers/user/auth/registerController.js` - poprawić walidację
- `utils/phoneNormalization.js` - stworzyć helper do normalizacji

---

## ✅ NAPRAWIONE PROBLEMY

### ✅ PROBLEM #3: Błędny URL webhooka Tpay (NAPRAWIONY)

**Status:** ✅ NAPRAWIONY (2026-01-07)

**Opis:**

- URL webhooka w `tpayService.js` był błędny
- Było: `/api/payments/webhook`
- Powinno być: `/api/transactions/webhook/tpay`

**Naprawa:**

- Plik: `services/tpay/tpayService.js` (linia 71)
- Zmieniono URL na poprawny

---

## 📋 PRIORYTETYZACJA

### 🔴 KRYTYCZNE (do naprawy przed produkcją):

- ✅ ~~Błędny URL webhooka Tpay~~ (NAPRAWIONE)

### 🔴 WYSOKIE (do naprawy wkrótce):

- [ ] Możliwość rejestracji z tym samym numerem telefonu

### 🟡 ŚREDNIE (do naprawy gdy będzie czas):

- [ ] Błąd w panelu admina (Cannot read properties of undefined)

---

## 📝 NOTATKI

- Problemy zostały zidentyfikowane podczas analizy integracji Tpay
- Użytkownik poprosił o zapamiętanie problemów na później
- Nie wprowadzać zmian teraz, żeby nic nie popsuć
- Wrócić do tych problemów później

---

**Ostatnia aktualizacja:** 2026-01-07 17:35
