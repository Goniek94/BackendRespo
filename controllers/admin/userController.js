// controllers/admin/userController.js
/**
 * Kontroler do zarządzania użytkownikami przez administratora
 * Controller for managing users by administrator
 */

import User from '../../models/user.js';

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
