# ANALIZA: CZEGO BACKEND NIE WYSYŁA DO BAZY DANYCH

## PORÓWNANIE POLA Z FORMULARZA VS createAdHandler

### ❌ POLA KTÓRE BRAKUJĄ W createAdHandler (destructuring):

#### Z FORMULARZA → BRAKUJE W BACKEND:

1. **lastOfficialMileage** (Przebieg CEPiK)
   - ✅ Jest w formularzu: TechnicalDataSection
   - ✅ Jest w schemacie: technicalDetailsSchema
   - ❌ **BRAKUJE** w createAdHandler destructuring

2. **doors** (Liczba drzwi)
   - ✅ Jest w formularzu: BodyInfoSection (1,2,3,4,5,6)
   - ✅ Jest w schemacie: technicalDetailsSchema
   - ❌ **BRAKUJE** w createAdHandler destructuring

3. **firstRegistrationDate** (Data pierwszej rejestracji)
   - ✅ Jest w formularzu: BasicInfoSection (DatePicker)
   - ❌ **BRAKUJE** w schemacie basicInfoSchema
   - ❌ **BRAKUJE** w createAdHandler destructuring

### ❌ PROBLEMY MAPOWANIA W createAdHandler:

4. **productionYear → year**
   - ✅ Frontend wysyła: `productionYear`
   - ❌ Backend mapuje: `year: parseInt(data.productionYear || data.year || '2010')`
   - ⚠️ **PROBLEM**: Może nie działać poprawnie

5. **engineSize** (Pojemność)
   - ✅ Jest w formularzu: TechnicalDataSection
   - ✅ Jest w schemacie: technicalDetailsSchema
   - ✅ Jest w createAdHandler destructuring
   - ⚠️ **PROBLEM**: Może być problem z mapowaniem

### ✅ POLA KTÓRE DZIAŁAJĄ POPRAWNIE:

- brand, model, generation, version ✅
- price, mileage, fuelType, transmission ✅
- vin, registrationNumber ✅
- headline, description ✅
- purchaseOptions, sellerType ✅
- condition, accidentStatus, damageStatus ✅
- bodyType, color, paintFinish, seats ✅
- power, weight ✅
- drive ✅
- countryOfOrigin ✅
- imported, registeredInPL, firstOwner, disabledAdapted ✅
- tuning ✅
- Pola cesji: leasingCompany, remainingInstallments, installmentAmount, cessionFee ✅
- Pola zamiany: exchangeOffer, exchangeValue, exchangePayment, exchangeConditions ✅

---

## KONKRETNE PROBLEMY DO NAPRAWY:

### 1. BRAKUJE W DESTRUCTURING createAdHandler:
```javascript
// DODAĆ DO DESTRUCTURING:
const {
  // ... istniejące pola ...
  lastOfficialMileage,    // ❌ BRAKUJE
  doors,                  // ❌ BRAKUJE
  firstRegistrationDate   // ❌ BRAKUJE (gdy dodamy do schematu)
} = mappedData;
```

### 2. BRAKUJE W TWORZENIU OBIEKTU Ad:
```javascript
const newAd = new Ad({
  // ... istniejące pola ...
  lastOfficialMileage: lastOfficialMileage ? parseInt(lastOfficialMileage) : undefined,  // ❌ BRAKUJE
  doors: doors ? parseInt(doors) : undefined,                                            // ❌ BRAKUJE
  firstRegistrationDate                                                                  // ❌ BRAKUJE
});
```

### 3. DODAĆ POLE DO SCHEMATU:
```javascript
// W basicInfoSchema.js DODAĆ:
firstRegistrationDate: {
  type: Date
}
```

---

## DLACZEGO TE POLA SIĘ NIE WYŚWIETLAJĄ:

1. **lastOfficialMileage** - backend nie zapisuje do bazy, więc nie ma czego wyświetlić
2. **doors** - backend nie zapisuje do bazy, więc nie ma czego wyświetlić  
3. **firstRegistrationDate** - nie ma w schemacie + backend nie zapisuje

---

## SZYBKA NAPRAWA:

### KROK 1: Dodać firstRegistrationDate do basicInfoSchema
### KROK 2: Dodać brakujące pola do destructuring w createAdHandler
### KROK 3: Dodać brakujące pola do tworzenia obiektu Ad
### KROK 4: Przetestować

**TO SĄ GŁÓWNE POWODY DLACZEGO DANE SIĘ NIE WYŚWIETLAJĄ!**
