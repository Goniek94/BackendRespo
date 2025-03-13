// src/controllers/messagesController.js
import Message from '../models/message';
import User from '../models/user';
import Notification from '../models/notification';

// Pobieranie wiadomości dla określonego folderu
export const getMessages = async (req, res) => {
  try {
    const { folder } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const userId = req.user.id;
    
    let query = {};
    
    // Określ zapytanie w zależności od wybranego folderu
    switch (folder) {
      case 'inbox':
        query = { recipient: userId, draft: false, deleted: false, deletedBy: { $ne: userId } };
        break;
      case 'sent':
        query = { sender: userId, draft: false, deleted: false, deletedBy: { $ne: userId } };
        break;
      case 'drafts':
        query = { sender: userId, draft: true, deleted: false, deletedBy: { $ne: userId } };
        break;
      case 'starred':
        query = { 
          $or: [
            { recipient: userId, starred: true },
            { sender: userId, starred: true }
          ],
          draft: false,
          deleted: false,
          deletedBy: { $ne: userId }
        };
        break;
      case 'trash':
        query = {
          $or: [
            { recipient: userId },
            { sender: userId }
          ],
          deleted: true,
          deletedBy: userId
        };
        break;
      default:
        return res.status(400).json({ message: 'Niepoprawny folder' });
    }
    
    // Pobierz wiadomości z paginacją i populacją użytkowników
    const messages = await Message.find(query)
      .populate('sender', 'name lastName email')
      .populate('recipient', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Pobierz całkowitą liczbę wiadomości dla paginacji
    const total = await Message.countDocuments(query);
    
    // Zwróć wyniki
    return res.status(200).json({
      messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Błąd pobierania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas pobierania wiadomości' });
  }
};

// Pobieranie pojedynczej wiadomości
export const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pobierz wiadomość
    const message = await Message.findById(id)
      .populate('sender', 'name lastName email')
      .populate('recipient', 'name lastName email');
    
    // Sprawdź, czy wiadomość istnieje
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }
    
    // Sprawdź, czy użytkownik ma dostęp do wiadomości
    if (!message.sender.equals(userId) && !message.recipient.equals(userId)) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }
    
    // Jeśli użytkownik jest odbiorcą i wiadomość nie była jeszcze przeczytana
    if (message.recipient.equals(userId) && !message.read) {
      // Oznacz wiadomość jako przeczytaną
      message.read = true;
      await message.save();
    }
    
    // Zwróć wiadomość
    return res.status(200).json(message);
    
  } catch (error) {
    console.error('Błąd pobierania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas pobierania wiadomości' });
  }
};

// Wysyłanie nowej wiadomości
export const sendMessage = async (req, res) => {
  try {
    const { recipient, subject, content } = req.body;
    const senderId = req.user.id;
    
    // Sprawdź, czy odbiorca istnieje
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Odbiorca nie został znaleziony' });
    }
    
    // Utwórz nową wiadomość
    const newMessage = new Message({
      sender: senderId,
      recipient,
      subject,
      content,
      read: false,
      draft: false
    });
    
    // Obsługa załączników, jeśli są
    if (req.files && req.files.length > 0) {
      newMessage.attachments = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }
    
    // Zapisz wiadomość
    await newMessage.save();
    
    // Utwórz powiadomienie dla odbiorcy
    const notification = new Notification({
      user: recipient,
      message: `Masz nową wiadomość od ${req.user.name} ${req.user.lastName}`,
      isRead: false
    });
    
    await notification.save();
    
    // Zwróć odpowiedź
    return res.status(201).json({
      message: 'Wiadomość została wysłana',
      messageId: newMessage._id
    });
    
  } catch (error) {
    console.error('Błąd wysyłania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas wysyłania wiadomości' });
  }
};

// Zapisywanie wiadomości jako robocza
export const saveDraft = async (req, res) => {
  try {
    const { recipient, subject, content, draftId } = req.body;
    const senderId = req.user.id;
    
    // Sprawdź, czy odbiorca istnieje, jeśli podano
    if (recipient) {
      const recipientUser = await User.findById(recipient);
      if (!recipientUser) {
        return res.status(404).json({ message: 'Odbiorca nie został znaleziony' });
      }
    }
    
    // Jeśli mamy draftId, aktualizujemy istniejący szkic
    if (draftId) {
      const existingDraft = await Message.findById(draftId);
      
      // Sprawdź, czy szkic istnieje i należy do użytkownika
      if (!existingDraft || !existingDraft.sender.equals(senderId)) {
        return res.status(404).json({ message: 'Wiadomość robocza nie została znaleziona' });
      }
      
      // Aktualizuj pola
      if (recipient) existingDraft.recipient = recipient;
      if (subject) existingDraft.subject = subject;
      if (content) existingDraft.content = content;
      
      // Obsługa załączników, jeśli są
      if (req.files && req.files.length > 0) {
        existingDraft.attachments = req.files.map(file => ({
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));
      }
      
      // Zapisz zmiany
      await existingDraft.save();
      
      // Zwróć odpowiedź
      return res.status(200).json({
        message: 'Wiadomość robocza została zaktualizowana',
        messageId: existingDraft._id
      });
      
    } else {
      // Utwórz nową wiadomość roboczą
      const newDraft = new Message({
        sender: senderId,
        recipient: recipient || null,
        subject: subject || '',
        content: content || '',
        read: false,
        draft: true
      });
      
      // Obsługa załączników, jeśli są
      if (req.files && req.files.length > 0) {
        newDraft.attachments = req.files.map(file => ({
          name: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));
      }
      
      // Zapisz wiadomość
      await newDraft.save();
      
      // Zwróć odpowiedź
      return res.status(201).json({
        message: 'Wiadomość robocza została zapisana',
        messageId: newDraft._id
      });
    }
    
  } catch (error) {
    console.error('Błąd zapisywania wiadomości roboczej:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas zapisywania wiadomości roboczej' });
  }
};

// Oznaczanie wiadomości jako przeczytana
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pobierz wiadomość
    const message = await Message.findById(id);
    
    // Sprawdź, czy wiadomość istnieje
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }
    
    // Sprawdź, czy użytkownik jest odbiorcą
    if (!message.recipient.equals(userId)) {
      return res.status(403).json({ message: 'Nie możesz oznaczyć tej wiadomości jako przeczytana' });
    }
    
    // Oznacz jako przeczytana
    message.read = true;
    await message.save();
    
    // Zwróć odpowiedź
    return res.status(200).json({ message: 'Wiadomość oznaczona jako przeczytana' });
    
  } catch (error) {
    console.error('Błąd oznaczania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas oznaczania wiadomości' });
  }
};

