# ANALIZA PÓL FORMULARZA VS BAZA DANYCH

## POLA Z FORMULARZA (na podstawie zrzutu ekranu Volvo Xc60):

### DANE TECHNICZNE:
1. **Marka**: Volvo ✅ (mamy w bazie: `brand`)
2. **Model**: Xc60 ✅ (mamy w bazie: `model`)
3. **Generacja**: Brak ✅ (mamy w bazie: `generation`)
4. **Rok produkcji**: 2016 ✅ (mamy w bazie: `year`)
5. **Przebieg CEPIK**: 176523 km ❌ **BRAKUJE** (mamy tylko `mileage`, ale nie `cepikMileage`)
6. **Moc**: 160 KM ✅ (mamy w bazie: `power`)
7. **Skrzynia**: Automatyczna ✅ (mamy w bazie: `transmission`)
8. **Waga**: 1895 kg ✅ (mamy w bazie: `weight`)
9. **Napęd**: Fwd (Wyd) ✅ (mamy w bazie: `drive`)
10. **Typ nadwozia**: Hatchback ✅ (mamy w bazie: `bodyType`)
11. **Kolor**: Czarny ✅ (mamy w bazie: `color`)
12. **Liczba miejsc**: 5 ✅ (mamy w bazie: `seats`)
13. **Tuning**: Tak ✅ (mamy w bazie: `tuning`)

### INFORMACJE O POJEŹDZIE:
14. **Stan techniczny**: Używany ✅ (mamy w bazie: `condition`)
15. **Historyczny**: Tak ❌ **PROBLEM MAPOWANIA** (mamy `imported`, ale nie `historyczny`)
16. **Kraj pochodzenia**: Niemcy ✅ (mamy w bazie: `countryOfOrigin`)
17. **Typ sprzedawcy**: Prywatny ✅ (mamy w bazie: `sellerType`)
18. **Wyposażenie**: Bezwypadkowy ❌ **PROBLEM MAPOWANIA** (to powinno być `accidentStatus`)
19. **Adaptacja medyczna**: Tak ✅ (mamy w bazie: `disabledAdapted`)
20. **VIN**: WVGZZZ5N2GW428063 ✅ (mamy w bazie: `vin`)
21. **Nr rejestracyjny**: LGSYXUX ✅ (mamy w bazie: `registrationNumber`)

### INFORMACJE SPRZEDAŻOWE:
22. **Cena do negocjacji**: Tak ✅ (mamy w bazie: `negotiable`)
23. **Opcja zakupu**: Zamiana ✅ (mamy w bazie: `purchaseOptions`)
24. **Obrót w zamian**: Zamiana za małucha ✅ (mamy w bazie: `exchangeOffer`)
25. **Dopłata**: 200000 zł ❌ **BRAKUJE** (nie mamy pola `exchangePayment` w formularzu)
26. **Wartość oferowanego pojazdu**: 70 zł ❌ **BRAKUJE** (nie mamy pola `exchangeValue` w formularzu)
27. **Data pierwszej rejestracji**: 2023 09 01 ❌ **BRAKUJE** (nie mamy `firstRegistrationDate` w schemacie)

---

## PROBLEMY I BRAKUJĄCE POLA:

### 1. BRAKUJĄCE POLA W SCHEMACIE:
- `cepikMileage` - przebieg z CEPIK (różny od zwykłego przebiegu)
- `firstRegistrationDate` - data pierwszej rejestracji

### 2. PROBLEMY MAPOWANIA:
- **"Historyczny"** → powinno mapować na `imported` 
- **"Bezwypadkowy"** w sekcji "Wyposażenie" → powinno mapować na `accidentStatus`

### 3. POLA KTÓRE MAMY W BAZIE, ALE NIE MA W FORMULARZU:
- `generation` - generacja pojazdu
- `version` - wersja pojazdu  
- `engineSize` - pojemność silnika
- `doors` - liczba drzwi
- `paintFinish` - rodzaj lakieru
- `voivodeship` - województwo
- `city` - miasto
- `rentalPrice` - cena najmu
- `cessionFee` - opłata za cesję
- `exchangeConditions` - warunki zamiany

### 4. POLA CESJI (nie widoczne w tym formularzu, bo to zamiana):
✅ Wszystkie pola cesji są w schemacie:
- `leasingCompany`
- `remainingInstallments` 
- `installmentAmount`
- `cessionFee`

### 5. POLA ZAMIANY:
✅ `exchangeOffer` - jest w formularzu i schemacie
❌ `exchangePayment` - jest w schemacie, ale nie widać w formularzu
❌ `exchangeValue` - jest w schemacie, ale nie widać w formularzu  
❌ `exchangeConditions` - jest w schemacie, ale nie widać w formularzu

---

## MAPOWANIE W createAdHandler - STATUS:

### ✅ DZIAŁA POPRAWNIE:
- Podstawowe pola (marka, model, rok, cena, przebieg)
- Pola techniczne (moc, skrzynia, napęd, kolor)
- Pola cesji i zamiany
- sellerType 'firma' → 'Firma'
- purchaseOptions mapowanie

### ❌ WYMAGA POPRAWY:
1. **Brak mapowania dla "Historyczny"**:
   ```javascript
   // Powinno być dodane:
   imported: data.historyczny || data.imported
   ```

2. **Brak pola `cepikMileage`** w schemacie i mapowaniu

3. **Brak pola `firstRegistrationDate`** w schemacie

4. **Problem z "Bezwypadkowy" w sekcji wyposażenie** - powinno mapować na `accidentStatus`

---

## REKOMENDACJE:

1. **Dodać brakujące pola do schematu**:
   - `cepikMileage` w technicalDetailsSchema
   - `firstRegistrationDate` w basicInfoSchema

2. **Poprawić mapowanie w createAdHandler**:
   - Dodać mapowanie dla "historyczny" → `imported`
   - Dodać obsługę `cepikMileage`
   - Dodać obsługę `firstRegistrationDate`

3. **Sprawdzić frontend**:
   - Czy wszystkie pola zamiany są wysyłane
   - Czy pole "historyczny" jest poprawnie nazwane

4. **Przetestować**:
   - Czy po dodaniu ogłoszenia wszystkie pola są zapisywane
   - Czy wyświetlają się w szczegółach ogłoszenia
