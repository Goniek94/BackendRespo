// controllers/admin/userController.js
/**
 * Kontroler do zarządzania użytkownikami przez administratora
 * Controller for managing users by administrator
 */

import User from '../../models/user.js';
import Notification from '../../models/notification.js';

/**
 * Pobiera listę użytkowników z możliwością filtrowania i paginacji
 * Retrieves a list of users with filtering and pagination options
 */
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Przygotuj zapytanie / Prepare query
    const query = {};
    
    // Filtrowanie po roli / Filter by role
    if (role) {
      query.role = role;
    }
    
    // Wyszukiwanie po email, imieniu lub nazwisku / Search by email, name or last name
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Przygotuj opcje sortowania / Prepare sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pobierz całkowitą liczbę pasujących użytkowników / Get total count of matching users
    const total = await User.countDocuments(query);
    
    // Pobierz użytkowników z paginacją / Get users with pagination
    const users = await User.find(query)
      .select('-password') // Nie zwracaj hasła / Don't return password
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    return res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania listy użytkowników:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy użytkowników.' });
  }
};

/**
 * Pobiera szczegóły pojedynczego użytkownika
 * Retrieves details of a single user
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('favorites');
    
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania szczegółów użytkownika.' });
  }
};

/**
 * Aktualizuje dane użytkownika, w tym rolę
 * Updates user data, including role
 */
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, name, lastName, email, is2FAEnabled } = req.body;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Aktualizuj dane / Update data
    if (role !== undefined) user.role = role;
    if (name !== undefined) user.name = name;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (is2FAEnabled !== undefined) user.is2FAEnabled = is2FAEnabled;
    
    await user.save();
    
    return res.status(200).json({ 
      message: 'Dane użytkownika zostały zaktualizowane.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        is2FAEnabled: user.is2FAEnabled
      }
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji użytkownika.' });
  }
};

/**
 * Blokuje konto użytkownika
 * Blocks a user account
 */
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { blockType, reason, duration } = req.body;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Nie pozwól zablokować administratora / Don't allow blocking an admin
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Nie można zablokować konta administratora.' });
    }
    
    // Ustaw odpowiedni status i czas blokady / Set appropriate status and block time
    if (blockType === 'suspend') {
      // Tymczasowa blokada / Temporary suspension
      const suspensionDuration = duration || 7; // domyślnie 7 dni / default 7 days
      user.status = 'suspended';
      user.suspendedUntil = new Date(Date.now() + suspensionDuration * 24 * 60 * 60 * 1000);
      user.suspendedBy = req.user.userId;
      user.suspensionReason = reason || 'Naruszenie zasad serwisu';
    } else if (blockType === 'ban') {
      // Permanentna blokada / Permanent ban
      user.status = 'banned';
      user.bannedBy = req.user.userId;
      user.banReason = reason || 'Poważne naruszenie zasad serwisu';
      user.suspendedUntil = null; // Usuń datę zakończenia blokady / Remove suspension end date
    } else {
      return res.status(400).json({ message: 'Nieprawidłowy typ blokady. Użyj "suspend" lub "ban".' });
    }
    
    await user.save();
    
    // Powiadom użytkownika o blokadzie / Notify user about block
    try {
      await Notification.create({
        user: userId,
        type: blockType === 'suspend' ? 'account_suspended' : 'account_banned',
        title: blockType === 'suspend' ? 'Konto zostało tymczasowo zawieszone' : 'Konto zostało zbanowane',
        message: `Twoje konto zostało ${blockType === 'suspend' ? 'tymczasowo zawieszone' : 'permanentnie zbanowane'} przez administratora. Powód: ${user.suspensionReason || user.banReason}`,
        data: {
          suspendedUntil: user.suspendedUntil,
          reason: user.suspensionReason || user.banReason
        }
      });
    } catch (notificationError) {
      console.error('Błąd podczas wysyłania powiadomienia:', notificationError);
      // Kontynuuj, nawet jeśli powiadomienie się nie powiodło / Continue even if notification failed
    }
    
    return res.status(200).json({ 
      message: blockType === 'suspend' 
        ? `Konto użytkownika zostało tymczasowo zawieszone do ${user.suspendedUntil.toLocaleDateString()}.` 
        : 'Konto użytkownika zostało permanentnie zbanowane.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        status: user.status,
        suspendedUntil: user.suspendedUntil
      }
    });
  } catch (error) {
    console.error('Błąd podczas blokowania użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas blokowania użytkownika.' });
  }
};

/**
 * Odblokowuje konto użytkownika
 * Unblocks a user account
 */
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Sprawdź czy użytkownik jest zablokowany / Check if user is blocked
    if (user.status !== 'suspended' && user.status !== 'banned') {
      return res.status(400).json({ message: 'Konto użytkownika nie jest zablokowane.' });
    }
    
    // Odblokuj konto / Unblock account
    user.status = 'active';
    user.suspendedUntil = null;
    user.suspendedBy = null;
    user.suspensionReason = null;
    user.bannedBy = null;
    user.banReason = null;
    
    await user.save();
    
    // Powiadom użytkownika o odblokowaniu / Notify user about unblock
    try {
      await Notification.create({
        user: userId,
        type: 'account_unblocked',
        title: 'Konto zostało odblokowane',
        message: 'Twoje konto zostało odblokowane przez administratora. Możesz znów korzystać z pełnej funkcjonalności serwisu.',
        data: {}
      });
    } catch (notificationError) {
      console.error('Błąd podczas wysyłania powiadomienia:', notificationError);
      // Kontynuuj, nawet jeśli powiadomienie się nie powiodło / Continue even if notification failed
    }
    
    return res.status(200).json({ 
      message: 'Konto użytkownika zostało odblokowane.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Błąd podczas odblokowywania użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas odblokowywania użytkownika.' });
  }
};

/**
 * Usuwa użytkownika
 * Deletes a user
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Sprawdź czy użytkownik istnieje / Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }
    
    // Nie pozwól usunąć ostatniego administratora / Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Nie można usunąć ostatniego administratora.' });
      }
    }
    
    await User.findByIdAndDelete(userId);
    
    return res.status(200).json({ message: 'Użytkownik został usunięty.' });
  } catch (error) {
    console.error('Błąd podczas usuwania użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania użytkownika.' });
  }
};
