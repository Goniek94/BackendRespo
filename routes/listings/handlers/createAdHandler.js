/**
 * Handler dla tworzenia nowych ogłoszeń
 */

import Ad from "../../../models/listings/ad.js";
import User from "../../../models/user/user.js";
import Transaction from "../../../models/payments/Transaction.js";
import Promotion from "../../../admin/models/admin/Promotion.js";
import auth from "../../../middleware/auth.js";
import validate from "../../../middleware/validation/validate.js";
import adValidationSchema from "../../../validationSchemas/adValidation.js";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import notificationManager from "../../../services/notificationManager.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Funkcja do kapitalizacji tekstu (pierwsza litera duża, reszta mała)
 */
const capitalizeText = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Funkcja do pełnej kapitalizacji (wszystkie litery duże)
 */
const toUpperCase = (text) => {
  if (!text || typeof text !== "string") return text;
  return text.toUpperCase();
};

/**
 * Mapowanie marek na kraje pochodzenia
 */
const brandToCountryMapping = {
  // Niemieckie marki
  AUDI: "Niemcy",
  BMW: "Niemcy",
  "MERCEDES-BENZ": "Niemcy",
  MERCEDES: "Niemcy",
  VOLKSWAGEN: "Niemcy",
  PORSCHE: "Niemcy",
  OPEL: "Niemcy",
  SMART: "Niemcy",

  // Francuskie marki
  PEUGEOT: "Francja",
  CITROEN: "Francja",
  RENAULT: "Francja",
  DACIA: "Francja",

  // Włoskie marki
  FIAT: "Włochy",
  "ALFA ROMEO": "Włochy",
  LANCIA: "Włochy",
  FERRARI: "Włochy",
  LAMBORGHINI: "Włochy",
  MASERATI: "Włochy",

  // Hiszpańskie marki
  SEAT: "Hiszpania",
  CUPRA: "Hiszpania",

  // Czeskie marki
  SKODA: "Czechy",

  // Szwedzkie marki
  VOLVO: "Szwecja",
  SAAB: "Szwecja",

  // Brytyjskie marki
  "ASTON MARTIN": "Wielka Brytania",
  BENTLEY: "Wielka Brytania",
  JAGUAR: "Wielka Brytania",
  "LAND ROVER": "Wielka Brytania",
  LOTUS: "Wielka Brytania",
  MINI: "Wielka Brytania",
  "ROLLS-ROYCE": "Wielka Brytania",

  // Amerykańskie marki
  FORD: "USA",
  CHEVROLET: "USA",
  CADILLAC: "USA",
  CHRYSLER: "USA",
  DODGE: "USA",
  JEEP: "USA",
  TESLA: "USA",

  // Japońskie marki
  TOYOTA: "Japonia",
  HONDA: "Japonia",
  NISSAN: "Japonia",
  MAZDA: "Japonia",
  SUBARU: "Japonia",
  MITSUBISHI: "Japonia",
  SUZUKI: "Japonia",
  LEXUS: "Japonia",
  ACURA: "Japonia",
  INFINITI: "Japonia",

  // Koreańskie marki
  HYUNDAI: "Korea Południowa",
  KIA: "Korea Południowa",
  GENESIS: "Korea Południowa",
  DAEWOO: "Korea Południowa",

  // Polskie marki
  FSO: "Polska",
  POLONEZ: "Polska",
  SYRENA: "Polska",
};

/**
 * Mapowanie wartości z frontendu na backend
 */
