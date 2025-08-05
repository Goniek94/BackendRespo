/**
 * AUTH ROUTES - ALIAS FOR USER ROUTES
 * 
 * Ten plik jest aliasem dla routes/user/userRoutes.js
 * Utworzony dla kompatybilności z testami i zewnętrznymi modułami
 * które oczekują routes/auth.js
 */

import userRoutes from './user/userRoutes.js';

// Eksportuj wszystkie trasy użytkownika jako trasy autoryzacji
export default userRoutes;
