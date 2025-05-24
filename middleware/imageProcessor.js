import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Katalog na tymczasowe pliki
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Upewnij się, że katalog temp istnieje
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generuje unikalny hash na podstawie ścieżki i parametrów
 * @param {string} imagePath - Ścieżka do obrazu
 * @param {Object} params - Parametry przetwarzania
 * @returns {string} - Hash
 */
const generateCacheKey = (imagePath, params) => {
  const data = JSON.stringify({
    path: imagePath,
    params
  });
  
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Middleware do przetwarzania obrazów na żądanie
 * Obsługuje parametry:
 * - w: szerokość obrazu
 * - h: wysokość obrazu
 * - format: format obrazu (webp, jpeg, png)
 * - quality: jakość obrazu (1-100)
 */
const imageProcessor = async (req, res, next) => {
  // Sprawdź, czy żądanie dotyczy obrazu
  const imagePath = req.path;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(imagePath).toLowerCase();
  
  // Jeśli to nie jest obraz lub nie ma parametrów przetwarzania, przejdź dalej
  if (!imageExtensions.includes(ext) || 
      (!req.query.w && !req.query.h && !req.query.format)) {
    return next();
  }
  
  try {
    // Pełna ścieżka do pliku
    const fullPath = path.join(process.cwd(), imagePath.startsWith('/') ? imagePath.substring(1) : imagePath);
    
    // Sprawdź, czy plik istnieje
    if (!fs.existsSync(fullPath)) {
      return next();
    }
    
    // Parametry przetwarzania
    const params = {
      width: req.query.w ? parseInt(req.query.w) : null,
      height: req.query.h ? parseInt(req.query.h) : null,
      format: req.query.format || 'avif', // Domyślnie używaj AVIF dla najlepszej kompresji
      quality: req.query.quality ? parseInt(req.query.quality) : 60 // Niższa jakość dla lepszej kompresji
    };
    
    // Generuj klucz cache
    const cacheKey = generateCacheKey(imagePath, params);
    const cacheFilePath = path.join(TEMP_DIR, `${cacheKey}.${params.format}`);
    
    // Sprawdź, czy plik jest już w cache
    if (fs.existsSync(cacheFilePath)) {
      // Pobierz statystyki pliku
      const stats = fs.statSync(cacheFilePath);
      
      // Ustaw nagłówki
      res.setHeader('Content-Type', `image/${params.format}`);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 rok
      res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
      res.setHeader('X-Cache', 'HIT');
      
      // Wyślij plik z cache
      fs.createReadStream(cacheFilePath).pipe(res);
      return;
    }
    
    // Utwórz instancję sharp
    let image = sharp(fullPath);
    
    // Zmień rozmiar, jeśli podano szerokość lub wysokość
    if (params.width || params.height) {
      image = image.resize(params.width, params.height, {
        fit: 'cover',
        withoutEnlargement: true
      });
    }
    
    // Ustaw format i jakość
    switch (params.format.toLowerCase()) {
      case 'avif':
        image = image.avif({ quality: params.quality });
        res.setHeader('Content-Type', 'image/avif');
        break;
      case 'webp':
        image = image.webp({ quality: params.quality });
        res.setHeader('Content-Type', 'image/webp');
        break;
      case 'jpeg':
      case 'jpg':
        image = image.jpeg({ quality: params.quality });
        res.setHeader('Content-Type', 'image/jpeg');
        break;
      case 'png':
        image = image.png({ quality: params.quality });
        res.setHeader('Content-Type', 'image/png');
        break;
      default:
        // Domyślnie używaj AVIF dla najlepszej kompresji
        image = image.avif({ quality: params.quality });
        res.setHeader('Content-Type', 'image/avif');
    }
    
    // Ustaw nagłówki cache
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 rok
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    res.setHeader('X-Cache', 'MISS');
    
    // Zapisz przetworzony obraz do cache
    await image.toFile(cacheFilePath);
    
    // Wyślij przetworzony obraz
    fs.createReadStream(cacheFilePath).pipe(res);
  } catch (error) {
    console.error('Błąd przetwarzania obrazu:', error);
    next();
  }
};

export default imageProcessor;
