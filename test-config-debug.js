/**
 * Test debugowania konfiguracji JWT
 */

import dotenv from 'dotenv';
dotenv.config();

import config from './config/index.js';

console.log('🔍 DEBUGOWANIE KONFIGURACJI JWT');
console.log('=' .repeat(50));

console.log('\n📋 Zmienne środowiskowe:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET (z process.env):', process.env.JWT_SECRET ? 'USTAWIONY' : 'BRAK');
console.log('JWT_SECRET długość:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_SECRET pierwsze 20 znaków:', process.env.JWT_SECRET?.substring(0, 20) || 'BRAK');

console.log('\n⚙️ Konfiguracja aplikacji:');
console.log('Environment:', config.environment);
console.log('JWT Secret (z config):', config.security.jwt.secret ? 'USTAWIONY' : 'BRAK');
console.log('JWT Secret długość:', config.security.jwt.secret?.length || 0);
console.log('JWT Secret pierwsze 20 znaków:', config.security.jwt.secret?.substring(0, 20) || 'BRAK');

console.log('\n🔍 Porównanie sekretów:');
const envSecret = process.env.JWT_SECRET;
const configSecret = config.security.jwt.secret;

if (envSecret && configSecret) {
  console.log('Sekrety są identyczne:', envSecret === configSecret ? '✅ TAK' : '❌ NIE');
  
  if (envSecret !== configSecret) {
    console.log('ENV Secret start:', envSecret.substring(0, 30) + '...');
    console.log('Config Secret start:', configSecret.substring(0, 30) + '...');
  }
} else {
  console.log('❌ Jeden z sekretów nie jest ustawiony');
}

console.log('\n🧪 Test weryfikacji JWT:');
import jwt from 'jsonwebtoken';

// Stwórz testowy token
const testPayload = { userId: 'test123', role: 'user' };

try {
  // Użyj sekretu z konfiguracji (tego samego co middleware)
  const token = jwt.sign(testPayload, configSecret, { expiresIn: '1h' });
  console.log('✅ Token utworzony pomyślnie');
  console.log('Token start:', token.substring(0, 50) + '...');
  
  // Spróbuj zweryfikować
  const decoded = jwt.verify(token, configSecret);
  console.log('✅ Token zweryfikowany pomyślnie');
  console.log('Decoded payload:', decoded);
  
} catch (error) {
  console.log('❌ Błąd JWT:', error.message);
}
