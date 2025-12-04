# API Transakcji - Dokumentacja

## Przegląd

System transakcji obsługuje symulowane płatności za ogłoszenia, historię transakcji, generowanie faktur i automatyczne wysyłanie ich na email.

## Endpointy

### 1. Pobieranie listy transakcji

**GET** `/api/transactions` lub `/api/v1/transactions`

Pobiera listę transakcji użytkownika z paginacją i filtrowaniem.

**Wymagane:** Autoryzacja (token JWT)

**Query Parameters:**

- `page` (optional, default: 1) - Numer strony
- `limit` (optional, default: 10) - Liczba transakcji na stronę
- `status` (optional) - Filtrowanie po statusie: `pending`, `completed`, `failed`

**Przykład żądania:**

```bash
GET /api/transactions?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Przykład odpowiedzi:**

```json
{
  "transactions": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "adId": "507f1f77bcf86cd799439013",
      "amount": 30,
      "type": "standard_listing",
      "status": "completed",
      "paymentMethod": "card",
      "invoiceRequested": false,
      "invoiceGenerated": false,
      "transactionId": "TXN_1234567890_abcd1234",
```
