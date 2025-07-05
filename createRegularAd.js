// Skrypt do utworzenia przykładowego standardowego ogłoszenia w kolekcji 'ads'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function createRegularAd() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const ad = new Ad({
    brand: 'Toyota',
    model: 'Corolla',
    generation: 'XII',
    version: '1.8 Hybrid',
    year: 2020,
    price: 85000,
    mileage: 45000,
    fuelType: 'hybryda',
    transmission: 'automatyczna',
    vin: '',
    registrationNumber: 'WZ12345',
    headline: 'Toyota Corolla 1.8 Hybrid, 2020, niski przebieg',
    description: 'Sprzedam Toyotę Corollę z 2020 roku, wersja hybrydowa 1.8, niski przebieg, pierwszy właściciel, serwisowana w ASO.',
    images: [
      '/uploads/toyota1.jpg',
      '/uploads/toyota2.jpg'
    ],
    mainImageIndex: 0,
    purchaseOptions: 'umowa kupna-sprzedaży',
    listingType: 'standardowe',
    status: 'opublikowane',
    condition: 'Używany',
    tuning: 'Nie',
    imported: 'Nie',
    registeredInPL: 'Tak',
    firstOwner: 'Tak',
    disabledAdapted: 'Nie',
    bodyType: 'Sedan',
    color: 'Czerwony',
    lastOfficialMileage: 45000,
    power: 122,
    engineSize: 1800,
    drive: 'Na przednie koła',
    doors: 5,
    weight: 1400,
    voivodeship: 'mazowieckie',
    city: 'Warszawa',
    rentalPrice: undefined,
    owner: new mongoose.Types.ObjectId(),
    ownerName: 'Jan',
    ownerLastName: 'Kowalski',
    ownerEmail: 'jan.kowalski@example.com',
    ownerPhone: '987654321'
  });

  await ad.save();
  console.log('Dodano przykładowe standardowe ogłoszenie:', ad._id);

  await mongoose.disconnect();
}

createRegularAd().catch(err => {
  console.error('Błąd podczas dodawania ogłoszenia:', err);
  process.exit(1);
});
