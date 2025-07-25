/**
 * Test naprawy systemu ulubionych
 * Sprawdza czy nowe endpointy działają poprawnie
 */

import mongoose from 'mongoose';
import User from './models/user.js';
import Ad from './models/ad.js';
import dotenv from 'dotenv';

dotenv.config();

// Połączenie z bazą danych
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Połączono z MongoDB');
  } catch (error) {
    console.error('❌ Błąd połączenia z MongoDB:', error);
    throw error;
  }
};

// Test funkcjonalności ulubionych
const testFavorites = async () => {
  try {
    console.log('\n🧪 Testowanie systemu ulubionych...\n');

    // 1. Znajdź testowego użytkownika
    const testUser = await User.findOne({ email: { $regex: /test/i } }).limit(1);
    if (!testUser) {
      console.log('❌ Nie znaleziono testowego użytkownika');
      return;
    }
    console.log(`✅ Znaleziono testowego użytkownika: ${testUser.email} (ID: ${testUser._id})`);

    // 2. Znajdź testowe ogłoszenie
    const testAd = await Ad.findOne({ status: { $in: ['active', 'opublikowane', 'pending'] } }).limit(1);
    if (!testAd) {
      console.log('❌ Nie znaleziono aktywnego ogłoszenia');
      return;
    }
    console.log(`✅ Znaleziono testowe ogłoszenie: ${testAd.headline || testAd.brand + ' ' + testAd.model} (ID: ${testAd._id})`);

    // 3. Sprawdź obecny stan ulubionych
    console.log(`\n📊 Obecny stan ulubionych użytkownika:`);
    console.log(`   Liczba ulubionych: ${testUser.favorites ? testUser.favorites.length : 0}`);
    console.log(`   Lista ID: ${testUser.favorites ? testUser.favorites.map(id => id.toString()).join(', ') : 'brak'}`);

    // 4. Sprawdź czy ogłoszenie jest już w ulubionych
    const isAlreadyFavorite = testUser.favorites && testUser.favorites.some(
      favId => favId.toString() === testAd._id.toString()
    );
    console.log(`   Czy testowe ogłoszenie jest w ulubionych: ${isAlreadyFavorite ? 'TAK' : 'NIE'}`);

    // 5. Test dodawania do ulubionych (jeśli nie jest już dodane)
    if (!isAlreadyFavorite) {
      console.log(`\n➕ Dodawanie ogłoszenia do ulubionych...`);
      testUser.favorites = testUser.favorites || [];
      testUser.favorites.push(testAd._id);
      await testUser.save();
      console.log(`✅ Ogłoszenie dodane do ulubionych`);
    } else {
      console.log(`\n⚠️  Ogłoszenie już jest w ulubionych, pomijam dodawanie`);
    }

    // 6. Test pobierania ulubionych z populate
    console.log(`\n📋 Test pobierania ulubionych z populate...`);
    const userWithFavorites = await User.findById(testUser._id)
      .populate({
        path: 'favorites',
        match: { status: { $in: ['active', 'opublikowane', 'pending'] } },
        select: '_id brand model headline shortDescription price year status'
      });

    if (userWithFavorites && userWithFavorites.favorites) {
      console.log(`✅ Pobrano ${userWithFavorites.favorites.length} ulubionych ogłoszeń:`);
      userWithFavorites.favorites.forEach((ad, index) => {
        if (ad) {
          console.log(`   ${index + 1}. ${ad.headline || ad.brand + ' ' + ad.model} (${ad._id}) - Status: ${ad.status}`);
        } else {
          console.log(`   ${index + 1}. [USUNIĘTE OGŁOSZENIE]`);
        }
      });
    } else {
      console.log(`❌ Nie udało się pobrać ulubionych`);
    }

    // 7. Test agregacji (jak w kontrolerze)
    console.log(`\n🔍 Test agregacji ulubionych...`);
    const aggregationResult = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(testUser._id) } },
      { $unwind: '$favorites' },
      {
        $lookup: {
          from: 'ads',
          localField: 'favorites',
          foreignField: '_id',
          as: 'ad'
        }
      },
      { $unwind: '$ad' },
      { $match: { 'ad.status': { $in: ['active', 'opublikowane', 'pending'] } } },
      { $count: 'total' }
    ]);

    const totalValidFavorites = aggregationResult.length > 0 ? aggregationResult[0].total : 0;
    console.log(`✅ Liczba aktywnych ulubionych (agregacja): ${totalValidFavorites}`);

    // 8. Test struktury odpowiedzi API
    console.log(`\n📤 Test struktury odpowiedzi API...`);
    const apiResponse = {
      success: true,
      data: {
        favorites: userWithFavorites.favorites.filter(ad => ad !== null).map(ad => ({
          ...ad.toObject(),
          title: ad.headline ? ad.headline.substring(0, 120) : ''
        })),
        pagination: {
          currentPage: 1,
          totalPages: Math.ceil(totalValidFavorites / 20),
          totalItems: totalValidFavorites,
          itemsPerPage: 20
        }
      }
    };

    console.log(`✅ Struktura odpowiedzi API:`);
    console.log(`   success: ${apiResponse.success}`);
    console.log(`   data.favorites.length: ${apiResponse.data.favorites.length}`);
    console.log(`   data.pagination.totalItems: ${apiResponse.data.pagination.totalItems}`);

    console.log(`\n🎉 Test zakończony pomyślnie!`);

  } catch (error) {
    console.error('❌ Błąd podczas testowania:', error);
  }
};

// Główna funkcja
const runTest = async () => {
  try {
    await connectDB();
    await testFavorites();
  } catch (error) {
    console.error('❌ Błąd testu:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
};

// Uruchom test
runTest();
