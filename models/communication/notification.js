import mongoose from "mongoose";
import { NotificationType } from "../../utils/notificationTypes.js";

/**
 * Schema dla modelu powiadomień
 * @type {mongoose.Schema}
 */
const notificationSchema = new mongoose.Schema(
  {
    // Użytkownik, do którego należy powiadomienie (userId)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Dodanie indeksu dla wydajności zapytań
    },

    // Zachowujemy też pole user dla kompatybilności wstecznej
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Typ powiadomienia (enum) - zgodny z wymaganiami
    type: {
      type: String,
      enum: [
        "listing_added",
        "listing_expiring",
        "listing_liked",
        "new_message",
        "system_notification",
        "listing_expired",
        "listing_status_changed",
        "new_comment",
        "payment_completed",
        "payment_failed",
        "payment_refunded",
        "account_activity",
      ],
      default: "system_notification",
      index: true, // Dodanie indeksu dla wydajności zapytań
    },

    // Tytuł powiadomienia
    title: {
      type: String,
      required: true,
    },

    // Treść powiadomienia
    message: {
      type: String,
      required: true,
    },

    // Link do przekierowania (opcjonalny)
    link: {
      type: String,
      default: null,
    },

    // Status przeczytania
    isRead: {
      type: Boolean,
      default: false,
      index: true, // Dodanie indeksu dla wydajności zapytań
    },

    // ID ogłoszenia (jeśli powiadomienie dotyczy ogłoszenia)
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ad",
      default: null,
    },

    // Metadane - dodatkowe informacje o powiadomieniu (np. ID komentarza, itp.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Data wygaśnięcia powiadomienia (opcjonalna)
    expiresAt: {
      type: Date,
      default: function () {
        // Domyślnie powiadomienie wygasa po 30 dniach
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
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
          title: this.title,
          message: this.message,
          type: this.type,
          isRead: this.isRead,
          link: this.link,
          adId: this.adId,
          metadata: this.metadata,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
        };
      },
    },
  }
);

// Indeks TTL (Time-To-Live) dla automatycznego usuwania wygasłych powiadomień
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Metoda statyczna do pobierania nieprzeczytanych powiadomień użytkownika
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

// Metoda statyczna do oznaczania wszystkich powiadomień użytkownika jako przeczytane
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

// Eksport domyślny modelu Notification
const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
export default Notification;
