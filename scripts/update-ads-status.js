import mongoose from 'mongoose';
import Ad from '../models/listings/ad.js';
import User from '../models/user/user.js';

mongoose.connect('mongodb://localhost:27017/marketplace').then(async () => {
  console.log('Połączono z bazą danych');
  
  try {
    // 1. Sprawdź obecny stan
    console.log('=== OBECNY STAN BAZY DANYCH ===');
    const allAds = await Ad.find({}).populate('owner', 'name email role');
    console.log(`Łączna liczba ogłoszeń: ${allAds.length}`);
    
    const statusCounts = await Ad.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('Statusy przed aktualizacją:');
    statusCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    
    // 2. Aktualizuj ogłoszenia ze statusem "opublikowane" na "active"
    console.log('\n=== AKTUALIZACJA STATUSÓW ===');
    const updateResult = await Ad.updateMany(
      { status: 'opublikowane' },
      { $set: { status: 'active' } }
    );
    
    console.log(`Zaktualizowano ${updateResult.modifiedCount} ogłoszeń ze statusu "opublikowane" na "active"`);
    
    // 2b. Aktualizuj również status "sold" na "completed" (jeśli istnieją)
    const soldUpdateResult = await Ad.updateMany(
      { status: 'sold' },
      { $set: { status: 'completed' } }
    );
    
    console.log(`Zaktualizowano ${soldUpdateResult.modifiedCount} ogłoszeń ze statusu "sold" na "completed"`);
    
    // 3. Ustaw odpowiednie statusy na podstawie roli właściciela
    console.log('\n=== USTAWIANIE STATUSÓW NA PODSTAWIE ROLI WŁAŚCICIELA ===');
    
    const adsWithOwners = await Ad.find({}).populate('owner', 'role');
    
    for (const ad of adsWithOwners) {
      if (ad.owner && (ad.owner.role === 'admin' || ad.owner.role === 'moderator')) {
        // Admin/Moderator - status active, bez terminu ważności
        if (ad.status !== 'active' || ad.expiresAt !== null) {
          await Ad.updateOne(
            { _id: ad._id },
            { 
              $set: { status: 'active' },
              $unset: { expiresAt: 1 }
            }
          );
          console.log(`Zaktualizowano ogłoszenie admina/moderatora: ${ad.brand} ${ad.model}`);
        }
      } else if (ad.owner && ad.owner.role === 'user') {
        // Zwykły użytkownik - jeśli ma status "active" ale nie ma expiresAt, ustaw termin ważności
        if (ad.status === 'active' && !ad.expiresAt) {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 30);
          
          await Ad.updateOne(
            { _id: ad._id },
            { $set: { expiresAt: expirationDate } }
          );
          console.log(`Ustawiono termin ważności dla ogłoszenia użytkownika: ${ad.brand} ${ad.model}`);
        }
      }
    }
    
    // 4. Sprawdź stan po aktualizacji
    console.log('\n=== STAN PO AKTUALIZACJI ===');
    const finalStatusCounts = await Ad.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('Statusy po aktualizacji:');
    finalStatusCounts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    
    // 5. Sprawdź ile ogłoszeń ma termin ważności
    const adsWithExpiration = await Ad.countDocuments({ expiresAt: { $ne: null } });
    const adsWithoutExpiration = await Ad.countDocuments({ expiresAt: null });
    
    console.log(`\nOgłoszenia z terminem ważności: ${adsWithExpiration}`);
    console.log(`Ogłoszenia bez terminu ważności: ${adsWithoutExpiration}`);
    
    console.log('\n✅ Aktualizacja zakończona pomyślnie!');
    
  } catch (error) {
    console.error('Błąd podczas aktualizacji:', error);
  } finally {
    mongoose.disconnect();
  }
}).catch(err => {
  console.error('Błąd połączenia z bazą danych:', err);
  process.exit(1);
});
