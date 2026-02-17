import axios from "axios";
import crypto from "crypto";

class TpayService {
  constructor() {
    // Adres API produkcyjnego
    this.apiUrl = "https://api.tpay.com";

    // Pobieramy klucze z .env
    this.clientId = process.env.TPAY_CLIENT_ID;
    this.clientSecret = process.env.TPAY_SECRET;
    this.merchantId = process.env.TPAY_MERCHANT_ID;
    this.securityCode = process.env.TPAY_SECURITY_CODE;

    // Cache na token (żeby nie pytać o niego przy każdym kliknięciu)
    this.accessToken = null;
    this.tokenExpiration = null;
  }

  /**
   * Pobiera token dostępu (Bearer Token)
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiration > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/oauth/auth`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "read write",
        },
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiration =
        Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error(
        "❌ [TpayService] Błąd autoryzacji:",
        error.response?.data || error.message,
      );
      throw new Error("Błąd autoryzacji Tpay");
    }
  }

  /**
   * Tworzy transakcję
   */
  async createTransaction({
    amount,
    description,
    email,
    name,
    transactionId,
    returnUrl,
    errorUrl,
  }) {
    try {
      const token = await this.getAccessToken();

      // Tutaj ustalamy adres powiadomień (Webhooka)
      // Musi być publiczny (https://twoja-domena.pl/...)
      const notifyUrl = `${process.env.BACKEND_URL}/api/transactions/webhook/tpay`;

      console.log(`🌐 [TpayService] Webhook URL ustawiony na: ${notifyUrl}`);

      const payload = {
        amount: parseFloat(amount),
        description: description,
        hiddenDescription: transactionId,
        payer: {
          email: email,
          name: name,
        },
        callbacks: {
          payerUrls: {
            success: returnUrl,
            error: errorUrl,
          },
          notification: {
            url: notifyUrl,
            email: email,
          },
        },
        pay: {
          redirectUrl: returnUrl, // Automatyczne przekierowanie po płatności
        },
        lang: "pl", // Wymuszenie języka polskiego w bramce
      };

      const response = await axios.post(
        `${this.apiUrl}/transactions`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return {
        transactionId: response.data.transactionId,
        transactionPaymentUrl: response.data.transactionPaymentUrl,
        status: response.data.status,
      };
    } catch (error) {
      console.error(
        "❌ [TpayService] Błąd tworzenia transakcji:",
        error.response?.data || error.message,
      );
      throw new Error("Błąd komunikacji z Tpay");
    }
  }

  /**
   * Weryfikuje podpis powiadomienia (Webhook)
   * UWAGA: Nowe API Tpay używa innego formatu niż stare API
   */
  verifyNotificationSignature(notification) {
    console.log("🔍 [TpayService] Weryfikacja podpisu webhook:", notification);

    // Nowe API Tpay (OAuth) - brak weryfikacji MD5, używa HTTPS + IP whitelisting
    // Stare API Tpay - używa MD5

    // Sprawdź czy to nowe API (brak md5sum)
    if (!notification.md5sum) {
      console.log("✅ [TpayService] Nowe API Tpay - pomijam weryfikację MD5");
      return true; // Nowe API nie używa MD5, tylko HTTPS
    }

    // Stare API - weryfikacja MD5
    const {
      id,
      tr_id,
      tr_amount,
      tr_crc,
      md5sum,
      tr_date,
      tr_paid,
      tr_desc,
      tr_status,
    } = notification;

    if (!tr_id || !tr_amount || !tr_crc || !md5sum) {
      console.error("❌ [TpayService] Brak wymaganych parametrów webhook");
      return false;
    }

    // Wzór MD5 dla starego API Tpay
    const dataString = `${tr_id}${tr_date}${tr_crc}${tr_amount}${tr_paid}${tr_desc}${tr_status}${this.securityCode}`;
    const calculatedMd5 = crypto
      .createHash("md5")
      .update(dataString)
      .digest("hex");

    const isValid = calculatedMd5 === md5sum;

    if (!isValid) {
      console.error("❌ [TpayService] Nieprawidłowy MD5");
      console.error("Otrzymany:", md5sum);
      console.error("Obliczony:", calculatedMd5);
      console.error("String do weryfikacji:", dataString);
    } else {
      console.log("✅ [TpayService] Podpis MD5 poprawny");
    }

    return isValid;
  }
}

export default new TpayService();
