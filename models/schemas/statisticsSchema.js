import mongoose from 'mongoose';

/**
 * Schemat statystyk ogłoszenia
 */
const statisticsSchema = new mongoose.Schema({
  // Podstawowe statystyki
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  messages: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  visits: {
    type: Number,
    default: 0
  },
  
  // Historia wyświetleń (ostatnie 6 miesięcy)
  viewsHistory: [{
    month: String,
    year: Number,
    views: {
      type: Number,
      default: 0
    },
    messages: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    }
  }],
  
  // Źródła ruchu
  trafficSources: {
    search: {
      type: Number,
      default: 0
    },
    direct: {
      type: Number,
      default: 0
    },
    similar: {
      type: Number,
      default: 0
    },
    social: {
      type: Number,
      default: 0
    }
  },
  
  // Historia aktywności
  activityHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    activityType: {
      type: String,
      enum: ['view', 'message', 'favorite', 'visit', 'price_change']
    },
    details: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Historia cen
  priceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    price: Number
  }]
});

export default statisticsSchema;
