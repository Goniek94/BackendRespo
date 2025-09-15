/**
 * Instrukcje debugowania konsoli przeglądarki
 * Pomaga zidentyfikować błędy JavaScript w dashboardzie
 */

console.log(`
🔍 DEBUGOWANIE KONSOLI PRZEGLĄDARKI - INSTRUKCJE

1. 📱 OTWÓRZ KONSOLĘ PRZEGLĄDARKI:
   - Naciśnij F12 lub Ctrl+Shift+I
   - Przejdź do zakładki "Console"

2. 🔄 ODŚWIEŻ STRONĘ:
   - Naciśnij Ctrl+F5 (hard refresh)
   - Sprawdź czy pojawiają się błędy w konsoli

3. 🔍 SZUKAJ BŁĘDÓW:
   - Czerwone wpisy = błędy JavaScript
   - Żółte wpisy = ostrzeżenia
   - Sprawdź czy są błędy związane z:
     * AdminDashboard
     * useAdminApi
     * dashboard-public
     * fetch errors

4. 📡 SPRAWDŹ NETWORK TAB:
   - Przejdź do zakładki "Network"
   - Odśwież stronę (F5)
   - Szukaj wywołania do:
     * /api/admin-panel/dashboard-public
     * /api/admin-panel/dashboard
   - Sprawdź status odpowiedzi (200 OK vs 404/500)

5. 🎯 TYPOWE PROBLEMY:
   - Błąd importu: "Cannot resolve module"
   - Błąd API: "Failed to fetch"
   - Błąd autoryzacji: "401 Unauthorized"
   - Błąd CORS: "Access-Control-Allow-Origin"

6. 📋 CO SPRAWDZIĆ:
   - Czy jest wywołanie do /dashboard-public?
   - Czy odpowiedź zawiera dane (totalUsers: 5)?
   - Czy są błędy JavaScript?
   - Czy komponent AdminDashboard się ładuje?

7. 🔧 MOŻLIWE ROZWIĄZANIA:
   - Jeśli brak wywołania API: Problem z routingiem/komponentem
   - Jeśli 404 na dashboard: Backend nie działa
   - Jeśli błędy JS: Problem z kodem React
   - Jeśli 401: Problem z autoryzacją

8. 📞 RAPORTOWANIE:
   - Skopiuj błędy z konsoli
   - Sprawdź czy jest wywołanie do dashboard-public
   - Sprawdź odpowiedź z API (czy zawiera totalUsers: 5)
`);
