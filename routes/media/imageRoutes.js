import express from 'express';
import * as imageController from '../../controllers/media/imageController.js';
import auth from '../../middleware/auth.js';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting dla upload zdjęć
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 10, // maksymalnie 10 uploadów na minutę
  message: {
    error: 'Za dużo prób uploadu. Spróbuj ponownie za minutę.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Konfiguracja multer dla obsługi plików
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB na plik
    files: 15 // maksymalnie 15 plików na raz
  },
  fileFilter: (req, file, cb) => {
    // Sprawdź typ pliku
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Nieobsługiwany format pliku: ${file.mimetype}`), false);
    }
  }
});

// POST /api/images/upload - Upload zdjęć z metadanymi
router.post('/upload', 
  auth, 
  uploadRateLimit,
  upload.array('images', 15),
  imageController.uploadImages
);

// GET /api/images/:carId - Pobieranie zdjęć dla konkretnego samochodu
router.get('/:carId', imageController.getImagesByCarId);

// DELETE /api/images/:id - Usuwanie pojedynczego zdjęcia
router.delete('/:id', auth, imageController.deleteImage);

// PUT /api/images/:id/main - Ustawianie zdjęcia jako główne
router.put('/:id/main', auth, imageController.setMainImage);

// POST /api/images/batch-delete - Usuwanie wielu zdjęć na raz
router.post('/batch-delete', auth, imageController.batchDeleteImages);

// GET /api/images/metadata/:id - Pobieranie metadanych zdjęcia
router.get('/metadata/:id', imageController.getImageMetadata);

// PUT /api/images/:id/metadata - Aktualizacja metadanych zdjęcia
router.put('/:id/metadata', auth, imageController.updateImageMetadata);

// POST /api/images/optimize - Optymalizacja istniejących zdjęć
router.post('/optimize', auth, imageController.optimizeImages);

// GET /api/images/stats/:carId - Statystyki zdjęć dla samochodu
router.get('/stats/:carId', imageController.getImageStats);

// POST /api/images/cleanup - Czyszczenie nieużywanych zdjęć (admin)
router.post('/cleanup', auth, imageController.cleanupUnusedImages);

export default router;
