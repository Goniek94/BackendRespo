import Message from '../../models/message.js';
import mongoose from 'mongoose';

// Oznaczanie jako przeczytane
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Oznaczono jako przeczytane' });
  } catch (error) {
    console.error('Błąd podczas oznaczania wiadomości jako przeczytanej:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przełączanie gwiazdki
export const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    message.starred = !message.starred;
    await message.save();

    res.status(200).json({ starred: message.starred });
  } catch (error) {
    console.error('Błąd podczas przełączania gwiazdki:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Usuwanie wiadomości
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Jeśli już jest w koszu, usuń całkowicie
    if (message.deletedBy.some(id => id.toString() === userIdStr)) {
      await Message.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Wiadomość usunięta' });
    }
    
    // Dodaj do kosza
    message.deletedBy.push(userObjectId);
    await message.save();

    res.status(200).json({ message: 'Przeniesiono do kosza' });
  } catch (error) {
    console.error('Błąd podczas usuwania wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przenoszenie wiadomości do archiwum
export const archiveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Dodaj flagę archived
    message.archived = true;
    await message.save();

    res.status(200).json({ message: 'Wiadomość przeniesiona do archiwum' });
  } catch (error) {
    console.error('Błąd podczas przenoszenia wiadomości do archiwum:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przywracanie wiadomości z archiwum
export const unarchiveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie znaleziona' });
    }
    
    if (message.sender.toString() !== userIdStr && message.recipient.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Usuń flagę archived
    message.archived = false;
    await message.save();

    res.status(200).json({ message: 'Wiadomość przywrócona z archiwum' });
  } catch (error) {
    console.error('Błąd podczas przywracania wiadomości z archiwum:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};