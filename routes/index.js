import userRoutes from './userRoutes.js';
import adRoutes from './adRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import commentRoutes from './commentRoutes.js';
import cepikRoutes from './cepikRoutes.js';
import messagesRoutes from './messagesRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import adminRoutes from './adminRoutes.js';
import statsRoutes from './statsRoutes.js';
import imageRoutes from './imageRoutes.js';

/**
 * Konfiguracja tras API z obsługą wstecznej kompatybilności
 * Wszystkie trasy są dostępne zarówno z prefiksem /api jak i bez
 * dla zachowania kompatybilności ze starszymi wersjami frontendu
 */
export default (app) => {
  // Mapowanie tras do ich routerów
  const routes = {
    'users': userRoutes,
    'ads': adRoutes,
    'notifications': notificationRoutes,
    'payments': paymentRoutes,
    'comments': commentRoutes,
    'cepik': cepikRoutes,
    'messages': messagesRoutes,
    'favorites': favoriteRoutes,
    'admin': adminRoutes,
    'images': imageRoutes
  };
  
  // Dodatkowe trasy specjalne
  app.use('/api/ads/stats', statsRoutes);

  // Rejestracja wszystkich tras z prefiksem /api i bez
  Object.entries(routes).forEach(([path, router]) => {
    // Nowe API z prefiksem /api
    app.use(`/api/${path}`, router);

    // Stare API (dla zgodności)
    if (path !== 'admin') { // Admin dostępny tylko przez /api/admin
      app.use(`/${path}`, router);
    }
  });

  // Dodatkowe ścieżki dla Auth API - zgodne z frontendem
  app.use('/api/auth', userRoutes);
  app.use('/auth', userRoutes);
  app.use('/api/v1/auth', userRoutes);
};
