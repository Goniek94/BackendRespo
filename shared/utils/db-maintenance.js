#!/usr/bin/env node

/**
 * Skrypt do zarządzania indeksami i strukturą bazy danych MongoDB
 * Operacje przeniesione z index.js, aby nie spowalniały startu serwera
 * 
 * Użycie: node utils/db-maintenance.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Konfiguracja ścieżek dla ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kolory do konsoli
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Funkcja do logowania
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Połączenie z bazą danych MongoDB
 */
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    
    log('✅ Połączono z bazą danych MongoDB', colors.green);
    return true;
  } catch (err) {
    log(`❌ Błąd połączenia z MongoDB: ${err.message}`, colors.red);
    return false;
  }
};

/**
 * Zarządzanie indeksami w kolekcji Ads
 */
const manageAdsIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Sprawdź, czy kolekcja ads istnieje
    if (collections.some(col => col.name === 'ads')) {
      log('\n📊 Zarządzanie indeksami kolekcji Ads:', colors.cyan);
      
      // Pobierz aktualne indeksy
      const indexes = await db.collection('ads').indexes();
      log(`Znaleziono ${indexes.length} indeksów w kolekcji ads`, colors.dim);
      
      // Usuń indeks registrationNumber_1, jeśli istnieje
      try {
        await db.collection('ads').dropIndex('registrationNumber_1');
        log('✅ Usunięto indeks registrationNumber_1', colors.green);
      } catch (err) {
        log(`ℹ️ Indeks registrationNumber_1: ${err.message}`, colors.yellow);
      }
      
      // Usuń indeks vin_1, jeśli istnieje
      try {
        await db.collection('ads').dropIndex('vin_1');
        log('✅ Usunięto indeks vin_1', colors.green);
      } catch (err) {
        log(`ℹ️ Indeks vin_1: ${err.message}`, colors.yellow);
      }
      
      // Tworzenie nowych indeksów
      try {
        // Utwórz indeks pola createdAt dla szybkiego sortowania
        await db.collection('ads').createIndex({ createdAt: -1 });
        log('✅ Utworzono indeks dla createdAt', colors.green);
        
        // Utwórz indeks dla pola status dla szybkiego filtrowania
        await db.collection('ads').createIndex({ status: 1 });
        log('✅ Utworzono indeks dla status', colors.green);
        
        // Utwórz indeks dla pola userId dla szybkiego wyszukiwania ogłoszeń użytkownika
        await db.collection('ads').createIndex({ userId: 1 });
        log('✅ Utworzono indeks dla userId', colors.green);
        
        // Indeks dla wyszukiwania tekstowego
        await db.collection('ads').createIndex({ 
          title: "text", 
          description: "text" 
        }, { 
          name: "search_index",
          default_language: "polish",
          weights: {
            title: 10,
            description: 5
          }
        });
        log('✅ Utworzono indeks tekstowy dla wyszukiwania', colors.green);
      } catch (err) {
        log(`❌ Błąd podczas tworzenia indeksów: ${err.message}`, colors.red);
      }
    } else {
      log('⚠️ Kolekcja ads nie istnieje', colors.yellow);
    }
  } catch (error) {
    log(`❌ Błąd zarządzania indeksami: ${error.message}`, colors.red);
  }
};

/**
 * Zarządzanie indeksami dla kolekcji messages
 */
const manageMessagesIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Sprawdź, czy kolekcja messages istnieje
    if (collections.some(col => col.name === 'messages')) {
      log('\n📊 Zarządzanie indeksami kolekcji Messages:', colors.cyan);
      
      // Tworzenie indeksów
      try {
        // Indeks dla wątków
        await db.collection('messages').createIndex({ conversationId: 1 });
        log('✅ Utworzono/zaktualizowano indeks dla conversationId', colors.green);
        
        // Indeks dla szybkiego wyszukiwania wiadomości użytkownika
        await db.collection('messages').createIndex({ 
          senderId: 1, 
          recipientId: 1 
        });
        log('✅ Utworzono/zaktualizowano indeks dla senderId i recipientId', colors.green);
        
        // Indeks dla statusu odczytania
        await db.collection('messages').createIndex({ read: 1 });
        log('✅ Utworzono/zaktualizowano indeks dla statusu odczytania', colors.green);
      } catch (err) {
        log(`❌ Błąd podczas zarządzania indeksami messages: ${err.message}`, colors.red);
      }
    } else {
      log('⚠️ Kolekcja messages nie istnieje', colors.yellow);
    }
  } catch (error) {
    log(`❌ Błąd zarządzania indeksami messages: ${error.message}`, colors.red);
  }
};

/**
 * Zarządzanie indeksami dla kolekcji notifications
 */
const manageNotificationsIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Sprawdź, czy kolekcja notifications istnieje
    if (collections.some(col => col.name === 'notifications')) {
      log('\n📊 Zarządzanie indeksami kolekcji Notifications:', colors.cyan);
      
      // Tworzenie indeksów
      try {
        // Indeks dla wyszukiwania powiadomień użytkownika
        await db.collection('notifications').createIndex({ userId: 1 });
        log('✅ Utworzono/zaktualizowano indeks dla userId', colors.green);
        
        // Indeks dla sortowania według czasu
        await db.collection('notifications').createIndex({ createdAt: -1 });
        log('✅ Utworzono/zaktualizowano indeks dla createdAt', colors.green);
        
        // Indeks dla statusu odczytania
        await db.collection('notifications').createIndex({ isRead: 1 });
        log('✅ Utworzono/zaktualizowano indeks dla statusu odczytania', colors.green);
        
        // Indeks TTL dla automatycznego usuwania starych powiadomień
        await db.collection('notifications').createIndex(
          { createdAt: 1 }, 
          { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 dni
        );
        log('✅ Utworzono/zaktualizowano indeks TTL dla automatycznego usuwania', colors.green);
      } catch (err) {
        log(`❌ Błąd podczas zarządzania indeksami notifications: ${err.message}`, colors.red);
      }
    } else {
      log('⚠️ Kolekcja notifications nie istnieje', colors.yellow);
    }
  } catch (error) {
    log(`❌ Błąd zarządzania indeksami notifications: ${error.message}`, colors.red);
  }
};

/**
 * Główna funkcja skryptu
 */
const main = async () => {
  log('\n🛠️  Narzędzie do zarządzania bazą danych MongoDB', colors.bright + colors.cyan);
  log('='.repeat(60), colors.dim);
  
  // Połączenie z bazą danych
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    log('❌ Nie można kontynuować bez połączenia z bazą danych', colors.red);
    process.exit(1);
  }
  
  // Zarządzanie indeksami
  await manageAdsIndexes();
  await manageMessagesIndexes();
  await manageNotificationsIndexes();
  
  log('\n✅ Operacje na bazie danych zakończone pomyślnie!', colors.bright + colors.green);
  
  // Zamknięcie połączenia z bazą danych
  await mongoose.connection.close();
  log('🔌 Połączenie z bazą danych zamknięte', colors.dim);
  process.exit(0);
};

// Uruchomienie skryptu
main().catch(err => {
  log(`❌ Błąd podczas wykonywania skryptu: ${err.message}`, colors.red);
  process.exit(1);
});
