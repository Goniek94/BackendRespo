/**
 * KOMPLETNE CZYSZCZENIE CACHE FRONTENDU
 * Usuwa wszystkie możliwe cache i restartuje frontend
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function clearFrontendCache() {
  console.log('🧹 KOMPLETNE CZYSZCZENIE CACHE FRONTENDU...\n');
  
  try {
    // 1. Zatrzymaj frontend jeśli działa
    console.log('1️⃣ Zatrzymywanie frontendu...');
    try {
      await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *react-scripts*"');
      console.log('✅ Frontend zatrzymany');
    } catch (error) {
      console.log('ℹ️ Frontend prawdopodobnie nie był uruchomiony');
    }
    
    // 2. Usuń node_modules i package-lock.json
    console.log('\n2️⃣ Usuwanie node_modules...');
    const frontendPath = '../marketplace-frontend';
    const nodeModulesPath = path.join(frontendPath, 'node_modules');
    const packageLockPath = path.join(frontendPath, 'package-lock.json');
    
    if (fs.existsSync(nodeModulesPath)) {
      await execAsync(`rmdir /s /q "${nodeModulesPath}"`);
      console.log('✅ node_modules usunięte');
    }
    
    if (fs.existsSync(packageLockPath)) {
      fs.unlinkSync(packageLockPath);
      console.log('✅ package-lock.json usunięty');
    }
    
    // 3. Usuń build folder
    console.log('\n3️⃣ Usuwanie build folder...');
    const buildPath = path.join(frontendPath, 'build');
    if (fs.existsSync(buildPath)) {
      await execAsync(`rmdir /s /q "${buildPath}"`);
      console.log('✅ Build folder usunięty');
    }
    
    // 4. Wyczyść npm cache
    console.log('\n4️⃣ Czyszczenie npm cache...');
    await execAsync('npm cache clean --force');
    console.log('✅ NPM cache wyczyszczony');
    
    // 5. Reinstaluj dependencies
    console.log('\n5️⃣ Reinstalacja dependencies...');
    process.chdir(frontendPath);
    await execAsync('npm install');
    console.log('✅ Dependencies zainstalowane');
    
    // 6. Uruchom frontend
    console.log('\n6️⃣ Uruchamianie frontendu...');
    console.log('🚀 Frontend zostanie uruchomiony w nowym oknie...');
    
    // Uruchom w nowym oknie
    exec('start cmd /k "npm start"', { cwd: frontendPath });
    
    console.log('\n✅ GOTOWE!');
    console.log('📋 Co zostało zrobione:');
    console.log('   • Zatrzymano stary frontend');
    console.log('   • Usunięto node_modules');
    console.log('   • Usunięto package-lock.json');
    console.log('   • Usunięto build folder');
    console.log('   • Wyczyszczono npm cache');
    console.log('   • Zainstalowano dependencies');
    console.log('   • Uruchomiono frontend na nowo');
    console.log('\n🌐 Frontend powinien być dostępny na: http://localhost:3001');
    console.log('🔧 Backend działa na: http://localhost:3000');
    console.log('\n⚠️ WAŻNE: Odśwież przeglądarkę i wyczyść cache przeglądarki (Ctrl+Shift+R)');
    
  } catch (error) {
    console.error('❌ Błąd podczas czyszczenia cache:', error.message);
    process.exit(1);
  }
}

// Uruchom czyszczenie
clearFrontendCache();
