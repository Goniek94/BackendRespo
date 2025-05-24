// controllers/admin/adController.js
/**
 * Kontroler do zarządzania ogłoszeniami przez administratora
 * Controller for managing ads by administrator
 */

import Ad from '../../models/ad.js';
import User from '../../models/user.js';

/**
 * Pobiera listę ogłoszeń z możliwością filtrowania i paginacji
 * Retrieves a list of ads with filtering and pagination options
 */
export const getAds = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status, 
      category,
      featured,
      userId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Przygotuj zapytanie / Prepare query
    const query = {};
    
    // Filtrowanie po statusie / Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filtrowanie po kategorii / Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filtrowanie po wyróżnieniu / Filter by featured status
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }
    
    // Filtrowanie po użytkowniku / Filter by user
    if (userId) {
      query.user = userId;
    }
    
    // Wyszukiwanie po tytule lub opisie / Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Przygotuj opcje sortowania / Prepare sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pobierz całkowitą liczbę pasujących ogłoszeń / Get total count of matching ads
    const total = await Ad.countDocuments(query);
    
    // Pobierz ogłoszenia z paginacją / Get ads with pagination
    const ads = await Ad.find(query)
      .populate('user', 'email name lastName')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    return res.status(200).json({
      ads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania listy ogłoszeń:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy ogłoszeń.' });
  }
};

/**
 * Pobiera szczegóły pojedynczego ogłoszenia
 * Retrieves details of a single ad
 */
export const getAdDetails = async (req, res) => {
  try {
    const { adId } = req.params;
    
    const ad = await Ad.findById(adId)
      .populate('user', 'email name lastName phoneNumber')
      .populate('comments');
    
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    return res.status(200).json({ ad });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania szczegółów ogłoszenia.' });
  }
};

/**
 * Aktualizuje ogłoszenie (status, wyróżnienie, zniżka)
 * Updates an ad (status, featured status, discount)
 */
export const updateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { status, featured, discount, title, description, price } = req.body;
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Aktualizuj dane / Update data
    if (status !== undefined) ad.status = status;
    if (featured !== undefined) ad.featured = featured;
    if (discount !== undefined) ad.discount = discount;
    if (title !== undefined) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (price !== undefined) ad.price = price;
    
    // Jeśli dodajemy zniżkę, oblicz cenę po zniżce / If adding discount, calculate discounted price
    if (discount !== undefined && discount > 0) {
      ad.discountedPrice = ad.price * (1 - discount / 100);
    } else if (discount === 0) {
      ad.discountedPrice = undefined;
    }
    
    await ad.save();
    
    return res.status(200).json({ 
      message: 'Ogłoszenie zostało zaktualizowane.',
      ad
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji ogłoszenia.' });
  }
};

/**
 * Usuwa ogłoszenie
 * Deletes an ad
 */
export const deleteAd = async (req, res) => {
  try {
    const { adId } = req.params;
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    await Ad.findByIdAndDelete(adId);
    
    return res.status(200).json({ message: 'Ogłoszenie zostało usunięte.' });
  } catch (error) {
    console.error('Błąd podczas usuwania ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania ogłoszenia.' });
  }
};

/**
 * Ustawia zniżkę dla wielu ogłoszeń jednocześnie
 * Sets discount for multiple ads at once
 */
export const setBulkDiscount = async (req, res) => {
  try {
    const { adIds, discount } = req.body;
    
    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ message: 'Nie podano poprawnej listy ogłoszeń.' });
    }
    
    if (discount === undefined || discount < 0 || discount > 99) {
      return res.status(400).json({ message: 'Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.' });
    }
    
    // Aktualizuj wszystkie ogłoszenia / Update all ads
    const updatePromises = adIds.map(async (adId) => {
      const ad = await Ad.findById(adId);
      if (ad) {
        ad.discount = discount;
        
        // Oblicz cenę po zniżce / Calculate discounted price
        if (discount > 0) {
          ad.discountedPrice = ad.price * (1 - discount / 100);
        } else {
          ad.discountedPrice = undefined;
        }
        
        return ad.save();
      }
    });
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({ 
      message: `Zniżka ${discount}% została zastosowana dla ${adIds.length} ogłoszeń.`
    });
  } catch (error) {
    console.error('Błąd podczas ustawiania zniżek dla ogłoszeń:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas ustawiania zniżek dla ogłoszeń.' });
  }
};
