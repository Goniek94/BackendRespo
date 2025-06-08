// src/hooks/useAuth.js

import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// Tworzenie kontekstu autoryzacji
const AuthContext = createContext(null);

// Provider kontekstu autoryzacji
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Efekt do ładowania danych użytkownika przy inicjalizacji
  useEffect(() => {
    const loadUserData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Najpierw sprawdź, czy token jest prawidłowy przez zdekodowanie go
      try {
        const tokenData = parseJwt(token);
        
        // Sprawdź, czy token ma podstawowe wymagane pola
        if (!tokenData || !tokenData.userId || !tokenData.exp) {
          console.error('Token jest nieprawidłowy lub brakuje wymaganych pól');
          throw new Error('Nieprawidłowy token');
        }
        
        // Sprawdź, czy token nie wygasł
        const currentTime = Date.now() / 1000;
        if (tokenData.exp && tokenData.exp < currentTime) {
          console.error('Token wygasł');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Ustaw podstawowe dane użytkownika z tokenu
        const basicUserData = {
          id: tokenData.userId,
          role: tokenData.role || 'user'
        };
        
        // Ustaw dane użytkownika z tokenu jako fallback
        setUser(basicUserData);
        
        // Spróbuj pobrać pełne dane użytkownika z API
        const baseUrl = 'http://localhost:5000';
        try {
          const response = await axios.get(`${baseUrl}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Jeśli się udało, zaktualizuj dane użytkownika
          setUser(response.data);
          console.log('Załadowano dane użytkownika z API:', response.data);
        } catch (apiError) {
          console.warn('Nie udało się pobrać pełnych danych użytkownika z API, używam danych z tokenu:', apiError);
          // Nie wylogowujemy użytkownika, ponieważ już ustawiliśmy podstawowe dane z tokenu
        }
      } catch (err) {
        console.error('Błąd podczas przetwarzania tokenu:', err);
        
        // Wyloguj użytkownika tylko jeśli token jest całkowicie nieprawidłowy
        // lub jednoznacznie odrzucony przez serwer (401)
        if (err.response && err.response.status === 401 && 
            err.response.data && err.response.data.message === 'Invalid token') {
          console.error('Token został odrzucony przez serwer, wylogowuję...');
          logout();
        } else {
          // Ustaw błąd, ale nie wylogowuj - może to być chwilowy problem z siecią
          setError('Wystąpił problem z autoryzacją, ale sesja została zachowana');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [token]);

  // Funkcja do logowania
  const login = (newToken, userData = null) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    if (userData) {
      setUser(userData);
    } else {
      // Jeśli nie przekazano danych użytkownika, spróbuj je wyciągnąć z tokenu
      try {
        const tokenData = parseJwt(newToken);
        setUser({
          id: tokenData.userId,
          role: tokenData.role || 'user'
        });
      } catch (err) {
        console.error('Błąd podczas parsowania tokenu:', err);
      }
    }
    
    setError(null);
  };

  // Funkcja do wylogowania
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Funkcja do parsowania tokenu JWT
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error('Błąd podczas parsowania tokenu JWT:', err);
      return {};
    }
  };

  // Wartość kontekstu
  const value = {
    token,
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook do używania kontekstu autoryzacji
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider');
  }
  return context;
};

export default useAuth;
