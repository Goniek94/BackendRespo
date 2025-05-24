// controllers/admin/discountController.js
/**
 * Kontroler do zarządzania zniżkami i bonusami przez administratora
 * Controller for managing discounts and bonuses by administrator
 */

import Ad from '../../models/ad.js';
import User from '../../models/user.js';

/**
 * Pobiera listę aktywnych zniżek z możliwością filtrowania i paginacji
 * Retrieves a list of active discounts with filtering and pagination options
 */
export const getDiscounts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      minDiscount, 
      maxDiscount,
      category,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Przygotuj zapytanie / Prepare query
    const query = {
      discount: { $gt: 0 }  // Tylko ogłoszenia ze zniżką / Only ads with discount
    };
    
    // Filtrowanie po kategorii / Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filtrowanie po wartości zniżki / Filter by discount value
    if (minDiscount !== undefined) {
      query.discount = { ...query.discount, $gte: Number(minDiscount) };
    }
    
    if (maxDiscount !== undefined) {
      query.discount = { ...query.discount, $lte: Number(maxDiscount) };
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
    console.error('Błąd podczas pobierania listy zniżek:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy zniżek.' });
  }
};

/**
 * Ustawia zniżkę dla pojedynczego ogłoszenia
 * Sets discount for a single ad
 */
export const setDiscount = async (req, res) => {
  try {
    const { adId } = req.params;
    const { discount } = req.body;
    
    if (discount === undefined || discount < 0 || discount > 99) {
      return res.status(400).json({ message: 'Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.' });
    }
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Aktualizuj zniżkę / Update discount
    ad.discount = discount;
    
    // Oblicz cenę po zniżce / Calculate discounted price
    if (discount > 0) {
      ad.discountedPrice = ad.price * (1 - discount / 100);
    } else {
      ad.discountedPrice = undefined;
    }
    
    await ad.save();
    
    return res.status(200).json({ 
      message: `Zniżka ${discount}% została ustawiona dla ogłoszenia.`,
      ad
    });
  } catch (error) {
    console.error('Błąd podczas ustawiania zniżki:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas ustawiania zniżki.' });
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

/**
 * Ustawia zniżkę dla wszystkich ogłoszeń danego użytkownika
 * Sets discount for all ads of a specific user
 */
export const setUserDiscount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { discount } = req.body;
    
    if (discount === undefined || discount < 0 || discount > 99) {
      return res.status(400).json({ message: 'Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.' });
    }
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Znajdź wszystkie ogłoszenia użytkownika / Find all user's ads
    const ads = await Ad.find({ user: userId });
    
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Użytkownik nie ma żadnych ogłoszeń.' });
    }
    
    // Aktualizuj wszystkie ogłoszenia użytkownika / Update all user's ads
    const updatePromises = ads.map(async (ad) => {
      ad.discount = discount;
      
      // Oblicz cenę po zniżce / Calculate discounted price
      if (discount > 0) {
        ad.discountedPrice = ad.price * (1 - discount / 100);
      } else {
        ad.discountedPrice = undefined;
      }
      
      return ad.save();
    });
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({ 
      message: `Zniżka ${discount}% została zastosowana dla wszystkich ogłoszeń użytkownika (${ads.length}).`
    });
  } catch (error) {
    console.error('Błąd podczas ustawiania zniżek dla użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas ustawiania zniżek dla użytkownika.' });
  }
};

/**
 * Ustawia zniżkę dla wszystkich ogłoszeń w danej kategorii
 * Sets discount for all ads in a specific category
 */
export const setCategoryDiscount = async (req, res) => {
  try {
    const { category } = req.params;
    const { discount } = req.body;
    
    if (discount === undefined || discount < 0 || discount > 99) {
      return res.status(400).json({ message: 'Nieprawidłowa wartość zniżki. Podaj wartość od 0 do 99.' });
    }
    
    // Znajdź wszystkie ogłoszenia w kategorii / Find all ads in category
    const ads = await Ad.find({ category });
    
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Brak ogłoszeń w podanej kategorii.' });
    }
    
    // Aktualizuj wszystkie ogłoszenia w kategorii / Update all ads in category
    const updatePromises = ads.map(async (ad) => {
      ad.discount = discount;
      
      // Oblicz cenę po zniżce / Calculate discounted price
      if (discount > 0) {
        ad.discountedPrice = ad.price * (1 - discount / 100);
      } else {
        ad.discountedPrice = undefined;
      }
      
      return ad.save();
    });
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({ 
      message: `Zniżka ${discount}% została zastosowana dla wszystkich ogłoszeń w kategorii "${category}" (${ads.length}).`
    });
  } catch (error) {
    console.error('Błąd podczas ustawiania zniżek dla kategorii:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas ustawiania zniżek dla kategorii.' });
  }
};

/**
 * Dodaje bonus dla użytkownika
 * Adds bonus for a user
 */
export const addUserBonus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { bonusType, bonusValue, expirationDate, description } = req.body;
    
    // Walidacja danych / Validate data
    if (!bonusType || !bonusValue) {
      return res.status(400).json({ message: 'Typ i wartość bonusu są wymagane.' });
    }
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Inicjalizuj tablicę bonusów, jeśli nie istnieje / Initialize bonuses array if it doesn't exist
    if (!user.bonuses) {
      user.bonuses = [];
    }
    
    // Dodaj nowy bonus / Add new bonus
    user.bonuses.push({
      type: bonusType,
      value: bonusValue,
      expiresAt: expirationDate ? new Date(expirationDate) : null,
      description: description || '',
      isUsed: false,
      createdAt: new Date()
    });
    
    await user.save();
    
    return res.status(200).json({ 
      message: 'Bonus został dodany dla użytkownika.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        bonuses: user.bonuses
      }
    });
  } catch (error) {
    console.error('Błąd podczas dodawania bonusu:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas dodawania bonusu.' });
  }
};

/**
 * Pobiera listę bonusów użytkownika
 * Retrieves a list of user's bonuses
 */
export const getUserBonuses = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Zwróć bonusy użytkownika / Return user's bonuses
    return res.status(200).json({ 
      bonuses: user.bonuses || []
    });
  } catch (error) {
    console.error('Błąd podczas pobierania bonusów użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania bonusów użytkownika.' });
  }
};

/**
 * Usuwa bonus użytkownika
 * Removes user's bonus
 */
export const removeUserBonus = async (req, res) => {
  try {
    const { userId, bonusId } = req.params;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Sprawdź czy użytkownik ma bonusy / Check if user has bonuses
    if (!user.bonuses || user.bonuses.length === 0) {
      return res.status(404).json({ message: 'Użytkownik nie ma żadnych bonusów.' });
    }
    
    // Znajdź indeks bonusu / Find bonus index
    const bonusIndex = user.bonuses.findIndex(bonus => bonus._id.toString() === bonusId);
    
    if (bonusIndex === -1) {
      return res.status(404).json({ message: 'Bonus nie został znaleziony.' });
    }
    
    // Usuń bonus / Remove bonus
    user.bonuses.splice(bonusIndex, 1);
    
    await user.save();
    
    return res.status(200).json({ 
      message: 'Bonus został usunięty.',
      bonuses: user.bonuses
    });
  } catch (error) {
    console.error('Błąd podczas usuwania bonusu:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania bonusu.' });
  }
};
