import express from "express";
import mongoose from "mongoose";
import auth from "../../middleware/auth.js";
import transactionController from "../../controllers/payments/transactionController.js";
import adminPaymentController from "../../controllers/payments/adminPaymentController.js";
import Transaction from "../../models/payments/Transaction.js";
import {
  paymentRateLimiter,
  webhookRateLimiter,
} from "../../middleware/paymentRateLimit.js";

const router = express.Router();

/**
 * ==========================================
 * TPAY WEBHOOK (MUSI BYĆ PIERWSZY I PUBLICZNY)
 * ==========================================
 * @route POST /api/transactions/webhook/tpay
 * @desc Odbiera powiadomienia o statusie płatności z Tpay (server-to-server)
 * @access Public (Bez middleware auth!)
 */
router.post("/webhook/tpay", webhookRateLimiter, async (req, res, next) => {
  try {
    await transactionController.handleTpayWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * ==========================================
 * TPAY POWRÓT Z PŁATNOŚCI
 * ==========================================
 * @route GET /api/transactions/payment/return
 * @desc Obsługa powrotu użytkownika z bramki Tpay (success/error)
 * @access Public (użytkownik wraca z Tpay bez tokenu)
 */
router.get("/payment/return", async (req, res, next) => {
  try {
    await transactionController.handlePaymentReturn(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * ==========================================
 * TPAY INICJACJA PŁATNOŚCI
 * ==========================================
 * @route POST /api/transactions/tpay/initiate
 * @desc Inicjuje płatność Tpay i zwraca link do bramki
 * @access Private
 */
router.post(
  "/tpay/initiate",
  auth,
  paymentRateLimiter,
  async (req, res, next) => {
    try {
      // Używamy metody createTransaction, która teraz obsługuje logikę Tpay
      await transactionController.createTransaction(req, res);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * ==========================================
 * ADMIN - BEZPŁATNA AKTYWACJA OGŁOSZENIA
 * ==========================================
 * @route POST /api/transactions/admin/activate
 * @desc Admin aktywuje ogłoszenie bez płatności (tworzy transakcję completed dla historii)
 * @access Private (Admin only)
 */
router.post("/admin/activate", auth, async (req, res, next) => {
  try {
    await adminPaymentController.activateAdAsAdmin(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * ==========================================
 * POZOSTAŁE TRASY TRANSAKCJI
 * ==========================================
 */

/**
 * @route GET /api/transactions
 * @desc Pobieranie listy transakcji użytkownika z paginacją i filtrowaniem
 * @access Private
 */
router.get("/", auth, async (req, res, next) => {
  try {
    await transactionController.getTransactions(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/transactions
 * @desc Standardowe tworzenie transakcji (fallback / legacy)
 * @access Private
 */
router.post("/", auth, async (req, res, next) => {
  try {
    await transactionController.createTransaction(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/transactions/stats/summary
 * @desc Pobieranie statystyk transakcji użytkownika
 * @access Private
 */
router.get("/stats/summary", auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    console.log(`Pobieranie statystyk transakcji dla użytkownika: ${userId}`);

    // Agregacja statystyk
    const stats = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
          invoicesRequested: {
            $sum: { $cond: ["$invoiceRequested", 1, 0] },
          },
          invoicesGenerated: {
            $sum: { $cond: ["$invoiceGenerated", 1, 0] },
          },
        },
      },
    ]);

    const summary = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      invoicesRequested: 0,
      invoicesGenerated: 0,
    };

    res.status(200).json({
      summary: {
        ...summary,
        averageAmount:
          summary.totalTransactions > 0
            ? (summary.totalAmount / summary.totalTransactions).toFixed(2)
            : 0,
        successRate:
          summary.totalTransactions > 0
            ? (
                (summary.completedTransactions / summary.totalTransactions) *
                100
              ).toFixed(1)
            : 0,
      },
    });
  } catch (error) {
    console.error("Błąd podczas pobierania statystyk transakcji:", error);
    next(error);
  }
});

/**
 * @route GET /api/transactions/:transactionId/status
 * @desc Sprawdzanie statusu płatności (używane po powrocie z Tpay)
 * @access Private
 */
router.get("/:transactionId/status", auth, async (req, res, next) => {
  try {
    await transactionController.checkPaymentStatus(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/transactions/:id/request-invoice
 * @desc Żądanie faktury dla transakcji - generuje PDF i wysyła email
 * @access Private
 */
router.post("/:id/request-invoice", auth, async (req, res, next) => {
  try {
    await transactionController.requestInvoice(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/transactions/:id/download-invoice
 * @desc Pobieranie faktury PDF do pobrania
 * @access Private
 */
router.get("/:id/download-invoice", auth, async (req, res, next) => {
  try {
    await transactionController.downloadInvoice(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/transactions/:id
 * @desc Usuwanie transakcji (tylko pending/failed/cancelled)
 * @access Private
 */
router.delete("/:id", auth, async (req, res, next) => {
  try {
    await transactionController.deleteTransaction(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/transactions/:id
 * @desc Pobieranie szczegółów pojedynczej transakcji
 * @access Private
 */
router.get("/:id", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(
      `Pobieranie szczegółów transakcji: ${id} dla użytkownika: ${userId}`,
    );

    // Znajdź transakcję z populacją danych
    const transaction = await Transaction.findOne({ _id: id, userId })
      .populate("adId", "headline brand model price images")
      .populate("userId", "name lastName email");

    if (!transaction) {
      return res.status(404).json({
        message: "Transakcja nie znaleziona",
      });
    }

    // Zwróć szczegóły transakcji
    res.status(200).json({
      transaction: {
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
        user: {
          name: transaction.userId.name,
          lastName: transaction.userId.lastName,
          email: transaction.userId.email,
        },
      },
    });
  } catch (error) {
    console.error("Błąd podczas pobierania szczegółów transakcji:", error);
    next(error);
  }
});

export default router;
