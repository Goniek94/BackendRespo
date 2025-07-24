// Skrypt do czyszczenia cache przeglądarki i localStorage
// Uruchom w konsoli przeglądarki (F12 -> Console)

console.log('🧹 CZYSZCZENIE CACHE PRZEGLĄDARKI');
console.log('=================================');

// 1. Wyczyść localStorage
try {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('car') || key.includes('brand') || key.includes('model') || key.includes('search'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Usunięto z localStorage: ${key}`);
  });
  
  if (keysToRemove.length === 0) {
    console.log('ℹ️ Brak danych do usunięcia z localStorage');
  }
} catch (error) {
  console.error('❌ Błąd czyszczenia localStorage:', error);
}

// 2. Wyczyść sessionStorage
try {
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('car') || key.includes('brand') || key.includes('model') || key.includes('search'))) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ Usunięto z sessionStorage: ${key}`);
  });
  
  if (sessionKeysToRemove.length === 0) {
    console.log('ℹ️ Brak danych do usunięcia z sessionStorage');
  }
} catch (error) {
  console.error('❌ Błąd czyszczenia sessionStorage:', error);
}

// 3. Wyczyść cache serwisów
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        console.log(`🗑️ Usuwanie cache: ${cacheName}`);
        return caches.delete(cacheName);
      })
    );
  }).then(() => {
    console.log('✅ Cache serwisów wyczyszczony');
  }).catch(error => {
    console.error('❌ Błąd czyszczenia cache serwisów:', error);
  });
} else {
  console.log('ℹ️ Cache API nie jest dostępne');
}

// 4. Instrukcje dla użytkownika
console.log('\n🔄 NASTĘPNE KROKI:');
console.log('1. Naciśnij Ctrl+Shift+R (lub Cmd+Shift+R na Mac) żeby odświeżyć stronę');
console.log('2. Lub naciśnij F5 kilka razy');
console.log('3. Sprawdź czy w konsoli pojawiają się logi: "🔍 DEBUG brands from API"');
console.log('4. Wybierz markę w wyszukiwarce i sprawdź czy pojawiają się modele');

console.log('\n✨ GOTOWE! Cache został wyczyszczony.');
