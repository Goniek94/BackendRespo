# KOMPLETNA LISTA WSZYSTKICH OPCJI Z FORMULARZA DODAWANIA OGŁOSZENIA

## 1. BASIC INFO SECTION (Podstawowe informacje)

### Nagłówek ogłoszenia:
- **Pole tekstowe** (80-120 znaków, wymagane)

### Kto sprzedaje:
- **Osoba Prywatna** (prywatny)
- **Firma** (firma)

### Dane pojazdu z VIN:
- **Numer rejestracyjny** (pole tekstowe)
- **Data pierwszej rejestracji** (DatePicker)
- **Numer VIN** (pole tekstowe, 17 znaków)

### Podstawowe dane pojazdu:
- **Marka** (dynamiczna lista z API)
- **Model** (dynamiczna lista z API)
- **Generacja** (dynamiczna lista z API)
- **Rok produkcji** (1900 - aktualny rok + 1)

### Dodatkowe informacje:
- **Wersja silnika** (pole tekstowe, np. "1.4 TSI")
- **Numer rejestracyjny** (pole tekstowe)
- **Data pierwszej rejestracji** (DatePicker)
- **Numer VIN** (pole tekstowe)

---

## 2. PRICE SECTION (Cena i opcje zakupu)

### Opcje zakupu:
- **Sprzedaż** (umowa kupna-sprzedaży)
- **Faktura VAT** (faktura VAT)
- **Inne** (z modelem wyboru):
  - **Cesja** (Cesja leasingu)
  - **Zamiana** (Zamiana)
  - **Najem** (Najem)

### Cena:
- **Cena (zł)** (pole liczbowe, wymagane dla sprzedaży)
- **Cena najmu (zł/miesiąc)** (dla opcji najem)
- **Cena do negocjacji** (checkbox)

### Pola dla CESJI:
- **Firma leasingowa/bank** (pole tekstowe, wymagane)
- **Pozostałe raty (ilość)** (pole liczbowe, wymagane)
- **Wysokość raty (zł/miesiąc)** (pole liczbowe, wymagane)
- **Opłata za cesję (zł)** (pole liczbowe, opcjonalne)

### Pola dla ZAMIANY:
- **Co oferujesz w zamian** (textarea, wymagane)
- **Szacowana wartość oferowanego pojazdu (zł)** (pole liczbowe)
- **Dopłata (zł)** (pole liczbowe, może być ujemna)
- **Dodatkowe warunki zamiany** (textarea)

---

## 3. TECHNICAL DATA SECTION (Dane techniczne)

### Pola liczbowe:
- **Przebieg (km)** (wymagane)
- **Przebieg CEPiK (km)** (opcjonalne)
- **Pojemność (cm³)** (wymagane)
- **Moc (KM)** (wymagane)
- **Waga (kg)** (opcjonalne)

### Pola wyboru:
- **Paliwo** (wymagane):
  - Benzyna
  - Diesel
  - LPG
  - Hybryda
  - Hybryda plug-in
  - Elektryczny
  - CNG
  - Wodór

- **Skrzynia** (wymagane):
  - Manualna
  - Automatyczna
  - Półautomatyczna
  - CVT

- **Napęd** (wymagane):
  - FWD (przedni)
  - RWD (tylny)
  - AWD/4x4

- **Tuning**:
  - Tak
  - Nie

- **Wykończenie** (wymagane):
  - Metalik
  - Perła
  - Mat
  - Połysk
  - Inne (z możliwością wpisania własnego)

---

## 4. BODY INFO SECTION (Nadwozie)

### Typ nadwozia (wymagane):
- Sedan
- Hatchback
- Kombi
- SUV
- Coupe
- Cabrio
- Pickup
- Van
- Minivan
- Limuzyna
- Roadster
- Targa

### Kolor (wymagane):
- Biały
- Czarny
- Srebrny
- Szary
- Niebieski
- Czerwony
- Zielony
- Żółty
- Brązowy
- Złoty
- Fioletowy
- Pomarańczowy
- Inne

### Liczba drzwi (wymagane):
- 1, 2, 3, 4, 5, 6

### Liczba miejsc (wymagane):
- 2, 3, 4, 5, 6, 7, 8, 9+

---

## 5. VEHICLE STATUS SECTION (Stan pojazdu)

### Stan (wymagane):
- **Nowy**
- **Używany**

