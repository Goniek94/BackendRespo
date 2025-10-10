import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Inicjalizacja Supabase - tylko jeśli skonfigurowane
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isSupabaseConfigured = true;
    console.log("✅ Supabase storage configured");
  } catch (error) {
    console.warn("⚠️ Supabase configuration failed:", error.message);
  }
} else {
  console.warn("⚠️ Supabase not configured - image upload will be disabled");
}

// Magic bytes signatures for image validation (SECURITY)
const IMAGE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/jpg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

/**
 * Validate image file by checking magic bytes (SECURITY CRITICAL)
 * Prevents malicious file uploads disguised as images
 */
function validateImageFile(file) {
  // 1. Check file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error(`Plik ${file.originalname} jest za duży (max 10MB)`);
  }

  // 2. Check if mimetype is allowed
  const signature = IMAGE_SIGNATURES[file.mimetype];
  if (!signature) {
    throw new Error(`Nieobsługiwany typ pliku: ${file.mimetype}`);
  }

  // 3. CRITICAL: Check actual file bytes (magic bytes)
  // This prevents malicious files disguised as images
  const header = file.buffer.slice(0, signature.length);
  const isValid = signature.every((byte, i) => header[i] === byte);

  if (!isValid) {
    throw new Error(
      `Plik ${file.originalname} nie jest prawdziwym obrazem! Wykryto próbę uploadu złośliwego pliku.`
    );
  }

  return true;
}

// Model dla car_images (symulacja - w rzeczywistości używamy Supabase)
class CarImageModel {
  static async create(imageData) {
    const { data, error } = await supabase
      .from("car_images")
      .insert([imageData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByCarId(carId) {
    const { data, error } = await supabase
      .from("car_images")
      .select("*")
      .eq("car_id", carId)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from("car_images")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from("car_images")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase.from("car_images").delete().eq("id", id);

    if (error) throw error;
    return true;
  }

  static async setMainImage(carId, imageId) {
    // Najpierw usuń is_main z wszystkich zdjęć tego samochodu
    await supabase
      .from("car_images")
      .update({ is_main: false })
      .eq("car_id", carId);

    // Następnie ustaw nowe główne zdjęcie
    const { data, error } = await supabase
      .from("car_images")
      .update({ is_main: true })
      .eq("id", imageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Upload zdjęć z automatyczną optymalizacją
 */
const uploadImages = async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        success: false,
        message: "Upload zdjęć niedostępny - brak konfiguracji Supabase",
      });
    }

    const { carId, mainImageIndex = 0 } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nie przesłano żadnych plików",
      });
    }

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: "Brak ID samochodu",
      });
    }

    const uploadedImages = [];
    const bucketName = "autosell";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // SECURITY: Validate image file with magic bytes check
        validateImageFile(file);

        // Optymalizacja obrazu z Sharp
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1920, null, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        // Generowanie thumbnail
        const thumbnailBuffer = await sharp(file.buffer)
          .resize(300, 300, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        // Pobieranie metadanych
        const metadata = await sharp(file.buffer).metadata();

        // Generowanie unikalnych nazw plików
        const fileId = uuidv4();
        const fileExt = "jpg"; // Zawsze konwertujemy do JPEG
        const fileName = `${carId}/${fileId}.${fileExt}`;
        const thumbnailName = `${carId}/thumbs/${fileId}_thumb.${fileExt}`;

        // Upload głównego obrazu do Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, optimizedBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Błąd uploadu głównego obrazu: ${uploadError.message}`
          );
        }

        // Upload thumbnail do Supabase Storage
        const { data: thumbnailUploadData, error: thumbnailUploadError } =
          await supabase.storage
            .from(bucketName)
            .upload(thumbnailName, thumbnailBuffer, {
              contentType: "image/jpeg",
              cacheControl: "3600",
              upsert: false,
            });

        if (thumbnailUploadError) {
          // Thumbnail nie jest krytyczny - kontynuuj bez niego
        }

        // Pobieranie publicznych URL-i
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        const { data: thumbnailPublicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(thumbnailName);

        // Zapisanie metadanych do bazy danych
        const imageRecord = await CarImageModel.create({
          car_id: carId,
          url: publicUrlData.publicUrl,
          thumbnail_url: thumbnailPublicUrlData.publicUrl,
          is_main: i === parseInt(mainImageIndex),
          file_size: optimizedBuffer.length,
          width: metadata.width,
          height: metadata.height,
          original_name: file.originalname,
          file_type: "image/jpeg",
          storage_path: fileName,
          bucket_name: bucketName,
        });

        uploadedImages.push({
          id: imageRecord.id,
          url: publicUrlData.publicUrl,
          thumbnailUrl: thumbnailPublicUrlData.publicUrl,
          isMain: i === parseInt(mainImageIndex),
          metadata: {
            originalName: file.originalname,
            fileSize: optimizedBuffer.length,
            width: metadata.width,
            height: metadata.height,
          },
        });
      } catch (fileError) {
        console.error(
          `Błąd przetwarzania pliku ${file.originalname}:`,
          fileError
        );
        // Kontynuuj z pozostałymi plikami
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nie udało się przesłać żadnego zdjęcia",
      });
    }

    res.json({
      success: true,
      message: `Przesłano ${uploadedImages.length} zdjęć`,
      data: uploadedImages,
    });
  } catch (error) {
    console.error("Błąd uploadu zdjęć:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas uploadu zdjęć",
      error: error.message,
    });
  }
};

