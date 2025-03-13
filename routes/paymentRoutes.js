// routes/paymentRoutes.js
import express from 'express';
import { Router } from 'express';
import auth from '../middleware/auth.js';
import Payment from '../models/payment.js';
import Ad from '../models/ad.js';
import errorHandler from '../middleware/errorHandler.js';

const router = Router();

// Symulacja płatności za ogłoszenie
router.post('/process', auth, async (req, res, next) => {
  try {
    const { adId, amount, paymentMethod } = req.body;
    
    if (!adId || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Brakujące dane płatności' });
    }
    
    // Znajdź ogłoszenie
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }
    
    // Sprawdź czy użytkownik jest właścicielem ogłoszenia
    if (ad.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nie masz uprawnień do tej operacji' });
    }
    
    // Utwórz rekord płatności
    const payment = new Payment({
      user: req.user._id,
      amount,
      paymentMethod,
      status: 'completed' // W przypadku prawdziwej płatności byłby status 'pending'
    });
    
    await payment.save();
    
    // Aktualizuj status ogłoszenia na "opublikowane"
    ad.status = 'opublikowane';
    await ad.save();
    
    res.status(200).json({ 
      message: 'Płatność zakończona sukcesem',
      payment,
      ad
    });
  } catch (err) {
    next(err);
  }
}, errorHandler);

// Pobieranie historii płatności
router.get('/history', auth, async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ transactionDate: -1 });
    
    res.status(200).json(payments);
  } catch (err) {
    next(err);
  }
}, errorHandler);

export default router;