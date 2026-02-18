/**
 * Skrypt diagnostyczny dla Tpay na VPS
 * Sprawdza konfigurację i testuje połączenie z API Tpay
 */

import axios from "axios";
import dotenv from "dotenv";

// Wczytaj zmienne środowiskowe
dotenv.config();

console.log("🔍 DIAGNOSTYKA TPAY NA VPS");
console.log("=".repeat(60));

// 1. Sprawdź zmienne środowiskowe
console.log("\n📋 KROK 1: Sprawdzanie zmiennych środowiskowych");
console.log("-".repeat(60));

const requiredVars = {
  TPAY_CLIENT_ID: process.env.TPAY_CLIENT_ID,
  TPAY_SECRET: process.env.TPAY_SECRET,
  TPAY_MERCHANT_ID: process.env.TPAY_MERCHANT_ID,
  TPAY_SECURITY_CODE: process.env.TPAY_SECURITY_CODE,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
};

let allVarsPresent = true;
for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.error(`❌ ${key}: BRAK`);
    allVarsPresent = false;
  } else {
    // Pokaż tylko pierwsze i ostatnie 4 znaki dla bezpieczeństwa
    const masked =
      value.length > 8
        ? `${value.slice(0, 4)}...${value.slice(-4)} (długość: ${value.length})`
        : `****** (długość: ${value.length})`;
    console.log(`✅ ${key}: ${masked}`);
  }
}

if (!allVarsPresent) {
  console.error("\n❌ BŁĄD: Brakuje wymaganych zmiennych środowiskowych!");
  process.exit(1);
}

// 2. Test autoryzacji OAuth
console.log("\n🔐 KROK 2: Test autoryzacji OAuth z Tpay");
console.log("-".repeat(60));

async function testOAuth() {
  try {
    const response = await axios.post(
      "https://api.tpay.com/oauth/auth",
      {
        client_id: process.env.TPAY_CLIENT_ID,
        client_secret: process.env.TPAY_SECRET,
        scope: "read write",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    console.log("✅ Autoryzacja OAuth zakończona sukcesem!");
    console.log(`   Token type: ${response.data.token_type}`);
    console.log(`   Expires in: ${response.data.expires_in} sekund`);
    console.log(
      `   Access token: ${response.data.access_token.slice(0, 20)}...`,
    );

    return response.data.access_token;
  } catch (error) {
    console.error("❌ Błąd autoryzacji OAuth:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Message: ${error.message}`);
    }
    return null;
  }
}

// 3. Test tworzenia transakcji
async function testCreateTransaction(accessToken) {
  console.log("\n💳 KROK 3: Test tworzenia transakcji testowej");
  console.log("-".repeat(60));

  if (!accessToken) {
    console.error("❌ Brak tokenu - pomijam test transakcji");
    return;
  }

  try {
    const testPayload = {
      amount: 1.0,
      description: "Test transakcji - diagnostyka",
      hiddenDescription: "TEST_" + Date.now(),
      payer: {
        email: "test@autosell.pl",
        name: "Test User",
      },
      callbacks: {
        payerUrls: {
          success: `${process.env.FRONTEND_URL}/payment/return`,
          error: `${process.env.FRONTEND_URL}/payment/return`,
        },
        notification: {
          url: `${process.env.BACKEND_URL}/api/transactions/webhook/tpay`,
          email: "test@autosell.pl",
        },
      },
      lang: "pl",
    };

    console.log("📤 Wysyłam payload:");
    console.log(JSON.stringify(testPayload, null, 2));

    const response = await axios.post(
      "https://api.tpay.com/transactions",
      testPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("\n✅ Transakcja testowa utworzona pomyślnie!");
    console.log(`   Transaction ID: ${response.data.transactionId}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Payment URL: ${response.data.transactionPaymentUrl}`);
  } catch (error) {
    console.error("\n❌ Błąd tworzenia transakcji:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));

      // Szczegółowa analiza błędu
      if (error.response.status === 400) {
        console.error("\n⚠️  BŁĄD 400 - Nieprawidłowe dane:");
        console.error("   Sprawdź czy wszystkie wymagane pola są poprawne");
      } else if (error.response.status === 401) {
        console.error("\n⚠️  BŁĄD 401 - Nieautoryzowany:");
        console.error("   Token może być nieprawidłowy lub wygasły");
      } else if (error.response.status === 403) {
        console.error("\n⚠️  BŁĄD 403 - Brak dostępu:");
        console.error("   Sprawdź uprawnienia konta Tpay");
      }
    } else {
      console.error(`   Message: ${error.message}`);
    }
  }
}

// 4. Sprawdź webhook URL
console.log("\n🌐 KROK 4: Sprawdzanie konfiguracji webhook");
console.log("-".repeat(60));
console.log(
  `Webhook URL: ${process.env.BACKEND_URL}/api/transactions/webhook/tpay`,
);
console.log(`Return URL: ${process.env.FRONTEND_URL}/payment/return`);

// Uruchom testy
(async () => {
  const token = await testOAuth();
  if (token) {
    await testCreateTransaction(token);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🏁 DIAGNOSTYKA ZAKOŃCZONA");
  console.log("=".repeat(60));

  if (!token) {
    console.log("\n❌ PROBLEM: Nie udało się uzyskać tokenu OAuth");
    console.log("   Sprawdź TPAY_CLIENT_ID i TPAY_SECRET w pliku .env");
  } else {
    console.log("\n✅ Autoryzacja działa poprawnie");
    console.log(
      "   Jeśli test transakcji się nie powiódł, sprawdź szczegóły błędu powyżej",
    );
  }
})();
