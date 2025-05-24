# System wiadomości - Przykładowa implementacja

Ten katalog zawiera przykładową implementację systemu wiadomości dla aplikacji Marketplace. Implementacja obejmuje zarówno backend (API) jak i frontend (komponenty React).

## Struktura plików

- `README.md` - Ten plik
- `README_MESSAGES.md` - Dokumentacja systemu wiadomości
- `MessageForm.jsx` - Komponent formularza do wysyłania wiadomości
- `MessagesInbox.jsx` - Komponent skrzynki odbiorczej wiadomości
- `App.jsx` - Główny komponent aplikacji
- `client.js` - Klient API do komunikacji z backendem
- `notificationClient.js` - Klient do obsługi powiadomień w czasie rzeczywistym
- `hooks/useAuth.js` - Hook do autoryzacji
- `index.html` - Plik HTML do uruchomienia przykładowej aplikacji

## Uruchomienie przykładowej aplikacji

1. Upewnij się, że serwer backend jest uruchomiony:
   ```
   node index.js
   ```

2. Otwórz plik `index.html` w przeglądarce:
   ```
   open examples/index.html
   ```

3. Zaloguj się do aplikacji, używając formularza logowania.

4. Przejdź do sekcji wiadomości, aby zobaczyć skrzynkę odbiorczą i wysyłać wiadomości.

## Integracja z istniejącą aplikacją

Aby zintegrować system wiadomości z istniejącą aplikacją, wykonaj następujące kroki:

1. Skopiuj pliki `MessageForm.jsx`, `MessagesInbox.jsx` i `notificationClient.js` do swojego projektu.

2. Zaimportuj komponenty w odpowiednich miejscach:
   ```jsx
   import MessageForm from './components/MessageForm';
   import MessagesInbox from './components/MessagesInbox';
   ```

3. Dodaj formularz wiadomości do strony szczegółów ogłoszenia:
   ```jsx
   <MessageForm
     adId={ad._id}
     adTitle={ad.headline}
     onSuccess={() => alert('Wiadomość wysłana pomyślnie!')}
     onError={(err) => console.error('Błąd wysyłania wiadomości:', err)}
   />
   ```

4. Dodaj skrzynkę odbiorczą do profilu użytkownika:
   ```jsx
   <MessagesInbox />
   ```

5. Zintegruj klienta powiadomień z głównym komponentem aplikacji:
   ```jsx
   import NotificationClient from './services/notificationClient';

   // W komponencie App
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
   ```

## Rozwiązywanie problemów

### Problem: Wiadomości nie są wysyłane

1. Sprawdź, czy użytkownik jest zalogowany i token jest poprawnie przesyłany w nagłówku `Authorization`
2. Sprawdź, czy formularz jest poprawnie skonfigurowany (Content-Type: multipart/form-data)
3. Sprawdź logi serwera, aby zobaczyć, czy występują błędy

### Problem: Wiadomości nie są wyświetlane w skrzynce odbiorczej

1. Sprawdź, czy użytkownik ma uprawnienia do przeglądania wiadomości
2. Sprawdź, czy API zwraca poprawne dane
3. Sprawdź, czy komponent jest poprawnie skonfigurowany

### Problem: Powiadomienia nie działają

1. Sprawdź, czy serwer Socket.IO jest uruchomiony
2. Sprawdź, czy klient Socket.IO jest poprawnie skonfigurowany
3. Sprawdź, czy token jest poprawnie przesyłany do serwera Socket.IO

## Dodatkowe informacje

Więcej informacji na temat systemu wiadomości znajdziesz w pliku `README_MESSAGES.md`.
