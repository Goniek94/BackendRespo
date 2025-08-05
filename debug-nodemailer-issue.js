// Debug problemu z nodemailer.js - dlaczego używa MOCK
import { sendVerificationLinkEmail } from './config/nodemailer.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 DEBUG PROBLEMU Z NODEMAILER.JS');
console.log('=================================\n');

console.log('📋 Zmienne środowiskowe:');
console.log('MOCK_EMAIL:', JSON.stringify(process.env.MOCK_EMAIL));
console.log('MOCK_EMAIL === "false":', process.env.MOCK_EMAIL === 'false');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('🧪 Test funkcji sendVerificationLinkEmail...');

async function testNodemailerFunction() {
  try {
    const email = 'mateusznikk94@gmail.com';
    const verificationLink = 'http://localhost:3001/verify-email?token=test123&email=' + encodeURIComponent(email);
    const name = 'Mateusz';

    console.log('📧 Parametry:');
    console.log('Email:', email);
    console.log('Link:', verificationLink);
    console.log('Name:', name);
    console.log('');

    console.log('🚀 Wywołuję sendVerificationLinkEmail...');
    const result = await sendVerificationLinkEmail(email, verificationLink, name);
    
    console.log('📊 Wynik:', result);
    
    if (result) {
      console.log('✅ Funkcja zwróciła sukces!');
    } else {
      console.log('❌ Funkcja zwróciła błąd!');
    }

  } catch (error) {
    console.error('❌ Błąd wywołania funkcji:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNodemailerFunction();
