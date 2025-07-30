# 🔒 PRAWDZIWY AUDYT BEZPIECZEŃSTWA MARKETPLACE BACKEND

## 📊 Podsumowanie Wykonawcze

**Data audytu:** 30.07.2025, 12:27:20  
**Czas trwania:** 0s  
**Przeskanowane pliki:** 38  
**Wersja audytu:** 2.0.0

## 🚨 Statystyki Problemów

- **Łączna liczba problemów:** 196
- **🔴 Krytyczne:** 121
- **🟠 Wysokie:** 48
- **🟡 Średnie:** 5
- **🔵 Niskie:** 0
- **ℹ️ Informacyjne:** 22


## 🔴 Problemy CRITICAL (121)

### 1. Hardcoded secret detected

**Kategoria:** Security Config  
**Plik:** `config/security.js`  
**Opis:** Wykryto zahardkodowany sekret w kodzie  
**Rekomendacja:** Przenieś sekrety do zmiennych środowiskowych  
**Ryzyko:** Sekrety mogą być widoczne w repozytorium  

---

### 2. Hardcoded secret detected

**Kategoria:** Security Config  
**Plik:** `config/security.js`  
**Opis:** Wykryto zahardkodowany sekret w kodzie  
**Rekomendacja:** Przenieś sekrety do zmiennych środowiskowych  
**Ryzyko:** Sekrety mogą być widoczne w repozytorium  

---

### 3. Hardcoded secret detected

**Kategoria:** Security Config  
**Plik:** `config/security.js`  
**Opis:** Wykryto zahardkodowany sekret w kodzie  
**Rekomendacja:** Przenieś sekrety do zmiennych środowiskowych  
**Ryzyko:** Sekrety mogą być widoczne w repozytorium  

---

### 4. Hardcoded secret detected

**Kategoria:** Security Config  
**Plik:** `config/security.js`  
**Opis:** Wykryto zahardkodowany sekret w kodzie  
**Rekomendacja:** Przenieś sekrety do zmiennych środowiskowych  
**Ryzyko:** Sekrety mogą być widoczne w repozytorium  

---

### 5. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 6. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 7. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-password-management.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 8. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-password-management.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 9. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 10. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 11. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 12. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 13. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 14. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 15. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 16. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `analyze-jwt-cookie-issues.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 17. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 18. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 19. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 20. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 21. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 22. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 23. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 24. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\client.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 25. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\client.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 26. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\testFrontend.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 27. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\testFrontend.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 28. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\testFrontend.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 29. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `examples\testFrontend.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 30. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `get-token.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 31. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `real-security-audit.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 32. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `reset-admin-password.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 33. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 34. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 35. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 36. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 37. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 38. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `scripts\generate-secrets.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 39. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit\scripts\comprehensive-security-audit.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 40. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-simple.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 41. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-simple.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 42. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-test.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 43. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-test.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 44. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-test.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 45. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `security-audit-test.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 46. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 47. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 48. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 49. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 50. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 51. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 52. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 53. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 54. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 55. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 56. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 57. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-cookie-security-fix.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 58. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 59. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 60. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 61. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 62. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 63. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 64. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 65. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 66. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 67. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 68. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 69. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 70. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-header-size.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 71. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 72. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 73. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 74. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 75. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 76. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 77. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-admin-panel-real.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 78. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 79. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 80. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 81. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 82. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 83. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 84. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 85. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 86. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 87. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 88. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 89. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 90. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-auth-functionality.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 91. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 92. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 93. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 94. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 95. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 96. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 97. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 98. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 99. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 100. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 101. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 102. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 103. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 104. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 105. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 106. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 107. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 108. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 109. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 110. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 111. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 112. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 113. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 114. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 115. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `test-jwt-optimization.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 116. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTest.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 117. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTest.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 118. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTestByEmail.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 119. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTestByEmail.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 120. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTestSendToAd.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 121. Potential jwt logging

**Kategoria:** Sensitive Logging  
**Plik:** `tools\testing\messageTestSendToAd.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu jwt  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---


## 🟠 Problemy HIGH (48)

### 1. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 2. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 3. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 4. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 5. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 6. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 7. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 8. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 9. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 10. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 11. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 12. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 13. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 14. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 15. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 16. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin\controllers\auth\adminLoginController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 17. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-2fa-simulation.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 18. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-2fa-simulation.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 19. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-2fa-simulation.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 20. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-password-management.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 21. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-password-management.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 22. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `admin-password-management.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 23. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\nodemailer.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 24. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\nodemailer.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 25. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\nodemailer.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 26. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 27. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `config\security.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 28. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 29. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 30. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 31. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\authController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 32. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 33. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 34. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\passwordController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 35. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 36. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 37. Potential secret logging

**Kategoria:** Sensitive Logging  
**Plik:** `controllers\user\verificationController.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu secret  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 38. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 39. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 40. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 41. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 42. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 43. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 44. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 45. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\auth.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 46. Potential password logging

**Kategoria:** Sensitive Logging  
**Plik:** `middleware\rateLimiting.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu password  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 47. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `services\socketService.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---

### 48. Potential token logging

**Kategoria:** Sensitive Logging  
**Plik:** `services\socketService.js`  
**Opis:** Potencjalne logowanie wrażliwych danych typu token  
**Rekomendacja:** Usuń lub zamaskuj wrażliwe dane w logach  
**Ryzyko:** Wrażliwe dane mogą być widoczne w logach  

