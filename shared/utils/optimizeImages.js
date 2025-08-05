import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Katalog z obrazami
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
// Katalog na zoptymalizowane obrazy
const OPTIMIZED_DIR = path.join(process.cwd(), 'uploads/optimized');

// Upewnij się, że katalog na zoptymalizowane obrazy istnieje
if (!fs.existsSync(OPTIMIZED_DIR)) {
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });
}

// Konfiguracja optymalizacji
const config = {
  formats: ['avif', 'webp'], // Formaty do których konwertujemy
  quality: 60, // Jakość obrazu (1-100)
  sizes: [
    { width: 1920, height: null, suffix: 'large' },
    { width: 1280, height: null, suffix: 'medium' },
    { width: 640, height: null, suffix: 'small' },
    { width: 320, height: null, suffix: 'thumbnail' }
  ]
};

/**
 * Optymalizuje pojedynczy obraz
 * @param {string} filePath - Ścieżka do pliku
 * @returns {Promise<Object>} - Informacje o zoptymalizowanym obrazie
 */
async function optimizeImage(filePath) {
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;
  
  console.log(`Optymalizacja obrazu: ${fileName}`);
  
  const results = [];
  
  try {
    // Wczytaj obraz
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Dla każdego rozmiaru
    for (const size of config.sizes) {
      // Dla każdego formatu
      for (const format of config.formats) {
        const outputFileName = `${fileNameWithoutExt}-${size.suffix}.${format}`;
        const outputPath = path.join(OPTIMIZED_DIR, outputFileName);
        
        // Zmień rozmiar i format
        let resizedImage = image.clone().resize({
          width: size.width,
          height: size.height,
          fit: 'inside',
          withoutEnlargement: true
        });
        
        // Ustaw format i jakość
        switch (format) {
          case 'avif':
            resizedImage = resizedImage.avif({ quality: config.quality });
            break;
          case 'webp':
            resizedImage = resizedImage.webp({ quality: config.quality });
            break;
          case 'jpeg':
          case 'jpg':
            resizedImage = resizedImage.jpeg({ quality: config.quality });
            break;
          case 'png':
            resizedImage = resizedImage.png({ quality: config.quality });
            break;
        }
        
        // Zapisz zoptymalizowany obraz
        await resizedImage.toFile(outputPath);
        
        // Pobierz rozmiar zoptymalizowanego obrazu
        const optimizedStats = fs.statSync(outputPath);
        const optimizedSize = optimizedStats.size;
        
        // Oblicz oszczędność
        const savings = originalSize - optimizedSize;
        const savingsPercent = (savings / originalSize) * 100;
        
        results.push({
          original: fileName,
          optimized: outputFileName,
          originalSize,
          optimizedSize,
          savings,
          savingsPercent: savingsPercent.toFixed(2)
        });
        
        console.log(`  - ${outputFileName}: ${(optimizedSize / 1024).toFixed(2)} KB (oszczędność: ${savingsPercent.toFixed(2)}%)`);
      }
    }
    
    return {
      fileName,
      results
    };
  } catch (error) {
    console.error(`Błąd podczas optymalizacji obrazu ${fileName}:`, error);
    return {
      fileName,
      error: error.message
    };
  }
}

/**
 * Optymalizuje wszystkie obrazy w katalogu
 * @returns {Promise<Array>} - Wyniki optymalizacji
 */
async function optimizeAllImages() {
  // Pobierz listę plików
  const files = fs.readdirSync(UPLOADS_DIR);
  
  // Filtruj tylko obrazy
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext) && !file.includes('optimized');
  });
  
  console.log(`Znaleziono ${imageFiles.length} obrazów do optymalizacji`);
  
  // Optymalizuj każdy obraz
  const results = [];
  
  for (const file of imageFiles) {
    const filePath = path.join(UPLOADS_DIR, file);
    const result = await optimizeImage(filePath);
    results.push(result);
  }
  
  // Podsumowanie
  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  
  console.log('\nPodsumowanie:');
  console.log(`- Zoptymalizowano: ${successCount} obrazów`);
  console.log(`- Błędy: ${errorCount} obrazów`);
  
  // Oblicz całkowitą oszczędność
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  results.forEach(result => {
    if (result.results) {
      result.results.forEach(r => {
        totalOriginalSize += r.originalSize;
        totalOptimizedSize += r.optimizedSize;
      });
    }
  });
  
  const totalSavings = totalOriginalSize - totalOptimizedSize;
  const totalSavingsPercent = (totalSavings / totalOriginalSize) * 100;
  
  console.log(`- Całkowita oszczędność: ${(totalSavings / 1024 / 1024).toFixed(2)} MB (${totalSavingsPercent.toFixed(2)}%)`);
  
  return results;
}

// Uruchom optymalizację
optimizeAllImages()
  .then(() => {
    console.log('Optymalizacja zakończona');
  })
  .catch(error => {
    console.error('Błąd podczas optymalizacji:', error);
  });
