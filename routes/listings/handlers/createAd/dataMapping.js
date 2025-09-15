/**
 * Mapowanie danych z frontendu na backend
 */

/**
 * Funkcja do kapitalizacji tekstu (pierwsza litera duża, reszta mała)
 */
const capitalizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Funkcja do pełnej kapitalizacji (wszystkie litery duże)
 */
const toUpperCase = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.toUpperCase();
};

/**
 * Mapowanie marek na kraje pochodzenia
 */
const brandToCountryMapping = {
  // Niemieckie marki
  'AUDI': 'Niemcy',
  'BMW': 'Niemcy',
  'MERCEDES-BENZ': 'Niemcy',
  'MERCEDES': 'Niemcy',
  'VOLKSWAGEN': 'Niemcy',
  'PORSCHE': 'Niemcy',
  'OPEL': 'Niemcy',
  'SMART': 'Niemcy',
  
  // Francuskie marki
  'PEUGEOT': 'Francja',
  'CITROEN': 'Francja',
  'RENAULT': 'Francja',
  'DACIA': 'Francja',
  
  // Włoskie marki
  'FIAT': 'Włochy',
  'ALFA ROMEO': 'Włochy',
  'LANCIA': 'Włochy',
  'FERRARI': 'Włochy',
  'LAMBORGHINI': 'Włochy',
  'MASERATI': 'Włochy',
  
  // Hiszpańskie marki
  'SEAT': 'Hiszpania',
  'CUPRA': 'Hiszpania',
  
  // Czeskie marki
  'SKODA': 'Czechy',
  
  // Szwedzkie marki
  'VOLVO': 'Szwecja',
  'SAAB': 'Szwecja',
  
  // Brytyjskie marki
  'ASTON MARTIN': 'Wielka Brytania',
  'BENTLEY': 'Wielka Brytania',
  'JAGUAR': 'Wielka Brytania',
  'LAND ROVER': 'Wielka Brytania',
  'LOTUS': 'Wielka Brytania',
  'MINI': 'Wielka Brytania',
  'ROLLS-ROYCE': 'Wielka Brytania',
  
  // Amerykańskie marki
  'FORD': 'USA',
  'CHEVROLET': 'USA',
  'CADILLAC': 'USA',
  'CHRYSLER': 'USA',
  'DODGE': 'USA',
  'JEEP': 'USA',
  'TESLA': 'USA',
  
  // Japońskie marki
  'TOYOTA': 'Japonia',
  'HONDA': 'Japonia',
  'NISSAN': 'Japonia',
  'MAZDA': 'Japonia',
  'SUBARU': 'Japonia',
  'MITSUBISHI': 'Japonia',
  'SUZUKI': 'Japonia',
  'LEXUS': 'Japonia',
  'ACURA': 'Japonia',
  'INFINITI': 'Japonia',
  
  // Koreańskie marki
  'HYUNDAI': 'Korea Południowa',
  'KIA': 'Korea Południowa',
  'GENESIS': 'Korea Południowa',
  'DAEWOO': 'Korea Południowa',
  
  // Polskie marki
  'FSO': 'Polska',
  'POLONEZ': 'Polska',
  'SYRENA': 'Polska'
};

/**
 * Mapowanie wartości z frontendu na backend
 */
