# 🔧 PLAN NAPRAWY SYSTEMU PŁATNOŚCI

## Data: 2025-12-29

---

## 📋 OBECNY STAN

### ✅ Backend - CO DZIAŁA:

- ✅ Integracja z Tpay API (`services/tpay/tpayService.js`)
- ✅ Kontroler transakcji z pełną logiką (`controllers/payments/transactionController.js`)
- ✅ Webhook Tpay odbierający powiadomienia
- ✅ Routing dla płatności (`routes/payments/transactionRoutes.js`)
- ✅ Rate limiting dla bezpieczeństwa
- ✅ Model Transaction z wszystkimi polami

### ❌ Frontend - CO NIE DZIAŁA:

- ❌ PaymentModal używa STAREGO flow (tworzy ogłoszenie przed płatnością)
- ❌ Brak przekierowania do bramki Tpay
- ❌ TransactionsService nie ma metody `initiateTpayPayment()`
- ❌ Brak obsługi powrotu z Tpay (success/error)

---

## 🎯 PLAN NAPRAWY

### KROK 1: Aktualizacja TransactionsService (Frontend)

**Plik:** `src/services/api/transactionsApi.js`

**Dodać metodę:**

```javascript
/**
 * Inicjacja płatności Tpay z danymi ogłoszenia
 * @param {Object} paymentData - Dane płatności
 * @param {Object} paymentData.adData - Wszystkie dane ogłoszenia z formularza
 * @param {number} paymentData.amount - Kwota płatności
 * @param {string} paymentData.type - Typ ogłoszenia (standard_listing, featured_listing)
 * @param {Object} paymentData.invoiceData - Dane do faktury (opcjonalne)
 * @returns {Promise} - Promise z paymentUrl do przekierowania
 */
initiateTpayPayment: (paymentData) =>
  apiClient
    .post("/transactions/tpay/initiate", paymentData)
    .then((response) => response.data)
    .catch((error) => {
      console.error("Błąd podczas inicjacji płatności Tpay:", error);
      throw error;
    }),
```

---

### KROK 2: Aktualizacja PaymentModal (Frontend)

**Plik:** `src/components/payment/PaymentModal.js`

**Zmiany:**

1. **Import nowej metody:**

```javascript
import TransactionsService from "../../services/api/transactionsApi";
```

2. **Zmiana logiki handlePayment:**

```javascript
const handlePayment = async (e) => {
  e.preventDefault();

  if (!preparedData || !preparedData.draftData) {
    setErrors({ general: "Brak danych ogłoszenia. Spróbuj ponownie." });
    return;
  }

  setIsProcessing(true);
  setErrors({});

  try {
    console.log("💳 Rozpoczynam proces płatności Tpay...");

    // Przygotuj dane ogłoszenia z URL-ami zdjęć
    let listingDataWithImages = { ...preparedData.draftData };

    // KROK 1: Upload zdjęć do Supabase (jeśli są)
    if (preparedData.originalFormData?.photos?.length > 0 && uploadImages) {
      setProcessingStep("Przesyłanie zdjęć...");

      const filesToUpload = preparedData.originalFormData.photos
        .filter((photo) => photo.file && photo.file instanceof File)
        .map((photo) => photo.file);

      const mainPhotoIndex = preparedData.originalFormData.mainPhotoIndex || 0;
      const mainImageFile =
        preparedData.originalFormData.photos[mainPhotoIndex]?.file;

      if (filesToUpload.length > 0) {
        const tempId = `temp_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const uploadedImages = await uploadImages(
          filesToUpload,
          tempId,
          mainImageFile
        );

        if (uploadedImages?.length > 0) {
          listingDataWithImages.images = uploadedImages.map((img) => img.url);
          listingDataWithImages.mainImage =
            uploadedImages.find((img) => img.isMain)?.url ||
            uploadedImages[0]?.url;
        }
      }
    }

    // Sprawdź minimalną liczbę zdjęć
    if (
      !listingDataWithImages.images ||
      listingDataWithImages.images.length < 5
    ) {
      setProcessingStep("");
      setErrors({ general: "Ogłoszenie musi zawierać minimum 5 zdjęć." });
      setIsProcessing(false);
      return;
    }

    // KROK 2: Inicjacja płatności Tpay (backend utworzy ogłoszenie + transakcję)
    setProcessingStep("Przygotowywanie płatności...");

    const transactionType =
      listingType === "wyróżnione" ? "featured_listing" : "standard_listing";

    const paymentData = {
      adData: listingDataWithImages, // Wysyłamy WSZYSTKIE dane ogłoszenia
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

    console.log("📤 Wysyłam dane do backendu:", {
      hasAdData: !!paymentData.adData,
      amount: paymentData.amount,
      type: paymentData.type,
      hasInvoice: !!paymentData.invoiceData,
    });

    const response = await TransactionsService.initiateTpayPayment(paymentData);

    console.log("✅ Odpowiedź z backendu:", response);

    // KROK 3: Przekierowanie do Tpay
    if (response.success && response.paymentUrl) {
      console.log("🔗 Przekierowuję do Tpay:", response.paymentUrl);

      // Zapisz ID transakcji i ogłoszenia w localStorage (na wypadek powrotu)
      localStorage.setItem(
        "pendingTransaction",
        JSON.stringify({
          transactionId: response.transactionId,
          adId: response.adId,
          timestamp: Date.now(),
        })
      );

      // Przekieruj do bramki Tpay
      window.location.href = response.paymentUrl;
    } else {
      throw new Error("Brak URL płatności w odpowiedzi");
    }
  } catch (error) {
    console.error("❌ Błąd podczas przetwarzania płatności:", error);
    setProcessingStep("");
    setErrors({
      general:
        error.response?.data?.message ||
        error.message ||
        "Wystąpił błąd podczas przetwarzania płatności.",
    });
    setIsProcessing(false);
  }
};
```

---

### KROK 3: Strona Powrotu z Płatności (Frontend)

**Nowy plik:** `src/pages/PaymentReturnPage.js`

```javascript
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, X, Loader } from "lucide-react";
import TransactionsService from "../services/api/transactionsApi";

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking, success, error
  const [message, setMessage] = useState("Sprawdzam status płatności...");
  const [transactionData, setTransactionData] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlStatus = searchParams.get("status");
      const pendingData = localStorage.getItem("pendingTransaction");

      if (!pendingData) {
        setStatus("error");
        setMessage("Nie znaleziono danych transakcji");
        return;
      }

      const { transactionId, adId } = JSON.parse(pendingData);

      if (urlStatus === "success") {
        try {
          // Pobierz szczegóły transakcji z backendu
          const response = await TransactionsService.getTransaction(
            transactionId
          );

          if (response.transaction.status === "completed") {
            setStatus("success");
            setMessage("Płatność zakończona sukcesem!");
            setTransactionData({ transactionId, adId });

            // Wyczyść localStorage
            localStorage.removeItem("pendingTransaction");

            // Przekieruj po 3 sekundach
            setTimeout(() => {
              navigate(`/ogloszenie/${adId}`);
            }, 3000);
          } else {
            setStatus("checking");
            setMessage("Płatność w trakcie przetwarzania...");

            // Sprawdź ponownie za 2 sekundy
            setTimeout(checkPaymentStatus, 2000);
          }
        } catch (error) {
          setStatus("error");
          setMessage("Błąd podczas sprawdzania statusu płatności");
        }
      } else if (urlStatus === "error") {
        setStatus("error");
        setMessage("Płatność nie powiodła się. Spróbuj ponownie.");
        localStorage.removeItem("pendingTransaction");
      }
    };

    checkPaymentStatus();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === "checking" && (
          <>
            <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sprawdzam płatność...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Sukces!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Za chwilę zostaniesz przekierowany do ogłoszenia...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <X className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">
              Błąd płatności
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate("/profil/transakcje")}
              className="bg-[#35530A] text-white px-6 py-2 rounded-lg hover:bg-[#2D4A06]"
            >
              Przejdź do transakcji
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturnPage;
```

---

### KROK 4: Dodanie Routingu (Frontend)

**Plik:** `src/App.js` lub routing

```javascript
import PaymentReturnPage from "./pages/PaymentReturnPage";

