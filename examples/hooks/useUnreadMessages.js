import { useState, useEffect, useCallback } from 'react';
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

  // Funkcja pobierająca liczbę nieprzeczytanych wiadomości
  const fetchUnreadCount = useCallback(async () => {
    // Jeśli użytkownik nie jest zalogowany, nie pobieraj danych
    if (!isAuthenticated || !token) {
      setUnreadCount(0);
      return;
    }

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

      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Błąd podczas pobierania liczby nieprzeczytanych wiadomości:', err);
      setError(err.message || 'Wystąpił błąd podczas pobierania liczby nieprzeczytanych wiadomości');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Błąd podczas oznaczania wiadomości jako przeczytana:', err);
    }
  }, [token, isAuthenticated]);

  // Funkcja do zwiększania licznika nieprzeczytanych wiadomości (np. po otrzymaniu powiadomienia)
  const incrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  // Pobierz liczbę nieprzeczytanych wiadomości przy montowaniu komponentu
  useEffect(() => {
    fetchUnreadCount();
    
    // Pobieraj liczbę nieprzeczytanych wiadomości co minutę
    const intervalId = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    error,
    fetchUnreadCount,
    markAsRead,
    incrementUnreadCount
  };
};