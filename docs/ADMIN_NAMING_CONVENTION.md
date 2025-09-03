# Konwencja Nazewnictwa - Panel Administratora

## 📋 Przegląd

Ten dokument definiuje spójną konwencję nazewnictwa dla systemu panelu administratora, rozwiązując chaos między nazwami "AdminPanel" i "AdminDashboard".

## 🎯 Główne Zasady

### 1. **AdminPanel** = Cały System
- **Definicja**: Ogólna nazwa dla całej funkcjonalności panelu administracyjnego
- **Zastosowanie**: API endpoints, User-Agent, commit messages, ogólne odniesienia do systemu
- **Przykłady**:
  - `/api/admin-panel/*` (backend endpoints)
  - `AdminPanel-Client/1.0` (User-Agent)
  - `feat(AdminPanel): Add new feature` (commit messages)

### 2. **AdminDashboard** = Komponent UI
- **Definicja**: Główny komponent React/Vue odpowiedzialny za renderowanie widoku pulpitu nawigacyjnego
- **Zastosowanie**: Nazwy komponentów frontend, pliki UI, widoki
- **Przykłady**:
  - `AdminDashboard.jsx` (główny komponent widoku)
  - `AdminDashboardStats.jsx` (komponenty statystyk)
  - `admin-dashboard.css` (style CSS)

## 🗂️ Struktura Plików

```
admin/
├── services/
│   └── adminApi.js              # ✅ AdminPanel-Client/1.0 User-Agent
├── components/
│   ├── AdminDashboard.jsx       # ✅ Główny widok dashboardu
│   ├── AdminDashboardStats.jsx  # ✅ Komponenty statystyk
│   └── AdminPanelLayout.jsx     # ✅ Layout całego panelu
└── routes/
    └── admin-panel/*            # ✅ Backend endpoints
```

## 🌐 API Endpoints

### Backend (Spójne z "AdminPanel")
```javascript
// ✅ POPRAWNE
/api/admin-panel/dashboard/stats
/api/admin-panel/users
/api/admin-panel/ads
/api/admin-panel/reports

// ❌ NIEPOPRAWNE
/api/admin-dashboard/*
/api/admindashboard/*
```

### Aliasy (dla kompatybilności)
```javascript
// Główny endpoint
/api/admin-panel/*

// Alias (dla starszego kodu)
/api/admin/*  → przekierowuje do /api/admin-panel/*
```

## 🔧 Konfiguracja Klientów API

### Axios Configuration
```javascript
// ✅ POPRAWNE
const api = axios.create({
  baseURL: '/api/admin-panel',
  headers: {
    'User-Agent': 'AdminPanel-Client/1.0'  // Spójne z systemem
  }
});

// ❌ NIEPOPRAWNE
'User-Agent': 'AdminDashboardTest/1.0'     // Powoduje chaos w logach
'User-Agent': 'AdminDashboard/1.0'         // Niezgodne z API
```

## 📝 Commit Messages

### Wzorce Commitów
```bash
# ✅ POPRAWNE - używaj "AdminPanel" dla systemu
feat(AdminPanel): Add user management functionality
fix(AdminPanel): Resolve authentication issues
refactor(AdminPanel): Improve API response structure

# ✅ POPRAWNE - używaj "AdminDashboard" dla UI
feat(AdminDashboard): Add statistics charts
fix(AdminDashboard): Fix responsive layout
style(AdminDashboard): Update color scheme

# ❌ NIEPOPRAWNE - mieszanie nazw
feat(AdminDashboard): Add API endpoint  # Dashboard to UI, nie API
fix(AdminPanel): Update component style # Panel to system, nie style
```

## 🏗️ Komponenty Frontend

### Hierarchia Komponentów
```javascript
AdminPanelLayout              // ✅ Ogólny layout panelu
├── AdminPanelNavigation     // ✅ Nawigacja panelu
├── AdminDashboard           // ✅ Główny widok dashboardu
│   ├── AdminDashboardStats  // ✅ Statystyki
│   ├── AdminDashboardCharts // ✅ Wykresy
│   └── AdminDashboardCards  // ✅ Karty informacyjne
├── AdminUserManagement      // ✅ Zarządzanie użytkownikami
└── AdminReportManagement    // ✅ Zarządzanie raportami
```

## 🔍 Logowanie i Monitoring

