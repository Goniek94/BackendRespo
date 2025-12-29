// routes/payments/paymentRoutes.js
// ⚠️ DEPRECATED - Ten plik jest przestarzały!
// ✅ Użyj: routes/payments/transactionRoutes.js
//
// AKTUALIZACJA 2025-12-20: Dodano prawdziwą integrację z Tpay API
// Ten plik teraz używa tpayService do prawdziwej komunikacji z Tpay

import { Router } from "express";
import auth from "../../middleware/auth.js";
import Transaction from "../../models/payments/Transaction.js";
import Ad from "../../models/listings/ad.js";
import User from "../../models/user/user.js";
import tpayService from "../../services/tpay/tpayService.js";
import errorHandler from "../../middleware/errors/errorHandler.js";

const router = Router();

router.post(
  "/tpay/initiate",
  auth,
  async (req, res, next) => {
    try {
      const { adId, amount, type = "standard_listing", invoiceData } = req.body;

      console.log("🚀 [PAYMENT_ROUTES] Inicjacja płatności Tpay");
      console.log("📝 [PAYMENT_ROUTES] Dane:", { adId, amount, type });

      if (!adId || !amount) {
        return res
          .status(400)
          .json({ message: "Brakujące dane: adId lub amount" });
      }

      // Poprawka: req.user.userId zamiast req.user._id
      const userId = req.user.userId || req.user._id;

      const user = await User.findById(userId);
      const ad = await Ad.findById(adId);

      if (!ad) {
        console.log("❌ [PAYMENT_ROUTES] Ogłoszenie nie znalezione:", adId);
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      if (!user) {
        console.log("❌ [PAYMENT_ROUTES] Użytkownik nie znaleziony:", userId);
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      console.log("✅ [PAYMENT_ROUTES] Użytkownik:", user.email);
      console.log("✅ [PAYMENT_ROUTES] Ogłoszenie:", `${ad.brand} ${ad.model}`);

      // 1. Zapisz transakcję w bazie jako PENDING
      const transactionIdInternal = `TXN_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const transaction = new Transaction({
        userId,
        adId,
        amount: parseFloat(amount),
        currency: "PLN",
        type,
        status: "pending",
        paymentMethod: "tpay",
        transactionId: transactionIdInternal,
        invoiceRequested: !!invoiceData,
        invoiceDetails: invoiceData || {},
        metadata: {
          adTitle: ad.headline || `${ad.brand} ${ad.model}`,
          adType: type,
          createdAt: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      const savedTransaction = await transaction.save();
      console.log(
        "✅ [PAYMENT_ROUTES] Transakcja zapisana:",
        savedTransaction._id
      );

      // 2. Wywołaj prawdziwe API Tpay
      console.log("🌐 [PAYMENT_ROUTES] Wywołanie Tpay API...");

      const tpayData = await tpayService.createTransaction({
        amount: amount,
        description: `Opłata za ogłoszenie: ${ad.brand} ${ad.model}`,
        email: user.email,
        name: user.name || user.email,
        transactionId: savedTransaction._id.toString(),
        returnUrl: `${process.env.FRONTEND_URL}/profil/transakcje?status=success`,
        errorUrl: `${process.env.FRONTEND_URL}/profil/transakcje?status=error`,
      });

      console.log("✅ [PAYMENT_ROUTES] Odpowiedź z Tpay:", {
        transactionId: tpayData.transactionId,
        hasPaymentUrl: !!tpayData.transactionPaymentUrl,
      });

      if (tpayData.transactionPaymentUrl) {
        // Zapisz ID z Tpay
        savedTransaction.providerId = tpayData.transactionId;
        await savedTransaction.save();

        console.log(
          "🔗 [PAYMENT_ROUTES] URL płatności:",
          tpayData.transactionPaymentUrl
        );

        res.status(200).json({
          success: true,
          message: "Transakcja utworzona",
          paymentUrl: tpayData.transactionPaymentUrl,
          transactionId: savedTransaction._id,
        });
      } else {
        console.log("❌ [PAYMENT_ROUTES] Brak URL płatności");
        throw new Error("Brak URL płatności w odpowiedzi Tpay");
      }
    } catch (err) {
      console.error("❌ [PAYMENT_ROUTES] Błąd:", err);
      next(err);
    }
  },
  errorHandler
);

export default router;
