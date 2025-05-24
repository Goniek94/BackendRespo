import mongoose from 'mongoose';
import { NotificationType } from '../utils/notificationTypes.js';

/**
 * Schema dla modelu powiadomień
 * @type {mongoose.Schema}
 */
const notificationSchema = new mongoose.Schema(
  {
    // Użytkownik, do którego należy powiadomienie
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Dodanie indeksu dla wydajności zapytań
    },
    
    // Treść powiadomienia
    message: {
      type: String,
      required: true,
    },
    
    // Typ powiadomienia (z enum NotificationType)
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.SYSTEM_NOTIFICATION,
      index: true // Dodanie indeksu dla wydajności zapytań
    },
    
    // Status przeczytania
    isRead: {
      type: Boolean,
      default: false,
      index: true // Dodanie indeksu dla wydajności zapytań
    },
    
    // Metadane - dodatkowe informacje o powiadomieniu (np. ID ogłoszenia, ID komentarza, itp.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Data wygaśnięcia powiadomienia (opcjonalna)
    expiresAt: {
      type: Date,
      default: function() {
        // Domyślnie powiadomienie wygasa po 30 dniach
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      }
    }
  },
  { 
    timestamps: true, // Automatyczne dodawanie pól createdAt i updatedAt
    
    // Dodanie metod pomocniczych
    methods: {
      /**
       * Sprawdza, czy powiadomienie wygasło
       * @returns {boolean} - Czy powiadomienie wygasło
       */
      isExpired() {
        if (!this.expiresAt) return false;
        return new Date() > this.expiresAt;
      },
      
      /**
       * Konwertuje powiadomienie do formatu JSON dla API
       * @returns {Object} - Obiekt JSON
       */
      toApiResponse() {
        return {
          id: this._id,
          message: this.message,
          type: this.type,
          isRead: this.isRead,
          metadata: this.metadata,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
    }
  }
);

// Indeks TTL (Time-To-Live) dla automatycznego usuwania wygasłych powiadomień
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Metoda statyczna do pobierania nieprzeczytanych powiadomień użytkownika
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

// Metoda statyczna do oznaczania wszystkich powiadomień użytkownika jako przeczytane
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

// Eksport domyślny modelu Notification
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
