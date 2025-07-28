import axios from 'axios';
import colors from 'colors';

// Konfiguracja testów
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'security-test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Funkcja pomocnicza do logowania wyników
const logResult = (testName, success, message) => {
  const status = success ? '✅ PASS'.green : '❌ FAIL'.red;
  console.log(`${status} ${testName}: ${message}`);
};

// Test 1: Sprawdzenie czy serwer odpowiada
const testServerHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logResult('Server Health', response.status === 200, 'Serwer działa prawidłowo');
    return true;
  } catch (error) {
    logResult('Server Health', false, `Serwer nie odpowiada: ${error.message}`);
    return false;
  }
};

// Test 2: Sprawdzenie security headers
const testSecurityHeaders = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/`);
    const headers = response.headers;
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    let hasSecurityHeaders = true;
    const missingHeaders = [];
    
    securityHeaders.forEach(header => {
      if (!headers[header]) {
        hasSecurityHeaders = false;
        missingHeaders.push(header);
      }
    });
    
    if (hasSecurityHeaders) {
      logResult('Security Headers', true, 'Wszystkie wymagane nagłówki bezpieczeństwa są obecne');
    } else {
      logResult('Security Headers', false, `Brakuje nagłówków: ${missingHeaders.join(', ')}`);
    }
    
    return hasSecurityHeaders;
  } catch (error) {
    logResult('Security Headers', false, `Błąd sprawdzania nagłówków: ${error.message}`);
    return false;
  }
};

// Test 3: Sprawdzenie rate limiting na endpoincie logowania
const testRateLimiting = async () => {
  try {
    console.log('\n🔄 Testowanie rate limiting (może potrwać chwilę)...');
    
    const requests = [];
    const maxAttempts = 7; // Więcej niż limit (5)
    
    // Wykonaj wiele żądań jednocześnie
    for (let i = 0; i < maxAttempts; i++) {
      requests.push(
        axios.post(`${BASE_URL}/api/users/login`, {
          email: 'test@example.com',
          password: 'wrongpassword'
        }).catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Sprawdź czy któreś żądanie zostało zablokowane (429)
    const blockedRequests = responses.filter(res => res && res.status === 429);
    
    if (blockedRequests.length > 0) {
      logResult('Rate Limiting', true, `${blockedRequests.length} żądań zostało zablokowanych przez rate limiting`);
      return true;
    } else {
      logResult('Rate Limiting', false, 'Rate limiting nie działa - wszystkie żądania przeszły');
      return false;
    }
  } catch (error) {
    logResult('Rate Limiting', false, `Błąd testowania rate limiting: ${error.message}`);
    return false;
  }
};

// Test 4: Sprawdzenie CORS
const testCORS = async () => {
  try {
    const response = await axios.options(`${BASE_URL}/api/users/check-auth`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    
    if (corsHeaders) {
      logResult('CORS Configuration', true, `CORS skonfigurowany: ${corsHeaders}`);
      return true;
    } else {
      logResult('CORS Configuration', false, 'Brak nagłówków CORS');
      return false;
    }
  } catch (error) {
    logResult('CORS Configuration', false, `Błąd sprawdzania CORS: ${error.message}`);
    return false;
  }
};

// Test 5: Sprawdzenie walidacji danych wejściowych
const testInputValidation = async () => {
  try {
    // Test z nieprawidłowymi danymi
    const response = await axios.post(`${BASE_URL}/api/users/register`, {
      email: 'invalid-email',
      password: '123', // Za krótkie hasło
      name: '', // Puste imię
      phone: 'invalid-phone'
    }).catch(err => err.response);
    
    if (response && response.status === 400) {
      logResult('Input Validation', true, 'Walidacja danych wejściowych działa prawidłowo');
      return true;
    } else {
      logResult('Input Validation', false, 'Walidacja danych wejściowych nie działa');
      return false;
    }
  } catch (error) {
    logResult('Input Validation', false, `Błąd testowania walidacji: ${error.message}`);
    return false;
  }
};

// Test 6: Sprawdzenie obsługi błędów
const testErrorHandling = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/nonexistent-endpoint`)
      .catch(err => err.response);
    
    if (response && response.status === 404) {
      const errorData = response.data;
      
      // Sprawdź czy odpowiedź błędu nie zawiera wrażliwych informacji
      const hasStack = errorData.stack !== undefined;
      const hasMessage = errorData.message !== undefined;
      
      if (hasMessage && !hasStack) {
        logResult('Error Handling', true, 'Obsługa błędów działa prawidłowo - brak wrażliwych informacji');
        return true;
      } else if (hasStack) {
        logResult('Error Handling', false, 'UWAGA: Stack trace jest widoczny w odpowiedzi błędu');
        return false;
      }
    }
    
    logResult('Error Handling', false, 'Nieprawidłowa obsługa błędów');
    return false;
  } catch (error) {
    logResult('Error Handling', false, `Błąd testowania obsługi błędów: ${error.message}`);
    return false;
  }
};

// Test 7: Sprawdzenie czy JWT sekrety zostały zmienione
const testJWTSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  // Sprawdź czy sekrety nie są domyślne/słabe
  const weakSecrets = ['secret', 'jwt-secret', 'your-secret-key', 'default'];
  
  let isSecure = true;
  let message = '';
  
  if (!jwtSecret || jwtSecret.length < 32) {
    isSecure = false;
    message += 'JWT_SECRET jest za krótki lub nie istnieje. ';
  }
  
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    isSecure = false;
    message += 'JWT_REFRESH_SECRET jest za krótki lub nie istnieje. ';
  }
  
  if (weakSecrets.some(weak => jwtSecret?.toLowerCase().includes(weak))) {
    isSecure = false;
    message += 'JWT_SECRET wydaje się być słaby. ';
  }
  
  if (isSecure) {
    message = 'JWT sekrety są bezpieczne';
  }
  
  logResult('JWT Secrets', isSecure, message);
  return isSecure;
};

// Główna funkcja testowa
const runSecurityTests = async () => {
  console.log('🔒 ROZPOCZYNANIE TESTÓW BEZPIECZEŃSTWA'.yellow.bold);
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Wykonaj wszystkie testy
  results.push(await testServerHealth());
  results.push(await testSecurityHeaders());
  results.push(await testRateLimiting());
  results.push(await testCORS());
  results.push(await testInputValidation());
  results.push(await testErrorHandling());
  results.push(testJWTSecrets());
  
  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log(`📊 PODSUMOWANIE: ${passedTests}/${totalTests} testów przeszło pomyślnie`.bold);
  
  if (passedTests === totalTests) {
    console.log('🎉 Wszystkie testy bezpieczeństwa przeszły pomyślnie!'.green.bold);
  } else {
    console.log('⚠️  Niektóre testy bezpieczeństwa nie przeszły. Sprawdź powyższe wyniki.'.yellow.bold);
  }
  
  console.log('\n📋 ZALECENIA:');
  console.log('1. Upewnij się, że serwer działa na porcie 5000');
  console.log('2. Sprawdź czy wszystkie middleware są poprawnie skonfigurowane');
  console.log('3. Zweryfikuj konfigurację CORS dla środowiska produkcyjnego');
  console.log('4. Regularnie aktualizuj sekrety JWT');
  
  return passedTests === totalTests;
};

// Uruchom testy jeśli skrypt jest wykonywany bezpośrednio
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this module is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Błąd podczas wykonywania testów:', error.message);
      process.exit(1);
    });
}

export { runSecurityTests };
