import Transaction from "../../models/payments/Transaction.js";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import notificationManager from "../../services/notificationManager.js";
import tpayService from "../../services/tpay/tpayService.js";

import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Kontroler do zarządzania transakcjami (Zintegrowany z Tpay)
 */
class TransactionController {
  /**
   * 1. Pobieranie historii transakcji (To widzi użytkownik w profilu)
   */
  async getTransactions(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user.userId;

      console.log(
        `📋 [TRANSACTIONS] Pobieranie transakcji dla użytkownika: ${userId}`,
      );

      const transactions = await Transaction.findByUser(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      const totalTransactions = await Transaction.countByUser(userId, status);

      const formattedTransactions = transactions.map((transaction) => ({
        ...transaction.toApiResponse(),
        ad: transaction.adId
          ? {
              id: transaction.adId._id,
              headline: transaction.adId.headline,
              brand: transaction.adId.brand,
              model: transaction.adId.model,
              price: transaction.adId.price,
              images: transaction.adId.images,
            }
          : null,
      }));

      res.status(200).json({
        transactions: formattedTransactions,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTransactions / parseInt(limit)),
        totalTransactions,
        hasNextPage:
          parseInt(page) < Math.ceil(totalTransactions / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      });
    } catch (error) {
      console.error(
        "❌ [TRANSACTIONS] Błąd podczas pobierania transakcji:",
        error,
      );
      res.status(500).json({
        message: "Błąd podczas pobierania transakcji",
        error: error.message,
      });
    }
  }

  /**
   * 2. Inicjacja transakcji - KLUCZOWY MOMENT
   */
  async createTransaction(req, res) {
    try {
      const {
        adData,
        adId,
        amount,
        type = "standard_listing",
        invoiceData,
      } = req.body;
      const userId = req.user.userId;

      if (!adData && !adId) {
        return res
          .status(400)
          .json({ message: "Brak wymaganych danych: adData lub adId" });
      }

      if (!amount) {
        return res
          .status(400)
          .json({ message: "Brak wymaganej kwoty (amount)" });
      }

      const user = await User.findById(userId);
      if (!user)
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });

