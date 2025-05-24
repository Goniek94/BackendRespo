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

      try {
        // Pobierz dane użytkownika z API
        const baseUrl = 'http://localhost:5000';
        try {
          const response = await axios.get(`${baseUrl}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          setUser(response.data);
          console.log('Załadowano dane użytkownika z API:', response.data);
        } catch (apiError) {
          console.error('Błąd podczas pobierania danych użytkownika z API:', apiError);
          
          // Jeśli nie udało się pobrać danych z API, użyj danych z tokenu
          const tokenData = parseJwt(token);
          setUser({
            id: tokenData.userId,
            role: tokenData.role || 'user'
          });
          
          console.log('Załadowano dane użytkownika z tokenu:', tokenData);
        }
      } catch (err) {
        console.error('Błąd podczas ładowania danych użytkownika:', err);
        setError('Nie udało się załadować danych użytkownika');
        
        // Jeśli token jest nieprawidłowy, wyloguj użytkownika
        if (err.response && err.response.status === 401) {
          logout();
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
