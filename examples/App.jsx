// src/App.jsx

import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import NotificationClient from './notificationClient';

// Importy komponentów
import MessagesInbox from './MessagesInbox';
import MessageForm from './MessageForm';
import NotificationBadge from './NotificationBadge';

// Import stylów
import './styles/NotificationBadge.css';

// Komponent główny aplikacji
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

// Zawartość aplikacji z dostępem do kontekstu autoryzacji
const AppContent = () => {
  const { token, isAuthenticated } = useAuth();
  const { 
    unreadCount, 
    incrementUnreadCount, 
    // Nie używaj fetchUnreadCount bezpośrednio w renderze - hook sam zarządza odświeżaniem
  } = useUnreadMessages();
  
  // Referencja do klienta powiadomień, aby uniknąć tworzenia nowych instancji przy re-renderach
  const notificationClientRef = useRef(null);
  
  // Inicjalizacja klienta powiadomień - tylko raz przy montowaniu lub zmianie tokenu
  useEffect(() => {
    // Jeśli nie ma tokenu, nie inicjalizuj klienta
    if (!token) return;
    
    // Unikaj tworzenia nowych instancji przy każdym re-renderze
    if (!notificationClientRef.current) {
      notificationClientRef.current = new NotificationClient('http://localhost:5000');
      
      // Ustaw obsługę powiadomień tylko raz
      notificationClientRef.current.onNotification((notification) => {
        if (notification.type === 'new_message') {
          // Pokaż powiadomienie o nowej wiadomości
          console.log('Nowa wiadomość:', notification.message);
          
          // Zwiększ licznik nieprzeczytanych wiadomości
          incrementUnreadCount();
          
          // Tutaj możesz dodać kod do wyświetlania powiadomień
          // np. za pomocą biblioteki toast
          // toast.info(`Nowa wiadomość od ${notification.data.senderName}`);
        }
      });
    }
    
    // Łącz z serwerem tylko jeśli mamy token i klient nie jest podłączony
    if (token && notificationClientRef.current) {
      // Użyj zmiennej connected do śledzenia stanu połączenia
      let connected = false;
      
      notificationClientRef.current.connect(token)
        .then(() => {
          connected = true;
          console.log('Połączono z serwerem powiadomień');
        })
        .catch(err => {
          console.error('Błąd połączenia z serwerem powiadomień:', err);
        });
      
      return () => {
        // Rozłącz tylko jeśli faktycznie byliśmy połączeni
        if (connected && notificationClientRef.current) {
          notificationClientRef.current.disconnect();
          console.log('Rozłączono z serwerem powiadomień');
        }
      };
    }
  }, [token, incrementUnreadCount]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Marketplace</h1>
        <nav className="main-nav">
          <ul className="nav-list">
            <li><Link to="/">Strona główna</Link></li>
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link to="/messages">
                    Wiadomości
                    <NotificationBadge count={unreadCount} />
                  </Link>
                </li>
                <li><Link to="/profile">Mój profil</Link></li>
                <li><Link to="/ads/my">Moje ogłoszenia</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/login">Logowanie</Link></li>
                <li><Link to="/register">Rejestracja</Link></li>
              </>
            )}
          </ul>
        </nav>
      </header>
      
      <main className="app-content">
        <Routes>
          {/* Publiczne trasy */}
          <Route path="/" element={<div>Strona główna</div>} />
          <Route path="/login" element={<div>Strona logowania</div>} />
          <Route path="/register" element={<div>Strona rejestracji</div>} />
          
          {/* Prywatne trasy - wymagają zalogowania */}
          <Route
            path="/messages/*"
            element={isAuthenticated ? <MessagesRoutes /> : <Navigate to="/login" />}
          />
          
          {/* Trasa 404 */}
          <Route path="*" element={<div>Strona nie znaleziona</div>} />
        </Routes>
      </main>
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Marketplace. Wszelkie prawa zastrzeżone.</p>
      </footer>
    </div>
  );
};

// Trasy dla systemu wiadomości
const MessagesRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MessagesInbox />} />
      <Route path="/new" element={<MessageForm />} />
      <Route path="/new/:userId" element={<MessageForm />} />
      <Route path="/new/ad/:adId" element={<MessageForm />} />
    </Routes>
  );
};

export default App;
