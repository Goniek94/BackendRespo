import Message from '../../models/message.js';
import User from '../../models/user.js';
import mongoose from 'mongoose';

// Pobieranie liczby nieprzeczytanych wiadomości
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Pobierz liczbę nieprzeczytanych wiadomości
    const unreadCount = await Message.countDocuments({ 
      recipient: userObjectId,
      read: false,
      deletedBy: { $ne: userObjectId }
    });
    
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Błąd podczas pobierania liczby nieprzeczytanych wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Wyszukiwanie wiadomości
export const searchMessages = async (req, res) => {
  try {
    const { query, folder } = req.query;
    const userId = req.user.userId;
    
    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    if (!query) {
      return res.status(400).json({ message: 'Brak parametru wyszukiwania' });
    }

    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    };

    // Dodaj kryteria folderu
    if (folder === 'inbox') {
      searchCriteria = { $and: [searchCriteria, { recipient: userObjectId, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'sent') {
      searchCriteria = { $and: [searchCriteria, { sender: userObjectId, draft: false, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'drafts') {
      searchCriteria = { $and: [searchCriteria, { sender: userObjectId, draft: true, deletedBy: { $ne: userObjectId } }] };
    } else if (folder === 'starred') {
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { 
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            starred: true,
            deletedBy: { $ne: userObjectId }
          }
        ] 
      };
    } else if (folder === 'trash') {
      searchCriteria = { $and: [searchCriteria, { deletedBy: userObjectId }] };
    } else if (folder === 'archived') {
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { 
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            archived: true,
            deletedBy: { $ne: userObjectId }
          }
        ] 
      };
    } else {
      // Wszystkie foldery
      searchCriteria = { 
        $and: [
          searchCriteria, 
          { $or: [{ recipient: userObjectId }, { sender: userObjectId }] },
          { deletedBy: { $ne: userObjectId } }
        ] 
      };
    }

    const messages = await Message.find(searchCriteria)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Błąd podczas wyszukiwania wiadomości:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Sugestie użytkowników
export const getUserSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;
    
    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      _id: { $ne: userObjectId },
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name email')
    .limit(5);

    res.status(200).json(users);
  } catch (error) {
    console.error('Błąd podczas pobierania sugestii użytkowników:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};

// Zapisywanie wiadomości roboczej
export const saveDraft = async (req, res) => {
  try {
    const { recipient, subject, content, draftId } = req.body;
    const senderId = req.user.userId;
    
    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : senderId;
    
    // Przygotuj dane
    const draftData = {
      sender: senderObjectId,
      subject: subject || '',
      content: content || '',
      draft: true
    };

    // Dodaj załączniki, jeśli są
    if (req.files && req.files.length > 0) {
      draftData.attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Znajdź odbiorcę, jeśli podano
    if (recipient) {
      let recipientUser;
      if (mongoose.Types.ObjectId.isValid(recipient)) {
        recipientUser = await User.findById(recipient);
      } else {
        recipientUser = await User.findOne({ email: recipient });
      }

      if (recipientUser) {
        draftData.recipient = recipientUser._id;
      }
    } else {
      // Wymagane pole w MongoDB
      draftData.recipient = senderId; // Tymczasowo, odbiorca to nadawca
    }

    // Aktualizuj lub utwórz szkic
    let draft;
    if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
      draft = await Message.findOneAndUpdate(
        { _id: draftId, sender: senderId, draft: true },
        draftData,
        { new: true }
      );
      
      if (!draft) {
        return res.status(404).json({ message: 'Szkic nie znaleziony' });
      }
    } else {
      draft = new Message(draftData);
      await draft.save();
    }

    res.status(200).json({ draftId: draft._id });
  } catch (error) {
    console.error('Błąd podczas zapisywania szkicu:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
};