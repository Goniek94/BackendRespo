import express from 'express';
import mongoose from 'mongoose';
import auth from '../../middleware/auth.js';
import transactionController from '../../controllers/payments/transactionController.js';
import Transaction from '../../models/payments/Transaction.js';

const router = express.Router();

/**
 * @route GET /api/transactions
 * @desc Pobieranie listy transakcji użytkownika z paginacją i filtrowaniem
 * @access Private
 */
router.get('/', auth, async (req, res, next) => {
  try {
    await transactionController.getTransactions(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/transactions
 * @desc Tworzenie nowej transakcji (symulacja płatności)
 * @access Private
 */
router.post('/', auth, async (req, res, next) => {
  try {
    await transactionController.createTransaction(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/transactions/:id/request-invoice
 * @desc Żądanie faktury dla transakcji - generuje PDF i wysyła email
 * @access Private
 */
router.post('/:id/request-invoice', auth, async (req, res, next) => {
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
router.get('/:id/download-invoice', auth, async (req, res, next) => {
  try {
    await transactionController.downloadInvoice(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/transactions/:id
 * @desc Pobieranie szczegółów pojedynczej transakcji
 * @access Private
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log(`Pobieranie szczegółów transakcji: ${id} dla użytkownika: ${userId}`);
    
    // Znajdź transakcję z populacją danych
    const transaction = await Transaction.findOne({ _id: id, userId })
      .populate('adId', 'headline brand model price images')
      .populate('userId', 'name lastName email');
    
    if (!transaction) {
      return res.status(404).json({
        message: 'Transakcja nie znaleziona'
      });
    }
    
    // Zwróć szczegóły transakcji
    res.status(200).json({
      transaction: {
        ...transaction.toApiResponse(),
        ad: transaction.adId ? {
          id: transaction.adId._id,
          headline: transaction.adId.headline,
          brand: transaction.adId.brand,
          model: transaction.adId.model,
          price: transaction.adId.price,
          images: transaction.adId.images
        } : null,
        user: {
          name: transaction.userId.name,
          lastName: transaction.userId.lastName,
          email: transaction.userId.email
        }
      }
    });
    
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów transakcji:', error);
    next(error);
  }
});

/**
 * @route GET /api/transactions/stats/summary
 * @desc Pobieranie statystyk transakcji użytkownika
 * @access Private
 */
router.get('/stats/summary', auth, async (req, res, next) => {
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
          totalAmount: { $sum: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          invoicesRequested: {
            $sum: { $cond: ['$invoiceRequested', 1, 0] }
          },
          invoicesGenerated: {
            $sum: { $cond: ['$invoiceGenerated', 1, 0] }
          }
        }
      }
    ]);
    
    const summary = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      invoicesRequested: 0,
      invoicesGenerated: 0
    };
    
    res.status(200).json({
      summary: {
        ...summary,
        averageAmount: summary.totalTransactions > 0 
          ? (summary.totalAmount / summary.totalTransactions).toFixed(2)
          : 0,
        successRate: summary.totalTransactions > 0
          ? ((summary.completedTransactions / summary.totalTransactions) * 100).toFixed(1)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk transakcji:', error);
    next(error);
  }
});

export default router;
