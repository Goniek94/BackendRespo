/**
 * Handler do pobierania ogłoszeń
 * Odpowiada za: pobieranie szczegółów ogłoszenia i aktualizację wyświetleń
 */

import Ad from '../../../models/listings/ad.js';
import errorHandler from '../../../middleware/errors/errorHandler.js';

/**
 * GET /ads/:id - Pobieranie szczegółów ogłoszenia oraz aktualizacja wyświetleń
 */
export const getAdById = async (req, res, next) => {
  // Sprawdź, czy id to nie jest jedna z naszych specjalnych ścieżek
  if (req.params.id === 'stats' || req.params.id === 'rotated' || 
      req.params.id === 'brands' || req.params.id === 'models' || 
      req.params.id === 'search' || req.params.id === 'user') {
    return next();
  }

  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true, runValidators: false }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie znalezione' });
    }

    // Konwertuj dokument Mongoose na zwykły obiekt JavaScript
    const adObj = ad.toObject();
    
    // Sprawdź, czy ogłoszenie ma zdjęcia
    if (!adObj.images || adObj.images.length === 0) {
      adObj.images = [];
    } else {
      // Filtruj tylko niepuste zdjęcia
      adObj.images = adObj.images.filter(imageUrl => imageUrl && imageUrl.trim() !== '');
      
      // Jeśli po filtrowaniu nie ma zdjęć, zwróć pustą tablicę
      if (adObj.images.length === 0) {
        adObj.images = [];
      }
      
      // Zdjęcia z Supabase już mają pełne URL-e, nie trzeba ich przekształcać
      // Pozostaw URL-e bez zmian - Supabase obsługuje CORS
    }

    console.log(`Zwracam ogłoszenie ${adObj._id} ze zdjęciami:`, adObj.images);
    res.status(200).json(adObj);
  } catch (err) {
    next(err);
  }
};

export default { getAdById };