### Wypadkowość (wymagane):
- **Bezwypadkowy**
- **Powypadkowy**

### Uszkodzenia (wymagane):
- **Nieuszkodzony**
- **Uszkodzony**

### Kraj pochodzenia (wymagane):
- Polska
- Niemcy
- Francja
- Włochy
- Hiszpania
- Czechy
- Słowacja
- Austria
- Belgia
- Holandia
- Szwecja
- Dania
- Norwegia
- Finlandia
- Wielka Brytania
- USA
- Japonia
- Korea Południowa
- Inne

### Importowany (wymagane):
- **Tak**
- **Nie**

### Zarejestrowany w PL (wymagane):
- **Tak**
- **Nie**

### Pierwszy właściciel (wymagane):
- **Tak**
- **Nie**

### Adaptacja medyczna (opcjonalne):
- **Tak**
- **Nie**

---

## 6. INNE SEKCJE (nie sprawdzone szczegółowo):

- **AdditionalFeaturesSection** - wyposażenie dodatkowe
- **DescriptionSection** - opis pojazdu
- **LocationSection** - lokalizacja
- **PhotoUploadSection** - zdjęcia

---

## PODSUMOWANIE WSZYSTKICH OPCJI:

### OPCJE WYBORU (SELECT/DROPDOWN):
1. **Kto sprzedaje**: Osoba Prywatna, Firma
2. **Marka**: Dynamiczna lista z API
3. **Model**: Dynamiczna lista z API  
4. **Generacja**: Dynamiczna lista z API
5. **Rok produkcji**: 1900 - 2026
6. **Opcje zakupu**: Sprzedaż, Faktura VAT, Inne (Cesja/Zamiana/Najem)
7. **Paliwo**: Benzyna, Diesel, LPG, Hybryda, Hybryda plug-in, Elektryczny, CNG, Wodór
8. **Skrzynia**: Manualna, Automatyczna, Półautomatyczna, CVT
9. **Napęd**: FWD (przedni), RWD (tylny), AWD/4x4
10. **Tuning**: Tak, Nie
11. **Wykończenie**: Metalik, Perła, Mat, Połysk, Inne
12. **Typ nadwozia**: Sedan, Hatchback, Kombi, SUV, Coupe, Cabrio, Pickup, Van, Minivan, Limuzyna, Roadster, Targa
13. **Kolor**: Biały, Czarny, Srebrny, Szary, Niebieski, Czerwony, Zielony, Żółty, Brązowy, Złoty, Fioletowy, Pomarańczowy, Inne
14. **Liczba drzwi**: 1, 2, 3, 4, 5, 6
15. **Liczba miejsc**: 2, 3, 4, 5, 6, 7, 8, 9+
16. **Stan**: Nowy, Używany
17. **Wypadkowość**: Bezwypadkowy, Powypadkowy
18. **Uszkodzenia**: Nieuszkodzony, Uszkodzony
19. **Kraj pochodzenia**: Polska, Niemcy, Francja, Włochy, Hiszpania, Czechy, Słowacja, Austria, Belgia, Holandia, Szwecja, Dania, Norwegia, Finlandia, Wielka Brytania, USA, Japonia, Korea Południowa, Inne
20. **Importowany**: Tak, Nie
21. **Zarejestrowany w PL**: Tak, Nie
22. **Pierwszy właściciel**: Tak, Nie
23. **Adaptacja medyczna**: Tak, Nie

### POLA TEKSTOWE:
- Nagłówek ogłoszenia
- Wersja silnika
- Numer rejestracyjny
- Numer VIN
- Firma leasingowa/bank
- Co oferujesz w zamian
- Dodatkowe warunki zamiany

### POLA LICZBOWE:
- Cena (zł)
- Cena najmu (zł/miesiąc)
- Przebieg (km)
- Przebieg CEPiK (km)
- Pojemność (cm³)
- Moc (KM)
- Waga (kg)
- Pozostałe raty (ilość)
- Wysokość raty (zł/miesiąc)
- Opłata za cesję (zł)
- Szacowana wartość oferowanego pojazdu (zł)
- Dopłata (zł)

### POLA DATY:
- Data pierwszej rejestracji

### CHECKBOXY:
- Cena do negocjacji

**ŁĄCZNIE: 23 pola wyboru + 11 pól tekstowych + 12 pól liczbowych + 1 pole daty + 1 checkbox = 48 PÓL FORMULARZA**
