import mongoose from 'mongoose';
import Ad from './models/ad.js';

mongoose.connect('mongodb://localhost:27017/marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.once('open', async () => {
  try {
    const count = await Ad.countDocuments();
    console.log('Całkowita liczba ogłoszeń w bazie:', count);
    
    const activeCount = await Ad.countDocuments({
      status: { $in: ['active', 'opublikowane', 'pending'] }
    });
    console.log('Liczba aktywnych ogłoszeń:', activeCount);
    
    const statusCounts = await Ad.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Rozkład statusów:', statusCounts);
    
    if (count > 0) {
      const sample = await Ad.findOne().select('brand model status headline price');
      console.log('Przykładowe ogłoszenie:', sample);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Błąd:', err);
    process.exit(1);
  }
});
