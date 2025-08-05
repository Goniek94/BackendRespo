// controllers/admin/adController.js
/**
 * Kontroler do zarządzania ogłoszeniami przez administratora
 * Controller for managing ads by administrator
 */

import Ad from '../../../models/listings/ad.js';
import User from '../../../models/user/user.js';
import Notification from '../../../models/communication/notification.js';

/**
 * Pobiera statystyki ogłoszeń
 * Retrieves listings statistics
 */
export const getListingsStats = async (req, res) => {
  try {
    // Pobierz statystyki z bazy danych
    const totalCount = await Ad.countDocuments();
    const pendingCount = await Ad.countDocuments({ status: 'pending' });
    const activeCount = await Ad.countDocuments({ status: 'active' });
    const rejectedCount = await Ad.countDocuments({ status: 'rejected' });
    
    // Zakończone ogłoszenia (sold + archived)
    const completedCount = await Ad.countDocuments({ 
      status: { $in: ['sold', 'archived'] } 
    });
    
    // Ukryte ogłoszenia (needs_changes + inne statusy)
    const hiddenCount = await Ad.countDocuments({ 
      status: { $in: ['needs_changes', 'opublikowane'] } 
    });
    
    // Oblicz statystyki z poprzedniego miesiąca dla porównania
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const totalLastMonth = await Ad.countDocuments({ 
      createdAt: { $lt: lastMonth } 
    });
    const pendingLastMonth = await Ad.countDocuments({ 
      status: 'pending',
      createdAt: { $lt: lastMonth } 
    });
    const activeLastMonth = await Ad.countDocuments({ 
      status: 'active',
      createdAt: { $lt: lastMonth } 
    });
    const rejectedLastMonth = await Ad.countDocuments({ 
      status: 'rejected',
      createdAt: { $lt: lastMonth } 
    });
    const completedLastMonth = await Ad.countDocuments({ 
      status: { $in: ['sold', 'archived'] },
      createdAt: { $lt: lastMonth } 
    });
    
    // Oblicz zmiany procentowe
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    const stats = {
      total: totalCount,
      pending: pendingCount,
      approved: activeCount, // Aktywne ogłoszenia
      rejected: rejectedCount,
      completed: completedCount, // Zakończone (sold + archived)
      hidden: hiddenCount, // Ukryte
      totalChange: calculateChange(totalCount, totalLastMonth),
      pendingChange: calculateChange(pendingCount, pendingLastMonth),
      approvedChange: calculateChange(activeCount, activeLastMonth),
      rejectedChange: calculateChange(rejectedCount, rejectedLastMonth),
      completedChange: calculateChange(completedCount, completedLastMonth)
    };
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk ogłoszeń:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania statystyk ogłoszeń.' });
  }
};

/**
 * Tworzy nowe ogłoszenie przez administratora
 * Creates a new ad by administrator
 */
