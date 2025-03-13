import express from 'express';
import axios from 'axios';
import auth from '../middleware/auth.js';

const router = express.Router();

// Funkcja pomocnicza do komunikacji z API CEPiK
const fetchVehicleData = async (url, apiKey) => {
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` } // brak klucza api
    });
    return response.data;
  } catch (error) {
    throw new Error('Błąd podczas komunikacji z API CEPiK.');
  }
};

// Trasa do sprawdzania pojazdu na podstawie numeru VIN lub rejestracyjnego
router.post('/checkVehicle', auth, async (req, res, next) => {
  const { vin, registrationNumber } = req.body;

  if (!vin && !registrationNumber) {
    return res.status(400).json({ message: 'Podaj numer VIN lub numer rejestracyjny.' });
  }

  const cepikBaseUrl = 'https://api.cepik.gov.pl/pojazdy';
  const cepikApiKey = process.env.CEPIK_API_KEY;
  let vehicleData;

  try {
    if (vin) {
      // Wyszukiwanie pojazdu po numerze VIN
      vehicleData = await fetchVehicleData(`${cepikBaseUrl}?vin=${vin}`, cepikApiKey);
    } else if (registrationNumber) {
      // Wyszukiwanie pojazdu po numerze rejestracyjnym
      vehicleData = await fetchVehicleData(`${cepikBaseUrl}?numer-rejestracyjny=${registrationNumber}`, cepikApiKey);
    }

    if (!vehicleData || !vehicleData.data || vehicleData.data.length === 0) {
      return res.status(404).json({ message: 'Pojazd nie znaleziony w CEPiK.' });
    }

    res.status(200).json({ vehicle: vehicleData.data.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Eksport domyślny routera
export default router;
