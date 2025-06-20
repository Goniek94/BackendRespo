import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Załadowanie zmiennych środowiskowych
dotenv.config();

// Konfiguracja Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
  secure: true
});

/**
 * Przesyła plik do Cloudinary
 * @param {string} filePath - Ścieżka do pliku
 * @param {Object} options - Opcje przesyłania
 * @returns {Promise<Object>} - Obiekt z informacjami o przesłanym pliku
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    // Uproszczone opcje bez transformacji
    const defaultOptions = {
      folder: 'marketplace/ads',
      resource_type: 'image'
    };

    // Połączenie domyślnych opcji z przekazanymi
    const uploadOptions = { ...defaultOptions, ...options };

    console.log('Próba przesłania pliku do Cloudinary z opcjami:', uploadOptions);
    
    // Przesłanie pliku do Cloudinary
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    console.log(`✅ Plik przesłany do Cloudinary: ${result.public_id}`);
    return result;
  } catch (error) {
    console.error(`❌ Błąd podczas przesyłania pliku do Cloudinary:`, error);
    throw error;
  }
};

/**
 * Usuwa plik z Cloudinary
 * @param {string} publicId - Publiczne ID pliku
 * @returns {Promise<Object>} - Obiekt z informacjami o usuniętym pliku
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Plik usunięty z Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error(`❌ Błąd podczas usuwania pliku z Cloudinary:`, error);
    throw error;
  }
};

/**
 * Generuje URL do pliku w Cloudinary
 * @param {string} publicId - Publiczne ID pliku
 * @param {Object} options - Opcje transformacji
 * @returns {string} - URL do pliku
 */
export const getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) return null;
  
  // Domyślne opcje
  const defaultOptions = {
    secure: true,
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto:good' }
    ]
  };

  // Połączenie domyślnych opcji z przekazanymi
  const urlOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, urlOptions);
};

export default cloudinary;
