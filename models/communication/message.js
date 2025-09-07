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
    trim: true
  },
  content: {
    type: String,
    required: function() {
      // Content jest wymagane tylko jeśli nie ma załączników
      return !this.attachments || this.attachments.length === 0;
    },
    trim: true,
    default: ''
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
  archived: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relatedAd: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  unsent: {
    type: Boolean,
    default: false
  },
  unsentAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indeksy dla wydajności
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
