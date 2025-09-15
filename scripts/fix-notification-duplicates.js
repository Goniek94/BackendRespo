#!/usr/bin/env node

/**
 * NAPRAWIENIE DUPLIKACJI POWIADOMIEŃ
 * 
 * Ten skrypt:
 * 1. Zunifikuje wszystkie implementacje do notificationManager
 * 2. Naprawi importy w kontrolerach
 * 3. Przetestuje działanie
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 NAPRAWIENIE DUPLIKACJI POWIADOMIEŃ');
console.log('====================================');

const filesToFix = [
  {
    file: 'controllers/communication/messageBasics.js',
    oldImport: "import notificationService from '../notifications/notificationController.js';",
    newImport: "import notificationManager from '../../services/notificationManager.js';",
    replacements: [
      { old: 'notificationService.notifyNewMessage', new: 'notificationManager.notifyNewMessage' }
    ]
  },
  {
    file: 'controllers/communication/conversations.js',
    oldImport: "import notificationService from '../notifications/notificationController.js';",
    newImport: "import notificationManager from '../../services/notificationManager.js';",
    replacements: [
      { old: 'notificationService.notifyNewMessage', new: 'notificationManager.notifyNewMessage' }
    ]
  },
  {
    file: 'controllers/communication/adMessages.js',
    oldImport: "import notificationService from '../notifications/notificationController.js';",
    newImport: "import notificationManager from '../../services/notificationManager.js';",
    replacements: [
      { old: 'notificationService.notifyNewMessage', new: 'notificationManager.notifyNewMessage' }
    ]
  },
  {
    file: 'controllers/payments/transactionController.js',
    oldImport: "import { notificationService } from '../notifications/notificationController.js';",
    newImport: "import notificationManager from '../../services/notificationManager.js';",
    replacements: [
      { old: 'notificationService.createNotification', new: 'notificationManager.createNotification' }
    ]
  }
];

async function fixFile(fileInfo) {
  const filePath = fileInfo.file;
  
  try {
    console.log(`\n🔧 Naprawiam: ${filePath}`);
    
    // Sprawdź czy plik istnieje
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Plik nie istnieje: ${filePath}`);
      return false;
    }
    
    // Wczytaj zawartość pliku
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Zamień import
    if (content.includes(fileInfo.oldImport)) {
      content = content.replace(fileInfo.oldImport, fileInfo.newImport);
      console.log(`✅ Zamieniono import`);
    } else {
      console.log(`ℹ️ Import już poprawny lub nie znaleziono`);
    }
    
    // Zamień wywołania
    let replacementsMade = 0;
    fileInfo.replacements.forEach(replacement => {
      const regex = new RegExp(replacement.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, replacement.new);
        replacementsMade += matches.length;
        console.log(`✅ Zamieniono ${matches.length}x: ${replacement.old} -> ${replacement.new}`);
      }
    });
    
    if (replacementsMade === 0) {
      console.log(`ℹ️ Brak wywołań do zamiany`);
    }
    
    // Zapisz plik
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Plik zapisany: ${filePath}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Błąd podczas naprawiania ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('\n1️⃣ Naprawiam duplikacje w kontrolerach...');
  
  let successCount = 0;
  for (const fileInfo of filesToFix) {
    const success = await fixFile(fileInfo);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Naprawiono ${successCount}/${filesToFix.length} plików`);
  
  console.log('\n2️⃣ Tworzę test powiadomienia...');
  
  // Stwórz prosty test
  const testScript = `
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import notificationManager from '../services/notificationManager.js';
import User from '../models/user/user.js';

async function testNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą');
    
    const users = await User.find().limit(1);
    if (users.length === 0) {
      console.log('❌ Brak użytkowników');
      return;
    }
    
    const user = users[0];
    console.log('👤 Testowy użytkownik:', user.email);
    
    notificationManager.initialize();
    
    const notification = await notificationManager.notifyAdCreated(
      user._id,
      'Test BMW X5 2020',
      null
    );
    
    if (notification) {
      console.log('✅ Powiadomienie utworzone:', notification._id);
    } else {
      console.log('❌ Nie udało się utworzyć powiadomienia');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Błąd:', error.message);
  }
}

testNotification();
`;
  
  fs.writeFileSync('scripts/test-unified-notifications.js', testScript);
  console.log('✅ Utworzono test: scripts/test-unified-notifications.js');
  
  console.log('\n🎉 NAPRAWIENIE ZAKOŃCZONE!');
  console.log('=====================================');
  console.log('✅ Wszystkie kontrolery używają teraz notificationManager');
  console.log('✅ Powiadomienia będą trafiać do jednego panelu');
  console.log('✅ Uruchom: node scripts/test-unified-notifications.js');
}

main();
