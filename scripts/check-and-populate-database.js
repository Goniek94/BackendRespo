/**
 * Sprawdź i wypełnij bazę danych testowymi danymi dla dashboard
 */

import mongoose from 'mongoose';
import User from '../models/user/user.js';
import Ad from '../models/listings/ad.js';
import Message from '../models/communication/message.js';

const checkAndPopulateDatabase = async () => {
  try {
    console.log('🔍 Sprawdzanie zawartości bazy danych...\n');

    // Połącz z bazą danych
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://waldemarkorepetycje:Nelusia321.@mateusz.hkdgv.mongodb.net/MarketplaceDB?retryWrites=true&w=majority&appName=Mateusz');
    console.log('✅ Połączono z bazą danych');

    // Sprawdź aktualne liczby
    const userCount = await User.countDocuments();
    const adCount = await Ad.countDocuments();
    const messageCount = await Message.countDocuments();

    console.log('\n📊 Aktualne dane w bazie:');
    console.log(`- Użytkownicy: ${userCount}`);
    console.log(`- Ogłoszenia: ${adCount}`);
    console.log(`- Wiadomości: ${messageCount}`);

    // Jeśli baza jest pusta, dodaj testowe dane
    if (userCount === 0 && adCount === 0 && messageCount === 0) {
      console.log('\n🔧 Baza danych jest pusta. Dodawanie testowych danych...');
      
      // Dodaj testowych użytkowników
      const testUsers = [];
      for (let i = 1; i <= 5; i++) {
        const user = new User({
          name: `Testowy${i}`,
          lastName: `Użytkownik${i}`,
          email: `test${i}@example.com`,
          phoneNumber: `+48${500000000 + i}`,
          password: 'TestPassword123!',
          dob: new Date('1990-01-01'),
          termsAccepted: true,
          dataProcessingAccepted: true,
          isVerified: true,
          registrationStep: 'completed',
          lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Ostatnie 30 dni
        });
        await user.save();
        testUsers.push(user);
        console.log(`✅ Dodano użytkownika: ${user.name} ${user.lastName}`);
      }

      // Dodaj testowe ogłoszenia
      const testAds = [];
      for (let i = 1; i <= 10; i++) {
        const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
        const ad = new Ad({
          headline: `Testowe ogłoszenie ${i}`,
          brand: ['BMW', 'Audi', 'Mercedes', 'Volkswagen', 'Toyota'][Math.floor(Math.random() * 5)],
          model: `Model${i}`,
          year: 2015 + Math.floor(Math.random() * 8),
          price: 50000 + Math.random() * 100000,
          mileage: Math.floor(Math.random() * 200000),
          fuelType: ['petrol', 'diesel', 'electric', 'hybrid'][Math.floor(Math.random() * 4)],
          transmission: ['manual', 'automatic'][Math.floor(Math.random() * 2)],
          bodyType: ['sedan', 'hatchback', 'suv', 'coupe'][Math.floor(Math.random() * 4)],
          description: `Opis testowego ogłoszenia ${i}`,
          owner: randomUser._id,
          status: ['active', 'pending', 'sold', 'expired'][Math.floor(Math.random() * 4)],
          createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Ostatnie 60 dni
          views: Math.floor(Math.random() * 1000),
          favorites: Math.floor(Math.random() * 50)
        });
        await ad.save();
        testAds.push(ad);
        console.log(`✅ Dodano ogłoszenie: ${ad.headline}`);
      }

      // Dodaj testowe wiadomości
      for (let i = 1; i <= 15; i++) {
        const sender = testUsers[Math.floor(Math.random() * testUsers.length)];
        let recipient;
        do {
          recipient = testUsers[Math.floor(Math.random() * testUsers.length)];
        } while (recipient._id.equals(sender._id));

        const message = new Message({
          sender: sender._id,
          recipient: recipient._id,
          subject: `Testowa wiadomość ${i}`,
          content: `Treść testowej wiadomości ${i}. Lorem ipsum dolor sit amet.`,
          read: Math.random() > 0.3, // 70% wiadomości przeczytanych
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Ostatnie 30 dni
          relatedAd: Math.random() > 0.5 ? testAds[Math.floor(Math.random() * testAds.length)]._id : null
        });
        await message.save();
        console.log(`✅ Dodano wiadomość: ${message.subject}`);
      }

      console.log('\n🎉 Testowe dane zostały dodane!');
    } else {
      console.log('\n✅ Baza danych zawiera już dane.');
    }

    // Sprawdź ponownie liczby
    const finalUserCount = await User.countDocuments();
    const finalAdCount = await Ad.countDocuments();
    const finalMessageCount = await Message.countDocuments();

    console.log('\n📊 Finalne dane w bazie:');
    console.log(`- Użytkownicy: ${finalUserCount}`);
    console.log(`- Ogłoszenia: ${finalAdCount}`);
    console.log(`- Wiadomości: ${finalMessageCount}`);

    // Test dashboard API
    console.log('\n🧪 Testowanie dashboard API...');
    
    const dashboardData = {
      totalUsers: finalUserCount,
      totalListings: finalAdCount,
      totalMessages: finalMessageCount,
      activeUsers: await User.countDocuments({ 
        lastActivity: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      }),
      activeListings: await Ad.countDocuments({ status: 'active' }),
      pendingListings: await Ad.countDocuments({ status: 'pending' }),
      unreadMessages: await Message.countDocuments({ read: false })
    };

    console.log('Dashboard data:', JSON.stringify(dashboardData, null, 2));

  } catch (error) {
    console.error('❌ Błąd:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Rozłączono z bazą danych');
  }
};

checkAndPopulateDatabase();
