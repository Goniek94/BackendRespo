// admin/services/adminApi.js
/**
 * Serwis API dla panelu administratora
 * API service for admin panel
 */

import axios from 'axios';

// Konfiguracja bazowego URL / Base URL configuration
const API_URL = '/api/admin-panel';

// Konfiguracja axios / Axios configuration
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor do obsługi błędów / Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Obsługa błędów autoryzacji / Handle authorization errors
    if (error.response && error.response.status === 401) {
      // Przekieruj do strony logowania / Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * API dla dashboardu / Dashboard API
 */
export const dashboardApi = {
  // Pobierz statystyki dashboardu / Get dashboard statistics
  getStats: () => api.get('/dashboard/stats')
};

/**
 * API dla zarządzania użytkownikami / User management API
 */
export const userApi = {
  // Pobierz listę użytkowników / Get users list
  getUsers: (params) => api.get('/users', { params }),
  
  // Pobierz szczegóły użytkownika / Get user details
  getUserDetails: (userId) => api.get(`/users/${userId}`),
  
  // Aktualizuj użytkownika / Update user
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  
  // Usuń użytkownika / Delete user
  deleteUser: (userId) => api.delete(`/users/${userId}`)
};

/**
 * API dla zarządzania ogłoszeniami / Ad management API
 */
export const adApi = {
  // Pobierz listę ogłoszeń / Get ads list
  getAds: (params) => api.get('/ads', { params }),
  
  // Pobierz szczegóły ogłoszenia / Get ad details
  getAdDetails: (adId) => api.get(`/ads/${adId}`),
  
  // Aktualizuj ogłoszenie / Update ad
  updateAd: (adId, adData) => api.put(`/ads/${adId}`, adData),
  
  // Usuń ogłoszenie / Delete ad
  deleteAd: (adId) => api.delete(`/ads/${adId}`),
  
  // Ustaw zniżkę dla wielu ogłoszeń / Set discount for multiple ads
  setBulkDiscount: (adIds, discount) => api.post('/ads/bulk-discount', { adIds, discount })
};

/**
 * API dla zarządzania komentarzami / Comment management API
 */
export const commentApi = {
  // Pobierz listę komentarzy / Get comments list
  getComments: (params) => api.get('/comments', { params }),
  
  // Pobierz szczegóły komentarza / Get comment details
  getCommentDetails: (commentId) => api.get(`/comments/${commentId}`),
  
  // Aktualizuj status komentarza / Update comment status
  updateCommentStatus: (commentId, statusData) => api.put(`/comments/${commentId}/status`, statusData),
  
  // Usuń komentarz / Delete comment
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
  
  // Masowa aktualizacja komentarzy / Bulk update comments
  bulkUpdateComments: (commentIds, status, moderationNote) => 
    api.post('/comments/bulk-update', { commentIds, status, moderationNote })
};

/**
 * API dla zarządzania zgłoszeniami / Report management API
 */
export const reportApi = {
  // Pobierz listę zgłoszeń / Get reports list
  getReports: (params) => api.get('/reports', { params }),
  
  // Pobierz szczegóły zgłoszenia / Get report details
  getReportDetails: (reportId) => api.get(`/reports/${reportId}`),
  
  // Aktualizuj status zgłoszenia / Update report status
  updateReportStatus: (reportId, statusData) => api.put(`/reports/${reportId}/status`, statusData),
  
  // Usuń zgłoszenie / Delete report
  deleteReport: (reportId) => api.delete(`/reports/${reportId}`),
  
  // Przypisz zgłoszenie do administratora / Assign report to admin
  assignReport: (reportId, adminId) => api.put(`/reports/${reportId}/assign`, { adminId })
};

// Eksportuj wszystkie API / Export all APIs
const adminApi = {
  dashboard: dashboardApi,
  users: userApi,
  ads: adApi,
  comments: commentApi,
  reports: reportApi
};

export default adminApi;
