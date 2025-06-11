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

/**
 * Pobiera listę oczekujących ogłoszeń do moderacji
 * Gets a list of pending ads for moderation
 */
export const getPendingAds = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Przygotuj zapytanie o oczekujące ogłoszenia / Prepare query for pending ads
    const query = { status: 'pending' };
    
    // Przygotuj opcje sortowania / Prepare sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pobierz całkowitą liczbę oczekujących ogłoszeń / Get total count of pending ads
    const total = await Ad.countDocuments(query);
    
    // Pobierz oczekujące ogłoszenia z paginacją / Get pending ads with pagination
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
    console.error('Błąd podczas pobierania listy oczekujących ogłoszeń:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy oczekujących ogłoszeń.' });
  }
};

/**
 * Zatwierdza ogłoszenie
 * Approves an ad
 */
export const approveAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { comment } = req.body;
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Sprawdź czy ogłoszenie jest w stanie oczekującym / Check if ad is pending
    if (ad.status !== 'pending') {
      return res.status(400).json({ message: `Ogłoszenie nie może zostać zatwierdzone, ponieważ ma status "${ad.status}".` });
    }
    
    // Zatwierdź ogłoszenie / Approve ad
    ad.status = 'active';
    ad.moderationComment = comment || 'Zatwierdzone przez moderatora.';
    ad.moderatedBy = req.user.userId;
    ad.moderatedAt = new Date();
    
    await ad.save();
    
    // Powiadom użytkownika o zatwierdzeniu ogłoszenia / Notify user about ad approval
    try {
      await Notification.create({
        user: ad.user,
        type: 'ad_approved',
        title: 'Ogłoszenie zostało zatwierdzone',
        message: `Twoje ogłoszenie "${ad.title}" zostało zatwierdzone przez moderatora i jest teraz widoczne na stronie.`,
        data: {
          adId: ad._id,
          comment: ad.moderationComment
        }
      });
    } catch (notificationError) {
      console.error('Błąd podczas wysyłania powiadomienia:', notificationError);
      // Kontynuuj, nawet jeśli powiadomienie się nie powiodło / Continue even if notification failed
    }
    
    return res.status(200).json({ 
      message: 'Ogłoszenie zostało zatwierdzone.',
      ad
    });
  } catch (error) {
    console.error('Błąd podczas zatwierdzania ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas zatwierdzania ogłoszenia.' });
  }
};

/**
 * Odrzuca ogłoszenie
 * Rejects an ad
 */
export const rejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason, comment } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Należy podać powód odrzucenia ogłoszenia.' });
    }
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Sprawdź czy ogłoszenie jest w stanie oczekującym / Check if ad is pending
    if (ad.status !== 'pending') {
      return res.status(400).json({ message: `Ogłoszenie nie może zostać odrzucone, ponieważ ma status "${ad.status}".` });
    }
    
    // Odrzuć ogłoszenie / Reject ad
    ad.status = 'rejected';
    ad.rejectionReason = reason;
    ad.moderationComment = comment || 'Odrzucone przez moderatora.';
    ad.moderatedBy = req.user.userId;
    ad.moderatedAt = new Date();
    
    await ad.save();
    
    // Powiadom użytkownika o odrzuceniu ogłoszenia / Notify user about ad rejection
    try {
      await Notification.create({
        user: ad.user,
        type: 'ad_rejected',
        title: 'Ogłoszenie zostało odrzucone',
        message: `Twoje ogłoszenie "${ad.title}" zostało odrzucone przez moderatora. Powód: ${reason}`,
        data: {
          adId: ad._id,
          reason: reason,
          comment: ad.moderationComment
        }
      });
    } catch (notificationError) {
      console.error('Błąd podczas wysyłania powiadomienia:', notificationError);
      // Kontynuuj, nawet jeśli powiadomienie się nie powiodło / Continue even if notification failed
    }
    
    return res.status(200).json({ 
      message: 'Ogłoszenie zostało odrzucone.',
      ad
    });
  } catch (error) {
    console.error('Błąd podczas odrzucania ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas odrzucania ogłoszenia.' });
  }
};

/**
 * Aktualizuje ogłoszenie po moderacji (z komentarzem moderatora)
 * Updates an ad after moderation (with moderator comment)
 */
export const moderateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { status, moderationComment, requiredChanges } = req.body;
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Sprawdź poprawność statusu / Check status validity
    const validStatuses = ['pending', 'active', 'rejected', 'needs_changes'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Nieprawidłowy status ogłoszenia.' });
    }
    
    // Aktualizuj dane / Update data
    if (status) ad.status = status;
    if (moderationComment) ad.moderationComment = moderationComment;
    if (requiredChanges) ad.requiredChanges = requiredChanges;
    
    ad.moderatedBy = req.user.userId;
    ad.moderatedAt = new Date();
    
    await ad.save();
    
    // Powiadom użytkownika o zmianach / Notify user about changes
    try {
      let notificationType, notificationTitle, notificationMessage;
      
      if (status === 'active') {
        notificationType = 'ad_approved';
        notificationTitle = 'Ogłoszenie zostało zatwierdzone';
        notificationMessage = `Twoje ogłoszenie "${ad.title}" zostało zatwierdzone przez moderatora i jest teraz widoczne na stronie.`;
      } else if (status === 'rejected') {
        notificationType = 'ad_rejected';
        notificationTitle = 'Ogłoszenie zostało odrzucone';
        notificationMessage = `Twoje ogłoszenie "${ad.title}" zostało odrzucone przez moderatora.`;
      } else if (status === 'needs_changes') {
        notificationType = 'ad_needs_changes';
        notificationTitle = 'Ogłoszenie wymaga zmian';
        notificationMessage = `Twoje ogłoszenie "${ad.title}" wymaga zmian przed zatwierdzeniem.`;
      }
      
      if (notificationType) {
        await Notification.create({
          user: ad.user,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            adId: ad._id,
            moderationComment: ad.moderationComment,
            requiredChanges: ad.requiredChanges
          }
        });
      }
    } catch (notificationError) {
      console.error('Błąd podczas wysyłania powiadomienia:', notificationError);
      // Kontynuuj, nawet jeśli powiadomienie się nie powiodło / Continue even if notification failed
    }
    
    return res.status(200).json({ 
      message: `Ogłoszenie zostało zaktualizowane ze statusem "${status}".`,
      ad
    });
  } catch (error) {
    console.error('Błąd podczas moderacji ogłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas moderacji ogłoszenia.' });
  }
};
