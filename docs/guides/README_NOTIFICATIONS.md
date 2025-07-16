# System Powiadomień Real-Time

System powiadomień real-time umożliwia wysyłanie i odbieranie powiadomień w czasie rzeczywistym za pomocą WebSocketów (Socket.io). System obsługuje różne typy powiadomień, zapisywanie ich w bazie danych, oznaczanie jako przeczytane oraz wyświetlanie w interfejsie użytkownika.

## Spis treści

1. [Architektura](#architektura)
2. [Typy powiadomień](#typy-powiadomień)
3. [Backend](#backend)
   - [Socket.io Server](#socketio-server)
   - [Middleware uwierzytelniania](#middleware-uwierzytelniania)
   - [Obsługa pokojów (rooms)](#obsługa-pokojów-rooms)
   - [Serwis powiadomień](#serwis-powiadomień)
4. [Frontend](#frontend)
   - [Socket.io Client](#socketio-client)
   - [Kontekst powiadomień](#kontekst-powiadomień)
   - [Komponent Toast](#komponent-toast)
   - [Licznik nieprzeczytanych powiadomień](#licznik-nieprzeczytanych-powiadomień)
5. [API](#api)
   - [REST API](#rest-api)
   - [WebSocket API](#websocket-api)
6. [Testowanie](#testowanie)
   - [Panel testowy](#panel-testowy)
   - [Przykłady użycia](#przykłady-użycia)
7. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

## Architektura

System powiadomień składa się z następujących komponentów:

1. **Backend**:
   - Socket.io Server - zarządza połączeniami WebSocket i emituje zdarzenia
   - Middleware uwierzytelniania - weryfikuje tokeny JWT
   - Obsługa pokojów (rooms) - organizuje użytkowników w pokoje
   - Serwis powiadomień - tworzy i zarządza powiadomieniami
   - Model powiadomień - przechowuje powiadomienia w bazie danych

2. **Frontend**:
   - Socket.io Client - nawiązuje połączenie z serwerem i obsługuje zdarzenia
   - Kontekst powiadomień - zarządza stanem powiadomień w aplikacji React
   - Komponent Toast - wyświetla powiadomienia w czasie rzeczywistym
   - Komponent listy powiadomień - wyświetla historię powiadomień
   - Licznik nieprzeczytanych powiadomień - pokazuje liczbę nowych powiadomień

3. **API**:
   - REST API - do zarządzania powiadomieniami (pobieranie, oznaczanie jako przeczytane)
   - WebSocket API - do wysyłania i odbierania powiadomień w czasie rzeczywistym

## Typy powiadomień

System obsługuje następujące typy powiadomień:

1. **`new_message`** - nowa wiadomość od innego użytkownika
2. **`listing_liked`** - polubienie ogłoszenia
3. **`payment_completed`** - płatność zrealizowana
4. **`listing_added`** - ogłoszenie dodane
5. **`listing_expiring`** - ogłoszenie się kończy
6. **`listing_expired`** - ogłoszenie wygasło
7. **`listing_status_changed`** - zmiana statusu ogłoszenia
8. **`listing_viewed`** - ogłoszenie zostało wyświetlone
9. **`new_comment`** - nowy komentarz do ogłoszenia
10. **`comment_reply`** - odpowiedź na komentarz
11. **`payment_failed`** - płatność nieudana
12. **`payment_refunded`** - zwrot płatności
13. **`account_activity`** - aktywność na koncie
14. **`profile_viewed`** - wyświetlenie profilu
15. **`system_notification`** - powiadomienie systemowe
16. **`maintenance_notification`** - powiadomienie o konserwacji systemu

Każdy typ powiadomienia ma przypisany szablon wiadomości w pliku `utils/notificationTypes.js`.

## Backend

### Socket.io Server

Socket.io Server jest inicjalizowany w pliku `services/socketService.js`. Serwis ten zarządza połączeniami WebSocket, uwierzytelnianiem użytkowników, pokojami i wysyłaniem powiadomień.

```javascript
// services/socketService.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket.id
    this.socketUsers = new Map(); // socket.id -> userId
  }

  initialize(server) {
    if (this.io) return this.io;

    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Middleware do uwierzytelniania
    this.io.use(this.authMiddleware.bind(this));

    // Obsługa połączeń
    this.io.on('connection', this.handleConnection.bind(this));

    return this.io;
  }

  // Reszta implementacji...
}

const socketService = new SocketService();
export default socketService;
```

### Middleware uwierzytelniania

Middleware uwierzytelniania weryfikuje token JWT przesłany przez klienta i zapisuje dane użytkownika w obiekcie socket.

```javascript
authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Brak tokenu uwierzytelniającego'));
    }

    // Weryfikacja tokenu JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Nieprawidłowy token'));
      }

      // Zapisanie danych użytkownika w obiekcie socket
      socket.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };

      next();
    });
  } catch (error) {
    next(new Error('Błąd uwierzytelniania'));
  }
}
```

### Obsługa pokojów (rooms)

Każdy użytkownik jest przypisywany do pokoju o nazwie `user:${userId}`. Dzięki temu powiadomienia mogą być kierowane do konkretnego użytkownika, nawet jeśli ma on wiele otwartych połączeń.

```javascript
handleConnection(socket) {
  const userId = socket.user?.userId;

  if (!userId) {
    socket.disconnect();
    return;
  }

  // Zapisanie połączenia w mapach
  if (!this.userSockets.has(userId)) {
    this.userSockets.set(userId, new Set());
  }
  this.userSockets.get(userId).add(socket.id);
  this.socketUsers.set(socket.id, userId);

  // Dołączenie do pokoju specyficznego dla użytkownika
  socket.join(`user:${userId}`);

  // Obsługa rozłączenia...
}
```

### Serwis powiadomień

Serwis powiadomień zarządza tworzeniem, pobieraniem i aktualizacją powiadomień. Jest zaimplementowany w pliku `controllers/notificationController.js`.

```javascript
// controllers/notificationController.js
class NotificationService {
  async createNotification(userId, message, type = NotificationType.SYSTEM_NOTIFICATION, metadata = {}) {
    // Implementacja...
  }

  async notifyNewMessage(userId, senderName, adTitle = null, metadata = {}) {
    // Implementacja...
  }

  async notifyAdAddedToFavorites(userId, adTitle, adId = null) {
    // Implementacja...
  }

  // Inne metody powiadomień...
}
```

## Frontend

### Socket.io Client

Klient Socket.io jest zaimplementowany w pliku `src/services/notifications.js`. Obsługuje połączenie z serwerem WebSocket, uwierzytelnianie i zdarzenia powiadomień.

```javascript
// src/services/notifications.js
import { io } from 'socket.io-client';

class NotificationService {
  constructor() {
    this.socket = null;
    this.serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.connected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket) {
      return;
    }

    this.socket = io(this.serverUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Połączono z serwerem powiadomień');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Rozłączono z serwerem powiadomień');
    });

    this.socket.on('new_notification', (notification) => {
      this.handleNotification(notification);
    });

    // Inne zdarzenia...
  }

  // Reszta implementacji...
}

const notificationService = new NotificationService();
export default notificationService;
```

### Kontekst powiadomień

Kontekst powiadomień zarządza stanem powiadomień w aplikacji React i udostępnia metody do zarządzania nimi. Jest zaimplementowany w pliku `src/contexts/NotificationContext.js`.

```javascript
// src/contexts/NotificationContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import notificationService from '../services/notifications';
import notificationsApi from '../services/api/notificationsApi';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Inicjalizacja połączenia WebSocket po zalogowaniu
  useEffect(() => {
    if (isAuthenticated && token) {
      notificationService.connect(token);
      fetchNotifications();
    } else {
      notificationService.disconnect();
    }
  }, [isAuthenticated, token]);

  // Metody do zarządzania powiadomieniami...

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      deleteNotification 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
```

### Komponent Toast

Komponent Toast wyświetla powiadomienia w czasie rzeczywistym. Jest zaimplementowany w pliku `src/components/notifications/ToastNotification.js`.

```javascript
// src/components/notifications/ToastNotification.js
import React, { useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNotifications } from '../../contexts/NotificationContext';

const ToastNotification = () => {
  const { notifications } = useNotifications();

  useEffect(() => {
    // Wyświetlanie powiadomień jako toast
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      if (!latestNotification.isRead) {
        showNotificationToast(latestNotification);
      }
    }
  }, [notifications]);

  const showNotificationToast = (notification) => {
    // Wyświetlanie różnych typów powiadomień
    switch (notification.type) {
      case 'new_message':
        toast.info(notification.message);
        break;
      case 'listing_liked':
        toast.success(notification.message);
        break;
      // Inne typy...
      default:
        toast.info(notification.message);
    }
  };

  return <ToastContainer />;
};

export default ToastNotification;
```

### Licznik nieprzeczytanych powiadomień

Licznik nieprzeczytanych powiadomień jest wyświetlany w interfejsie użytkownika, zazwyczaj w nagłówku aplikacji. Wykorzystuje kontekst powiadomień do pobierania liczby nieprzeczytanych powiadomień.

```javascript
// src/components/Header.js
import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const Header = () => {
  const { unreadCount } = useNotifications();

  return (
    <header>
      <nav>
        {/* Inne elementy nawigacji */}
        <div className="notifications-badge">
          <i className="fa fa-bell"></i>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
      </nav>
    </header>
  );
};
```

## API

### REST API

REST API do zarządzania powiadomieniami jest zaimplementowane w pliku `routes/notificationRoutes.js`.

```javascript
// routes/notificationRoutes.js
import express from 'express';
import auth from '../middleware/auth.js';
import notificationService from '../controllers/notificationController.js';

const router = express.Router();

// Pobieranie wszystkich powiadomień
router.get('/', auth, async (req, res) => {
  // Implementacja...
});

// Pobieranie nieprzeczytanych powiadomień
router.get('/unread', auth, async (req, res) => {
  // Implementacja...
});

// Oznaczanie powiadomienia jako przeczytane
router.put('/:id/read', auth, async (req, res) => {
  // Implementacja...
});

// Inne endpointy...

export default router;
```

### WebSocket API

WebSocket API to zdarzenia emitowane przez serwer Socket.io i obsługiwane przez klienta.

**Zdarzenia serwera:**

- `new_notification` - nowe powiadomienie
- `notification_updated` - aktualizacja powiadomienia
- `all_notifications_read` - wszystkie powiadomienia oznaczone jako przeczytane
- `notification_deleted` - usunięcie powiadomienia

**Zdarzenia klienta:**

- `mark_notification_read` - oznaczenie powiadomienia jako przeczytane

## Testowanie

### Panel testowy

Panel testowy pozwala na testowanie systemu powiadomień real-time. Jest dostępny pod adresem `/api/notifications/test`.

Panel testowy umożliwia:
- Połączenie z serwerem Socket.io z uwierzytelnianiem
- Wysyłanie testowych powiadomień różnych typów
- Generowanie tokenu JWT do testów
- Wyświetlanie historii powiadomień
- Oznaczanie powiadomień jako przeczytane

### Przykłady użycia

**Przykład 1: Wysyłanie powiadomienia o nowej wiadomości**

```javascript
// Backend
notificationService.notifyNewMessage(
  recipientUserId,
  senderName,
  adTitle,
  { messageId: message._id }
);

// Frontend
notificationService.on('new_notification', (notification) => {
  if (notification.type === 'new_message') {
    // Wyświetlenie powiadomienia
    toast.info(notification.message);
    
    // Aktualizacja licznika nieprzeczytanych wiadomości
    setUnreadMessagesCount(prev => prev + 1);
  }
});
```

**Przykład 2: Oznaczanie powiadomienia jako przeczytane**

```javascript
// Frontend
const markAsRead = async (notificationId) => {
  try {
    await notificationsApi.markAsRead(notificationId);
    
    // Aktualizacja stanu lokalnego
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    
    // Aktualizacja licznika nieprzeczytanych powiadomień
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch (error) {
    console.error('Błąd podczas oznaczania powiadomienia jako przeczytane:', error);
  }
};
```

## Rozwiązywanie problemów

### Problem: Brak połączenia z serwerem Socket.io

**Rozwiązanie:**

1. Sprawdź, czy serwer Socket.IO jest uruchomiony
2. Sprawdź, czy klient Socket.IO jest poprawnie skonfigurowany
3. Sprawdź, czy token jest poprawnie przesyłany do serwera Socket.IO
4. Sprawdź w konsoli przeglądarki błędy połączenia
5. Upewnij się, że CORS jest poprawnie skonfigurowany na serwerze

### Problem: Powiadomienia nie są wyświetlane

**Rozwiązanie:**

1. Sprawdź, czy komponent ToastNotification jest zaimplementowany i używany w aplikacji
2. Sprawdź, czy kontekst NotificationContext działa poprawnie
3. Sprawdź, czy zdarzenie `new_notification` jest obsługiwane przez klienta
4. Sprawdź, czy powiadomienia są zapisywane w bazie danych

### Problem: Niepoprawna liczba nieprzeczytanych powiadomień

**Rozwiązanie:**

1. Sprawdź, czy endpoint `/api/notifications/unread/count` zwraca poprawną liczbę
2. Sprawdź, czy powiadomienia są prawidłowo oznaczane jako przeczytane
3. Upewnij się, że licznik jest aktualizowany po każdej zmianie stanu powiadomień