/**
 * Pobieranie zdjęć dla konkretnego samochodu
 */
const getImagesByCarId = async (req, res) => {
  try {
    const { carId } = req.params;

    const images = await CarImageModel.findByCarId(carId);

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error("Błąd pobierania zdjęć:", error);
    res.status(500).json({
      success: false,
      message: "Błąd pobierania zdjęć",
      error: error.message,
    });
  }
};

/**
 * Usuwanie pojedynczego zdjęcia
 */
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Pobierz informacje o zdjęciu
    const image = await CarImageModel.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Zdjęcie nie zostało znalezione",
      });
    }

    // Usuń plik z Supabase Storage
    if (image.storage_path) {
      const { error: deleteError } = await supabase.storage
        .from(image.bucket_name)
        .remove([image.storage_path]);

      if (deleteError) {
        // Błąd usuwania pliku - nie krytyczny
      }
    }

    // Usuń thumbnail jeśli istnieje
    if (image.storage_path) {
      const thumbnailPath = image.storage_path
        .replace(/\/([^/]+)$/, "/thumbs/$1")
        .replace(/\.([^.]+)$/, "_thumb.$1");
      const { error: thumbnailDeleteError } = await supabase.storage
        .from(image.bucket_name)
        .remove([thumbnailPath]);

      if (thumbnailDeleteError) {
        // Błąd usuwania thumbnail - nie krytyczny
      }
    }

    // Usuń rekord z bazy danych
    await CarImageModel.delete(id);

    res.json({
      success: true,
      message: "Zdjęcie zostało usunięte",
    });
  } catch (error) {
    console.error("Błąd usuwania zdjęcia:", error);
    res.status(500).json({
      success: false,
      message: "Błąd usuwania zdjęcia",
      error: error.message,
    });
  }
};

/**
 * Ustawianie zdjęcia jako główne
 */
const setMainImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Pobierz informacje o zdjęciu
    const image = await CarImageModel.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Zdjęcie nie zostało znalezione",
      });
    }

    // Ustaw jako główne zdjęcie
    const updatedImage = await CarImageModel.setMainImage(image.car_id, id);

    res.json({
      success: true,
      message: "Zdjęcie zostało ustawione jako główne",
      data: updatedImage,
    });
  } catch (error) {
    console.error("Błąd ustawiania głównego zdjęcia:", error);
    res.status(500).json({
      success: false,
      message: "Błąd ustawiania głównego zdjęcia",
      error: error.message,
    });
  }
};

/**
 * Usuwanie wielu zdjęć na raz
 */
