const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseContent() {
  try {
    console.log('🔄 Łączenie z bazą danych...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Połączono z bazą danych:', process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n📋 Dostępne kolekcje:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} dokumentów`);
    }
    
    // Sprawdź użytkowników
    console.log('\n👥 UŻYTKOWNICY:');
    const usersCount = await db.collection('users').countDocuments();
    if (usersCount > 0) {
      console.log(`Znaleziono ${usersCount} użytkowników:`);
      const users = await db.collection('users').find({}).limit(5).toArray();
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. Użytkownik:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Imię: ${user.firstName || 'brak'}`);
        console.log(`   Nazwisko: ${user.lastName || 'brak'}`);
        console.log(`   Rola: ${user.role || 'brak'}`);
        console.log(`   Utworzony: ${user.createdAt || 'brak'}`);
        console.log(`   ID: ${user._id}`);
      });
    } else {
      console.log('❌ Brak użytkowników w bazie danych');
    }
    
    // Sprawdź ogłoszenia
    console.log('\n🚗 OGŁOSZENIA:');
    const adsCount = await db.collection('ads').countDocuments();
    if (adsCount > 0) {
      console.log(`Znaleziono ${adsCount} ogłoszeń:`);
      const ads = await db.collection('ads').find({}).limit(3).toArray();
      ads.forEach((ad, index) => {
        console.log(`\n${index + 1}. Ogłoszenie:`);
        console.log(`   Tytuł: ${ad.title || 'brak'}`);
        console.log(`   Marka: ${ad.basicInfo?.brand || 'brak'}`);
        console.log(`   Model: ${ad.basicInfo?.model || 'brak'}`);
        console.log(`   Cena: ${ad.price?.amount || 'brak'} ${ad.price?.currency || ''}`);
        console.log(`   Status: ${ad.status || 'brak'}`);
        console.log(`   Właściciel: ${ad.owner || 'brak'}`);
        console.log(`   ID: ${ad._id}`);
      });
    } else {
      console.log('❌ Brak ogłoszeń w bazie danych');
    }
    
    // Sprawdź inne ważne kolekcje
    console.log('\n📊 INNE KOLEKCJE:');
    
    const carBrandsCount = await db.collection('carbrands').countDocuments();
    if (carBrandsCount > 0) {
      console.log(`CarBrands: ${carBrandsCount} marek samochodów`);
      const sampleBrand = await db.collection('carbrands').findOne({});
      console.log(`   Przykład: ${sampleBrand?.brand || 'brak'}`);
    }
    
    const messagesCount = await db.collection('messages').countDocuments();
    console.log(`Messages: ${messagesCount} wiadomości`);
    
    const notificationsCount = await db.collection('notifications').countDocuments();
    console.log(`Notifications: ${notificationsCount} powiadomień`);
    
    console.log('\n✅ Sprawdzanie zakończone');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania bazy danych:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkDatabaseContent();
