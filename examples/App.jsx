// src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useUnreadMessages } from './hooks/useUnreadMessages';
import NotificationClient from './notificationClient';

// Importy komponentów
import MessagesInbox from './MessagesInbox';
import MessageForm from './MessageForm';
import NotificationBadge from './NotificationBadge';
// Import komponentu panelu administratora
import AdminPanel from '../admin/components/AdminPanel';

// Import stylów
import './styles/NotificationBadge.css';
import './styles/AdminButton.css';

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
  const { token, isAuthenticated, user } = useAuth();
  const { 
    unreadCount, 
    incrementUnreadCount, 
    // Nie używaj fetchUnreadCount bezpośrednio w renderze - hook sam zarządza odświeżaniem
  } = useUnreadMessages();
  
  // Sprawdzenie czy użytkownik jest administratorem
  const isAdmin = user && user.role === 'admin';
  
  // Stan dla dropdown menu
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Funkcja przełączająca dropdown
  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };
  
  // Referencja do klienta powiadomień, aby uniknąć tworzenia nowych instancji przy re-renderach
  const notificationClientRef = useRef(null);
  
  // Referencja do funkcji incrementUnreadCount, aby uniknąć niepotrzebnych renderów
  const incrementUnreadCountRef = useRef(incrementUnreadCount);
  
  // Aktualizuj referencję tylko gdy funkcja się zmienia
  useEffect(() => {
    incrementUnreadCountRef.current = incrementUnreadCount;
  }, [incrementUnreadCount]);
  
  // Flaga do śledzenia stanu połączenia WebSocket
  const connectionStatusRef = useRef({
    isConnecting: false,
    isConnected: false,
    reconnectAttempts: 0,
    lastConnectionTime: 0
  });
  
  // Inicjalizacja klienta powiadomień - tylko raz przy montowaniu
  useEffect(() => {
    // Funkcja do obsługi powiadomień
    const handleNotification = (notification) => {
      if (notification.type === 'new_message') {
        // Użyj referencji zamiast oryginalnej funkcji
        incrementUnreadCountRef.current();
      }
    };
    
    // Utwórz klienta tylko raz
    if (!notificationClientRef.current) {
      notificationClientRef.current = new NotificationClient('http://localhost:5000');
      // Dodaj obsługę powiadomień tylko raz
      notificationClientRef.current.onNotification(handleNotification);
    }
    
    // Wyczyść przy odmontowaniu
    return () => {
      // Bezpieczne rozłączenie przy odmontowaniu
      if (notificationClientRef.current && connectionStatusRef.current.isConnected) {
        notificationClientRef.current.disconnect();
        connectionStatusRef.current.isConnected = false;
      }
    };
  }, []); // Pusta tablica zależności - wykonaj tylko przy montowaniu
  
  // Obsługa połączenia - osobny useEffect tylko z zależnością od tokenu
  useEffect(() => {
    // Nie łącz jeśli nie ma tokenu lub trwa łączenie
    if (!token || !notificationClientRef.current || connectionStatusRef.current.isConnecting) {
      return;
    }
    
    // Zapobiegaj zbyt częstym ponownym połączeniom
    const now = Date.now();
    if (now - connectionStatusRef.current.lastConnectionTime < 10000) { // 10 sekund
      return;
    }
    
    // Ustaw flagę łączenia
    connectionStatusRef.current.isConnecting = true;
    connectionStatusRef.current.lastConnectionTime = now;
    
    // Łącz z serwerem
    notificationClientRef.current.connect(token)
      .then(() => {
        connectionStatusRef.current.isConnected = true;
        connectionStatusRef.current.isConnecting = false;
        connectionStatusRef.current.reconnectAttempts = 0;
      })
      .catch(err => {
        connectionStatusRef.current.isConnecting = false;
        connectionStatusRef.current.reconnectAttempts += 1;
      });
    
    // Wyczyść przy zmianie tokenu
    return () => {
      if (notificationClientRef.current && connectionStatusRef.current.isConnected) {
        notificationClientRef.current.disconnect();
        connectionStatusRef.current.isConnected = false;
      }
    };
  }, [token]); // Zależność tylko od tokenu
  
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
                
                {/* Dropdown menu dla użytkownika */}
                <li className="nav-item dropdown">
                  <button className="dropdown-toggle" onClick={toggleDropdown}>
                    Więcej <i className={`fa fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                  {dropdownOpen && (
                    <ul className="dropdown-menu">
                      <li><Link to="/settings">Ustawienia</Link></li>
                      {isAdmin && (
                        <li><Link to="/admin">Panel administratora</Link></li>
                      )}
                      <li><Link to="/logout">Wyloguj</Link></li>
                    </ul>
                  )}
                </li>
                
                {/* Przycisk panelu admina po prawej stronie */}
                {isAdmin && (
                  <li className="nav-item admin-button">
                    <Link to="/admin">Panel administratora</Link>
                  </li>
                )}
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
          
          {/* Panel administratora - wymaga roli admin */}
          <Route
            path="/admin/*"
            element={isAuthenticated && isAdmin ? <AdminPanel /> : <Navigate to="/" />}
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