export const createAd = async (req, res) => {
  try {
    // Pobierz wszystkie możliwe pola z request body
    const adData = req.body;
    
    // Mapowanie pól - obsługa różnych nazw pól
    const title = adData.title || adData.headline;
    const headline = adData.headline || adData.title;
    
    // Walidacja wymaganych pól
    if (!headline || !adData.description || !adData.price) {
      return res.status(400).json({ 
        message: 'Tytuł, opis i cena są wymagane.' 
      });
    }

    // Tworzenie nowego ogłoszenia z wszystkimi dostępnymi polami
    const newAd = new Ad({
      // Podstawowe informacje
      headline: headline,
      description: adData.description,
      shortDescription: adData.shortDescription,
      price: parseFloat(adData.price),
      brand: adData.brand,
      model: adData.model,
      generation: adData.generation,
      version: adData.version,
      year: adData.year ? parseInt(adData.year) : undefined,
      mileage: adData.mileage ? parseInt(adData.mileage) : undefined,
      fuelType: adData.fuelType,
      transmission: adData.transmission,
      
      // Identyfikatory pojazdu
      vin: adData.vin,
      registrationNumber: adData.registrationNumber,
      
      // Zdjęcia
      images: adData.images || [],
      mainImage: adData.mainImage,
      
      // Opcje ogłoszenia
      purchaseOptions: adData.purchaseOptions,
      negotiable: adData.negotiable,
      listingType: adData.listingType || 'standardowe',
      status: adData.status || 'active',
      
      // Dane techniczne
      condition: adData.condition,
      accidentStatus: adData.accidentStatus,
      damageStatus: adData.damageStatus,
      tuning: adData.tuning,
      imported: adData.imported,
      registeredInPL: adData.registeredInPL,
      firstOwner: adData.firstOwner,
      disabledAdapted: adData.disabledAdapted,
      
      bodyType: adData.bodyType,
      color: adData.color,
      paintFinish: adData.paintFinish,
      seats: adData.seats,
      lastOfficialMileage: adData.lastOfficialMileage ? parseInt(adData.lastOfficialMileage) : undefined,
      power: adData.power ? parseInt(adData.power) : undefined,
      engineSize: adData.engineSize ? parseFloat(adData.engineSize) : undefined,
      drive: adData.drive,
      doors: adData.doors,
      weight: adData.weight ? parseInt(adData.weight) : undefined,
      
      // Lokalizacja
      voivodeship: adData.voivodeship,
      city: adData.city,
      countryOfOrigin: adData.countryOfOrigin,
      
      // Najem
      rentalPrice: adData.rentalPrice ? parseFloat(adData.rentalPrice) : undefined,
      
      // Informacje o właścicielu
      owner: req.user.userId,
      ownerName: adData.ownerName,
      ownerLastName: adData.ownerLastName,
      ownerEmail: adData.ownerEmail,
      ownerPhone: adData.ownerPhone,
      sellerType: adData.sellerType || 'Prywatny',
      
      // Metadane
      ownerRole: 'admin',
      featured: adData.featured || false,
      discount: adData.discount ? parseFloat(adData.discount) : undefined,
      discountedPrice: adData.discountedPrice ? parseFloat(adData.discountedPrice) : undefined,
      moderationComment: adData.moderationComment,
      
      // Statystyki
      views: adData.views || 0,
      favorites: adData.favorites || 0,
      contactAttempts: adData.contactAttempts || 0,
      
      // Daty
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newAd.save();

    return res.status(201).json({
      success: true,
      message: 'Ogłoszenie zostało utworzone pomyślnie.',
      data: {
        id: newAd._id,
        brand: newAd.brand,
        model: newAd.model,
        year: newAd.year,
        price: newAd.price,
        status: newAd.status
      }
    });
  } catch (error) {
    console.error('Błąd podczas tworzenia ogłoszenia:', error);
    return res.status(500).json({ 
      message: 'Błąd serwera podczas tworzenia ogłoszenia.',
      error: error.message 
    });
  }
};

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
      listingType,
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
    
    // Filtrowanie po typie ogłoszenia / Filter by listing type
    if (listingType) {
      query.listingType = listingType;
    }
    
    // Filtrowanie po użytkowniku / Filter by user
    if (userId) {
      query.owner = userId;
    }
    
    // Wyszukiwanie po tytule lub opisie / Search by title or description
    if (search) {
      query.$or = [
        { headline: { $regex: search, $options: 'i' } },
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
      .populate('owner', 'email name lastName')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Mapuj dane do formatu oczekiwanego przez frontend
    const mappedListings = ads.map(ad => ({
      id: ad._id.toString(),
      title: ad.headline || `${ad.brand} ${ad.model} ${ad.year}`,
      headline: ad.headline,
      brand: ad.brand,
      model: ad.model,
      year: ad.year,
      price: ad.price,
      mileage: ad.mileage,
      fuelType: ad.fuelType,
      transmission: ad.transmission,
      status: ad.status,
      listingType: ad.listingType,
      category: `${ad.brand} ${ad.model}`,
      images: ad.images || [],
      mainImage: ad.mainImage,
      description: ad.description,
      user: ad.owner ? {
        id: ad.owner._id.toString(),
        name: ad.owner.name,
        lastName: ad.owner.lastName,
        email: ad.owner.email
      } : null,
      created_at: ad.createdAt,
      updated_at: ad.updatedAt,
      negotiable: ad.negotiable,
      purchaseOptions: ad.purchaseOptions,
      vin: ad.vin,
      registrationNumber: ad.registrationNumber
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        listings: mappedListings,
        total: total,
        totalPages: Math.ceil(total / limit),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
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
      .populate('owner', 'email name lastName phoneNumber')
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
 * Aktualizuje ogłoszenie (status, typ ogłoszenia, zniżka)
 * Updates an ad (status, listing type, discount)
 */
export const updateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { status, listingType, discount, title, description, price } = req.body;
    
    // Sprawdź czy ogłoszenie istnieje / Check if ad exists
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Ogłoszenie nie zostało znalezione.' });
    }
    
    // Aktualizuj dane / Update data
    if (status !== undefined) ad.status = status;
    if (listingType !== undefined) ad.listingType = listingType;
    if (discount !== undefined) ad.discount = discount;
    if (title !== undefined) ad.headline = title;
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
    
    // Zdjęcia są automatycznie usuwane z Supabase przez frontend
    
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
      .populate('owner', 'email name lastName')
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
        user: ad.owner,
        type: 'ad_approved',
        title: 'Ogłoszenie zostało zatwierdzone',
        message: `Twoje ogłoszenie "${ad.headline}" zostało zatwierdzone przez moderatora i jest teraz widoczne na stronie.`,
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
        user: ad.owner,
        type: 'ad_rejected',
        title: 'Ogłoszenie zostało odrzucone',
        message: `Twoje ogłoszenie "${ad.headline}" zostało odrzucone przez moderatora. Powód: ${reason}`,
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
        notificationMessage = `Twoje ogłoszenie "${ad.headline}" zostało zatwierdzone przez moderatora i jest teraz widoczne na stronie.`;
      } else if (status === 'rejected') {
        notificationType = 'ad_rejected';
        notificationTitle = 'Ogłoszenie zostało odrzucone';
        notificationMessage = `Twoje ogłoszenie "${ad.headline}" zostało odrzucone przez moderatora.`;
      } else if (status === 'needs_changes') {
        notificationType = 'ad_needs_changes';
        notificationTitle = 'Ogłoszenie wymaga zmian';
        notificationMessage = `Twoje ogłoszenie "${ad.headline}" wymaga zmian przed zatwierdzeniem.`;
      }
      
      if (notificationType) {
        await Notification.create({
          user: ad.owner,
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
