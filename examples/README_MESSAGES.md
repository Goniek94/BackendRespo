# System wiadomości - Instrukcja integracji

Ten dokument zawiera instrukcje, jak zintegrować system wiadomości z frontendem, aby użytkownicy mogli wysyłać wiadomości do właścicieli ogłoszeń i przeglądać swoje wiadomości w profilu.

## Spis treści

1. [Przegląd systemu](#przegląd-systemu)
2. [Endpointy API](#endpointy-api)
3. [Integracja z frontendem](#integracja-z-frontendem)
4. [Przykładowe komponenty](#przykładowe-komponenty)
5. [Powiadomienia w czasie rzeczywistym](#powiadomienia-w-czasie-rzeczywistym)
6. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

## Przegląd systemu

System wiadomości umożliwia użytkownikom:
- Wysyłanie wiadomości do właścicieli ogłoszeń
- Wysyłanie wiadomości do innych użytkowników
- Przeglądanie odebranych i wysłanych wiadomości
- Odpowiadanie na wiadomości
- Oznaczanie wiadomości jako przeczytane/nieprzeczytane
- Oznaczanie wiadomości gwiazdką
- Usuwanie wiadomości

## Endpointy API

### Pobieranie wiadomości

- `GET /api/messages/:folder` - Pobieranie wiadomości dla danego folderu (inbox, sent, drafts, starred, trash)
- `GET /api/messages/message/:id` - Pobieranie pojedynczej wiadomości
- `GET /api/messages/search` - Wyszukiwanie wiadomości
- `GET /api/messages/users/suggestions` - Pobieranie sugestii użytkowników do wysyłki wiadomości
- `GET /api/messages/conversations` - Pobieranie listy konwersacji użytkownika
- `GET /api/messages/conversation/:userId` - Pobieranie konwersacji z konkretnym użytkownikiem

### Wysyłanie wiadomości

- `POST /api/messages/send` - Wysyłanie nowej wiadomości
- `POST /api/messages/send-to-user/:userId` - Wysyłanie wiadomości do użytkownika
- `POST /api/messages/send-to-ad/:adId` - Wysyłanie wiadomości do właściciela ogłoszenia
- `POST /api/messages/reply/:messageId` - Odpowiadanie na wiadomość
- `POST /api/messages/draft` - Zapisywanie wersji roboczej

### Zarządzanie wiadomościami

- `PATCH /api/messages/read/:id` - Oznaczanie jako przeczytane
- `PATCH /api/messages/star/:id` - Przełączanie gwiazdki (oznaczanie/odznaczanie wiadomości)
- `DELETE /api/messages/:id` - Usuwanie wiadomości

## Integracja z frontendem

### Krok 1: Konfiguracja klienta API

Utwórz klienta API do komunikacji z backendem. Możesz użyć pliku `messagesApi.js.fixed` jako punktu wyjścia:

```javascript
// src/services/api/messagesApi.js
import apiClient from './client';

const MessagesService = {
  getByFolder: (folder = 'inbox') => apiClient.get(`/api/messages/${folder}`),
  getById: (id) => apiClient.get(`/api/messages/message/${id}`),
  send: (messageData) => apiClient.post('/api/messages/send', messageData),
  sendToUser: (userId, messageData) => apiClient.post(`/api/messages/send-to-user/${userId}`, messageData),
  sendToAd: (adId, messageData) => apiClient.post(`/api/messages/send-to-ad/${adId}`, messageData),
  reply: (messageId, messageData) => apiClient.post(`/api/messages/reply/${messageId}`, messageData),
  saveDraft: (messageData) => apiClient.post('/api/messages/draft', messageData),
  markAsRead: (id) => apiClient.patch(`/api/messages/read/${id}`),
  toggleStar: (id) => apiClient.patch(`/api/messages/star/${id}`),
  delete: (id) => apiClient.delete(`/api/messages/${id}`),
  search: (query, folder) =>
    apiClient.get('/api/messages/search', {
      params: { query, folder }
    }),
  getUserSuggestions: (query) =>
    apiClient.get('/api/messages/users/suggestions', {
      params: { query }
    }),
  getConversationsList: () => apiClient.get('/api/messages/conversations'),
  getConversation: (userId) => apiClient.get(`/api/messages/conversation/${userId}`)
};

export default MessagesService;
```

### Krok 2: Dodanie formularza wiadomości do strony ogłoszenia

Na stronie szczegółów ogłoszenia dodaj formularz do wysyłania wiadomości do właściciela ogłoszenia. Możesz użyć komponentu `MessageForm.jsx` jako punktu wyjścia.

```jsx
// Przykład użycia komponentu MessageForm
import MessageForm from '../components/MessageForm';

// W komponencie szczegółów ogłoszenia
const AdDetails = ({ ad }) => {
  // ...

  return (
    <div>
      {/* Szczegóły ogłoszenia */}
      <h1>{ad.headline}</h1>
      <p>{ad.description}</p>
      
      {/* Formularz wiadomości */}
      {isAuthenticated && (
        <MessageForm
          adId={ad._id}
          adTitle={ad.headline}
          onSuccess={() => alert('Wiadomość wysłana pomyślnie!')}
          onError={(err) => console.error('Błąd wysyłania wiadomości:', err)}
        />
      )}
      
      {!isAuthenticated && (
        <div className="alert alert-info">
          <a href="/login">Zaloguj się</a>, aby wysłać wiadomość do sprzedającego
        </div>
      )}
    </div>
  );
};
```

### Krok 3: Dodanie skrzynki wiadomości do profilu użytkownika

W profilu użytkownika dodaj sekcję do przeglądania wiadomości. Możesz użyć komponentu `MessagesInbox.jsx` jako punktu wyjścia.

```jsx
// Przykład użycia komponentu MessagesInbox
import MessagesInbox from '../components/MessagesInbox';

// W komponencie profilu użytkownika
const UserProfile = () => {
  // ...

  return (
    <div>
      {/* Zakładki profilu */}
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <a className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            Profil
          </a>
        </li>
        <li className="nav-item">
          <a className={`nav-link ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            Wiadomości
          </a>
        </li>
        {/* Inne zakładki */}
      </ul>
      
      {/* Zawartość zakładek */}
      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="profile-content">
            {/* Zawartość profilu */}
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="messages-content">
            <MessagesInbox />
          </div>
        )}
        
        {/* Inne zakładki */}
      </div>
    </div>
  );
};
```

## Przykładowe komponenty

W katalogu `examples` znajdują się przykładowe komponenty, które możesz wykorzystać w swojej aplikacji:

- `MessageForm.jsx` - Formularz do wysyłania wiadomości do właściciela ogłoszenia
- `MessagesInbox.jsx` - Komponent do przeglądania wiadomości w profilu użytkownika
- `notificationClient.js` - Klient do obsługi powiadomień w czasie rzeczywistym

## Powiadomienia w czasie rzeczywistym

System wiadomości jest zintegrowany z systemem powiadomień w czasie rzeczywistym. Gdy użytkownik otrzyma nową wiadomość, zostanie powiadomiony przez WebSocket.

Aby zintegrować powiadomienia w czasie rzeczywistym z frontendem, użyj klienta `notificationClient.js`:

```jsx
// Przykład użycia klienta powiadomień
import NotificationClient from '../services/notificationClient';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

const App = () => {
  const { token } = useAuth();
  
  useEffect(() => {
    if (token) {
      const notificationClient = new NotificationClient('http://localhost:5000');
      
      notificationClient.onNotification((notification) => {
        if (notification.type === 'new_message') {
          // Pokaż powiadomienie o nowej wiadomości
          showToast({
            title: 'Nowa wiadomość',
            message: notification.message
          });
        }
      });
      
      notificationClient.connect(token)
        .catch(err => console.error('Błąd połączenia z serwerem powiadomień:', err));
      
      return () => {
        notificationClient.disconnect();
      };
    }
  }, [token]);
  
  // ...
};
```

## Rozwiązywanie problemów

### Problem: Wiadomości nie są wysyłane

1. Sprawdź, czy użytkownik jest zalogowany i token jest poprawnie przesyłany w nagłówku `Authorization`
2. Sprawdź, czy formularz jest poprawnie skonfigurowany (Content-Type: multipart/form-data)
3. Sprawdź logi serwera, aby zobaczyć, czy występują błędy

### Problem: Wiadomości nie są wyświetlane w profilu użytkownika

1. Sprawdź, czy użytkownik ma uprawnienia do przeglądania wiadomości
2. Sprawdź, czy API zwraca poprawne dane
3. Sprawdź, czy komponent jest poprawnie skonfigurowany

### Problem: Powiadomienia nie działają

1. Sprawdź, czy serwer Socket.IO jest uruchomiony
2. Sprawdź, czy klient Socket.IO jest poprawnie skonfigurowany
3. Sprawdź, czy token jest poprawnie przesyłany do serwera Socket.IO
