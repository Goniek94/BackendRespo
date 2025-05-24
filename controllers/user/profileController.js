import User from '../../models/user.js';

// Pobranie danych użytkownika
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }

    // Zwracamy tylko bezpieczne dane
    return res.status(200).json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Błąd pobierania profilu użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania danych użytkownika.' });
  }
};

// Aktualizacja danych użytkownika
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, lastName } = req.body;

    // Sprawdź czy pola są poprawne
    if (name && name.length < 2) {
      return res.status(400).json({
        message: 'Imię musi zawierać co najmniej 2 znaki.',
        field: 'name'
      });
    }

    if (lastName && lastName.length < 2) {
      return res.status(400).json({
        message: 'Nazwisko musi zawierać co najmniej 2 znaki.',
        field: 'lastName'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony.' });
    }

    // Aktualizuj tylko dozwolone pola
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;

    await user.save();

    return res.status(200).json({
      message: 'Profil został zaktualizowany pomyślnie.',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Błąd aktualizacji profilu użytkownika:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji danych użytkownika.' });
  }
};