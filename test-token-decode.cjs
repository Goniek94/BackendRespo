const jwt = require('jsonwebtoken');

// Token z testu
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2NkODAzZTQzMGI3NTUwMzhmNjAwMjUiLCJyb2xlIjoiYWRtaW4iLCJ1c2VyQWdlbnQiOiJheGlvcy8xLjguNCIsImlwQWRkcmVzcyI6Ijo6MSIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTM3ODIzNjEsImp0aSI6IjczMmVhYzlkNThmOTBiNTk5YzA3MDg5YTIzYTY2NjBiIiwibGFzdEFjdGl2aXR5IjoxNzUzNzgyMzYxNDA5LCJmaW5nZXJwcmludCI6Ijk3Zjc0MDhhZDJjMDU0MTMiLCJleHAiOjE3NTM4Njg3NjEsImF1ZCI6Im1hcmtldHBsYWNlLXVzZXJzLWRldiIsImlzcyI6Im1hcmtldHBsYWNlLWRldiIsInN1YiI6IjY3Y2Q4MDNlNDMwYjc1NTAzOGY2MDAyNSJ9.SAGy0tEsA1nEzg-_Dt8ivfpbrZDRmzkm95mEfVyOI_k';

try {
  // Dekoduj bez weryfikacji żeby zobaczyć strukturę
  const decoded = jwt.decode(token);
  console.log('Struktura tokenu:');
  console.log(JSON.stringify(decoded, null, 2));
  
  // Sprawdź czy ma sessionId
  console.log('\nCzy ma sessionId?', !!decoded.sessionId);
  console.log('Czy ma jti?', !!decoded.jti);
  console.log('Czy ma userId?', !!decoded.userId);
  console.log('Czy ma id?', !!decoded.id);
  
} catch (error) {
  console.error('Błąd dekodowania:', error.message);
}
