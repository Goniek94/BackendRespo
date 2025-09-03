/**
 * Handler do zarządzania zdjęciami w ogłoszeniach
 * Odpowiada za: upload, usuwanie, zmianę kolejności zdjęć
 */

import Ad from '../../../models/listings/ad.js';
import auth from '../../../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import errorHandler from '../../../middleware/errors/errorHandler.js';

// Konfiguracja multera do obsługi plików
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/ads';
    // Sprawdź, czy katalog istnieje, jeśli nie - utwórz go
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generuj unikalną nazwę pliku
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // maksymalnie 10 plików
  },
  fileFilter: (req, file, cb) => {
    // Sprawdź czy plik to obraz
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Tylko pliki obrazów są dozwolone!'), false);
    }
  }
});

/**
 * PUT /ads/:id/reorder-images - Zmiana kolejności zdjęć
 */
export const reorderImages = [
  auth,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { images } = req.body;

      if (!images || !Array.isArray(images)) {
        return res.status(400).json({ message: 'Tablica zdjęć jest wymagana' });
      }

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
      }

      // Walidacja - sprawdź czy wszystkie zdjęcia z nowej kolejności istnieją w oryginalnej tablicy
      const originalImages = ad.images || [];
      const isValidReorder = images.every(img => originalImages.includes(img)) && 
                            images.length === originalImages.length;

      if (!isValidReorder) {
        return res.status(400).json({ 
          message: 'Nieprawidłowa kolejność zdjęć - wszystkie zdjęcia muszą pochodzić z oryginalnej tablicy' 
        });
      }

      // Aktualizuj kolejność zdjęć
      ad.images = images;

      // Jeśli główne zdjęcie nie jest już na pierwszej pozycji, zaktualizuj je
      if (ad.mainImage && images.length > 0) {
        // Sprawdź czy główne zdjęcie nadal istnieje w nowej tablicy
        if (!images.includes(ad.mainImage)) {
          ad.mainImage = images[0]; // Ustaw pierwsze zdjęcie jako główne
        }
      } else if (images.length > 0) {
        ad.mainImage = images[0];
      }

      await ad.save();

      console.log(`Zmieniono kolejność zdjęć w ogłoszeniu ${id}`);
      res.status(200).json({ 
        message: 'Kolejność zdjęć została zmieniona',
        images: ad.images,
        mainImage: ad.mainImage
      });
    } catch (err) {
      console.error('Błąd podczas zmiany kolejności zdjęć:', err);
      next(err);
    }
  },
  errorHandler
];

/**
 * POST /ads/:id/images - Upload nowych zdjęć do ogłoszenia
 */
export const uploadImages = [
  auth,
  upload.array('images', 10),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień do dodawania zdjęć do tego ogłoszenia' });
      }

      // Sprawdź czy przesłano pliki
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Nie przesłano żadnych plików' });
      }

      // Sprawdzenie limitu zdjęć
      const currentImagesCount = ad.images ? ad.images.length : 0;
      const newImagesCount = currentImagesCount + req.files.length;
      
      if (newImagesCount > 20) {
        return res.status(400).json({ 
          message: `Możesz mieć maksymalnie 20 zdjęć. Obecnie masz ${currentImagesCount}, próbujesz dodać ${req.files.length}.` 
        });
      }

      // Przygotuj ścieżki do nowych zdjęć
      const newImagePaths = req.files.map(file => `/${file.path.replace(/\\/g, '/')}`);
      
      console.log('=== DODAWANIE NOWYCH ZDJĘĆ ===');
      console.log('ID ogłoszenia:', id);
      console.log('Liczba nowych zdjęć:', req.files.length);
      console.log('Nowe ścieżki zdjęć:', newImagePaths);
      console.log('Aktualna liczba zdjęć:', currentImagesCount);

      // Dodaj nowe zdjęcia do istniejącej tablicy
      ad.images = [...(ad.images || []), ...newImagePaths];

      // Jeśli to pierwsze zdjęcie, ustaw je jako główne
      if (!ad.mainImage && ad.images.length > 0) {
        ad.mainImage = ad.images[0];
        console.log('Ustawiono pierwsze zdjęcie jako główne:', ad.mainImage);
      }

      await ad.save();

      console.log('✅ Zdjęcia zostały dodane pomyślnie');
      console.log('Nowa liczba zdjęć:', ad.images.length);

      res.status(200).json({ 
        message: 'Zdjęcia zostały dodane pomyślnie',
        images: ad.images,
        mainImage: ad.mainImage,
        addedImages: newImagePaths
      });
    } catch (err) {
      console.error('❌ Błąd podczas dodawania zdjęć:', err);
      next(err);
    }
  },
  errorHandler
];

/**
 * DELETE /ads/:id/images/:index - Usuwanie zdjęcia z ogłoszenia
 */
export const deleteImage = [
  auth,
  async (req, res, next) => {
    try {
      const { id, index } = req.params;
      const imageIndex = parseInt(index);

      const ad = await Ad.findById(id);

      if (!ad) {
        return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      if (ad.owner.toString() !== req.user.userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień do edycji tego ogłoszenia' });
      }

      // Sprawdź czy indeks jest prawidłowy
      if (imageIndex < 0 || imageIndex >= ad.images.length) {
        return res.status(400).json({ message: 'Nieprawidłowy indeks zdjęcia' });
      }

      // Sprawdź czy to nie jest ostatnie zdjęcie
      if (ad.images.length <= 1) {
        return res.status(400).json({ message: 'Ogłoszenie musi zawierać co najmniej jedno zdjęcie' });
      }

      // Usuń zdjęcie z tablicy
      const removedImage = ad.images[imageIndex];
      ad.images.splice(imageIndex, 1);

      // Jeśli usuwane zdjęcie było głównym, ustaw nowe główne zdjęcie
      if (ad.mainImage === removedImage) {
        ad.mainImage = ad.images[0]; // Ustaw pierwsze dostępne zdjęcie jako główne
      }

      // Zapisz zmiany
      await ad.save();

      console.log(`Usunięto zdjęcie o indeksie ${imageIndex} z ogłoszenia ${id}`);
      res.status(200).json({ 
        message: 'Zdjęcie zostało usunięte',
        images: ad.images,
        mainImage: ad.mainImage
      });
    } catch (err) {
      console.error('Błąd podczas usuwania zdjęcia:', err);
      next(err);
    }
  },
  errorHandler
];

export default { reorderImages, uploadImages, deleteImage };
