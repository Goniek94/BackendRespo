// Skrypt do utworzenia przykładowego ogłoszenia w kolekcji 'ads'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function createTestAd() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const ad = new Ad({
    brand: 'Volvo',
    model: 'XC60',
    generation: 'I',
    version: 'D4 AWD',
    year: 2016,
    price: 50000,
    mileage: 176052,
    fuelType: 'diesel',
    transmission: 'automatyczna',
    vin: '',
    registrationNumber: 'WPNRJ56',
    headline: 'Volvo XC60 D4 AWD, 2016, automat, diesel',
    description: 'Dzień dobry, Sprzedam Volvo XC60 z 2016 roku, wersja D4 AWD Ocean Race, automat, diesel, bardzo zadbany.',
    images: [
      '/uploads/volvo1.jpg',
      '/uploads/volvo2.jpg'
    ],
    mainImageIndex: 0,
    purchaseOptions: 'umowa kupna-sprzedaży',
  listingType: 'wyróżnione',
  status: 'active',
    condition: 'Używany',
    tuning: 'Nie',
    imported: 'Nie',
    registeredInPL: 'Tak',
    firstOwner: 'Nie',
    disabledAdapted: 'Nie',
    bodyType: 'Kombi',
    color: 'Biały',
    lastOfficialMileage: 176052,
    power: 140,
    engineSize: 2000,
    drive: '4x4',
    doors: 5,
    weight: 1800,
    voivodeship: 'mazowieckie',
    city: 'Warszawa',
    rentalPrice: undefined,
    owner: new mongoose.Types.ObjectId(),
    ownerName: 'Test',
    ownerLastName: 'User',
    ownerEmail: 'test@example.com',
    ownerPhone: '123456789'
  });

  await ad.save();
  console.log('Dodano przykładowe ogłoszenie:', ad._id);

  await mongoose.disconnect();
}

createTestAd().catch(err => {
  console.error('Błąd podczas dodawania ogłoszenia:', err);
  process.exit(1);
});
