# System Faktur - Dokumentacja

## 📋 Przegląd

System automatycznie obsługuje generowanie i pobieranie faktur dla transakcji TPay. Użytkownicy mogą:

1. Zażądać faktury podczas płatności (wypełniając dane firmowe)
2. Pobrać fakturę z historii transakcji w profilu
3. Otrzymać fakturę na email

## 🔄 Przepływ Działania

### 1. Podczas Płatności (PaymentModal)

Użytkownik wypełnia formularz płatności i może zaznaczyć opcję "Chcę otrzymać fakturę VAT":

- Jeśli zaznaczy: wypełnia dane firmowe (NIP, nazwa firmy, adres)
- Dane są wysyłane do backendu w polu `invoiceData`
- Backend zapisuje `invoiceRequested: true` w transakcji

```javascript
// Frontend - PaymentModal.js
const paymentData = {
  adData: listingDataWithImages,
  amount,
  type: transactionType,
  invoiceData: needsInvoice
    ? {
        companyName,
        nip,
        address: companyAddress,
        postalCode,
        city,
        email: invoiceEmail,
      }
    : null,
};
```

### 2. Po Opłaceniu (Webhook TPay)

Gdy TPay potwierdzi płatność:

- Backend otrzymuje webhook
- Metoda `completeTransaction()` jest wywoływana
- Jeśli `invoiceRequested === true`:
  - Generuje PDF faktury (`generateInvoicePDF()`)
  - Zapisuje ścieżkę do pliku w `invoicePdfPath`
  - Ustawia `invoiceGenerated: true`
  - Wysyła email z fakturą (`sendInvoiceEmail()`)

```javascript
// Backend - transactionController.js
if (transaction.invoiceRequested === true) {
  const invoicePath = await this.generateInvoicePDF(transaction);
  transaction.invoicePdfPath = invoicePath;
  transaction.invoiceGenerated = true;
  await transaction.save();
  await this.sendInvoiceEmail(transaction, invoicePath);
}
```

### 3. Pobieranie z Historii Transakcji

Użytkownik może pobrać fakturę z profilu:

#### Frontend (TransactionListPanel.js)

- Wyświetla przycisk "Pobierz Fakturę" dla transakcji z `canDownloadInvoice: true`
- Po kliknięciu wywołuje `onDownloadInvoice(transaction)`

#### Hook (useTransactions.js)

```javascript
const downloadReceipt = async (transaction) => {
  const blob = await TransactionsService.downloadInvoice(transaction.id);
  // Tworzy link do pobrania i pobiera plik
};
```

#### Backend Endpoint

```
GET /api/transactions/:id/download-invoice
```

**Logika:**

1. Sprawdza czy transakcja należy do użytkownika
2. Jeśli faktura nie istnieje, generuje ją automatycznie
3. Zwraca plik PDF jako stream

## 📁 Struktura Danych

### Model Transaction

```javascript
{
  invoiceRequested: Boolean,      // Czy użytkownik zażądał faktury
  invoiceGenerated: Boolean,      // Czy faktura została wygenerowana
  invoiceNumber: String,          // Numer faktury (np. "FV/2024/ABC123")
  invoicePdfPath: String,         // Ścieżka do pliku PDF
  invoiceDetails: {               // Dane do faktury
    companyName: String,
    nip: String,
    address: String,
    postalCode: String,
    city: String,
    email: String
  },
  invoiceRequestedAt: Date,       // Data żądania
  invoiceGeneratedAt: Date        // Data wygenerowania
}
```

### Metody Modelu

```javascript
// Sprawdza czy faktura jest dostępna do pobrania
transaction.isInvoiceAvailable(); // returns Boolean

// Sprawdza czy można zażądać faktury
transaction.canRequestInvoice(); // returns Boolean
```

## 🔌 API Endpoints

### 1. Pobieranie Historii Transakcji

```
GET /api/transactions
Authorization: Bearer <token>
```

**Odpowiedź:**

```json
{
  "transactions": [
    {
      "id": "...",
      "amount": 50,
      "status": "completed",
      "invoiceNumber": "FV/2024/ABC123",
      "details": {
        "canDownloadInvoice": true,
        "invoiceNumber": "FV/2024/ABC123"
      }
    }
  ]
}
```

### 2. Pobieranie Faktury PDF

