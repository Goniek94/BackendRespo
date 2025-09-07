import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Inicjalizacja Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isSupabaseConfigured = true;
    console.log('✅ Supabase storage configured for messages');
  } catch (error) {
    console.warn('⚠️ Supabase configuration failed for messages:', error.message);
  }
} else {
  console.warn('⚠️ Supabase not configured - message image upload will be disabled');
}

/**
 * Upload zdjęć dla wiadomości do Supabase
 * @param {Array} files - Pliki do uploadu
 * @param {string} userId - ID użytkownika
 * @param {string} messageId - ID wiadomości
 * @returns {Array} - Tablica z danymi przesłanych zdjęć
 */
export const uploadMessageImages = async (files, userId, messageId) => {
  if (!isSupabaseConfigured) {
    throw new Error('Upload zdjęć niedostępny - brak konfiguracji Supabase');
  }

  if (!files || files.length === 0) {
    return [];
  }

  const uploadedImages = [];
  const bucketName = 'autosell';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // Walidacja pliku
      if (file.size > 10 * 1024 * 1024) { // 10MB limit dla wiadomości
        throw new Error(`Plik ${file.originalname} jest za duży (max 10MB)`);
      }

      // Sprawdź czy to obraz
      if (!file.mimetype.startsWith('image/')) {
        throw new Error(`Plik ${file.originalname} nie jest obrazem`);
      }

      // Optymalizacja obrazu z Sharp
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Generowanie thumbnail dla szybkiego ładowania
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Pobieranie metadanych
      const metadata = await sharp(file.buffer).metadata();

      // Generowanie unikalnych nazw plików
      const fileId = uuidv4();
      const fileExt = 'jpg'; // Zawsze konwertujemy do JPEG
      const fileName = `messages/${userId}/${messageId}/${fileId}.${fileExt}`;
      const thumbnailName = `messages/${userId}/${messageId}/thumbs/${fileId}_thumb.${fileExt}`;

      // Upload głównego obrazu do Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Błąd uploadu obrazu: ${uploadError.message}`);
      }

      // Upload thumbnail do Supabase Storage
      const { data: thumbnailUploadData, error: thumbnailUploadError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailName, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (thumbnailUploadError) {
        console.warn(`Błąd uploadu thumbnail: ${thumbnailUploadError.message}`);
        // Thumbnail nie jest krytyczny - kontynuuj bez niego
      }

      // Pobieranie publicznych URL-i
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const { data: thumbnailPublicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(thumbnailName);

      uploadedImages.push({
        id: fileId,
        name: file.originalname,
        path: publicUrlData.publicUrl,
        thumbnailPath: thumbnailUploadError ? publicUrlData.publicUrl : thumbnailPublicUrlData.publicUrl,
        size: optimizedBuffer.length,
        mimetype: 'image/jpeg',
        width: metadata.width,
        height: metadata.height,
        storagePath: fileName,
        bucketName: bucketName
      });

      console.log(`✅ Przesłano zdjęcie do wiadomości: ${file.originalname} -> ${fileName}`);

    } catch (fileError) {
      console.error(`❌ Błąd przetwarzania pliku ${file.originalname}:`, fileError);
      throw fileError; // Rzuć błąd dalej, aby zatrzymać proces
    }
  }

  return uploadedImages;
};

/**
 * Usuwanie zdjęć wiadomości z Supabase
 * @param {Array} attachments - Załączniki do usunięcia
 */
export const deleteMessageImages = async (attachments) => {
  if (!isSupabaseConfigured || !attachments || attachments.length === 0) {
    return;
  }

  for (const attachment of attachments) {
    try {
      if (attachment.storagePath) {
        // Usuń główny obraz
        const { error: deleteError } = await supabase.storage
          .from(attachment.bucketName || 'autosell')
          .remove([attachment.storagePath]);

        if (deleteError) {
          console.warn(`Błąd usuwania obrazu ${attachment.storagePath}:`, deleteError.message);
        }

        // Usuń thumbnail jeśli istnieje
        const thumbnailPath = attachment.storagePath.replace(/\/([^/]+)$/, '/thumbs/$1').replace(/\.([^.]+)$/, '_thumb.$1');
        const { error: thumbnailDeleteError } = await supabase.storage
          .from(attachment.bucketName || 'autosell')
          .remove([thumbnailPath]);

        if (thumbnailDeleteError) {
          console.warn(`Błąd usuwania thumbnail ${thumbnailPath}:`, thumbnailDeleteError.message);
        }

        console.log(`✅ Usunięto zdjęcie wiadomości: ${attachment.storagePath}`);
      }
    } catch (error) {
      console.error(`❌ Błąd usuwania załącznika:`, error);
    }
  }
};

/**
 * Sprawdzenie czy Supabase jest skonfigurowany
 */
export const isImageUploadAvailable = () => {
  return isSupabaseConfigured;
};

/**
 * Walidacja plików przed uploadem
 * @param {Array} files - Pliki do walidacji
 * @returns {Object} - Wynik walidacji
 */
export const validateMessageFiles = (files) => {
  const errors = [];
  const validFiles = [];

  if (!files || files.length === 0) {
    return { valid: true, files: [], errors: [] };
  }

  // Maksymalnie 5 zdjęć na wiadomość
  if (files.length > 5) {
    errors.push('Maksymalnie 5 zdjęć na wiadomość');
    return { valid: false, files: [], errors };
  }

  for (const file of files) {
    // Sprawdź rozmiar (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`Plik ${file.originalname} jest za duży (max 10MB)`);
      continue;
    }

    // Sprawdź typ pliku
    if (!file.mimetype.startsWith('image/')) {
      errors.push(`Plik ${file.originalname} nie jest obrazem`);
      continue;
    }

    // Sprawdź obsługiwane formaty
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedFormats.includes(file.mimetype.toLowerCase())) {
      errors.push(`Nieobsługiwany format pliku: ${file.originalname}`);
      continue;
    }

    validFiles.push(file);
  }

  return {
    valid: errors.length === 0,
    files: validFiles,
    errors
  };
};

export default {
  uploadMessageImages,
  deleteMessageImages,
  isImageUploadAvailable,
  validateMessageFiles
};