const batchDeleteImages = async (req, res) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Brak ID zdjęć do usunięcia",
      });
    }

    const deletedImages = [];
    const errors = [];

    for (const imageId of imageIds) {
      try {
        const image = await CarImageModel.findById(imageId);

        if (image) {
          // Usuń pliki z storage
          if (image.storage_path) {
            await supabase.storage
              .from(image.bucket_name)
              .remove([image.storage_path]);
          }

          // Usuń rekord z bazy
          await CarImageModel.delete(imageId);
          deletedImages.push(imageId);
        }
      } catch (error) {
        errors.push({ imageId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Usunięto ${deletedImages.length} zdjęć`,
      data: {
        deleted: deletedImages,
        errors: errors,
      },
    });
  } catch (error) {
    console.error("Błąd usuwania zdjęć:", error);
    res.status(500).json({
      success: false,
      message: "Błąd usuwania zdjęć",
      error: error.message,
    });
  }
};

/**
 * Pobieranie metadanych zdjęcia
 */
const getImageMetadata = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await CarImageModel.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Zdjęcie nie zostało znalezione",
      });
    }

    res.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error("Błąd pobierania metadanych:", error);
    res.status(500).json({
      success: false,
      message: "Błąd pobierania metadanych",
      error: error.message,
    });
  }
};

/**
 * Aktualizacja metadanych zdjęcia
 */
const updateImageMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Filtruj dozwolone pola do aktualizacji
    const allowedFields = ["original_name", "is_main"];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Brak danych do aktualizacji",
      });
    }

    const updatedImage = await CarImageModel.update(id, filteredData);

    res.json({
      success: true,
      message: "Metadane zostały zaktualizowane",
      data: updatedImage,
    });
  } catch (error) {
    console.error("Błąd aktualizacji metadanych:", error);
    res.status(500).json({
      success: false,
      message: "Błąd aktualizacji metadanych",
      error: error.message,
    });
  }
};

/**
 * Optymalizacja istniejących zdjęć
 */
const optimizeImages = async (req, res) => {
  try {
    const { carId } = req.body;

    if (!carId) {
      return res.status(400).json({
        success: false,
        message: "Brak ID samochodu",
      });
    }

    const images = await CarImageModel.findByCarId(carId);
    const optimizedCount = 0;

    // TODO: Implementacja optymalizacji istniejących zdjęć
    // Pobierz zdjęcia z storage, zoptymalizuj i zastąp

    res.json({
      success: true,
      message: `Zoptymalizowano ${optimizedCount} zdjęć`,
      data: { optimizedCount },
    });
  } catch (error) {
    console.error("Błąd optymalizacji zdjęć:", error);
    res.status(500).json({
      success: false,
      message: "Błąd optymalizacji zdjęć",
      error: error.message,
    });
  }
};

/**
 * Statystyki zdjęć dla samochodu
 */
const getImageStats = async (req, res) => {
  try {
    const { carId } = req.params;

    const images = await CarImageModel.findByCarId(carId);

    const stats = {
      totalImages: images.length,
      totalSize: images.reduce((sum, img) => sum + (img.file_size || 0), 0),
      hasMainImage: images.some((img) => img.is_main),
      averageSize:
        images.length > 0
          ? Math.round(
              images.reduce((sum, img) => sum + (img.file_size || 0), 0) /
                images.length
            )
          : 0,
      formats: images.reduce((acc, img) => {
        const type = img.file_type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Błąd pobierania statystyk:", error);
    res.status(500).json({
      success: false,
      message: "Błąd pobierania statystyk",
      error: error.message,
    });
  }
};

/**
 * Czyszczenie nieużywanych zdjęć (admin)
 */
const cleanupUnusedImages = async (req, res) => {
  try {
    // TODO: Implementacja czyszczenia nieużywanych zdjęć
    // Znajdź zdjęcia bez powiązanych ogłoszeń i usuń je

    res.json({
      success: true,
      message: "Czyszczenie zakończone",
      data: { deletedCount: 0 },
    });
  } catch (error) {
    console.error("Błąd czyszczenia:", error);
    res.status(500).json({
      success: false,
      message: "Błąd czyszczenia",
      error: error.message,
    });
  }
};

export {
  uploadImages,
  getImagesByCarId,
  deleteImage,
  setMainImage,
  batchDeleteImages,
  getImageMetadata,
  updateImageMetadata,
  optimizeImages,
  getImageStats,
  cleanupUnusedImages,
};
