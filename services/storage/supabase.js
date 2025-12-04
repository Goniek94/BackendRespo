/**
 * Unified Supabase Storage Service
 * Handles all image uploads for ads and messages
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const bucketName = "autosell";

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isSupabaseConfigured = true;
    console.log("✅ Supabase Storage unified service configured");
  } catch (error) {
    console.error("❌ Supabase configuration failed:", error.message);
  }
} else {
  console.warn("⚠️ Supabase not configured - image uploads will be disabled");
}

// Magic bytes signatures for image validation (SECURITY)
const IMAGE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/jpg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

/**
 * Validate image magic bytes (SECURITY CRITICAL)
 * Prevents malicious file uploads disguised as images
 */
function validateImageMagicBytes(buffer, mimetype) {
  const signature = IMAGE_SIGNATURES[mimetype];
  if (!signature) return false;

  const header = buffer.slice(0, signature.length);
  return signature.every((byte, i) => header[i] === byte);
}

/**
 * Build Supabase storage path
 * @param {string} type - 'ads' or 'messages'
 * @param {string} id - adId or conversationId
 * @param {string} subType - 'original', 'thumb', or messageId for messages
 * @param {string} filename - generated filename
 * @returns {string} - full storage path
 */
export function buildSupabasePath(type, id, subType, filename) {
  if (type === "ads") {
    // ads/{adId}/original/{timestamp}-{rand}.{ext}
    // ads/{adId}/thumb/{timestamp}-{rand}.webp
    return `ads/${id}/${subType}/${filename}`;
  } else if (type === "messages") {
    // messages/{conversationId}/{messageId}/{timestamp}-{rand}.{ext}
    return `messages/${id}/${subType}/${filename}`;
  }
  throw new Error(`Invalid storage type: ${type}`);
}

/**
 * Upload buffer to Supabase Storage
 * @param {string} path - storage path
 * @param {Buffer} buffer - file buffer
 * @param {string} contentType - MIME type
 * @param {Object} options - additional options (upsert, cacheControl)
 * @returns {Object} - upload result with public URL
 */
export async function uploadBuffer(path, buffer, contentType, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured");
  }

  const { upsert = false, cacheControl = "3600" } = options;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, {
      contentType,
      cacheControl,
      upsert,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data;
}

/**
 * Get public URL for a storage path
 * @param {string} path - storage path
 * @returns {string} - public URL
 */
export function getPublicUrl(path) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured");
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create signed URL with expiration
 * @param {string} path - storage path
 * @param {number} expiresIn - expiration time in seconds (default 1 hour)
 * @returns {string} - signed URL
 */
export async function createSignedUrl(path, expiresIn = 3600) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured");
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete file(s) from Supabase Storage
 * @param {string|string[]} paths - single path or array of paths
 * @returns {Object} - deletion result
 */
export async function deleteFiles(paths) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured");
  }

  const pathsArray = Array.isArray(paths) ? paths : [paths];

  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove(pathsArray);

  if (error) {
    throw new Error(`Deletion failed: ${error.message}`);
  }

  return data;
}

/**
 * Upload ad images to Supabase Storage
 * @param {Array} files - files to upload (with buffer property)
 * @param {string} adId - ad ID
 * @param {Object} options - additional options
 * @returns {Array} - array of uploaded image URLs
 */
