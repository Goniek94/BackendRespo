import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

/**
 * Hook do zarządzania liczbą nieprzeczytanych wiadomości
 * @returns {Object} Obiekt zawierający liczbę nieprzeczytanych wiadomości i funkcje do zarządzania nimi
 */
export const useUnreadMessages = () => {
  const { token, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Referencje do śledzenia ostatniego odświeżenia i stanu wysyłania zapytań
  const lastFetchTime = useRef(0);
  const isRequestPending = useRef(false);
  const cachedCountRef = useRef(null);
  
  // Stała dla minimalnego czasu między zapytaniami (5 sekund)
  const MIN_FETCH_INTERVAL = 5000; 

  // Funkcja pomocnicza do debounce'owania
  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  };

  // Funkcja pobierająca liczbę nieprzeczytanych wiadomości
  const fetchUnreadCountInternal = useCallback(async (force = false) => {
    // Jeśli użytkownik nie jest zalogowany, nie pobieraj danych
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }
    
    // Zapobiegaj zbyt częstym wywołaniom API
    const now = Date.now();
    if (!force && 
        (isRequestPending.current || 
         now - lastFetchTime.current < MIN_FETCH_INTERVAL)) {
      console.log('Pomijanie zapytania - zbyt szybkie wywołania lub trwa poprzednie zapytanie');
      return;
    }
    
    // Jeśli mamy buforowaną wartość, użyj jej
    if (!force && cachedCountRef.current !== null) {
      setUnreadCount(cachedCountRef.current);
      return;
    }
    
    isRequestPending.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      const response = await axios.get(`${baseUrl}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const newCount = response.data.unreadCount;
      setUnreadCount(newCount);
      cachedCountRef.current = newCount;
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.error('Błąd podczas pobierania liczby nieprzeczytanych wiadomości:', err);
      setError(err.message || 'Wystąpił błąd podczas pobierania liczby nieprzeczytanych wiadomości');
    } finally {
      setIsLoading(false);
      isRequestPending.current = false;
    }
  }, [token, isAuthenticated]);
  
  // Publiczna funkcja do odświeżania danych z debounce
  const fetchUnreadCount = useCallback(
    debounce(() => fetchUnreadCountInternal(), 300), 
    [fetchUnreadCountInternal]
  );
  
  // Funkcja wymuszająca odświeżenie (używana tylko gdy naprawdę potrzebujemy świeżych danych)
  const forceRefresh = useCallback(() => {
    fetchUnreadCountInternal(true);
  }, [fetchUnreadCountInternal]);

  // Funkcja do oznaczania wiadomości jako przeczytana
  const markAsRead = useCallback(async (messageId) => {
    if (!isAuthenticated || !token) return;

    try {
      // Ustaw pełny URL z protokołem i hostem
      const baseUrl = 'http://localhost:5000';
      await axios.patch(`${baseUrl}/api/messages/read/${messageId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Zmniejsz licznik nieprzeczytanych wiadomości
      setUnreadCount(prev => {
        const newCount = Math.max(0, prev - 1);
        cachedCountRef.current = newCount;
        return newCount;
      });
    } catch (err) {
      console.error('Błąd podczas oznaczania wiadomości jako przeczytana:', err);
    }
  }, [token, isAuthenticated]);

  // Funkcja do zwiększania licznika nieprzeczytanych wiadomości (np. po otrzymaniu powiadomienia)
  const incrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => {
      const newCount = prev + 1;
      cachedCountRef.current = newCount;
      return newCount;
    });
  }, []);

  // Pobierz liczbę nieprzeczytanych wiadomości tylko raz przy montowaniu komponentu
  // i używaj stabilnego tokenId jako zależności zamiast całego obiektu token
  useEffect(() => {
    // Używamy tokenu jako ID do śledzenia, czy faktycznie się zmienił
    const tokenId = token ? token.slice(0, 10) : 'no-token';
    
    // Pobierz dane przy montowaniu lub zmianie tokenu
    if (isAuthenticated) {
      fetchUnreadCountInternal(true);
    }
    
    // Pobieraj liczbę nieprzeczytanych wiadomości co 60 sekund, ale tylko jeśli użytkownik jest zalogowany
    let intervalId;
    if (isAuthenticated) {
      intervalId = setInterval(() => {
        fetchUnreadCountInternal();
      }, 60000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, fetchUnreadCountInternal]);

  return {
    unreadCount,
    isLoading,
    error,
    fetchUnreadCount,
    forceRefresh,
    markAsRead,
    incrementUnreadCount
  };
};