export const mapFormDataToBackend = (data) => {
  const fuelTypeMapping = {
    Benzyna: "BENZYNA",
    benzyna: "BENZYNA",
    Diesel: "DIESEL",
    diesel: "DIESEL",
    Elektryczny: "ELEKTRYCZNY",
    elektryczny: "ELEKTRYCZNY",
    Hybryda: "HYBRYDA",
    hybryda: "HYBRYDA",
    Hybrydowy: "HYBRYDA",
    hybrydowy: "HYBRYDA",
    "Benzyna+LPG": "BENZYNA+LPG",
    "benzyna+lpg": "BENZYNA+LPG",
    "Benzyna+CNG": "BENZYNA+CNG",
    "benzyna+cng": "BENZYNA+CNG",
    Etanol: "ETANOL",
    etanol: "ETANOL",
  };

  const transmissionMapping = {
    Manualna: "MANUALNA",
    manualna: "MANUALNA",
    Automatyczna: "AUTOMATYCZNA",
    automatyczna: "AUTOMATYCZNA",
    Półautomatyczna: "PÓŁAUTOMATYCZNA",
    półautomatyczna: "PÓŁAUTOMATYCZNA",
    "Bezstopniowa CVT": "AUTOMATYCZNA CVT",
    "bezstopniowa cvt": "AUTOMATYCZNA CVT",
  };

  const purchaseOptionsMapping = {
    sprzedaz: "SPRZEDAŻ",
    sprzedaż: "SPRZEDAŻ",
    Sprzedaż: "SPRZEDAŻ",
    "umowa kupna-sprzedaży": "SPRZEDAŻ",
    faktura: "FAKTURA VAT",
    "faktura VAT": "FAKTURA VAT",
    "Faktura VAT": "FAKTURA VAT",
    inne: "INNE",
    Inne: "INNE",
    najem: "NAJEM",
    Najem: "NAJEM",
    leasing: "LEASING",
    Leasing: "LEASING",
    // NAPRAWIONE: Poprawne mapowanie zgodne ze schematem - DUŻE LITERY
    Cesja: "CESJA LEASINGU",
    cesja: "CESJA LEASINGU",
    "Cesja leasingu": "CESJA LEASINGU",
    "cesja leasingu": "CESJA LEASINGU",
    Zamiana: "ZAMIANA",
    zamiana: "ZAMIANA",
  };

  const driveMapping = {
    // Nowe wartości z frontendu
    "FWD (Przedni)": "FWD (Przedni)",
    "RWD (Tylny)": "RWD (Tylny)",
    "AWD (4x4)": "AWD (4x4)",
    // Stare wartości dla kompatybilności
    "RWD (tylny)": "RWD (Tylny)",
    "FWD (przedni)": "FWD (Przedni)",
    "AWD (na cztery koła)": "AWD (4x4)",
    "Na cztery koła stały": "AWD (4x4)",
    "Na cztery koła dołączany": "AWD (4x4)",
    Przedni: "FWD (Przedni)",
    przedni: "FWD (Przedni)",
    Tylny: "RWD (Tylny)",
    tylny: "RWD (Tylny)",
    "4x4": "AWD (4x4)",
    "Napęd na przód": "FWD (Przedni)",
    "Napęd na tył": "RWD (Tylny)",
    "Napęd na cztery koła": "AWD (4x4)",
    FWD: "FWD (Przedni)",
    RWD: "RWD (Tylny)",
    AWD: "AWD (4x4)",
    "4WD": "AWD (4x4)",
  };

  const bodyTypeMapping = {
    Hatchback: "Hatchback",
    hatchback: "Hatchback",
    Sedan: "Sedan",
    sedan: "Sedan",
    Kombi: "Kombi",
    kombi: "Kombi",
    SUV: "Suv",
    suv: "Suv",
    Coupe: "Coupe",
    coupe: "Coupe",
    Cabrio: "Cabrio",
    cabrio: "Cabrio",
    Kabriolet: "Cabrio",
    kabriolet: "Cabrio",
    Terenowe: "Terenowe",
    terenowe: "Terenowe",
    Minivan: "Minivan",
    minivan: "Minivan",
    Dostawcze: "Dostawcze",
    dostawcze: "Dostawcze",
    Pickup: "Pickup",
    pickup: "Pickup",
    Van: "Van",
    van: "Van",
    Limuzyna: "Limuzyna",
    limuzyna: "Limuzyna",
    Roadster: "Roadster",
    roadster: "Roadster",
    Targa: "Targa",
    targa: "Targa",
  };

  const conditionMapping = {
    nowy: "Nowy",
    Nowy: "Nowy",
    używany: "Używany",
    Używany: "Używany",
    uzywany: "Używany",
  };

  const sellerTypeMapping = {
    Prywatny: "PRYWATNY",
    prywatny: "PRYWATNY",
    private: "PRYWATNY",
    Firma: "FIRMA",
    firma: "FIRMA",
    company: "FIRMA",
  };

  const paintFinishMapping = {
    metalik: "METALIK",
    Metalik: "METALIK",
    perła: "PERŁA",
    Perła: "PERŁA",
    mat: "MAT",
    Mat: "MAT",
    połysk: "POŁYSK",
    Połysk: "POŁYSK",
    inne: "INNE",
    Inne: "INNE",
  };

  return {
    ...data,
    // NAPRAWIONE: Kapitalizacja marki i modelu - ZAWSZE Z DUŻYCH LITER
    brand: toUpperCase(data.brand),
    model: toUpperCase(data.model),
    // NAPRAWIONE: Wersja silnika - ZAWSZE Z DUŻYCH LITER (np. TDI 1.5)
    version: toUpperCase(data.version),
    generation: toUpperCase(data.generation),
    // Mapowanie roku produkcji
    year: parseInt(data.productionYear || data.year || "2010"),
    // Mapowanie paliwa - DUŻE LITERY
    fuelType:
      fuelTypeMapping[data.fuelType] || toUpperCase(data.fuelType) || "BENZYNA",
    // Mapowanie skrzyni biegów - DUŻE LITERY
    transmission:
      transmissionMapping[data.transmission] ||
      toUpperCase(data.transmission) ||
      "MANUALNA",
    // NAPRAWIONE: Mapowanie opcji zakupu - DUŻE LITERY
    purchaseOptions:
      purchaseOptionsMapping[data.purchaseOption] ||
      purchaseOptionsMapping[data.purchaseOptions] ||
      toUpperCase(data.purchaseOptions) ||
      "SPRZEDAŻ",
    // NAPRAWIONE: Mapowanie typu sprzedającego - DUŻE LITERY
    sellerType:
      sellerTypeMapping[data.sellerType] ||
      toUpperCase(data.sellerType) ||
      "PRYWATNY",
    // Mapowanie napędu - DUŻE LITERY
    drive: driveMapping[data.drive] || toUpperCase(data.drive) || "FWD",
    // Mapowanie typu nadwozia - pierwsza litera wielka
    bodyType: bodyTypeMapping[data.bodyType] || capitalizeText(data.bodyType),
    // Mapowanie stanu pojazdu - pierwsza litera wielka
    condition:
      conditionMapping[data.condition] ||
      capitalizeText(data.condition) ||
      "Używany",
    // DODANE: Automatyczne mapowanie kraju pochodzenia na podstawie marki
    countryOfOrigin:
      data.countryOfOrigin ||
      data.country ||
      brandToCountryMapping[toUpperCase(data.brand)] ||
      "Inne",
    // NAPRAWIONE: Kolor - DUŻE LITERY
    color: toUpperCase(data.color),
    // NAPRAWIONE: Wykończenie lakieru - DUŻE LITERY
    paintFinish:
      paintFinishMapping[data.paintFinish] || toUpperCase(data.paintFinish),

    // NAPRAWIONE: Jawne mapowanie pól cesji
    leasingCompany: data.leasingCompany || null,
    remainingInstallments: data.remainingInstallments
      ? parseInt(data.remainingInstallments)
      : null,
    installmentAmount: data.installmentAmount
      ? parseFloat(data.installmentAmount)
      : null,
    cessionFee: data.cessionFee ? parseFloat(data.cessionFee) : null,

    // NAPRAWIONE: Jawne mapowanie pól zamiany
    exchangeOffer: data.exchangeOffer || null,
    exchangeValue: data.exchangeValue ? parseFloat(data.exchangeValue) : null,
    exchangePayment: data.exchangePayment
      ? parseFloat(data.exchangePayment)
      : null,
    exchangeConditions: data.exchangeConditions || null,

    // NAPRAWIONE: Jawne mapowanie pól najmu
    rentalPrice: data.rentalPrice ? parseFloat(data.rentalPrice) : null,
  };
};