export async function uploadAdImages(files, adId, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured - cannot upload images");
  }

  if (!files || files.length === 0) {
    return [];
  }

  const { maxImages = 20, maxSizePerFile = 5 * 1024 * 1024 } = options;

  if (files.length > maxImages) {
    throw new Error(`Maximum ${maxImages} images allowed`);
  }

  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // Validate file size
      if (file.size > maxSizePerFile) {
        throw new Error(
          `File ${file.originalname} is too large (max ${Math.round(
            maxSizePerFile / 1024 / 1024
          )}MB)`
        );
      }

      // Validate file type
      if (!file.mimetype.startsWith("image/")) {
        throw new Error(`File ${file.originalname} is not an image`);
      }

      // Validate magic bytes (SECURITY)
      if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
        throw new Error(
          `${file.originalname}: Invalid image file (security check failed)`
        );
      }

      // Optimize image with Sharp
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Generate thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(400, 300, {
          fit: "cover",
          position: "center",
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Get metadata
      const metadata = await sharp(file.buffer).metadata();

      // Generate unique filenames
      const timestamp = Date.now();
      const randomId = Math.round(Math.random() * 1e9);
      const fileId = `${timestamp}-${randomId}`;
      const originalExt = "jpg"; // Always convert to JPEG for originals
      const thumbExt = "webp"; // Always WebP for thumbnails

      // Build storage paths
      const originalPath = buildSupabasePath(
        "ads",
        adId,
        "original",
        `${fileId}.${originalExt}`
      );
      const thumbPath = buildSupabasePath(
        "ads",
        adId,
        "thumb",
        `${fileId}.${thumbExt}`
      );

      // Upload original
      await uploadBuffer(originalPath, optimizedBuffer, "image/jpeg");

      // Upload thumbnail
      await uploadBuffer(thumbPath, thumbnailBuffer, "image/webp");

      // Get public URLs
      const originalUrl = getPublicUrl(originalPath);
      const thumbUrl = getPublicUrl(thumbPath);

      uploadedImages.push({
        id: fileId,
        originalUrl,
        thumbnailUrl: thumbUrl,
        storagePath: originalPath,
        thumbnailPath: thumbPath,
        size: optimizedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        mimetype: "image/jpeg",
      });

      console.log(
        `✅ Uploaded ad image: ${file.originalname} -> ${originalPath}`
      );
    } catch (fileError) {
      console.error(
        `❌ Error processing file ${file.originalname}:`,
        fileError
      );
      throw fileError;
    }
  }

  return uploadedImages;
}

/**
 * Upload message images to Supabase Storage
 * @param {Array} files - files to upload (with buffer property)
 * @param {string} userId - user ID
 * @param {string} messageId - message ID
 * @returns {Array} - array of uploaded image data
 */