### User-Agent w Logach
```javascript
// ✅ POPRAWNE - będzie wyświetlane jako "ADMINPANEL" w konsoli
"userAgent": "AdminPanel-Client/1.0"

// ❌ NIEPOPRAWNE - wyświetlane jako "ADMINDASHBOARD" (mylące)
"userAgent": "AdminDashboardTest/1.0"
```

### Logi Bezpieczeństwa
```javascript
// ✅ POPRAWNE
logger.info('Admin panel access granted', {
  userId: user.id,
  userAgent: 'AdminPanel-Client/1.0',
  endpoint: '/api/admin-panel/dashboard'
});
```

## 🎨 Style i CSS

### Nazwy Klas CSS
```css
/* ✅ POPRAWNE - Panel dla layoutu, Dashboard dla widoku */
.admin-panel-layout { }          /* Ogólny layout panelu */
.admin-panel-navigation { }      /* Nawigacja panelu */
.admin-dashboard-container { }   /* Kontener dashboardu */
.admin-dashboard-stats { }       /* Statystyki dashboardu */

/* ❌ NIEPOPRAWNE - mieszanie nazw */
.admin-dashboard-layout { }      /* Dashboard to nie layout */
.admin-panel-stats { }           /* Panel to nie statystyki */
```

## 📚 Dokumentacja

### Nazwy w Dokumentacji
- **"Panel Administratora"** - gdy mówisz o całym systemie
- **"Dashboard Administratora"** - gdy mówisz o widoku statystyk/pulpicie
- **"Interfejs Panelu"** - gdy mówisz o UI całego panelu

### Przykłady Opisów
```markdown
✅ POPRAWNE:
"Panel Administratora umożliwia zarządzanie użytkownikami przez Dashboard Administratora"
"API Panelu Administratora dostępne pod /api/admin-panel/*"
"Dashboard wyświetla statystyki w interfejsie Panelu Administratora"

❌ NIEPOPRAWNE:
"Dashboard Administratora ma endpoint /api/admin-panel/*"  # Dashboard to UI, nie API
"Panel wyświetla wykresy"  # Panel to system, wykresy wyświetla Dashboard
```

## 🔄 Migracja Istniejącego Kodu

### Checklist Migracji
- [ ] Zmień User-Agent z "AdminDashboardTest/1.0" na "AdminPanel-Client/1.0"
- [ ] Sprawdź nazwy komponentów - czy Dashboard komponenty dotyczą UI
- [ ] Sprawdź commit messages - używaj AdminPanel dla systemu, AdminDashboard dla UI
- [ ] Zaktualizuj dokumentację używając nowej konwencji
- [ ] Dodaj komentarze wyjaśniające różnicę Panel vs Dashboard

### Skrypt Migracji
```bash
# Znajdź wszystkie wystąpienia do zmiany
grep -r "AdminDashboardTest" .
grep -r "admin-dashboard" . --include="*.js"

# Zamień User-Agent w plikach API
sed -i 's/AdminDashboardTest\/1.0/AdminPanel-Client\/1.0/g' **/*.js
```

## ✅ Korzyści Tej Konwencji

1. **Jasność**: Każdy wie kiedy używać Panel (system) vs Dashboard (UI)
2. **Spójność**: User-Agent zgodny z API endpoints
3. **Maintenance**: Łatwiejsze utrzymanie kodu
4. **Debugging**: Czytelniejsze logi bez mylących nazw
5. **Onboarding**: Nowi programiści szybko rozumieją strukturę

## 🚨 Częste Błędy

### ❌ Błędne Użycie
```javascript
// Nie używaj Dashboard dla API
fetch('/api/admin-dashboard/users')  // BŁĄD

// Nie używaj Panel dla komponentów UI
<AdminPanelStats />  // BŁĄD - to powinno być AdminDashboardStats

// Nie mieszaj nazw w User-Agent
'User-Agent': 'AdminDashboard-Panel/1.0'  // BŁĄD - wybierz jedno
```

### ✅ Poprawne Użycie
```javascript
// Panel dla API
fetch('/api/admin-panel/users')  // ✅

// Dashboard dla UI
<AdminDashboardStats />  // ✅

// Spójny User-Agent
'User-Agent': 'AdminPanel-Client/1.0'  // ✅
```

---

**Ostatnia aktualizacja**: 2025-01-09  
**Wersja**: 1.0  
**Status**: Aktywna konwencja
