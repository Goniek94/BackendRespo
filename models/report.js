// models/report.js
/**
 * Model zgłoszeń użytkowników
 * User reports model
 */

import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  // Użytkownik zgłaszający / Reporting user
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Typ zgłaszanego elementu / Type of reported item
  reportType: {
    type: String,
    enum: ['ad', 'user', 'comment'],
    required: true
  },
  
  // ID zgłaszanego elementu / ID of reported item
  reportedItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reportType'
  },
  
  // Powód zgłoszenia / Reason for report
  reason: {
    type: String,
    enum: [
      'spam', // Spam / Spam
      'offensive', // Obraźliwe treści / Offensive content
      'inappropriate', // Nieodpowiednie treści / Inappropriate content
      'fake', // Fałszywe ogłoszenie / Fake listing
      'scam', // Oszustwo / Scam
      'illegal', // Nielegalne treści / Illegal content
      'other' // Inne / Other
    ],
    required: true
  },
  
  // Dodatkowy opis zgłoszenia / Additional description
  description: {
    type: String,
    trim: true
  },
  
  // Status zgłoszenia / Report status
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'rejected'],
    default: 'pending'
  },
  
  // Notatka administratora / Admin note
  adminNote: {
    type: String,
    trim: true
  },
  
  // Administrator obsługujący zgłoszenie / Admin handling the report
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Podjęte działanie / Action taken
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'content_removed', 'account_suspended', 'account_banned'],
    default: 'none'
  }
}, { timestamps: true });

// Indeksy dla wydajniejszego wyszukiwania / Indexes for more efficient searching
reportSchema.index({ status: 1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ createdAt: -1 });

export default mongoose.model('Report', reportSchema);