// Oznaczanie wiadomości gwiazdką
export const toggleStar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pobierz wiadomość
    const message = await Message.findById(id);
    
    // Sprawdź, czy wiadomość istnieje
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }
    
    // Sprawdź, czy użytkownik ma dostęp do wiadomości
    if (!message.sender.equals(userId) && !message.recipient.equals(userId)) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }
    
    // Zmień status gwiazdki
    message.starred = !message.starred;
    await message.save();
    
    // Zwróć odpowiedź
    return res.status(200).json({ 
      message: message.starred ? 'Wiadomość oznaczona gwiazdką' : 'Gwiazdka usunięta',
      starred: message.starred
    });
    
  } catch (error) {
    console.error('Błąd oznaczania wiadomości gwiazdką:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas oznaczania wiadomości gwiazdką' });
  }
};

// Usuwanie wiadomości
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Pobierz wiadomość
    const message = await Message.findById(id);
    
    // Sprawdź, czy wiadomość istnieje
    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }
    
    // Sprawdź, czy użytkownik ma dostęp do wiadomości
    if (!message.sender.equals(userId) && !message.recipient.equals(userId)) {
      return res.status(403).json({ message: 'Brak dostępu do tej wiadomości' });
    }
    
    // Jeśli wiadomość jest już w koszu dla tego użytkownika
    if (message.deleted && message.deletedBy.some(id => id.equals(userId))) {
      // Jeśli obaj użytkownicy usunęli wiadomość, usuń ją całkowicie
      if (message.deletedBy.length >= 2 || 
         (message.sender.equals(message.recipient) && message.deletedBy.length >= 1)) {
        // Całkowicie usuń wiadomość (i jej załączniki, jeśli są)
        await Message.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Wiadomość została trwale usunięta' });
      }
    } else {
      // Oznacz jako usunięta przez tego użytkownika
      message.deleted = true;
      message.deletedBy.push(userId);
      await message.save();
      
      return res.status(200).json({ message: 'Wiadomość została przeniesiona do kosza' });
    }
    
  } catch (error) {
    console.error('Błąd usuwania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas usuwania wiadomości' });
  }
};

// Wyszukiwanie wiadomości
export const searchMessages = async (req, res) => {
  try {
    const { query, folder = 'all' } = req.query;
    const userId = req.user.id;
    
    // Podstawowe kryteria wyszukiwania
    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ],
      $and: [
        {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        }
      ]
    };
    
    // Dodaj filtry w zależności od folderu
    if (folder !== 'all') {
      switch (folder) {
        case 'inbox':
          searchCriteria.$and.push({ recipient: userId, draft: false, deleted: false, deletedBy: { $ne: userId } });
          break;
        case 'sent':
          searchCriteria.$and.push({ sender: userId, draft: false, deleted: false, deletedBy: { $ne: userId } });
          break;
        case 'drafts':
          searchCriteria.$and.push({ sender: userId, draft: true, deleted: false, deletedBy: { $ne: userId } });
          break;
        case 'starred':
          searchCriteria.$and.push({ 
            $or: [
              { recipient: userId, starred: true },
              { sender: userId, starred: true }
            ],
            draft: false,
            deleted: false,
            deletedBy: { $ne: userId }
          });
          break;
        case 'trash':
          searchCriteria.$and.push({
            deleted: true,
            deletedBy: userId
          });
          break;
      }
    } else {
      // Dla wszystkich folderów, wykluczamy usunięte wiadomości
      searchCriteria.$and.push({ 
        deleted: false,
        deletedBy: { $ne: userId }
      });
    }
    
    // Wykonaj wyszukiwanie
    const messages = await Message.find(searchCriteria)
      .populate('sender', 'name lastName email')
      .populate('recipient', 'name lastName email')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Zwróć wyniki
    return res.status(200).json(messages);
    
  } catch (error) {
    console.error('Błąd wyszukiwania wiadomości:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas wyszukiwania wiadomości' });
  }
};

// Pobieranie sugestii użytkowników do wysyłki wiadomości
export const getUserSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    
    // Wyszukaj użytkowników pasujących do zapytania
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('_id name lastName email')
    .limit(10);
    
    // Zwróć listę sugestii
    return res.status(200).json(users);
    
  } catch (error) {
    console.error('Błąd pobierania sugestii użytkowników:', error);
    return res.status(500).json({ message: 'Wystąpił błąd podczas pobierania sugestii użytkowników' });
  }
};