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
      // Domyślnie ogłoszenie wygasa po 30 dniach od utworzenia
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  notifiedAboutExpiration: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['w toku', 'opublikowane', 'archiwalne'],
    default: 'w toku'
  }
});

export default metadataSchema;
