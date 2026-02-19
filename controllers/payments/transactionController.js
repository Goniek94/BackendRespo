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

      const formattedTransactions = transactions.map((transaction) => {
        const apiResponse = transaction.toApiResponse();
        return {
          ...apiResponse,
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
          // Dodaj szczegóły dla UI
          details: {
            description: apiResponse.description,
            providerId: transaction.providerId || "-",
            paymentMethod: transaction.paymentMethod || "tpay",
            invoiceNumber: transaction.invoiceNumber,
            canDownloadInvoice: transaction.isInvoiceAvailable(),
            adLink: transaction.adId?._id
              ? `/listing/${transaction.adId._id}`
              : null,
          },
          // Dodaj mainInfo dla wyświetlania
          mainInfo: {
            title:
              transaction.adId?.headline ||
              transaction.metadata?.adTitle ||
              apiResponse.description,
            amountString: `- ${transaction.amount.toFixed(2)} PLN`,
            isExpense: true,
            image: transaction.adId?.images?.[0] || null,
          },
        };
      });

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
        // Sanityzacja danych numerycznych - konwersja stringów na liczby
        const sanitizedAdData = { ...adData };

        // Lista pól numerycznych, które mogą przyjść jako stringi
        const numericFields = [
          "doors",
          "seats",
          "year",
          "mileage",
          "price",
          "enginePower",
          "engineCapacity",
          "weight",
          "priceNetto",
          "priceVAT",
          "installmentAmount",
          "remainingInstallments",
          "cessionFee",
          "exchangeValue",
          "exchangePayment",
        ];

        // Konwertuj pola numeryczne
        numericFields.forEach((field) => {
          if (
            sanitizedAdData[field] !== undefined &&
            sanitizedAdData[field] !== null
          ) {
            const value = sanitizedAdData[field];

            // Jeśli to string, spróbuj przekonwertować
            if (typeof value === "string") {
              // Usuń wszystko oprócz cyfr i kropki/przecinka
              const cleaned = value.replace(/[^\d.,]/g, "");
              const parsed = parseFloat(cleaned.replace(",", "."));

              // Jeśli udało się sparsować, użyj wartości, w przeciwnym razie usuń pole
              if (!isNaN(parsed)) {
                sanitizedAdData[field] = parsed;
              } else {
                console.warn(
                  `⚠️ [SANITIZE] Nie można sparsować ${field}: "${value}" - usuwam pole`,
                );
                delete sanitizedAdData[field];
              }
            }
          }
        });

        const newAd = new Ad({
          ...sanitizedAdData,
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
        returnUrl: `${process.env.FRONTEND_URL}/listing/${savedAd._id}?payment=success`,
        errorUrl: `${process.env.FRONTEND_URL}/listing/${savedAd._id}?payment=error`,
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

        // Przekieruj z adId aby frontend mógł od razu przekierować do ogłoszenia
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/return?status=success&transactionId=${transaction._id}&adId=${transaction.adId}`,
        );
      }

      // Płatność nieudana
      console.warn(
        `⚠️ [RETURN] Płatność nieudana dla transakcji ${transaction._id}`,
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/return?status=error&transactionId=${transaction._id}&adId=${transaction.adId}&reason=${tr_error || "unknown"}`,
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

      // OBSŁUGA FAKTURY / POTWIERDZENIA
      try {
        if (transaction.invoiceRequested === true) {
          // A) Klient chce fakturę
          console.log(
            `📄 [COMPLETE] Generuję fakturę dla transakcji ${transaction._id}`,
          );
          const invoicePath = await this.generateInvoicePDF(transaction);
          transaction.invoicePdfPath = invoicePath;
          transaction.invoiceGenerated = true;
          await transaction.save();

          // Wyślij email z fakturą
          await this.sendInvoiceEmail(transaction, invoicePath);
          console.log(`✅ [COMPLETE] Faktura wygenerowana i wysłana`);
        } else {
          // B) Klient nie chce faktury - tylko potwierdzenie
          console.log(
            `📧 [COMPLETE] Wysyłam potwierdzenie płatności (bez faktury)`,
          );
          await this.sendInvoiceEmail(transaction, null);
          console.log(`✅ [COMPLETE] Potwierdzenie płatności wysłane`);
        }
      } catch (emailError) {
        console.error("❌ [COMPLETE] Błąd wysyłania email:", emailError);
        // Nie przerywaj procesu - ogłoszenie jest już aktywne
      }

      // Powiadomienie - używamy listing_added (typ istnieje w enum)
      // WAŻNE: relatedId musi być ustawione aby frontend mógł przekierować do ogłoszenia
      await notificationManager
        .createNotification(
          transaction.userId,
          "Ogłoszenie opublikowane",
          `Twoje ogłoszenie "${ad.headline || `${ad.brand} ${ad.model}`}" zostało pomyślnie opublikowane!`,
          "listing_added",
          {
            adId: ad._id,
            relatedId: ad._id, // KLUCZOWE: to pole jest używane przez frontend do przekierowania
            transactionId: transaction._id,
            metadata: {
              adId: ad._id,
              adTitle: ad.headline || `${ad.brand} ${ad.model}`,
            },
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

      console.log(
        `🔍 [CHECK STATUS] Sprawdzanie statusu transakcji: ${transactionId} dla użytkownika: ${userId}`,
      );

      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId,
      }).populate("adId", "brand model headline slug status isActive");

      if (!transaction) {
        console.error(
          `❌ [CHECK STATUS] Transakcja nie znaleziona: ${transactionId}`,
        );
        return res
          .status(404)
          .json({ success: false, message: "Transakcja nie znaleziona" });
      }

      console.log(
        `✅ [CHECK STATUS] Transakcja znaleziona - status: ${transaction.status}`,
      );

      // Bezpieczne odczytanie danych ogłoszenia
      let adData = null;
      if (transaction.adId) {
        // Sprawdź czy adId jest obiektem (populated) czy tylko ID
        if (transaction.adId._id) {
          // Jest populated
          adData = {
            id: transaction.adId._id,
            status: transaction.adId.status,
            isActive: transaction.adId.isActive,
          };
        } else {
          // Nie jest populated - tylko ID
          console.warn(
            `⚠️ [CHECK STATUS] adId nie jest populated, pobieram dane...`,
          );
          const Ad = (await import("../../models/listings/ad.js")).default;
          const ad = await Ad.findById(transaction.adId);
          if (ad) {
            adData = {
              id: ad._id,
              status: ad.status,
              isActive: ad.isActive,
            };
          }
        }
      }

      res.status(200).json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          ad: adData,
        },
      });
    } catch (error) {
      console.error(`❌ [CHECK STATUS] Błąd:`, error);
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

      console.log(
        `📄 [REQUEST INVOICE] Żądanie faktury dla transakcji ${id} przez użytkownika ${userId}`,
      );

      const transaction = await Transaction.findOne({
        _id: id,
        userId,
      }).populate("userId", "name lastName email");

      if (!transaction) {
        console.error(`❌ [REQUEST INVOICE] Transakcja nie znaleziona: ${id}`);
        return res.status(404).json({ message: "Transakcja nie znaleziona" });
      }

      if (transaction.status !== "completed") {
        console.error(
          `❌ [REQUEST INVOICE] Transakcja nie jest opłacona: ${transaction.status}`,
        );
        return res
          .status(400)
          .json({ message: "Transakcja nie jest opłacona" });
      }

      // Jeśli faktura już istnieje, zwróć ją
      if (transaction.invoiceGenerated && transaction.invoicePdfPath) {
        console.log(
          `✅ [REQUEST INVOICE] Faktura już istnieje: ${transaction.invoicePdfPath}`,
        );
        return res.status(200).json({
          message: "Faktura jest już dostępna do pobrania",
          invoiceAvailable: true,
        });
      }

      // Generuj fakturę
      console.log(`🔄 [REQUEST INVOICE] Generowanie faktury...`);
      const invoicePath = await this.generateInvoicePDF(transaction);
      await this.sendInvoiceEmail(transaction, invoicePath);

      transaction.invoiceRequested = true;
      transaction.invoiceGenerated = true;
      transaction.invoicePdfPath = invoicePath;
      await transaction.save();

      console.log(`✅ [REQUEST INVOICE] Faktura wygenerowana i wysłana`);
      res.status(200).json({
        message: "Faktura została wygenerowana i wysłana na email",
        invoiceAvailable: true,
      });
    } catch (error) {
      console.error(`❌ [REQUEST INVOICE] Błąd:`, error);
      res
        .status(500)
        .json({ message: "Błąd generowania faktury", error: error.message });
    }
  }

  async downloadInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log(
        `📥 [DOWNLOAD INVOICE] Pobieranie faktury dla transakcji ${id} przez użytkownika ${userId}`,
      );

      const transaction = await Transaction.findOne({ _id: id, userId });

      if (!transaction) {
        console.error(`❌ [DOWNLOAD INVOICE] Transakcja nie znaleziona: ${id}`);
        return res.status(404).json({ message: "Transakcja nie znaleziona" });
      }

      // Jeśli faktura nie została jeszcze wygenerowana, wygeneruj ją teraz
      if (!transaction.invoiceGenerated || !transaction.invoicePdfPath) {
        console.log(
          `⚠️ [DOWNLOAD INVOICE] Faktura nie istnieje, generuję nową...`,
        );

        if (transaction.status !== "completed") {
          return res
            .status(400)
            .json({ message: "Transakcja nie jest opłacona" });
        }

        // Generuj fakturę
        const invoicePath = await this.generateInvoicePDF(transaction);
        transaction.invoiceRequested = true;
        transaction.invoiceGenerated = true;
        transaction.invoicePdfPath = invoicePath;
        await transaction.save();

        console.log(
          `✅ [DOWNLOAD INVOICE] Faktura wygenerowana: ${invoicePath}`,
        );
      }

      // Sprawdź czy plik istnieje
      if (!fs.existsSync(transaction.invoicePdfPath)) {
        console.error(
          `❌ [DOWNLOAD INVOICE] Plik nie istnieje: ${transaction.invoicePdfPath}`,
        );
        return res.status(404).json({ message: "Plik faktury niedostępny" });
      }

      const fileName = `Faktura_${transaction.invoiceNumber?.replace(/\//g, "_") || transaction._id}.pdf`;
      console.log(`✅ [DOWNLOAD INVOICE] Wysyłanie pliku: ${fileName}`);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      fs.createReadStream(transaction.invoicePdfPath).pipe(res);
    } catch (error) {
      console.error(`❌ [DOWNLOAD INVOICE] Błąd:`, error);
      res.status(500).json({ message: "Błąd serwera", error: error.message });
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

    // Rozróżnienie: faktura vs potwierdzenie
    if (invoicePath) {
      // Klient chce fakturę - wyślij z załącznikiem
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@autosell.pl",
        to: transaction.userId.email,
        subject: "Twoja Faktura - AutoSell",
        html: "<p>W załączniku przesyłamy fakturę.</p>",
        attachments: [{ filename: "Faktura.pdf", path: invoicePath }],
      });
    } else {
      // Klient nie chce faktury - wyślij tylko potwierdzenie
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@autosell.pl",
        to: transaction.userId.email,
        subject: "Potwierdzenie płatności - AutoSell",
        html: "<p>Dziękujemy za opłacenie ogłoszenia. Twoja płatność została zaksięgowana, a ogłoszenie jest aktywne.</p>",
      });
    }
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
