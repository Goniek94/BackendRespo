import mongoose from 'mongoose';
import Ad from './models/ad.js';

mongoose.connect('mongodb://localhost:27017/marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Połączono z bazą danych');
  
  const allAds = await Ad.find({}, 'status brand model headline createdAt').sort({ createdAt: -1 });
  console.log('Wszystkie ogłoszenia w bazie:');
  allAds.forEach((ad, index) => {
    console.log(`${index + 1}. Status: ${ad.status} | ${ad.brand} ${ad.model} | ${ad.headline || 'Brak nagłówka'} | ${ad.createdAt}`);
  });
  
  const statusCounts = await Ad.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  console.log('\nPodsumowanie statusów:');
  statusCounts.forEach(item => {
    console.log(`${item._id}: ${item.count}`);
  });
  
  console.log(`\nŁączna liczba ogłoszeń: ${allAds.length}`);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Błąd:', err);
  process.exit(1);
});