export const mapFormDataToBackend = (data) => {
  const fuelTypeMapping = {
    'Benzyna': 'BENZYNA',
    'benzyna': 'BENZYNA',
    'Diesel': 'DIESEL', 
    'diesel': 'DIESEL',
    'Elektryczny': 'ELEKTRYCZNY',
    'elektryczny': 'ELEKTRYCZNY',
    'Hybryda': 'HYBRYDA',
    'hybryda': 'HYBRYDA',
    'Hybrydowy': 'HYBRYDA',
    'hybrydowy': 'HYBRYDA',
    'Benzyna+LPG': 'BENZYNA+LPG',
    'benzyna+lpg': 'BENZYNA+LPG',
    'Benzyna+CNG': 'BENZYNA+CNG',
    'benzyna+cng': 'BENZYNA+CNG',
    'Etanol': 'ETANOL',
    'etanol': 'ETANOL'
  };

  const transmissionMapping = {
    'Manualna': 'MANUALNA',
    'manualna': 'MANUALNA',
    'Automatyczna': 'AUTOMATYCZNA',
    'automatyczna': 'AUTOMATYCZNA',
    'Półautomatyczna': 'PÓŁAUTOMATYCZNA',
    'półautomatyczna': 'PÓŁAUTOMATYCZNA',
    'Bezstopniowa CVT': 'AUTOMATYCZNA CVT',
    'bezstopniowa cvt': 'AUTOMATYCZNA CVT'
  };

  const purchaseOptionsMapping = {
    'sprzedaz': 'SPRZEDAŻ',
    'sprzedaż': 'SPRZEDAŻ',
    'Sprzedaż': 'SPRZEDAŻ',
    'umowa kupna-sprzedaży': 'SPRZEDAŻ',
    'faktura': 'FAKTURA VAT',
    'faktura VAT': 'FAKTURA VAT',
    'Faktura VAT': 'FAKTURA VAT', 
    'inne': 'INNE',
    'Inne': 'INNE',
    'najem': 'NAJEM',
    'Najem': 'NAJEM',
    'leasing': 'LEASING',
    'Leasing': 'LEASING',
    'Cesja': 'CESJA LEASINGU',
    'cesja': 'CESJA LEASINGU',
    'Cesja leasingu': 'CESJA LEASINGU',
    'cesja leasingu': 'CESJA LEASINGU',
    'Zamiana': 'ZAMIANA',
    'zamiana': 'ZAMIANA'
  };

  const driveMapping = {
    'RWD (tylny)': 'RWD',
    'FWD (przedni)': 'FWD',
    'AWD (na cztery koła)': 'AWD',
    'Na cztery koła stały': '4WD',
    'Na cztery koła dołączany': 'AWD',
    'Przedni': 'FWD',
    'przedni': 'FWD',
    'Tylny': 'RWD',
    'tylny': 'RWD',
    '4x4': '4WD',
    'Napęd na przód': 'FWD',
    'Napęd na tył': 'RWD',
    'Napęd na cztery koła': 'AWD'
  };

  const bodyTypeMapping = {
    'Hatchback': 'Hatchback',
    'hatchback': 'Hatchback',
    'Sedan': 'Sedan',
    'sedan': 'Sedan',
    'Kombi': 'Kombi',
    'kombi': 'Kombi',
    'SUV': 'Suv',
    'suv': 'Suv',
    'Coupe': 'Coupe',
    'coupe': 'Coupe',
    'Cabrio': 'Cabrio',
    'cabrio': 'Cabrio',
    'Kabriolet': 'Cabrio',
    'kabriolet': 'Cabrio',
    'Terenowe': 'Terenowe',
    'terenowe': 'Terenowe',
    'Minivan': 'Minivan',
    'minivan': 'Minivan',
    'Dostawcze': 'Dostawcze',
    'dostawcze': 'Dostawcze',
    'Pickup': 'Pickup',
    'pickup': 'Pickup',
    'Van': 'Van',
    'van': 'Van',
    'Limuzyna': 'Limuzyna',
    'limuzyna': 'Limuzyna',
    'Roadster': 'Roadster',
    'roadster': 'Roadster',
    'Targa': 'Targa',
    'targa': 'Targa'
  };

  const conditionMapping = {
    'nowy': 'Nowy',
    'Nowy': 'Nowy',
    'używany': 'Używany',
    'Używany': 'Używany',
    'uzywany': 'Używany'
  };

  const sellerTypeMapping = {
    'Prywatny': 'PRYWATNY',
    'prywatny': 'PRYWATNY',
    'private': 'PRYWATNY',
    'Firma': 'FIRMA',
    'firma': 'FIRMA',
    'company': 'FIRMA'
  };

  const paintFinishMapping = {
    'metalik': 'METALIK',
    'Metalik': 'METALIK',
    'perła': 'PERŁA',
    'Perła': 'PERŁA',
    'mat': 'MAT',
    'Mat': 'MAT',
    'połysk': 'POŁYSK',
    'Połysk': 'POŁYSK',
    'inne': 'INNE',
    'Inne': 'INNE'
  };

  return {
    ...data,
    // Kapitalizacja marki i modelu - ZAWSZE Z DUŻYCH LITER
    brand: toUpperCase(data.brand),
    model: toUpperCase(data.model),
    // Wersja silnika - ZAWSZE Z DUŻYCH LITER (np. TDI 1.5)
    version: toUpperCase(data.version),
    generation: toUpperCase(data.generation),
    // Mapowanie roku produkcji
    year: parseInt(data.productionYear || data.year || '2010'),
    // Mapowanie paliwa - DUŻE LITERY
    fuelType: fuelTypeMapping[data.fuelType] || toUpperCase(data.fuelType) || 'BENZYNA',
    // Mapowanie skrzyni biegów - DUŻE LITERY
    transmission: transmissionMapping[data.transmission] || toUpperCase(data.transmission) || 'MANUALNA',
    // Mapowanie opcji zakupu - DUŻE LITERY
    purchaseOptions: purchaseOptionsMapping[data.purchaseOption] || purchaseOptionsMapping[data.purchaseOptions] || toUpperCase(data.purchaseOptions) || 'SPRZEDAŻ',
    // Mapowanie typu sprzedającego - DUŻE LITERY
    sellerType: sellerTypeMapping[data.sellerType] || toUpperCase(data.sellerType) || 'PRYWATNY',
    // Mapowanie napędu - DUŻE LITERY
    drive: driveMapping[data.drive] || toUpperCase(data.drive) || 'FWD',
    // Mapowanie typu nadwozia - pierwsza litera wielka
    bodyType: bodyTypeMapping[data.bodyType] || capitalizeText(data.bodyType),
    // Mapowanie stanu pojazdu - pierwsza litera wielka
    condition: conditionMapping[data.condition] || capitalizeText(data.condition) || 'Używany',
    // Automatyczne mapowanie kraju pochodzenia na podstawie marki
    countryOfOrigin: data.countryOfOrigin || data.country || brandToCountryMapping[toUpperCase(data.brand)] || 'Inne',
    // Kolor - DUŻE LITERY
    color: toUpperCase(data.color),
    // Wykończenie lakieru - DUŻE LITERY
    paintFinish: paintFinishMapping[data.paintFinish] || toUpperCase(data.paintFinish)
  };
};
