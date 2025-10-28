import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase client with SERVICE_ROLE_KEY for storage operations
const supabaseUrl =
  process.env.SUPABASE_URL || "https://zcxakmniknrtvtnyetxd.supabase.co";

// Use ANON_KEY - same as image uploads (WORKS!)
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjeGFrbW5pa25ydHZ0bnlldHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzEzNzgsImV4cCI6MjA2NzA0NzM3OH0.b7YK5XZMHsS4s3RHGw3rvcmdlV_kjHbxXVF9jB8UO4w";

// Use ANON_KEY for storage (same as image uploads - consistent!)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias for backwards compatibility
const supabaseAdmin = supabase;

/**
 * Upload image to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} bucketName - Supabase bucket name (default: 'autosell')
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Optional subfolder within the bucket (e.g., 'comments')
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadToSupabase(
  fileBuffer,
  fileName,
  bucketName = "autosell",
  mimeType = "image/jpeg",
  folder = null
) {
  try {
    // Kompresuj i zmniejsz zdjęcie do max 800px szerokości
    const compressedBuffer = await sharp(fileBuffer)
      .resize(800, null, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate unique file name with timestamp
    const timestamp = Date.now();
    let uniqueFileName = `${timestamp}-${fileName}`;

    // Add folder prefix if specified
    if (folder) {
      uniqueFileName = `${folder}/${uniqueFileName}`;
    }

    // Upload to Supabase Storage using anon client (same as image uploads)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, compressedBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(uniqueFileName);

    console.log("✅ Successfully uploaded to Supabase:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error in uploadToSupabase:", error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} imageUrl - Public URL of the image
 * @param {string} bucketName - Supabase bucket name
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteFromSupabase(imageUrl, bucketName = "comments") {
  try {
    // Extract file name from URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error("Supabase delete error:", error);
      return false;
    }

    console.log("✅ Successfully deleted from Supabase:", fileName);
    return true;
  } catch (error) {
    console.error("Error in deleteFromSupabase:", error);
    return false;
  }
}

export default {
  uploadToSupabase,
  deleteFromSupabase,
  supabase,
};