---


## 🟡 Problemy MEDIUM (5)

### 1. Missing MONGO_URI in .env.example

**Kategoria:** Environment  
**Plik:** `.env.example`  
**Opis:** Brak zmiennej MONGO_URI w pliku przykładowym  
**Rekomendacja:** Dodaj MONGO_URI=placeholder do .env.example  

---

### 2. Missing permission checks

**Kategoria:** Admin Security  
**Plik:** `admin/routes/listingRoutes.js`  
**Opis:** Brak sprawdzania uprawnień dla operacji modyfikujących  
**Rekomendacja:** Dodaj sprawdzanie uprawnień dla operacji DELETE/PUT  

---

### 3. Missing permission checks

**Kategoria:** Admin Security  
**Plik:** `admin/routes/promotionRoutes.js`  
**Opis:** Brak sprawdzania uprawnień dla operacji modyfikujących  
**Rekomendacja:** Dodaj sprawdzanie uprawnień dla operacji DELETE/PUT  

---

### 4. Missing permission checks

**Kategoria:** Admin Security  
**Plik:** `admin/routes/reportRoutes.js`  
**Opis:** Brak sprawdzania uprawnień dla operacji modyfikujących  
**Rekomendacja:** Dodaj sprawdzanie uprawnień dla operacji DELETE/PUT  

---

### 5. Missing permission checks

**Kategoria:** Admin Security  
**Plik:** `admin/routes/userRoutes.js`  
**Opis:** Brak sprawdzania uprawnień dla operacji modyfikujących  
**Rekomendacja:** Dodaj sprawdzanie uprawnień dla operacji DELETE/PUT  

---


## ℹ️ Problemy INFO (22)

### 1. Security configuration analyzed

**Kategoria:** Security Config  
**Plik:** `config/security.js`  
**Status:** Konfiguracja bezpieczeństwa została przeanalizowana  

---

### 2. HttpOnly properly configured

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ HttpOnly jest poprawnie skonfigurowane jako true  

---

### 3. Secure attribute properly configured

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Secure jest poprawnie skonfigurowane dla produkcji  

---

### 4. SameSite properly configured

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ SameSite jest poprawnie skonfigurowane (strict w produkcji)  

---

### 5. Access token expiry optimal

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Czas życia access tokena jest bezpieczny  

---

### 6. Helper function setAuthCookies available

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Funkcja helper jest dostępna  

---

### 7. Helper function clearAuthCookies available

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Funkcja helper jest dostępna  

---

### 8. Helper function setAdminCookies available

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Funkcja helper jest dostępna  

---

### 9. Helper function clearAdminCookies available

**Kategoria:** Cookie Security  
**Plik:** `config/cookieConfig.js`  
**Status:** ✅ Funkcja helper jest dostępna  

---

### 10. JWT secret from environment

**Kategoria:** JWT Security  
**Plik:** `controllers\user\verificationController.js`  
**Status:** ✅ Sekret JWT pobierany ze zmiennych środowiskowych  

---

### 11. JWT secret from environment

**Kategoria:** JWT Security  
**Plik:** `admin\controllers\auth\authController.js`  
**Status:** ✅ Sekret JWT pobierany ze zmiennych środowiskowych  

---

### 12. JWT secret from environment

**Kategoria:** JWT Security  
**Plik:** `admin\middleware\adminAuth.js`  
**Status:** ✅ Sekret JWT pobierany ze zmiennych środowiskowych  

---

### 13. JWT secret from environment

**Kategoria:** JWT Security  
**Plik:** `config\index.js`  
**Status:** ✅ Sekret JWT pobierany ze zmiennych środowiskowych  

---

### 14. JWT secret from environment

**Kategoria:** JWT Security  
**Plik:** `config\security.js`  
**Status:** ✅ Sekret JWT pobierany ze zmiennych środowiskowych  

---

### 15. JWT verification present

**Kategoria:** Auth Middleware  
**Plik:** `middleware/auth.js`  
**Status:** ✅ Middleware weryfikuje tokeny JWT  

---

### 16. Role-based access control

**Kategoria:** Auth Middleware  
**Plik:** `middleware/auth.js`  
**Status:** ✅ Middleware sprawdza role użytkowników  

---

### 17. Error handling present

**Kategoria:** Auth Middleware  
**Plik:** `middleware/auth.js`  
**Status:** ✅ Middleware obsługuje błędy  

---

### 18. Cookie-based authentication

**Kategoria:** Auth Middleware  
**Plik:** `middleware/auth.js`  
**Status:** ✅ Middleware używa cookies do autoryzacji  

---

### 19. JWT verification present

**Kategoria:** Auth Middleware  
**Plik:** `admin/middleware/adminAuth.js`  
**Status:** ✅ Middleware weryfikuje tokeny JWT  

---

### 20. Role-based access control

**Kategoria:** Auth Middleware  
**Plik:** `admin/middleware/adminAuth.js`  
**Status:** ✅ Middleware sprawdza role użytkowników  

---

### 21. Error handling present

**Kategoria:** Auth Middleware  
**Plik:** `admin/middleware/adminAuth.js`  
**Status:** ✅ Middleware obsługuje błędy  

---

### 22. Cookie-based authentication

**Kategoria:** Auth Middleware  
**Plik:** `admin/middleware/adminAuth.js`  
**Status:** ✅ Middleware używa cookies do autoryzacji  

---

