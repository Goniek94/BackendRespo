import { validationResult } from 'express-validator';
import User from '../../models/user.js';

/**
 * Get user profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Nie jesteś zalogowany'
      });
    }

    // Return user profile data
    const profileData = {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      dob: user.dob
    };

    res.status(200).json({
      success: true,
      message: 'Profil użytkownika pobrany pomyślnie',
      user: profileData
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania profilu'
    });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { name, lastName, phoneNumber, dob } = req.body;

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name?.trim(),
        lastName: lastName?.trim(),
        phoneNumber,
        dob: dob ? new Date(dob) : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Return updated profile data
    const profileData = {
      id: updatedUser._id,
      name: updatedUser.name,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
      dob: updatedUser.dob
    };

    console.log(`✅ Profile updated successfully for user: ${updatedUser.email}`);

    res.status(200).json({
      success: true,
      message: 'Profil zaktualizowany pomyślnie',
      user: profileData
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas aktualizacji profilu'
    });
  }
};
