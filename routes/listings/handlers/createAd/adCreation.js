/**
 * Tworzenie ogłoszenia w bazie danych
 */

import Ad from '../../../../models/listings/ad.js';
import notificationManager from '../../../../services/notificationManager.js';

/**
 * Tworzenie nowego obiektu ogłoszenia
 */
export const createAdObject = (mappedData, user, imageData, expiresAt, status) => {
  console.log('=== TWORZENIE OBIEKTU OGŁOSZENIA ===');
  
  const {
    brand, model, generation, version, year, price, mileage, fuelType, transmission, vin,
    registrationNumber, headline, description, purchaseOptions, listingType, condition,
    accidentStatus, damageStatus, tuning, imported, registeredInPL, firstOwner, disabledAdapted,
    bodyType, color, paintFinish, seats, lastOfficialMileage, power, engineSize, drive, doors, weight,
    voivodeship, city, rentalPrice, sellerType, countryOfOrigin, negotiable,
    firstRegistrationDate,
    // Pola cesji
    leasingCompany, remainingInstallments, installmentAmount, cessionFee,
    // Pola zamiany
    exchangeOffer, exchangeValue, exchangePayment, exchangeConditions
  } = mappedData;

  // Generowanie krótkiego opisu z nagłówka (do 120 znaków)
  const shortDescription = headline ? headline.substring(0, 120) : '';

  const newAd = new Ad({
    // Podstawowe dane
    brand,
    model,
    generation,
    version,
    year: parseInt(year),
    price: parseFloat(price),
    mileage: parseInt(mileage),
    fuelType,
    transmission,
    vin: vin || '',
    registrationNumber: registrationNumber || '',
    firstRegistrationDate,
    headline,
    description,
    shortDescription,
    images: imageData.images,
    mainImage: imageData.mainImage,
    purchaseOptions,
    negotiable: negotiable || 'Nie',
    listingType,
    sellerType,
    
    // Dane techniczne
    condition,
    accidentStatus,
    damageStatus,
    tuning,
    imported,
    registeredInPL,
    firstOwner,
    disabledAdapted,
    bodyType,
    color,
    paintFinish,
    seats,
    lastOfficialMileage: lastOfficialMileage ? parseInt(lastOfficialMileage) : undefined,
    power: power ? parseInt(power) : undefined,
    engineSize: engineSize ? parseInt(engineSize) : undefined,
    drive,
    doors: doors ? parseInt(doors) : undefined,
    weight: weight ? parseInt(weight) : undefined,
    countryOfOrigin,
    
    // Lokalizacja
    voivodeship,
    city,
    
    // Najem
    rentalPrice: rentalPrice ? parseFloat(rentalPrice) : undefined,
    
    // Pola cesji
    leasingCompany,
    remainingInstallments: remainingInstallments ? parseInt(remainingInstallments) : undefined,
    installmentAmount: installmentAmount ? parseFloat(installmentAmount) : undefined,
    cessionFee: cessionFee ? parseFloat(cessionFee) : undefined,
    
    // Pola zamiany
    exchangeOffer,
    exchangeValue: exchangeValue ? parseFloat(exchangeValue) : undefined,
    exchangePayment: exchangePayment ? parseFloat(exchangePayment) : undefined,
    exchangeConditions,
    
    // Dane właściciela
    owner: user._id,
    ownerName: user.name,
    ownerLastName: user.lastName,
    ownerEmail: user.email,
    ownerPhone: user.phoneNumber,
    ownerRole: user.role,
    
    // Termin ważności ogłoszenia
    expiresAt: expiresAt,
    
    // Status
    status: status
  });

  console.log('Obiekt ogłoszenia utworzony pomyślnie');
  console.log('Sprawdzenie kluczowych pól:', {
    sellerType: newAd.sellerType,
    purchaseOptions: newAd.purchaseOptions,
    countryOfOrigin: newAd.countryOfOrigin,
    firstRegistrationDate: newAd.firstRegistrationDate,
    lastOfficialMileage: newAd.lastOfficialMileage,
    leasingCompany: newAd.leasingCompany,
    exchangeOffer: newAd.exchangeOffer,
    imagesCount: newAd.images.length
  });
  
  return newAd;
};

/**
 * Zapisanie ogłoszenia w bazie danych
 */
export const saveAdToDatabase = async (adObject) => {
  console.log('=== ZAPISYWANIE OGŁOSZENIA W BAZIE DANYCH ===');
  
  try {
    const savedAd = await adObject.save();
    console.log('✅ Ogłoszenie zapisane pomyślnie w bazie danych');
    console.log('ID zapisanego ogłoszenia:', savedAd._id);
    return savedAd;
  } catch (error) {
    console.error('❌ Błąd podczas zapisywania ogłoszenia:', error);
    throw new Error(`Błąd podczas zapisywania ogłoszenia: ${error.message}`);
  }
};

/**
 * Tworzenie powiadomienia o dodaniu ogłoszenia
 */
export const createAdNotification = async (userId, headline, brand, model, adId) => {
  console.log('=== TWORZENIE POWIADOMIENIA ===');
  
  try {
    const adTitle = headline || `${brand} ${model}`;
    await notificationManager.notifyAdCreated(userId, adTitle, adId);
    console.log(`✅ Utworzono powiadomienie o dodaniu ogłoszenia dla użytkownika ${userId}`);
  } catch (notificationError) {
    console.error('⚠️ Błąd podczas tworzenia powiadomienia:', notificationError);
    // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
  }
};
