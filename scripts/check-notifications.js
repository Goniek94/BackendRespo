import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/user/user.js';
import Notification from '../models/communication/notification.js';
import notificationManager from '../services/notificationManager.js';

const checkNotifications = async () => {
  try {
    await mongoose.connect(config.database.uri);
    console.log('✅ Połączono z bazą');
    
    const user = await User.findOne();
    if (!user) {
      console.log('❌ Brak użytkowników');
      process.exit(1);
    }
    
    console.log('👤 Użytkownik:', user.name, user._id);
    
    // Sprawdź istniejące powiadomienia
    const existing = await Notification.find({ user: user._id }).sort({ createdAt: -1 });
    console.log('📋 Istniejące powiadomienia:', existing.length);
    
    if (existing.length === 0) {
      // Utwórz testowe powiadomienia
      notificationManager.initialize();
      await notificationManager.notifyAdCreated(user._id.toString(), 'BMW X5 2020', '507f1f77bcf86cd799439011');
      await notificationManager.notifyNewMessage(user._id.toString(), 'Jan Kowalski', 'Audi A4');
      await notificationManager.notifyAdAddedToFavorites(user._id.toString(), 'Mercedes C-Class', '507f1f77bcf86cd799439012');
      console.log('✅ Utworzono 3 testowe powiadomienia');
    }
    
    const final = await Notification.find({ user: user._id }).sort({ createdAt: -1 });
    console.log('📊 Końcowa liczba powiadomień:', final.length);
    final.forEach((n, i) => console.log(`  ${i+1}. ${n.title} - ${n.message}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
};

checkNotifications();
