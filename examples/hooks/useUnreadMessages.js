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

  // Użyj referencji do przechowywania funkcji, aby uniknąć problemów z zależnościami
  const fetchInternalRef = useRef(fetchUnreadCountInternal);
  
  // Aktualizuj referencję tylko gdy zależności się zmieniają
  useEffect(() => {
    fetchInternalRef.current = fetchUnreadCountInternal;
  }, [fetchUnreadCountInternal]);
  
  // Pobierz liczbę nieprzeczytanych wiadomości tylko raz przy montowaniu
  // Użyj stabilnych referencji zamiast zależności, które mogą powodować cykle
  useEffect(() => {
    // Flaga do śledzenia, czy komponent jest zamontowany
    let isMounted = true;
    const tokenCheck = token ? true : false;
    
    // Pobierz dane tylko raz przy montowaniu jeśli jest token
    if (tokenCheck && isMounted) {
      // Użyj setTimeout zamiast bezpośredniego wywołania, aby dać czas na stabilizację komponentu
      const initialTimeout = setTimeout(() => {
        if (isMounted) {
          fetchInternalRef.current(true);
        }
      }, 500);
      
      // Wyczyść timeout przy odmontowaniu
      return () => {
        clearTimeout(initialTimeout);
        isMounted = false;
      };
    }
    
    return () => {
      isMounted = false;
    };
  }, []); // Pusta tablica zależności - wykonaj tylko przy montowaniu
  
  // Skonfiguruj interwał w osobnym useEffect, aby rozdzielić logikę
  useEffect(() => {
    // Nie twórz interwału, jeśli nie ma tokenu
    if (!token) return;
    
    // Używaj stałego interwału z referencją do najnowszej funkcji
    const intervalId = setInterval(() => {
      // Wywołaj najnowszą wersję funkcji z referencji
      fetchInternalRef.current();
    }, 60000); // 60 sekund
    
    // Wyczyść interwał przy odmontowaniu
    return () => {
      clearInterval(intervalId);
    };
  }, [token]); // Zależność tylko od samego tokenu, nie od funkcji

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