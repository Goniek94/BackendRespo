import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const testMongoConnection = async () => {
  console.log('🔍 Testowanie połączenia z MongoDB Atlas...');
  console.log('URI:', process.env.MONGODB_URI ? 'Ustawione' : 'BRAK');
  
  try {
    // Test połączenia z MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Połączenie z MongoDB Atlas UDANE');
    
    // Test podstawowych operacji
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Test zapisu do bazy UDANY');
    
    const testDoc = await testCollection.findOne({ test: 'connection' });
    console.log('✅ Test odczytu z bazy UDANY');
    
    // Sprawdź dostępne kolekcje
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Dostępne kolekcje:', collections.map(c => c.name));
    
    // Usuń test document
    await testCollection.deleteOne({ test: 'connection' });
    
  } catch (error) {
    console.error('❌ Błąd połączenia z MongoDB Atlas:');
    console.error('Typ błędu:', error.name);
    console.error('Wiadomość:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('🔐 Problem z uwierzytelnianiem - sprawdź username/password');
    }
    if (error.message.includes('network')) {
      console.error('🌐 Problem z siecią - sprawdź IP whitelist w MongoDB Atlas');
    }
    if (error.message.includes('timeout')) {
      console.error('⏰ Timeout - sprawdź połączenie internetowe');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
  }
};

testMongoConnection();