// W routingu:
<Route path="/payment/return" element={<PaymentReturnPage />} />;
```

---

### KROK 5: Aktualizacja URL-i Powrotu w Backendzie

**Plik:** `controllers/payments/transactionController.js`

**Zmienić linię 91-92:**

```javascript
returnUrl: `${process.env.FRONTEND_URL}/payment/return?status=success`,
errorUrl: `${process.env.FRONTEND_URL}/payment/return?status=error`,
```

---

## 🔍 TESTOWANIE

### Test 1: Lokalne środowisko (z ngrok)

1. Uruchom backend: `npm start`
2. Uruchom ngrok: `ngrok http 5000`
3. Ustaw `BACKEND_URL` w `.env` na URL z ngrok
4. Skonfiguruj webhook w panelu Tpay na URL ngrok
5. Przetestuj pełny flow

### Test 2: Środowisko testowe Tpay

1. Użyj danych testowych z dokumentacji Tpay
2. Sprawdź wszystkie scenariusze:
   - ✅ Płatność udana
   - ❌ Płatność odrzucona
   - 🔙 Płatność anulowana

### Test 3: Produkcja

1. Upewnij się, że wszystkie zmienne środowiskowe są poprawne
2. Webhook skonfigurowany na produkcyjny URL
3. Certyfikat SSL aktywny
4. Monitoring logów włączony

---

## ✅ CHECKLIST WDROŻENIA

### Backend:

- [x] Model Transaction ma wszystkie pola
- [x] Kontroler obsługuje tworzenie ogłoszenia + transakcji
- [x] Webhook Tpay działa poprawnie
- [x] Rate limiting skonfigurowany
- [ ] Zmienne środowiskowe ustawione (TPAY_CLIENT_ID, TPAY_SECRET, etc.)

### Frontend:

- [ ] TransactionsService ma metodę `initiateTpayPayment()`
- [ ] PaymentModal przekierowuje do Tpay
- [ ] Strona powrotu z płatności utworzona
- [ ] Routing dla `/payment/return` dodany
- [ ] Obsługa localStorage dla pending transactions

### Konfiguracja:

- [ ] Webhook skonfigurowany w panelu Tpay
- [ ] URL-e w `.env` są poprawne
- [ ] Certyfikat SSL aktywny (dla webhooka)
- [ ] Testy na środowisku testowym Tpay

---

## 🚀 KOLEJNOŚĆ WDROŻENIA

1. **Aktualizuj TransactionsService** (frontend)
2. **Zaktualizuj PaymentModal** (frontend)
3. **Utwórz PaymentReturnPage** (frontend)
4. **Dodaj routing** (frontend)
5. **Zaktualizuj URL-e powrotu** (backend)
6. **Przetestuj lokalnie z ngrok**
7. **Wdróż na produkcję**
8. **Skonfiguruj webhook w Tpay**
9. **Przetestuj na produkcji**

---

## 📞 WSPARCIE

- **Dokumentacja Tpay:** https://docs.tpay.com/
- **Panel Tpay:** https://panel.tpay.com/
- **Support Tpay:** support@tpay.com

---

**Autor:** Cline AI Assistant  
**Data:** 2025-12-29
