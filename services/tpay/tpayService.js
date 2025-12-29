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
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiration =
        Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error(
        "❌ [TpayService] Błąd autoryzacji:",
        error.response?.data || error.message
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
      const notifyUrl = `${process.env.BACKEND_URL}/api/payments/webhook`;

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
        lang: "pl", // Wymuszenie języka polskiego w bramce
      };

      const response = await axios.post(
        `${this.apiUrl}/transactions`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return {
        transactionId: response.data.transactionId,
        transactionPaymentUrl: response.data.transactionPaymentUrl,
        status: response.data.status,
      };
    } catch (error) {
      console.error(
        "❌ [TpayService] Błąd tworzenia transakcji:",
        error.response?.data || error.message
      );
      throw new Error("Błąd komunikacji z Tpay");
    }
  }

  /**
   * Weryfikuje podpis powiadomienia (Webhook)
   */
  verifyNotificationSignature(notification) {
    const { id, tr_id, tr_amount, tr_crc, md5sum } = notification;

    if (!id || !tr_id || !tr_amount || !tr_crc || !md5sum) {
      return false;
    }

    // Wzór MD5 dla powiadomień Tpay
    const dataString = `${id}${tr_id}${tr_amount}${tr_crc}${this.securityCode}`;
    const calculatedMd5 = crypto
      .createHash("md5")
      .update(dataString)
      .digest("hex");

    return calculatedMd5 === md5sum;
  }
}

export default new TpayService();
