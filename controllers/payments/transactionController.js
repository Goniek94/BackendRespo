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

      // Formatowanie danych dla frontendu
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

      console.log(
        `✅ [TRANSACTIONS] Znaleziono ${totalTransactions} transakcji`,
      );

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
   * Tu tworzymy OGŁOSZENIE + TRANSAKCJĘ atomowo, zanim wyślemy do Tpay.
   */
  async createTransaction(req, res) {
    try {
      const {
        adData, // Dane ogłoszenia z formularza (NOWY SPOSÓB)
        adId, // ID istniejącego ogłoszenia (STARY SPOSÓB - backward compatibility)
        amount,
        type = "standard_listing",
        paymentMethod,
        invoiceData,
      } = req.body;

      const userId = req.user.userId;

      console.log("🚀 [TPAY] ========================================");
      console.log("🚀 [TPAY] INICJACJA PŁATNOŚCI TPAY");
      console.log("🚀 [TPAY] ========================================");
      console.log("📝 [TPAY] Dane wejściowe:", {
        userId,
        hasAdData: !!adData,
        hasAdId: !!adId,
        amount,
        type,
        paymentMethod,
        hasInvoiceData: !!invoiceData,
      });

      // Walidacja - musi być albo adData albo adId
      if (!adData && !adId) {
        console.log("❌ [TPAY] Brak wymaganych danych");
        return res.status(400).json({
          message: "Brak wymaganych danych: adData lub adId, oraz amount",
        });
      }

      if (!amount) {
        console.log("❌ [TPAY] Brak kwoty");
        return res.status(400).json({
          message: "Brak wymaganej kwoty (amount)",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        console.log("❌ [TPAY] Użytkownik nie znaleziony:", userId);
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      console.log("✅ [TPAY] Znaleziono użytkownika:", user.email);

      let savedAd;

      // --- KROK 1: Utwórz NOWE ogłoszenie LUB pobierz istniejące ---
      if (adData) {
        // NOWY SPOSÓB: Tworzymy ogłoszenie ze statusem "pending_payment"
        console.log("🚗 [TPAY] Tworzenie NOWEGO ogłoszenia w bazie danych...");

        const newAd = new Ad({
          ...adData,
          user: userId,
          owner: userId, // Legacy support
          status: "pending_payment", // Kluczowe: ogłoszenie czeka na płatność
          ownerName: user.name || "",
          ownerLastName: user.lastName || "",
          ownerEmail: user.email,
          ownerPhone: user.phone || "",
          ownerRole: user.role || "user",
        });

        savedAd = await newAd.save();
        console.log("✅ [TPAY] Ogłoszenie utworzone z ID:", savedAd._id);
        console.log("✅ [TPAY] Status ogłoszenia:", savedAd.status);
      } else {
        // STARY SPOSÓB: Pobieramy istniejące ogłoszenie (backward compatibility)
        console.log("🔍 [TPAY] Pobieranie istniejącego ogłoszenia z ID:", adId);

        savedAd = await Ad.findById(adId);

        if (!savedAd) {
          console.log("❌ [TPAY] Ogłoszenie nie znalezione:", adId);
          return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
        }

        console.log("✅ [TPAY] Znaleziono ogłoszenie:", savedAd._id);
        console.log("✅ [TPAY] Status ogłoszenia:", savedAd.status);
      }

      // --- KROK 2: Zapisz transakcję w bazie jako OCZEKUJĄCA (PENDING) ---
      const transactionIdInternal = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;

      console.log("💾 [TPAY] Tworzenie transakcji w bazie danych...");
      console.log("💾 [TPAY] ID transakcji:", transactionIdInternal);

      // Przygotuj dane transakcji (bez invoiceNumber - zostanie dodane przez middleware)
      const transactionData = {
        userId,
        adId: savedAd._id, // Powiązanie z nowo utworzonym ogłoszeniem
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
      };

      // NIE dodawaj invoiceNumber - zostanie dodane automatycznie przez middleware gdy faktura zostanie wygenerowana
      const transaction = new Transaction(transactionData);

      const savedTransaction = await transaction.save();
      console.log("✅ [TPAY] Transakcja zapisana w bazie z statusem: pending");
      console.log("✅ [TPAY] MongoDB ID:", savedTransaction._id);

      // --- KROK 3: Wywołaj Tpay po link do płatności ---
      console.log("🌐 [TPAY] Wywołanie API Tpay...");

      const tpayData = await tpayService.createTransaction({
        amount: amount,
        description: `Opłata za ogłoszenie: ${savedAd.brand} ${savedAd.model}`,
        email: user.email,
        name: user.name || "Użytkownik",
        transactionId: savedTransaction._id.toString(),
        // Redirect to payment return page (existing flow)
        returnUrl: `${process.env.FRONTEND_URL}/payment/return?status=success`,
        errorUrl: `${process.env.FRONTEND_URL}/payment/return?status=error`,
      });

      console.log("✅ [TPAY] Odpowiedź z Tpay:", {
        transactionId: tpayData.transactionId,
        hasPaymentUrl: !!tpayData.transactionPaymentUrl,
        status: tpayData.status,
      });

      if (tpayData.transactionPaymentUrl) {
        // Aktualizujemy ID z Tpay w naszej bazie
        savedTransaction.providerId = tpayData.transactionId;
        await savedTransaction.save();

        console.log(
          "✅ [TPAY] Zaktualizowano providerId:",
          tpayData.transactionId,
        );
        console.log("🔗 [TPAY] URL płatności:", tpayData.transactionPaymentUrl);
        console.log("🚀 [TPAY] ========================================");
        console.log("🚀 [TPAY] PRZEKIEROWANIE DO BRAMKI PŁATNOŚCI");
        console.log("🚀 [TPAY] ========================================");

        // Zwracamy URL, frontend przekierowuje usera do banku
        res.status(201).json({
          success: true,
          message: "Transakcja utworzona, przekierowanie do płatności...",
          paymentUrl: tpayData.transactionPaymentUrl,
          transactionId: savedTransaction._id,
          adId: savedAd._id,
        });
      } else {
        console.log("❌ [TPAY] Brak URL płatności w odpowiedzi");
        throw new Error("Brak URL płatności w odpowiedzi Tpay");
      }
    } catch (error) {
      console.error(
        "❌ [TPAY] KRYTYCZNY BŁĄD podczas tworzenia transakcji:",
        error,
      );
      console.error("❌ [TPAY] Stack trace:", error.stack);
      res.status(500).json({
        message: "Błąd podczas inicjowania płatności",
        error: error.message,
      });
    }
  }

  /**
   * 3. Webhook Tpay - Tutaj dzieje się magia po opłaceniu
   * Zmienia status w historii na "Zakończona", generuje numer faktury i aktywuje ogłoszenie.
   */
  async handleTpayWebhook(req, res) {
    try {
      const notification = req.body;

      console.log("🔔 [WEBHOOK] ========================================");
      console.log("🔔 [WEBHOOK] OTRZYMANO POWIADOMIENIE Z TPAY");
      console.log("🔔 [WEBHOOK] ========================================");
      console.log("📦 [WEBHOOK] Dane:", JSON.stringify(notification, null, 2));

      // Weryfikacja podpisu (bezpieczeństwo)
      const isValid = tpayService.verifyNotificationSignature(notification);

      if (!isValid) {
        console.error("❌ [WEBHOOK] BŁĘDNA SUMA KONTROLNA!");
        console.error("❌ [WEBHOOK] Możliwa próba ataku lub błąd konfiguracji");
        return res.send("TRUE"); // Zwracamy TRUE żeby Tpay nie ponawiał
      }

      console.log("✅ [WEBHOOK] Podpis zweryfikowany poprawnie");

      // Jeśli status = TRUE (Zapłacono)
      if (notification.tr_status === "TRUE") {
        console.log("💰 [WEBHOOK] Status płatności: OPŁACONO");

        const transactionDbId = notification.tr_crc; // To jest ID naszej transakcji z bazy
        console.log("🔍 [WEBHOOK] Szukam transakcji w bazie:", transactionDbId);

        const transaction = await Transaction.findById(transactionDbId);

        if (!transaction) {
          console.error("❌ [WEBHOOK] Transakcja nie znaleziona w bazie!");
          return res.send("TRUE");
        }

        console.log("✅ [WEBHOOK] Znaleziono transakcję:", {
          id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          adId: transaction.adId,
        });

        // Przetwarzamy tylko, jeśli status w bazie nie jest jeszcze 'completed'
        if (transaction.status !== "completed") {
          console.log("🔄 [WEBHOOK] Aktualizacja statusu transakcji...");

          // A. Aktualizacja statusu transakcji w historii
          transaction.status = "completed";
          transaction.paidAt = new Date();
          transaction.providerTransactionId = notification.tr_id;

          // B. Generowanie numeru faktury
          transaction.invoiceNumber = `FV/${new Date().getFullYear()}/${transaction.transactionId
            .slice(-6)
            .toUpperCase()}`;

          await transaction.save();

          console.log("✅ [WEBHOOK] Transakcja zaktualizowana:");
          console.log("   - Status: completed");
          console.log("   - Numer faktury:", transaction.invoiceNumber);
          console.log("   - Data opłacenia:", transaction.paidAt);

          // C. Aktywacja ogłoszenia (Produkt)
          console.log("🚗 [WEBHOOK] Aktywacja ogłoszenia...");

          const ad = await Ad.findById(transaction.adId);
          if (ad) {
            console.log(
              "✅ [WEBHOOK] Znaleziono ogłoszenie:",
              `${ad.brand} ${ad.model}`,
            );

            // Logika dla wyróżnień
            if (
              transaction.type === "featured_listing" ||
              transaction.type === "wyróżnione"
            ) {
              ad.isFeatured = true;
              ad.featuredUntil = new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              );
              console.log("⭐ [WEBHOOK] Ogłoszenie oznaczone jako WYRÓŻNIONE");
            }

            // Aktywacja ogłoszenia (bo zostało opłacone)
            ad.status = "active";
            ad.expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await ad.save();

            console.log("✅ [WEBHOOK] Ogłoszenie AKTYWOWANE");
            console.log("   - Status: active");
            console.log("   - Data wygaśnięcia:", ad.expirationDate);
            console.log("   - Wyróżnione:", ad.isFeatured || false);
          } else {
            console.error(
              "❌ [WEBHOOK] Nie znaleziono ogłoszenia:",
              transaction.adId,
            );
          }

          // D. Powiadomienie użytkownika
          try {
            console.log(
              "📧 [WEBHOOK] Wysyłanie powiadomienia do użytkownika...",
            );

            await notificationManager.createNotification(
              transaction.userId,
              "Płatność zatwierdzona",
              `Twoje ogłoszenie zostało opłacone i aktywowane. Numer transakcji: ${transaction.transactionId}`,
              "payment_success",
              { transactionId: transaction.transactionId },
            );

            console.log("✅ [WEBHOOK] Powiadomienie wysłane");
          } catch (e) {
            console.error("❌ [WEBHOOK] Błąd wysyłania powiadomienia:", e);
          }

          console.log("🎉 [WEBHOOK] ========================================");
          console.log("🎉 [WEBHOOK] TRANSAKCJA SFINALIZOWANA POMYŚLNIE");
          console.log("🎉 [WEBHOOK] ========================================");
        } else {
          console.log("ℹ️ [WEBHOOK] Transakcja już przetworzona, pomijam");
        }
      } else if (notification.tr_status === "FALSE") {
        // Jeśli status = FALSE (Płatność odrzucona przez bank)
        console.log("❌ [WEBHOOK] Status płatności: ODRZUCONA");

        const transaction = await Transaction.findById(notification.tr_crc);
        if (transaction && transaction.status === "pending") {
          transaction.status = "failed";
          await transaction.save();
          console.log(
            "✅ [WEBHOOK] Transakcja oznaczona jako nieudana (failed)",
          );

          // Powiadomienie użytkownika o błędzie
          try {
            await notificationManager.createNotification(
              transaction.userId,
              "Płatność nieudana",
              `Płatność za ogłoszenie została odrzucona. Możesz spróbować ponownie.`,
              "payment_failed",
              { transactionId: transaction.transactionId },
            );
          } catch (e) {
            console.error("❌ [WEBHOOK] Błąd wysyłania powiadomienia:", e);
          }
        }
      } else if (notification.tr_status === "CHARGEBACK") {
        // Jeśli status = CHARGEBACK (Użytkownik anulował płatność)
        console.log("🔙 [WEBHOOK] Status płatności: ANULOWANA (CHARGEBACK)");

        const transaction = await Transaction.findById(notification.tr_crc);
        if (transaction && transaction.status === "pending") {
          transaction.status = "cancelled";
          await transaction.save();
          console.log(
            "✅ [WEBHOOK] Transakcja oznaczona jako anulowana (cancelled)",
          );

          // Powiadomienie użytkownika o anulowaniu
          try {
            await notificationManager.createNotification(
              transaction.userId,
              "Płatność anulowana",
              `Płatność za ogłoszenie została anulowana.`,
              "payment_cancelled",
              { transactionId: transaction.transactionId },
            );
          } catch (e) {
            console.error("❌ [WEBHOOK] Błąd wysyłania powiadomienia:", e);
          }
        }
      } else {
        // Inne statusy
        console.log(
          "⚠️ [WEBHOOK] Nieznany status płatności:",
          notification.tr_status,
        );
      }

      console.log("🔔 [WEBHOOK] Wysyłam potwierdzenie do Tpay: TRUE");
      // Tpay wymaga 'TRUE' na koniec
      res.send("TRUE");
    } catch (error) {
      console.error("❌ [WEBHOOK] KRYTYCZNY BŁĄD:", error);
      console.error("❌ [WEBHOOK] Stack trace:", error.stack);
      res.status(500).send("ERROR");
    }
  }

  /**
   * 4. Sprawdzanie statusu płatności (dla frontendu po powrocie z Tpay)
   */
  async checkPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;

      console.log(
        `🔍 [STATUS] Sprawdzanie statusu transakcji: ${transactionId}`,
      );

      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId,
      }).populate("adId", "brand model headline slug status");

      if (!transaction) {
        console.log("❌ [STATUS] Transakcja nie znaleziona");
        return res.status(404).json({
          success: false,
          message: "Transakcja nie znaleziona",
        });
      }

      console.log(`✅ [STATUS] Status transakcji: ${transaction.status}`);

      res.status(200).json({
        success: true,
        transaction: {
          id: transaction._id,
          status: transaction.status,
          amount: transaction.amount,
          type: transaction.type,
          paidAt: transaction.paidAt,
          ad: transaction.adId
            ? {
                id: transaction.adId._id,
                brand: transaction.adId.brand,
                model: transaction.adId.model,
                headline: transaction.adId.headline,
                slug: transaction.adId.slug,
                status: transaction.adId.status,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("❌ [STATUS] Błąd sprawdzania statusu:", error);
      res.status(500).json({
        success: false,
        message: "Błąd podczas sprawdzania statusu płatności",
        error: error.message,
      });
    }
  }

  /**
   * 5. Ręczne generowanie faktury PDF (na żądanie z historii)
   */
  async requestInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log(`📄 [INVOICE] Generowanie faktury dla transakcji: ${id}`);

      const transaction = await Transaction.findOne({
        _id: id,
        userId,
      }).populate("userId", "name lastName email");

      if (!transaction) {
        console.log("❌ [INVOICE] Transakcja nie znaleziona");
        return res.status(404).json({ message: "Transakcja nie znaleziona" });
      }

      // Sprawdzamy czy opłacona
      if (transaction.status !== "completed") {
        console.log("❌ [INVOICE] Transakcja nie jest opłacona");
        return res
          .status(400)
          .json({ message: "Transakcja nie jest opłacona, brak faktury." });
      }

      console.log("✅ [INVOICE] Generowanie PDF...");

      // Generowanie PDF
      const invoicePath = await this.generateInvoicePDF(transaction);

      console.log("✅ [INVOICE] PDF wygenerowany:", invoicePath);
      console.log("📧 [INVOICE] Wysyłanie na email...");

      // Wysyłka mailem
      await this.sendInvoiceEmail(transaction, invoicePath);

      // Aktualizacja stanu
      transaction.invoiceGenerated = true;
      transaction.invoicePdfPath = invoicePath;
      await transaction.save();

      console.log("✅ [INVOICE] Faktura wygenerowana i wysłana");

      res.status(200).json({
        message: "Faktura wygenerowana i wysłana na email.",
        transaction: transaction.toApiResponse(),
      });
    } catch (error) {
      console.error("❌ [INVOICE] Błąd faktury:", error);
      res
        .status(500)
        .json({ message: "Błąd generowania faktury", error: error.message });
    }
  }

  /**
   * 5. Pobieranie PDF faktury
   */
  async downloadInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log(`📥 [DOWNLOAD] Pobieranie faktury dla transakcji: ${id}`);

      const transaction = await Transaction.findOne({ _id: id, userId });

      if (
        !transaction ||
        !transaction.invoicePdfPath ||
        !fs.existsSync(transaction.invoicePdfPath)
      ) {
        console.log("❌ [DOWNLOAD] Plik faktury niedostępny");
        return res.status(404).json({ message: "Plik faktury niedostępny." });
      }

      const fileName = `Faktura_${
        transaction.invoiceNumber?.replace(/\//g, "_") || "auto"
      }.pdf`;

      console.log("✅ [DOWNLOAD] Wysyłanie pliku:", fileName);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      const fileStream = fs.createReadStream(transaction.invoicePdfPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("❌ [DOWNLOAD] Błąd pobierania:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  }

  // --- Helpery ---

  async generateInvoicePDF(transaction) {
    return new Promise((resolve, reject) => {
      try {
        const invoicesDir = path.join(process.cwd(), "uploads", "invoices");
        if (!fs.existsSync(invoicesDir))
          fs.mkdirSync(invoicesDir, { recursive: true });

        const fileName = `invoice_${transaction._id}_${Date.now()}.pdf`;
        const filePath = path.join(invoicesDir, fileName);
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Treść faktury
        doc.fontSize(20).text("FAKTURA VAT / PARAGON", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Numer: ${transaction.invoiceNumber || "Brak"}`);
        doc.text(
          `Data: ${new Date(
            transaction.paidAt || Date.now(),
          ).toLocaleDateString("pl-PL")}`,
        );
        doc.text(`Status: OPŁACONO`);

        doc.moveDown();
        doc.text(`Kwota: ${transaction.amount} PLN`);
        doc.text(`Usługa: ${this.getServiceName(transaction.type)}`);

        // Dane do faktury (jeśli są)
        if (
          transaction.invoiceDetails &&
          transaction.invoiceDetails.companyName
        ) {
          doc.moveDown();
          doc.text("Nabywca:", { underline: true });
          doc.text(transaction.invoiceDetails.companyName);
          doc.text(`NIP: ${transaction.invoiceDetails.nip}`);
          doc.text(transaction.invoiceDetails.address || "");
        } else {
          doc.moveDown();
          doc.text("Nabywca:", { underline: true });
          doc.text(
            `${transaction.userId.name || ""} ${
              transaction.userId.lastName || ""
            }`,
          );
          doc.text(transaction.userId.email);
        }

        doc.moveDown();
        doc.text("Sprzedawca: AutoMarketplace Sp. z o.o.");

        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendInvoiceEmail(transaction, invoicePath) {
    const transporter = nodemailer.createTransporter({
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
      listing_fee: "Publikacja ogłoszenia",
    };
    return map[type] || type;
  }
}

const transactionController = new TransactionController();
export default transactionController;
