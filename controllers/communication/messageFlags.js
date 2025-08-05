import Message from '../../models/communication/message.js';
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

// ===== FUNKCJE DO ZARZĄDZANIA KONWERSACJAMI =====

// Oznaczanie całej konwersacji jako ważnej
export const starConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Konwertuj ID na ObjectId
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) ? 
      new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(otherUserId) ? 
      new mongoose.Types.ObjectId(otherUserId) : otherUserId;

    // Znajdź wszystkie wiadomości w konwersacji
    const messages = await Message.find({
      $or: [
        { sender: currentUserObjectId, recipient: otherUserObjectId },
        { sender: otherUserObjectId, recipient: currentUserObjectId }
      ],
      deletedBy: { $ne: currentUserObjectId }
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Nie znaleziono konwersacji' });
    }

    // Oznacz wszystkie wiadomości jako ważne
    await Message.updateMany(
      {
        $or: [
          { sender: currentUserObjectId, recipient: otherUserObjectId },
          { sender: otherUserObjectId, recipient: currentUserObjectId }
        ],
        deletedBy: { $ne: currentUserObjectId }
      },
      { starred: true }
    );

    res.status(200).json({ message: 'Konwersacja oznaczona jako ważna' });
  } catch (error) {
    console.error('Błąd podczas oznaczania konwersacji jako ważnej:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Przenoszenie całej konwersacji do archiwum
export const archiveConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Konwertuj ID na ObjectId
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) ? 
      new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(otherUserId) ? 
      new mongoose.Types.ObjectId(otherUserId) : otherUserId;

    // Znajdź wszystkie wiadomości w konwersacji
    const messages = await Message.find({
      $or: [
        { sender: currentUserObjectId, recipient: otherUserObjectId },
        { sender: otherUserObjectId, recipient: currentUserObjectId }
      ],
      deletedBy: { $ne: currentUserObjectId }
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Nie znaleziono konwersacji' });
    }

    // Przenieś wszystkie wiadomości do archiwum
    await Message.updateMany(
      {
        $or: [
          { sender: currentUserObjectId, recipient: otherUserObjectId },
          { sender: otherUserObjectId, recipient: currentUserObjectId }
        ],
        deletedBy: { $ne: currentUserObjectId }
      },
      { archived: true }
    );

    res.status(200).json({ message: 'Konwersacja przeniesiona do archiwum' });
  } catch (error) {
    console.error('Błąd podczas przenoszenia konwersacji do archiwum:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Usuwanie całej konwersacji
export const deleteConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Konwertuj ID na ObjectId
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId) ? 
      new mongoose.Types.ObjectId(currentUserId) : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(otherUserId) ? 
      new mongoose.Types.ObjectId(otherUserId) : otherUserId;

    // Znajdź wszystkie wiadomości w konwersacji
    const messages = await Message.find({
      $or: [
        { sender: currentUserObjectId, recipient: otherUserObjectId },
        { sender: otherUserObjectId, recipient: currentUserObjectId }
      ],
      deletedBy: { $ne: currentUserObjectId }
    });

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Nie znaleziono konwersacji' });
    }

    // Dodaj użytkownika do deletedBy dla wszystkich wiadomości
    await Message.updateMany(
      {
        $or: [
          { sender: currentUserObjectId, recipient: otherUserObjectId },
          { sender: otherUserObjectId, recipient: currentUserObjectId }
        ],
        deletedBy: { $ne: currentUserObjectId }
      },
      { $push: { deletedBy: currentUserObjectId } }
    );

    res.status(200).json({ message: 'Konwersacja usunięta' });
  } catch (error) {
    console.error('Błąd podczas usuwania konwersacji:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};
