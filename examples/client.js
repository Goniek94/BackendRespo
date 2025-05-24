// src/services/api/client.js

import axios from 'axios';

// Konfiguracja klienta axios
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 sekund
});

// Interceptor do dodawania tokenu autoryzacji
apiClient.interceptors.request.use(
  (config) => {
    // Pobierz token z localStorage
    const token = localStorage.getItem('token');
    
    // Jeśli token istnieje, dodaj go do nagłówka Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Dodano token do zapytania:', config.url);
    } else {
      console.log('Brak tokenu autoryzacji dla zapytania:', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('Błąd w interceptorze zapytania:', error);
    return Promise.reject(error);
  }
);

// Interceptor do obsługi odpowiedzi
apiClient.interceptors.response.use(
  (response) => {
    console.log('Odpowiedź z API:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('Błąd odpowiedzi API:', error.config?.url, error.response?.status, error.message);
    
    // Obsługa błędu autoryzacji
    if (error.response && error.response.status === 401) {
      console.log('Błąd autoryzacji - wylogowywanie...');
      // Tutaj możesz dodać kod do wylogowania użytkownika
      // np. localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
