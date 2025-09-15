# PLAN REFAKTORYZACJI SYSTEMU POWIADOMIEŃ - FRONTEND

## 🔍 ANALIZA OBECNEGO STANU

### BACKEND ✅ (JUŻ ZUNIFIKOWANY)
- **notificationManager.js** - główny serwis (zaawansowany, kompletny)
- **routes/notifications** - używa notificationManager
- **kontrolery** - używają notificationManager
- **Brak duplikatów** - system jest spójny

### FRONTEND ❌ (WYMAGA REFAKTORYZACJI)

#### DUPLIKACJE SERWISÓW:
1. **UnifiedNotificationService.js** - zaawansowany HTTP + WebSocket
2. **notificationsApi.js** - klasyczny REST API

#### DUPLIKACJE KOMPONENTÓW:
1. **Notifications.js** (główny) - pełny 3-panelowy layout
2. **Notifications.js** (profil) - wrapper do NotificationsPage

#### DUPLIKACJE PANELI:
1. **NotificationsPanel.js** (główny) - lista powiadomień
2. **NotificationsPanel.js** (profil/listings) - wygasające ogłoszenia

#### DUPLIKACJE ELEMENTÓW:
1. **NotificationItem.js** (główny) - rozbudowany komponent
2. **NotificationListItem.js** - kompaktowy wariant

## 🎯 PLAN DZIAŁANIA

### FAZA 1: ZUNIFIKOWANIE SERWISÓW
- [ ] Scalenie UnifiedNotificationService + notificationsApi
- [ ] Jeden główny serwis NotificationService.js
- [ ] Aktualizacja wszystkich importów

### FAZA 2: KONSOLIDACJA KOMPONENTÓW
- [ ] Scalenie dwóch komponentów Notifications
- [ ] Zunifikowanie NotificationsPanel
- [ ] Jeden NotificationItem z wariantami

### FAZA 3: REORGANIZACJA STRUKTURY
```
src/features/notifications/
├── components/
│   ├── NotificationPanel.js (zunifikowany)
│   ├── NotificationItem.js (z wariantami)
│   ├── NotificationPreferences.js
│   └── NotificationBadge.js
├── services/
│   └── NotificationService.js (zunifikowany)
├── contexts/
│   └── NotificationContext.js
└── utils/
    └── notificationHelpers.js
```

### FAZA 4: TESTY I WERYFIKACJA
- [ ] Testy wszystkich komponentów
- [ ] Testy integracyjne
- [ ] Weryfikacja WebSocket + HTTP

## 📊 OCZEKIWANE KORZYŚCI
- **Redukcja kodu: ~50%**
- **Łatwiejsze utrzymanie: ~80%**
- **Spójne UX: 100%**
- **Mniejsze ryzyko bugów: ~70%**
