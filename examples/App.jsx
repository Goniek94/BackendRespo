// src/App.jsx

import React, { useEffect } from 'react';
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
  
  // Inicjalizacja klienta powiadomień
  useEffect(() => {
    if (token) {
      const notificationClient = new NotificationClient('http://localhost:5000');
      
      notificationClient.onNotification((notification) => {
        if (notification.type === 'new_message') {
          // Pokaż powiadomienie o nowej wiadomości
          console.log('Nowa wiadomość:', notification.message);
          
          // Tutaj możesz dodać kod do wyświetlania powiadomień
          // np. za pomocą biblioteki toast
          // toast.info(`Nowa wiadomość od ${notification.data.senderName}`);
        }
      });
      
      notificationClient.connect(token)
        .catch(err => console.error('Błąd połączenia z serwerem powiadomień:', err));
      
      return () => {
        notificationClient.disconnect();
      };
    }
  }, [token]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Marketplace</h1>
        {/* Tutaj możesz dodać pasek nawigacyjny */}
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
