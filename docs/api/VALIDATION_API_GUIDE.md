# 📋 PRZEWODNIK API WALIDACJI - MARKETPLACE BACKEND

## 🎯 **PRZEGLĄD**

System walidacji w czasie rzeczywistym dla formularza rejestracji użytkowników. Umożliwia sprawdzanie dostępności email/telefonu oraz walidację wieku przed wysłaniem formularza.

---

## 🔗 **ENDPOINTY API**

### 1. **Sprawdzanie Email** 
```
POST /api/v1/users/check-email
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Email dostępny):**
```json
{
  "exists": false,
  "message": "Adres email jest dostępny.",
  "valid": true
}
```

**Response (Email zajęty):**
```json
{
  "exists": true,
  "message": "Ten adres email jest już zarejestrowany. Spróbuj się zalogować lub użyj innego adresu.",
  "valid": false,
  "code": "EMAIL_ALREADY_EXISTS"
}
```

### 2. **Sprawdzanie Telefonu**
```
POST /api/v1/users/check-phone
```

**Request Body:**
```json
{
  "phone": "+48123456789"
}
```

**Response (Telefon dostępny):**
```json
{
  "exists": false,
  "message": "Numer telefonu jest dostępny.",
  "valid": true
}
```

**Response (Telefon zajęty):**
```json
{
  "exists": true,
  "message": "Ten numer telefonu jest już przypisany do innego konta. Użyj innego numeru.",
  "valid": false,
  "code": "PHONE_ALREADY_EXISTS"
}
```

---

## 📝 **WALIDACJA REJESTRACJI**

### **Endpoint Rejestracji:**
```
POST /api/v1/users/register
```

### **Ulepszone Walidacje:**

#### **1. Imię (name):**
- ✅ Wymagane
- ✅ 2-50 znaków
- ✅ Tylko litery, spacje, myślniki
- ✅ Obsługa polskich znaków (ąćęłńóśźż)

#### **2. Email:**
- ✅ Prawidłowy format
- ✅ Maksymalnie 100 znaków
- ✅ Sprawdzanie duplikatów
- ✅ Normalizacja

#### **3. Hasło:**
- ✅ 8-128 znaków
- ✅ Minimum: 1 mała litera, 1 wielka, 1 cyfra
- ✅ Bezpieczne wymagania

#### **4. Telefon:**
- ✅ Format międzynarodowy (+kod kraju)
- ✅ 9-16 znaków
- ✅ Sprawdzanie duplikatów

#### **5. Data urodzenia (dob):**
- ✅ Format ISO8601 (YYYY-MM-DD)
- ✅ **Minimum 16 lat**
- ✅ Maksimum 120 lat
- ✅ Dokładne obliczanie wieku

---

## 🚨 **KOMUNIKATY BŁĘDÓW**

### **Wiek poniżej 16 lat:**
```json
{
  "message": "Musisz mieć co najmniej 16 lat, aby się zarejestrować.",
  "field": "dob",
  "code": "AGE_TOO_YOUNG"
}
```

### **Email już istnieje:**
```json
{
  "message": "Ten adres email jest już zarejestrowany. Spróbuj się zalogować lub użyj innego adresu.",
  "field": "email",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

### **Telefon już istnieje:**
```json
{
  "message": "Ten numer telefonu jest już przypisany do innego konta. Użyj innego numeru.",
  "field": "phone",
  "code": "PHONE_ALREADY_EXISTS"
}
```

---

## 💻 **PRZYKŁAD UŻYCIA W FRONTEND**

### **JavaScript/React:**

```javascript
// Sprawdzanie email w czasie rzeczywistym
const checkEmailAvailability = async (email) => {
  try {
    const response = await fetch('/api/v1/users/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.exists) {
      showError('email', data.message);
      return false;
    } else {
      showSuccess('email', data.message);
      return true;
    }
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

// Sprawdzanie telefonu
const checkPhoneAvailability = async (phone) => {
  try {
    const response = await fetch('/api/v1/users/check-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone })
    });
    
    const data = await response.json();
    
    if (data.exists) {
      showError('phone', data.message);
      return false;
    } else {
      showSuccess('phone', data.message);
      return true;
    }
  } catch (error) {
    console.error('Error checking phone:', error);
    return false;
  }
};

// Walidacja wieku
const validateAge = (dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  let actualAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    actualAge--;
  }
  
  if (actualAge < 16) {
    showError('dob', 'Musisz mieć co najmniej 16 lat, aby się zarejestrować.');
    return false;
  }
  
  return true;
};
```

---

## 🔧 **KONFIGURACJA**

### **Zmienne środowiskowe:**
```env
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### **Wymagane pakiety:**
```json
{
  "express-validator": "^7.0.1",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "twilio": "^4.19.0"
}
```

---

## 📊 **KODY STATUSÓW HTTP**

| Status | Znaczenie |
|--------|-----------|
| `200` | Sukces - dane prawidłowe |
| `400` | Błąd walidacji |
| `404` | Użytkownik nie znaleziony |
| `500` | Błąd serwera |

---

## 🎨 **NAJLEPSZE PRAKTYKI**

### **1. Walidacja w czasie rzeczywistym:**
- Sprawdzaj email/telefon po opuszczeniu pola (onBlur)
- Używaj debounce (300-500ms) dla lepszej wydajności
- Pokazuj loading indicator podczas sprawdzania

### **2. UX/UI:**
- Wyświetlaj komunikaty błędów pod polami
- Używaj kolorów: czerwony (błąd), zielony (sukces)
- Dodaj ikony dla lepszej wizualizacji

### **3. Bezpieczeństwo:**
- Zawsze waliduj po stronie serwera
- Nie polegaj tylko na walidacji frontend
- Używaj HTTPS w produkcji

---

## 🚀 **TESTOWANIE**

### **Przykładowe dane testowe:**

```javascript
// Email już istnieje
{
  "email": "admin@example.com"
}

// Telefon już istnieje  
{
  "phone": "+48123456789"
}

// Wiek poniżej 16 lat
{
  "dob": "2010-01-01"
}

// Prawidłowe dane
{
  "name": "Jan",
  "email": "nowy@example.com",
  "phone": "+48987654321",
  "password": "SecurePass123",
  "dob": "1990-01-01"
}
```

---

## 📈 **MONITORING I LOGI**

System automatycznie loguje:
- Próby rejestracji
- Sprawdzanie dostępności email/telefonu
- Błędy walidacji
- Próby rejestracji nieletnich

Logi znajdują się w konsoli serwera i mogą być przekierowane do systemu monitoringu.

---

**✅ GOTOWE DO UŻYCIA!**

System walidacji jest w pełni funkcjonalny i gotowy do integracji z frontendem. Wszystkie komunikaty są w języku polskim i przyjazne dla użytkownika.