      let savedAd;
      if (adData) {
        const newAd = new Ad({
          ...adData,
          user: userId,
          owner: userId,
          status: "pending_payment",
          ownerName: user.name || "",
          ownerLastName: user.lastName || "",
          ownerEmail: user.email,
          ownerPhone: user.phone || "",
          ownerRole: user.role || "user",
        });
        savedAd = await newAd.save();
      } else {
        savedAd = await Ad.findById(adId);
        if (!savedAd)
          return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      const transactionIdInternal = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const transaction = new Transaction({
        userId,
        adId: savedAd._id,
        amount: parseFloat(amount),
        currency: "PLN",
        type,
        status: "pending",
        paymentMethod: "tpay",
        transactionId: transactionIdInternal,
        invoiceRequested: !!invoiceData,
        invoiceDetails: invoiceData || {},
        metadata: {
          adTitle:
            savedAd.headline ||
            savedAd.title ||
            `${savedAd.brand} ${savedAd.model}`,
          adType: type,
          createdAt: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      const savedTransaction = await transaction.save();

      const tpayData = await tpayService.createTransaction({
        amount: amount,
        description: `Opłata za ogłoszenie: ${savedAd.brand} ${savedAd.model}`,
        email: user.email,
        name: user.name || "Użytkownik",
        transactionId: savedTransaction._id.toString(),
        returnUrl: `${process.env.FRONTEND_URL}/payment/return`,
        errorUrl: `${process.env.FRONTEND_URL}/payment/return`,
      });

      if (tpayData.transactionPaymentUrl) {
        savedTransaction.providerId = tpayData.transactionId;
        await savedTransaction.save();

        res.status(201).json({
          success: true,
          paymentUrl: tpayData.transactionPaymentUrl,
          transactionId: savedTransaction._id,
          adId: savedAd._id,
        });
      } else {
        throw new Error("Brak URL płatności w odpowiedzi Tpay");
      }
    } catch (error) {
      console.error("❌ [TPAY] Błąd podczas tworzenia transakcji:", error);
      res.status(500).json({
        message: "Błąd podczas inicjowania płatności",
        error: error.message,
      });
    }
  }

  /**
   * 3. Webhook Tpay - Tutaj dzieje się magia po opłaceniu
   */
  async handleTpayWebhook(req, res) {
    try {
      const notification = req.body;

      console.log("🔔 [WEBHOOK] Otrzymano notyfikację:", notification);

      const isValid = tpayService.verifyNotificationSignature(notification);

      if (!isValid) {
        console.error("❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!");
        return res.send("TRUE"); // Tpay wymaga TRUE nawet dla błędów
      }

      if (notification.tr_status === "TRUE") {
        const transactionIdFromTpay = notification.tr_crc;

        // KLUCZOWA POPRAWKA: Szukamy transakcji na dwa sposoby
        let transaction = await Transaction.findById(
          transactionIdFromTpay,
        ).catch(() => null);
        if (!transaction) {
          transaction = await Transaction.findOne({
            transactionId: transactionIdFromTpay,
          });
        }

        if (!transaction) {
          console.error(
            "❌ [WEBHOOK] Transakcja nie znaleziona:",
            transactionIdFromTpay,
          );
          return res.send("TRUE");
        }

        if (transaction.status !== "completed") {
          await this.completeTransaction(transaction, notification.tr_id);
          console.log(
            `✅ [WEBHOOK] Transakcja ${transaction._id} zakończona sukcesem`,
          );
        } else {
          console.log(`ℹ️ [WEBHOOK] Transakcja już była completed`);
        }
      }

      res.send("TRUE");
    } catch (error) {
      console.error("❌ [WEBHOOK] KRYTYCZNY BŁĄD:", error);
      res.send("TRUE"); // Nawet przy błędzie zwróć TRUE
    }
  }

  /**
   * 3b. Obsługa powrotu użytkownika z Tpay (success/error)
   */
  async handlePaymentReturn(req, res) {
    try {
      const { tr_id, tr_status, tr_crc, tr_error } = req.query;

      console.log("📥 [RETURN] Użytkownik wrócił z Tpay:", req.query);

      // Znajdź transakcję
      let transaction = await Transaction.findById(tr_crc).catch(() => null);
      if (!transaction) {
        transaction = await Transaction.findOne({ transactionId: tr_crc });
      }

      if (!transaction) {
        console.error("❌ [RETURN] Transakcja nie znaleziona:", tr_crc);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/error?reason=not_found`,
        );
      }

      // Jeśli płatność SUCCESS
      if (tr_status === "TRUE") {
        // Zaktualizuj transakcję (jeśli webhook jeszcze nie dotarł)
        if (transaction.status !== "completed") {
          await this.completeTransaction(transaction, tr_id);
          console.log(
            `✅ [RETURN] Transakcja ${transaction._id} zakończona przez return URL`,
          );
        }

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/return?status=success&transactionId=${transaction._id}`,
        );
      }

      // Płatność nieudana
      console.warn(
        `⚠️ [RETURN] Płatność nieudana dla transakcji ${transaction._id}`,
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/return?status=error&transactionId=${transaction._id}&reason=${tr_error || "unknown"}`,
      );
    } catch (error) {
      console.error("❌ [RETURN] Błąd obsługi powrotu:", error);
      res.redirect(
        `${process.env.FRONTEND_URL}/payment/error?reason=system_error`,
      );
    }
  }

  /**
   * 3c. Wydzielona logika finalizacji transakcji (używana w webhook I return)
   */
  async completeTransaction(transaction, tpayTransactionId) {
    try {
      console.log(
        `🔄 [COMPLETE] Rozpoczynam finalizację transakcji ${transaction._id}`,
      );

      transaction.status = "completed";
      transaction.paidAt = new Date();
      transaction.providerTransactionId = tpayTransactionId;
      transaction.invoiceNumber = `FV/${new Date().getFullYear()}/${transaction.transactionId.slice(-6).toUpperCase()}`;
      await transaction.save();

      console.log(
        `✅ [COMPLETE] Transakcja ${transaction._id} zapisana jako completed`,
      );

      // AKTYWACJA OGŁOSZENIA
      const ad = await Ad.findById(transaction.adId);
      if (!ad) {
        console.error(
          `❌ [COMPLETE] Ogłoszenie ${transaction.adId} nie znalezione!`,
        );
        return false;
      }

      console.log(
        `📊 [COMPLETE] Ogłoszenie ${ad._id} - status PRZED: "${ad.status}"`,
      );

      // Ustaw status na active
      ad.status = "active";

      // Ustaw datę wygaśnięcia (30 dni) - POPRAWIONE: expiresAt zamiast expirationDate
      ad.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Dla wyróżnionych ogłoszeń
      if (
        transaction.type === "featured_listing" ||
        transaction.type === "wyróżnione"
      ) {
        ad.featured = true;
        ad.featuredAt = new Date();
        // expiresAt już ustawione powyżej
        console.log(`⭐ [COMPLETE] Ogłoszenie oznaczone jako WYRÓŻNIONE`);
      }

      await ad.save();
      console.log(`✅ [COMPLETE] Ogłoszenie ${ad._id} zapisane w bazie`);
      console.log(`📊 [COMPLETE] Status PO zapisie: "${ad.status}"`);

      // Weryfikacja - sprawdź czy faktycznie zapisało się w bazie
      const verifyAd = await Ad.findById(ad._id);
      console.log(
        `🔍 [COMPLETE] Weryfikacja z bazy - status: "${verifyAd.status}"`,
      );

      // Powiadomienie - używamy listing_added (typ istnieje w enum)
      await notificationManager
        .createNotification(
          transaction.userId,
          "Ogłoszenie opublikowane",
          `Twoje ogłoszenie "${ad.brand} ${ad.model}" zostało pomyślnie opublikowane!`,
          "listing_added",
          {
            adId: ad._id,
            transactionId: transaction._id,
          },
        )
        .catch((e) => console.error("❌ [COMPLETE] Błąd powiadomienia:", e));

      console.log(`🎉 [COMPLETE] Finalizacja zakończona sukcesem!`);
      return true;
    } catch (error) {
      console.error("❌ [COMPLETE] BŁĄD podczas finalizacji:", error);
      console.error("❌ [COMPLETE] Stack trace:", error.stack);
      throw error;
    }
  }

  /**
   * 4. Sprawdzanie statusu płatności (dla frontendu)
   */
  async checkPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;

      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId,
      }).populate("adId", "brand model headline slug status isActive");

      if (!transaction)
        return res
          .status(404)
          .json({ success: false, message: "Transakcja nie znaleziona" });

      res.status(200).json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          ad: transaction.adId
            ? {
                id: transaction.adId._id,
                status: transaction.adId.status,
                isActive: transaction.adId.isActive,
              }
            : null,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 5. Faktury i PDF
   */
  async requestInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const transaction = await Transaction.findOne({
        _id: id,
        userId,
      }).populate("userId", "name lastName email");
      if (!transaction || transaction.status !== "completed") {
        return res
          .status(400)
          .json({ message: "Transakcja nie jest opłacona" });
      }

      const invoicePath = await this.generateInvoicePDF(transaction);
      await this.sendInvoiceEmail(transaction, invoicePath);

      transaction.invoiceGenerated = true;
      transaction.invoicePdfPath = invoicePath;
      await transaction.save();

      res.status(200).json({ message: "Faktura wysłana na email." });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Błąd generowania faktury", error: error.message });
    }
  }

  async downloadInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const transaction = await Transaction.findOne({ _id: id, userId });

      if (
        !transaction ||
        !transaction.invoicePdfPath ||
        !fs.existsSync(transaction.invoicePdfPath)
      ) {
        return res.status(404).json({ message: "Plik faktury niedostępny." });
      }

      const fileName = `Faktura_${transaction.invoiceNumber?.replace(/\//g, "_")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      fs.createReadStream(transaction.invoicePdfPath).pipe(res);
    } catch (error) {
      res.status(500).json({ message: "Błąd serwera" });
    }
  }

  async generateInvoicePDF(transaction) {
    return new Promise((resolve, reject) => {
      try {
        const invoicesDir = path.join(process.cwd(), "uploads", "invoices");
        if (!fs.existsSync(invoicesDir))
          fs.mkdirSync(invoicesDir, { recursive: true });

        const filePath = path.join(
          invoicesDir,
          `invoice_${transaction._id}_${Date.now()}.pdf`,
        );
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);
        doc.fontSize(20).text("FAKTURA VAT / PARAGON", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Numer: ${transaction.invoiceNumber || "Brak"}`);
        doc.text(
          `Data: ${new Date(transaction.paidAt || Date.now()).toLocaleDateString("pl-PL")}`,
        );
        doc.text(`Kwota: ${transaction.amount} PLN`);
        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendInvoiceEmail(transaction, invoicePath) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@autosell.pl",
      to: transaction.userId.email,
      subject: "Twoja Faktura - AutoSell",
      html: "<p>Dziękujemy za płatność. W załączniku Twoja faktura.</p>",
      attachments: [{ filename: "Faktura.pdf", path: invoicePath }],
    });
  }

  getServiceName(type) {
    const map = {
      standard_listing: "Ogłoszenie Standard",
      featured_listing: "Ogłoszenie Wyróżnione",
    };
    return map[type] || type;
  }
}

const transactionController = new TransactionController();
export default transactionController;
