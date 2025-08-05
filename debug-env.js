// Debug zmiennych środowiskowych
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Debug zmiennych środowiskowych:');
console.log('');
console.log('MOCK_EMAIL:', JSON.stringify(process.env.MOCK_EMAIL));
console.log('MOCK_EMAIL type:', typeof process.env.MOCK_EMAIL);
console.log('MOCK_EMAIL === "false":', process.env.MOCK_EMAIL === 'false');
console.log('MOCK_EMAIL === false:', process.env.MOCK_EMAIL === false);
console.log('');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);
console.log('');
console.log('NODE_ENV:', process.env.NODE_ENV);
