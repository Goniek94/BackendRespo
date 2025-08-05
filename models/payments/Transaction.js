import mongoose from 'mongoose';

/**
 * Schema dla modelu transakcji
 * @type {mongoose.Schema}
 */
const transactionSchema = new mongoose.Schema(
  {
    // ID użytkownika (wymagane)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // ID ogłoszenia (wymagane)
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true
    },
    
    // Kwota transakcji (wymagane)
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Typ transakcji (wymagane)
    type: {
      type: String,
      required: true,
      enum: ['standard_listing', 'featured_listing', 'refund'],
      default: 'standard_listing'
    },
    
    // Status transakcji (wymagane)
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    
    // Metoda płatności (wymagane)
    paymentMethod: {
      type: String,
      required: true,
      enum: ['card', 'blik', 'transfer', 'paypal', 'przelewy24', 'payu']
    },
    
    // Czy zażądano faktury
    invoiceRequested: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Czy faktura została wygenerowana
    invoiceGenerated: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // ID transakcji z systemu płatności
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // Dodatkowe metadane transakcji
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Data żądania faktury
    invoiceRequestedAt: {
      type: Date,
      default: null
    },
    
    // Data wygenerowania faktury
    invoiceGeneratedAt: {
      type: Date,
      default: null
    },
    
    // Numer faktury (jeśli została wygenerowana)
    invoiceNumber: {
      type: String,
      default: null,
      sparse: true,
      unique: true
    },
    
    // Ścieżka do pliku PDF faktury
    invoicePdfPath: {
      type: String,
      default: null
    }
  },
  { 
    timestamps: true, // Automatyczne dodawanie pól createdAt i updatedAt
    
    // Dodanie metod pomocniczych
    methods: {
      /**
       * Sprawdza, czy transakcja jest zakończona
       * @returns {boolean}
       */
      isCompleted() {
        return this.status === 'completed';
      },
      
      /**
       * Sprawdza, czy można zażądać faktury
       * @returns {boolean}
       */
      canRequestInvoice() {
        return this.status === 'completed' && !this.invoiceRequested;
      },
      
      /**
       * Sprawdza, czy faktura jest dostępna do pobrania
       * @returns {boolean}
       */
      isInvoiceAvailable() {
        return this.invoiceGenerated && this.invoicePdfPath;
      },
      
      /**
       * Generuje numer faktury
       * @returns {string}
       */
      generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const timestamp = Date.now().toString().slice(-6);
        return `FV/${year}/${month}/${timestamp}`;
      },
      
      /**
       * Konwertuje transakcję do formatu JSON dla API
       * @returns {Object}
       */
      toApiResponse() {
        return {
          id: this._id,
          userId: this.userId,
          adId: this.adId,
          amount: this.amount,
          type: this.type,
          status: this.status,
          paymentMethod: this.paymentMethod,
          invoiceRequested: this.invoiceRequested,
          invoiceGenerated: this.invoiceGenerated,
          transactionId: this.transactionId,
          invoiceNumber: this.invoiceNumber,
          canRequestInvoice: this.canRequestInvoice(),
          isInvoiceAvailable: this.isInvoiceAvailable(),
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
          invoiceRequestedAt: this.invoiceRequestedAt,
          invoiceGeneratedAt: this.invoiceGeneratedAt,
          description: this.getTransactionDescription(),
          category: this.getTransactionCategory()
        };
      },
      
      /**
       * Generuje opis transakcji na podstawie typu
       * @returns {string}
       */
      getTransactionDescription() {
        switch (this.type) {
          case 'standard_listing':
            return 'Opłata za publikację ogłoszenia';
          case 'featured_listing':
            return 'Opłata za wyróżnienie ogłoszenia';
          case 'refund':
            return 'Zwrot za anulowane ogłoszenie';
          default:
            return 'Opłata za usługę';
        }
      },
      
      /**
       * Generuje kategorię transakcji na podstawie typu
       * @returns {string}
       */
      getTransactionCategory() {
        switch (this.type) {
          case 'standard_listing':
            return 'Ogłoszenie standardowe';
          case 'featured_listing':
            return 'Ogłoszenie wyróżnione';
          case 'refund':
            return 'Zwrot';
          default:
            return 'Inne';
        }
      }
    }
  }
);

// Indeksy złożone dla wydajności
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ adId: 1, status: 1 });

// Metody statyczne
transactionSchema.statics.findByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const filter = { userId };
  
  if (status) {
    filter.status = status;
  }
  
  return this.find(filter)
    .populate('adId', 'headline brand model price images')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

transactionSchema.statics.countByUser = function(userId, status = null) {
  const filter = { userId };
  if (status) {
    filter.status = status;
  }
  return this.countDocuments(filter);
};

// Middleware pre-save do generowania numeru faktury
transactionSchema.pre('save', function(next) {
  // Generuj numer faktury jeśli faktura została wygenerowana ale nie ma numeru
  if (this.invoiceGenerated && !this.invoiceNumber) {
    this.invoiceNumber = this.generateInvoiceNumber();
    this.invoiceGeneratedAt = new Date();
  }
  
  // Ustaw datę żądania faktury
  if (this.invoiceRequested && !this.invoiceRequestedAt) {
    this.invoiceRequestedAt = new Date();
  }
  
  next();
});

// Eksport modelu
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export default Transaction;
