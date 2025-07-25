import mongoose from 'mongoose';

/**
 * Schemat metadanych ogłoszenia
 */
const metadataSchema = new mongoose.Schema({
  // Metadane
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Sprawdzamy czy dokument jest inicjalizowany i ma pole owner
      if (this.ownerRole === 'admin') {
        // Ogłoszenia administratora nie wygasają
        return null;
      } else {
        // Zwykłe ogłoszenia wygasają po 30 dniach od utworzenia
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      }
    }
  },
  ownerRole: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  notifiedAboutExpiration: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'needs_changes', 'sold', 'archived', 'opublikowane'],
    default: 'pending'
  },
  
  // Pola związane z moderacją / Moderation fields
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  moderationComment: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  requiredChanges: {
    type: String
  },
  
  // Dodatkowe ustawienia ogłoszenia / Additional ad settings
  featured: {
    type: Boolean,
    default: false
  },
  discount: {
    type: Number,
    min: 0,
    max: 99
  },
  discountedPrice: {
    type: Number
  },
  
  // Dodatkowe pola potrzebne dla frontendu
  shortDescription: {
    type: String,
    maxlength: 120
  },
  productionYear: {
    type: Number // Alias dla year - dla kompatybilności z frontendem
  }
});

export default metadataSchema;
