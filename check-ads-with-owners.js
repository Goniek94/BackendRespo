import mongoose from 'mongoose';
import Ad from './models/ad.js';
import User from './models/user.js';

mongoose.connect('mongodb://localhost:27017/marketplace').then(async () => {
  console.log('Połączono z bazą danych');
  
  // Pobierz wszystkie ogłoszenia z danymi właścicieli
  const ads = await Ad.find({})
    .populate('owner', 'name email role')
    .select('status brand model headline createdAt owner ownerRole expiresAt')
    .sort({ createdAt: -1 });
  
  console.log('=== WSZYSTKIE OGŁOSZENIA W BAZIE ===\n');
  
  ads.forEach((ad, index) => {
    const ownerInfo = ad.owner ? 
      `${ad.owner.name} (${ad.owner.email}) - ROLA: ${ad.owner.role}` : 
      `ID: ${ad.owner} - ROLA w AD: ${ad.ownerRole || 'brak'}`;
    
    const expiresInfo = ad.expiresAt ? 
      `Wygasa: ${ad.expiresAt.toLocaleDateString()}` : 
      'Bez terminu ważności';
    
    console.log(`${index + 1}. STATUS: ${ad.status}`);
    console.log(`   ${ad.brand} ${ad.model} - ${ad.headline || 'Brak nagłówka'}`);
    console.log(`   Właściciel: ${ownerInfo}`);
    console.log(`   ${expiresInfo}`);
    console.log(`   Utworzono: ${ad.createdAt.toLocaleDateString()}\n`);
  });
  
  // Podsumowanie statusów
  const statusCounts = await Ad.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  console.log('=== PODSUMOWANIE STATUSÓW ===');
  statusCounts.forEach(item => {
    console.log(`${item._id}: ${item.count}`);
  });
  
  // Podsumowanie ról właścicieli
  const roleCounts = await Ad.aggregate([
    { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerData' } },
    { $unwind: '$ownerData' },
    { $group: { _id: '$ownerData.role', count: { $sum: 1 } } }
  ]);
  
  console.log('\n=== PODSUMOWANIE RÓL WŁAŚCICIELI ===');
  roleCounts.forEach(item => {
    console.log(`${item._id}: ${item.count}`);
  });
  
  console.log(`\nŁączna liczba ogłoszeń: ${ads.length}`);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