```
GET /api/transactions/:id/download-invoice
Authorization: Bearer <token>
```

**Odpowiedź:** Plik PDF (Content-Type: application/pdf)

### 3. Żądanie Faktury (jeśli nie została wygenerowana)

```
POST /api/transactions/:id/request-invoice
Authorization: Bearer <token>
```

**Odpowiedź:**

```json
{
  "message": "Faktura została wygenerowana i wysłana na email",
  "invoiceAvailable": true
}
```

## 📄 Generowanie PDF

Faktura zawiera:

- Nagłówek "FAKTURA VAT"
- Numer faktury
- Data wystawienia i sprzedaży
- Dane sprzedawcy (AutoSell)
- Dane nabywcy (jeśli podane)
- Tabela z pozycjami
- Podsumowanie (netto, VAT, brutto)
- Sposób płatności i status

```javascript
// Backend - generateInvoicePDF()
const doc = new PDFDocument({ margin: 50 });
// ... generowanie zawartości PDF
```

## 🔒 Bezpieczeństwo

1. **Autoryzacja**: Wszystkie endpointy wymagają tokenu JWT
2. **Weryfikacja właściciela**: Backend sprawdza czy transakcja należy do użytkownika
3. **Walidacja statusu**: Faktury można generować tylko dla transakcji `completed`
4. **Ścieżki plików**: Faktury są przechowywane w `uploads/invoices/` z unikalną nazwą

## 📧 Email z Fakturą

System wysyła dwa typy emaili:

### A) Z fakturą (gdy `invoiceRequested === true`)

```
Temat: Twoja Faktura - AutoSell
Załącznik: Faktura.pdf
```

### B) Potwierdzenie płatności (gdy `invoiceRequested === false`)

```
Temat: Potwierdzenie płatności - AutoSell
Treść: Dziękujemy za opłacenie ogłoszenia...
```

## 🐛 Debugowanie

Backend loguje wszystkie operacje:

```
📄 [REQUEST INVOICE] Żądanie faktury dla transakcji...
🔄 [REQUEST INVOICE] Generowanie faktury...
✅ [REQUEST INVOICE] Faktura wygenerowana i wysłana
📥 [DOWNLOAD INVOICE] Pobieranie faktury...
✅ [DOWNLOAD INVOICE] Wysyłanie pliku: Faktura_FV_2024_ABC123.pdf
```

## 🔧 Konfiguracja

### Wymagane zmienne środowiskowe (.env)

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=no-reply@autosell.pl
```

### Struktura katalogów

```
Marketplace-Backend/
├── uploads/
│   └── invoices/          # Tutaj są przechowywane faktury PDF
│       ├── invoice_123_1234567890.pdf
│       └── invoice_456_1234567891.pdf
```

## ✅ Testowanie

### 1. Test pełnego przepływu

1. Dodaj ogłoszenie
2. Zaznacz "Chcę otrzymać fakturę VAT"
3. Wypełnij dane firmowe
4. Opłać przez TPay (sandbox)
5. Sprawdź email - powinna przyjść faktura
6. Przejdź do Profil → Transakcje
7. Kliknij "Pobierz Fakturę"

### 2. Test pobierania bez wcześniejszego żądania

1. Opłać ogłoszenie BEZ zaznaczania faktury
2. Przejdź do historii transakcji
3. Kliknij "Pobierz Fakturę"
4. System automatycznie wygeneruje fakturę

## 📝 Uwagi

1. **Automatyczne generowanie**: Jeśli użytkownik nie zażądał faktury podczas płatności, ale kliknie "Pobierz Fakturę" w historii, system automatycznie ją wygeneruje
2. **Jednokrotne generowanie**: Faktura jest generowana raz i zapisywana - kolejne pobrania używają tego samego pliku
3. **Numer faktury**: Generowany automatycznie w formacie `FV/ROK/HASH` (np. `FV/2024/ABC123`)
4. **Dane firmowe**: Jeśli użytkownik nie podał danych firmowych, faktura jest generowana bez sekcji "Nabywca"

## 🚀 Przyszłe Ulepszenia

- [ ] Bardziej szczegółowy PDF z logo firmy
- [ ] Możliwość edycji danych do faktury po płatności
- [ ] Historia wersji faktur
- [ ] Automatyczne archiwizowanie starych faktur
- [ ] Eksport faktur do formatu XML (KSeF)