/**
 * Handler dla POST /ads/add - Tworzenie nowego ogłoszenia
 */
export const createAd = [
  auth,
  validate(adValidationSchema),
  async (req, res, next) => {
    try {
      console.log("Rozpoczęto dodawanie ogłoszenia z Supabase");
      console.log("Oryginalne dane z frontendu:", req.body);
      console.log("🔍 POLA CESJI Z FRONTENDU:", {
        leasingCompany: req.body.leasingCompany,
        remainingInstallments: req.body.remainingInstallments,
        installmentAmount: req.body.installmentAmount,
        cessionFee: req.body.cessionFee,
        purchaseOptions: req.body.purchaseOptions,
        purchaseOption: req.body.purchaseOption,
      });

      // Mapowanie danych
      const mappedData = mapFormDataToBackend(req.body);

      // NAPRAWIONE: Dodane wszystkie brakujące pola w destructuring
      const {
        brand,
        model,
        generation,
        version,
        year,
        price,
        mileage,
        fuelType,
        transmission,
        vin,
        registrationNumber,
        headline,
        description,
        purchaseOptions,
        listingType,
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
        lastOfficialMileage,
        power,
        engineSize,
        drive,
        doors,
        weight,
        voivodeship,
        city,
        rentalPrice,
        status,
        sellerType,
        countryOfOrigin,
        negotiable,
        images,
        mainImage,
        // NAPRAWIONE: Dodane brakujące pola
        firstRegistrationDate,
        // Pola cesji
        leasingCompany,
        remainingInstallments,
        installmentAmount,
        cessionFee,
        // Pola zamiany
        exchangeOffer,
        exchangeValue,
        exchangePayment,
        exchangeConditions,
      } = mappedData;

      console.log("Dane po mapowaniu:", {
        brand,
        model,
        year,
        price,
        mileage,
        fuelType,
        transmission,
        description,
        purchaseOptions,
        listingType,
        sellerType,
        images,
        // Logowanie nowych pól
        firstRegistrationDate,
        countryOfOrigin,
        lastOfficialMileage,
        leasingCompany,
        exchangeOffer,
      });
      console.log("🔍 POLA CESJI PO MAPOWANIU:", {
        leasingCompany,
        remainingInstallments,
        installmentAmount,
        cessionFee,
      });

      // Pobieranie danych użytkownika
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      // Walidacja liczby zdjęć - minimum 5, maksimum 15
      if (!images || !Array.isArray(images)) {
        return res.status(400).json({ message: "Zdjęcia są wymagane." });
      }

      if (images.length < 5) {
        return res
          .status(400)
          .json({ message: "Ogłoszenie musi zawierać minimum 5 zdjęć." });
      }

      if (images.length > 15) {
        return res
          .status(400)
          .json({ message: "Ogłoszenie może zawierać maksymalnie 15 zdjęć." });
      }

      console.log(
        `Otrzymano ${images.length} URL-i zdjęć z Supabase (wymagane: 5-15):`,
        images
      );

      // Automatycznie ustaw pierwsze zdjęcie jako główne
      req.body.mainImage = images[0];
      console.log(
        "Automatycznie ustawiono pierwsze zdjęcie jako główne:",
        images[0]
      );

      // Generowanie krótkiego opisu z nagłówka (do 120 znaków)
      const shortDescription = headline ? headline.substring(0, 120) : "";

      // Ustawienie daty wygaśnięcia na podstawie roli użytkownika
      let expiresAt = null;
      if (user.role !== "admin" && user.role !== "moderator") {
        // Zwykłe ogłoszenia wygasają po 30 dniach od utworzenia
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }
      // Ogłoszenia adminów i moderatorów nie mają terminu ważności (expiresAt = null)

      // NAPRAWIONE: Tworzenie nowego ogłoszenia z wszystkimi polami
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
        vin: vin || "",
        registrationNumber: registrationNumber || "",
        firstRegistrationDate, // NAPRAWIONE: Dodane pole
        headline,
        description,
        shortDescription,
        images,
        mainImage: req.body.mainImage,
        purchaseOptions,
        negotiable: req.body.negotiable || "Nie",
        listingType,
        sellerType, // NAPRAWIONE: Powinno działać z 'firma'

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
        lastOfficialMileage: lastOfficialMileage
          ? parseInt(lastOfficialMileage)
          : undefined, // NAPRAWIONE: Dodane pole
        power: power ? parseInt(power) : undefined,
        engineSize: engineSize ? parseInt(engineSize) : undefined,
        drive,
        doors: doors ? parseInt(doors) : undefined,
        weight: weight ? parseInt(weight) : undefined,
        countryOfOrigin, // NAPRAWIONE: Dodane pole

        // Lokalizacja
        voivodeship,
        city,

        // Najem
        rentalPrice: rentalPrice ? parseFloat(rentalPrice) : null,

        // Pola cesji - używamy wartości z mappedData (null jeśli brak)
        leasingCompany: leasingCompany || null,
        remainingInstallments: remainingInstallments
          ? parseInt(remainingInstallments)
          : null,
        installmentAmount: installmentAmount
          ? parseFloat(installmentAmount)
          : null,
        cessionFee: cessionFee ? parseFloat(cessionFee) : null,

        // Pola zamiany - używamy wartości z mappedData (null jeśli brak)
        exchangeOffer: exchangeOffer || null,
        exchangeValue: exchangeValue ? parseFloat(exchangeValue) : null,
        exchangePayment: exchangePayment ? parseFloat(exchangePayment) : null,
        exchangeConditions: exchangeConditions || null,

        // Dane właściciela
        owner: req.user.userId,
        ownerName: user.name,
        ownerLastName: user.lastName,
        ownerEmail: user.email,
        ownerPhone: user.phoneNumber,
        ownerRole: user.role,

        // Termin ważności ogłoszenia
        expiresAt: expiresAt,

        // ZABEZPIECZENIE: Status zależy od roli użytkownika
        // Admin może publikować bez płatności (status: "approved")
        // Zwykli użytkownicy muszą zapłacić (status: "pending_payment")
        status:
          user.role === "admin" || user.role === "moderator"
            ? "approved"
            : "pending_payment",
      });

      console.log(
        "Utworzono obiekt ogłoszenia, próba zapisania w bazie danych"
      );
      console.log("Sprawdzenie kluczowych pól przed zapisem:", {
        sellerType: newAd.sellerType,
        purchaseOptions: newAd.purchaseOptions,
        countryOfOrigin: newAd.countryOfOrigin,
        firstRegistrationDate: newAd.firstRegistrationDate,
        lastOfficialMileage: newAd.lastOfficialMileage,
        leasingCompany: newAd.leasingCompany,
        exchangeOffer: newAd.exchangeOffer,
      });

      // ZAPISUJEMY OGŁOSZENIE DO BAZY
      // Frontend wysyła dane dopiero po kliknięciu "Zapłać" w modalu płatności
      const ad = await newAd.save();
      console.log("Ogłoszenie zapisane w bazie danych:", ad._id);

      // Tworzenie powiadomienia o dodaniu ogłoszenia
      try {
        const adTitle = headline || `${brand} ${model}`;
        await notificationManager.notifyAdCreated(
          req.user.userId,
          adTitle,
          ad._id
        );
        console.log(
          `Utworzono powiadomienie o dodaniu ogłoszenia dla użytkownika ${req.user.userId}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      // Odpowiedź z zapisanym ogłoszeniem
      res.status(201).json({
        ...ad.toObject(),
        message: "Ogłoszenie zostało pomyślnie utworzone",
      });
    } catch (err) {
      console.error("Błąd podczas tworzenia draftu ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler,
];

/**
 * Handler dla POST /ads/finalize-payment - Finalizacja płatności i publikacja ogłoszenia
 */
export const finalizePayment = [
  auth,
  async (req, res, next) => {
    try {
      console.log("Rozpoczęto finalizację płatności i publikację ogłoszenia");

      const { draftId, draftData, paymentData } = req.body;

      if (!draftId || !draftData) {
        return res.status(400).json({
          message: "Brak danych draftu ogłoszenia",
        });
      }

      // Weryfikacja użytkownika
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      // Tworzenie nowego ogłoszenia z danych draftu
      const newAd = new Ad({
        ...draftData,
        owner: req.user.userId,
        ownerName: user.name,
        ownerLastName: user.lastName,
        ownerEmail: user.email,
        ownerPhone: user.phoneNumber,
        ownerRole: user.role,
        // Status zależy od roli użytkownika
        status:
          user.role === "admin" || user.role === "moderator"
            ? "approved"
            : "approved", // Zmienione na "approved" po płatności
      });

      // Zapisz ogłoszenie w bazie danych
      const ad = await newAd.save();
      console.log("Ogłoszenie zapisane w bazie danych po płatności:", ad._id);

      // Pobierz dane z draftData dla powiadomień
      const headline = draftData.headline || "";
      const brand = draftData.brand || "";
      const model = draftData.model || "";

      // Tworzenie transakcji dla ogłoszenia
      // Pobierz dane płatności z paymentData lub req.body
      let paymentAmount = paymentData?.amount || req.body.paymentAmount || 50;
      const paymentMethod =
        paymentData?.method || req.body.paymentMethod || "card";
      const transactionType =
        paymentData?.type || req.body.transactionType || "standard_listing";
      const promoCode = paymentData?.promoCode || req.body.promoCode;

      // Walidacja i stosowanie kodu promocyjnego
      let appliedPromotion = null;
      let originalAmount = paymentAmount;
      let discountAmount = 0;

      if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
        try {
          const normalized = promoCode.trim().toUpperCase();
          console.log(`Sprawdzanie kodu promocyjnego: ${normalized}`);

          // Szukaj aktywnej promocji
          const promotion = await Promotion.findOne({
            promoCode: normalized,
            status: "active",
          });

          if (promotion) {
            // Sprawdź czy promocja jest aktywna w danym okresie
            const now = new Date();
            const isValidPeriod =
              (!promotion.validFrom || now >= promotion.validFrom) &&
              (!promotion.validTo || now <= promotion.validTo);

            // Sprawdź limit użyć globalny
            const usedCount = Number(promotion.usedCount ?? 0);
            const hasGlobalLimit =
              !promotion.usageLimit || usedCount < promotion.usageLimit;

            // Sprawdź limit użyć per użytkownik
            const userUsageCount = promotion.usedByUsers.filter(
              (id) => id.toString() === req.user.userId.toString()
            ).length;
            const hasUserLimit =
              !promotion.maxUsagePerUser ||
              userUsageCount < promotion.maxUsagePerUser;

            if (isValidPeriod && hasGlobalLimit && hasUserLimit) {
              // Zastosuj zniżkę
              if (promotion.type === "percentage") {
                discountAmount = (originalAmount * promotion.value) / 100;
                paymentAmount = originalAmount - discountAmount;
              } else if (promotion.type === "fixed_amount") {
                discountAmount = promotion.value;
                paymentAmount = Math.max(0, originalAmount - discountAmount);
              } else if (promotion.type === "free_listing") {
                discountAmount = originalAmount;
                paymentAmount = 0;
              }

              appliedPromotion = {
                code: promotion.promoCode,
                type: promotion.type,
                value: promotion.value,
                title: promotion.title,
              };

              // Oznacz kod jako użyty
              promotion.usedCount = usedCount + 1;
              if (!promotion.usedByUsers.includes(req.user.userId)) {
                promotion.usedByUsers.push(req.user.userId);
              }
              await promotion.save();

              console.log(
                `Zastosowano kod promocyjny ${normalized}: zniżka ${discountAmount.toFixed(
                  2
                )} zł, nowa kwota: ${paymentAmount.toFixed(2)} zł`
              );
            } else {
              console.log(
                `Kod promocyjny ${normalized} jest nieważny lub wyczerpany`
              );
            }
          } else {
            console.log(`Kod promocyjny ${normalized} nie został znaleziony`);
          }
        } catch (promoError) {
          console.error(
            "Błąd podczas walidacji kodu promocyjnego:",
            promoError
          );
          // Kontynuuj bez kodu promocyjnego
        }
      }

      try {
        // Generuj unikalny ID transakcji
        const transactionId = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;

        // Utwórz transakcję
        const transaction = new Transaction({
          userId: req.user.userId,
          adId: ad._id,
          amount: parseFloat(paymentAmount),
          type: transactionType,
          status: "completed", // Symulacja udanej płatności
          paymentMethod: paymentMethod,
          transactionId: transactionId,
          metadata: {
            adTitle: headline || `${brand} ${model}`,
            createdBy: "listing_creation_system",
            simulatedPayment: true, // Oznaczenie że to symulowana płatność
            originalAmount: originalAmount,
            discountAmount: discountAmount,
            finalAmount: paymentAmount,
            promoCode: appliedPromotion ? appliedPromotion.code : null,
            promoType: appliedPromotion ? appliedPromotion.type : null,
            promoValue: appliedPromotion ? appliedPromotion.value : null,
          },
        });

        await transaction.save();
        console.log(
          `Utworzono transakcję ${transactionId} dla ogłoszenia ${ad._id}, kwota: ${paymentAmount} PLN`
        );

        // Utwórz powiadomienie o udanej płatności
        try {
          const adTitle = headline || `${brand} ${model}`;
          await notificationManager.notifyPaymentStatusChange(
            req.user.userId,
            "completed",
            adTitle,
            {
              transactionId: transaction.transactionId,
              amount: paymentAmount,
              type: transactionType,
            }
          );
          console.log("Utworzono powiadomienie o udanej płatności");
        } catch (notificationError) {
          console.error(
            "Błąd podczas tworzenia powiadomienia o płatności:",
            notificationError
          );
        }
      } catch (transactionError) {
        console.error("Błąd podczas tworzenia transakcji:", transactionError);
        // Nie przerywamy głównego procesu w przypadku błędu transakcji
      }

      // Tworzenie powiadomienia o dodaniu ogłoszenia
      try {
        const adTitle = headline || `${brand} ${model}`;
        await notificationManager.notifyAdCreated(
          req.user.userId,
          adTitle,
          ad._id
        );
        console.log(
          `Utworzono powiadomienie o dodaniu ogłoszenia dla użytkownika ${req.user.userId}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      // Odpowiedź z opublikowanym ogłoszeniem
      res.status(201).json({
        ...ad.toObject(),
        message: "Ogłoszenie zostało pomyślnie opublikowane po płatności",
      });
    } catch (err) {
      console.error("Błąd podczas dodawania ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler,
];
