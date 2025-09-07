const jwt = require('jsonwebtoken');

// Sprawdź aktualny token w cookies
console.log('🔍 Debugowanie aktualnego tokena...\n');

// Symuluj token z błędem
const problematicUserId = "d035b20a";
console.log(`❌ Problematyczny userId: "${problematicUserId}"`);
console.log(`   Długość: ${problematicUserId.length} znaków`);
console.log(`   Wymagana długość ObjectId: 24 znaki`);

// Sprawdź czy to jest fragment pełnego ObjectId
console.log('\n🔍 Analiza fragmentu ObjectId:');
console.log(`   Fragment: ${problematicUserId}`);
console.log(`   To wygląda jak początek ObjectId...`);

// Sprawdź pełne ObjectId z bazy danych
const fullObjectIds = [
    "688b4aba9c0f2fecd035b20a", // mateusz.goszczycki1994@gmail.com
    "66b4aba9c0f2fecd035b20b"   // przykładowy drugi
];

console.log('\n🔍 Porównanie z pełnymi ObjectId:');
fullObjectIds.forEach((fullId, index) => {
    const endsWithFragment = fullId.endsWith(problematicUserId);
    console.log(`   ObjectId ${index + 1}: ${fullId}`);
    console.log(`   Kończy się na "${problematicUserId}": ${endsWithFragment ? '✅ TAK' : '❌ NIE'}`);
    
    if (endsWithFragment) {
        console.log(`   🎯 ZNALEZIONO DOPASOWANIE! Pełny ObjectId: ${fullId}`);
    }
});

// Sprawdź jak może wyglądać token
console.log('\n🔍 Możliwe przyczyny problemu:');
console.log('1. Token zawiera tylko fragment ObjectId w polu "u"');
console.log('2. JWT został nieprawidłowo utworzony z obciętym ID');
console.log('3. Middleware nieprawidłowo parsuje pole userId');

console.log('\n💡 Rozwiązanie:');
console.log('1. Sprawdź jak token jest tworzony w kontrolerze logowania');
console.log('2. Upewnij się że pełny ObjectId jest zapisywany w JWT');
console.log('3. Popraw parsowanie w adminAuth middleware');
