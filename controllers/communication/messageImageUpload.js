/**
 * Message Image Upload Controller
 * UPDATED: Now uses unified Supabase Storage service
 */

import {
  uploadMessageImages as uploadToSupabase,
  deleteMessageImages as deleteFromSupabase,
  isStorageAvailable,
  validateFiles,
} from "../../services/storage/supabase.js";

/**
 * Upload zdjęć dla wiadomości do Supabase
 * Uses unified Supabase Storage service
 */
export const uploadMessageImages = async (files, userId, messageId) => {
  return await uploadToSupabase(files, userId, messageId);
};

/**
 * Usuwanie zdjęć wiadomości z Supabase
 * Uses unified Supabase Storage service
 */
export const deleteMessageImages = async (attachments) => {
  return await deleteFromSupabase(attachments);
};

/**
 * Sprawdzenie czy Supabase jest skonfigurowany
 */
export const isImageUploadAvailable = () => {
  return isStorageAvailable();
};

/**
 * Walidacja plików przed uploadem
 * Uses unified Supabase Storage service
 */
export const validateMessageFiles = (files) => {
  return validateFiles(files, {
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB for messages
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  });
};

export default {
  uploadMessageImages,
  deleteMessageImages,
  isImageUploadAvailable,
  validateMessageFiles,
};
