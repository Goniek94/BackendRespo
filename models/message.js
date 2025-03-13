// src/models/message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Temat musi zawierać co najmniej 1 znak.']
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Treść musi zawierać co najmniej 1 znak.']
  },
  attachments: [{
    name: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  read: {
    type: Boolean,
    default: false
  },
  starred: {
    type: Boolean,
    default: false
  },
  draft: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indeksy dla szybszego wyszukiwania
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;