export async function uploadMessageImages(files, userId, messageId) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase Storage not configured - cannot upload images");
  }

  if (!files || files.length === 0) {
    return [];
  }

  const maxFiles = 5;
  const maxSize = 10 * 1024 * 1024; // 10MB for messages

  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} images per message`);
  }

  const uploadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // Validate file size
      if (file.size > maxSize) {
        throw new Error(`File ${file.originalname} is too large (max 10MB)`);
      }

      // Validate file type
      if (!file.mimetype.startsWith("image/")) {
        throw new Error(`File ${file.originalname} is not an image`);
      }

      // Validate magic bytes (SECURITY)
      if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
        throw new Error(
          `${file.originalname}: Invalid image file (security check failed)`
        );
      }

      // Optimize image
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Generate thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Get metadata
      const metadata = await sharp(file.buffer).metadata();

      // Generate filenames
      const fileId = uuidv4();
      const fileExt = "jpg";

      // Build proper paths: messages/{messageId}/{fileId}.jpg
      const fileName = `messages/${messageId}/${fileId}.${fileExt}`;
      const thumbnailName = `messages/${messageId}/thumbs/${fileId}_thumb.${fileExt}`;

      console.log("📁 MESSAGE IMAGE UPLOAD DETAILS:");
      console.log(`   Bucket: ${bucketName}`);
      console.log(`   Original path: ${fileName}`);
      console.log(`   Thumbnail path: ${thumbnailName}`);
      console.log(`   File ID: ${fileId}`);
      console.log(`   Message ID: ${messageId}`);
      console.log(`   User ID: ${userId}`);

      // Upload files
      console.log(`⬆️  Uploading original to: ${bucketName}/${fileName}`);
      await uploadBuffer(fileName, optimizedBuffer, "image/jpeg");
      console.log(`✅ Original uploaded successfully`);

      console.log(`⬆️  Uploading thumbnail to: ${bucketName}/${thumbnailName}`);
      await uploadBuffer(thumbnailName, thumbnailBuffer, "image/jpeg");
      console.log(`✅ Thumbnail uploaded successfully`);

      // Get public URLs
      const publicUrl = getPublicUrl(fileName);
      const thumbnailUrl = getPublicUrl(thumbnailName);

      console.log(`🔗 Public URLs generated:`);
      console.log(`   Original: ${publicUrl}`);
      console.log(`   Thumbnail: ${thumbnailUrl}`);

      uploadedImages.push({
        id: fileId,
        name: file.originalname,
        path: publicUrl,
        thumbnailPath: thumbnailUrl,
        size: optimizedBuffer.length,
        mimetype: "image/jpeg",
        width: metadata.width,
        height: metadata.height,
        storagePath: fileName,
        bucketName: bucketName,
      });

      console.log(
        `✅ Uploaded message image: ${file.originalname} -> ${fileName}`
      );
    } catch (fileError) {
      console.error(
        `❌ Error processing file ${file.originalname}:`,
        fileError
      );
      throw fileError;
    }
  }

  return uploadedImages;
}

/**
 * Delete ad images from Supabase Storage
 * @param {string|string[]} imagePaths - image storage path(s)
 * @returns {Object} - deletion result
 */
export async function deleteAdImages(imagePaths) {
  if (!isSupabaseConfigured) {
    return { success: false, message: "Supabase not configured" };
  }

  const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];
  const allPaths = [];

  // Collect both original and thumbnail paths
  for (const path of paths) {
    allPaths.push(path);

    // Add thumbnail path if this is an original
    if (path.includes("/original/")) {
      const thumbPath = path
        .replace("/original/", "/thumb/")
        .replace(/\.jpg$/, ".webp");
      allPaths.push(thumbPath);
    }
  }

  try {
    await deleteFiles(allPaths);
    console.log(`✅ Deleted ${allPaths.length} file(s) from Supabase`);
    return { success: true, deletedCount: allPaths.length };
  } catch (error) {
    console.error("❌ Error deleting ad images:", error);
    throw error;
  }
}

/**
 * Delete message images from Supabase Storage
 * @param {Array} attachments - attachments to delete (with storagePath property)
 */
export async function deleteMessageImages(attachments) {
  if (!isSupabaseConfigured || !attachments || attachments.length === 0) {
    return;
  }

  const paths = [];

  for (const attachment of attachments) {
    if (attachment.storagePath) {
      paths.push(attachment.storagePath);

      // Add thumbnail path
      const thumbnailPath = attachment.storagePath
        .replace(/\/([^/]+)$/, "/thumbs/$1")
        .replace(/\.([^.]+)$/, "_thumb.$1");
      paths.push(thumbnailPath);
    }
  }

  try {
    await deleteFiles(paths);
    console.log(`✅ Deleted ${paths.length} message file(s) from Supabase`);
  } catch (error) {
    console.error("❌ Error deleting message images:", error);
    // Don't throw - deletion failures shouldn't break message deletion
  }
}

/**
 * Check if Supabase is configured and available
 * @returns {boolean}
 */
export function isStorageAvailable() {
  return isSupabaseConfigured;
}

/**
 * Validate files before upload
 * @param {Array} files - files to validate
 * @param {Object} options - validation options
 * @returns {Object} - validation result
 */
export function validateFiles(files, options = {}) {
  const {
    maxFiles = 20,
    maxFileSize = 5 * 1024 * 1024,
    allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  } = options;

  const errors = [];
  const validFiles = [];

  if (!files || files.length === 0) {
    return { valid: true, files: [], errors: [] };
  }

  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
    return { valid: false, files: [], errors };
  }

  for (const file of files) {
    // Check size
    if (file.size > maxFileSize) {
      errors.push(
        `File ${file.originalname} is too large (max ${Math.round(
          maxFileSize / 1024 / 1024
        )}MB)`
      );
      continue;
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      errors.push(`File ${file.originalname} has unsupported format`);
      continue;
    }

    // Validate magic bytes (SECURITY)
    if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
      errors.push(
        `${file.originalname}: Invalid image file (security check failed)`
      );
      continue;
    }

    validFiles.push(file);
  }

  return {
    valid: errors.length === 0,
    files: validFiles,
    errors,
  };
}

export default {
  uploadBuffer,
  getPublicUrl,
  createSignedUrl,
  deleteFiles,
  uploadAdImages,
  uploadMessageImages,
  deleteAdImages,
  deleteMessageImages,
  buildSupabasePath,
  isStorageAvailable,
  validateFiles,
};
