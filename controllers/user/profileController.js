import { validationResult } from 'express-validator';
import User from '../../models/user/user.js';
import Ad from '../../models/listings/ad.js';
import Message from '../../models/communication/message.js';
import Notification from '../../models/communication/notification.js';

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

    // Get fresh user data from database
    const dbUser = await User.findById(user.userId).select('-password');
    
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if account is still active
    if (dbUser.status === 'suspended' || dbUser.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Konto zostało zawieszone'
      });
    }

    // Return complete user profile data
    const profileData = {
      id: dbUser._id,
      name: dbUser.name,
      lastName: dbUser.lastName,
      email: dbUser.email,
      phoneNumber: dbUser.phoneNumber,
      dob: dbUser.dob,
      role: dbUser.role,
      status: dbUser.status,
      isVerified: dbUser.isVerified,
      isEmailVerified: dbUser.isEmailVerified,
      isPhoneVerified: dbUser.isPhoneVerified,
      createdAt: dbUser.createdAt,
      lastLogin: dbUser.lastLogin,
      registrationStep: dbUser.registrationStep,
      // Address fields
      street: dbUser.street,
      city: dbUser.city,
      postalCode: dbUser.postalCode,
      country: dbUser.country,
      // Preferences
      notificationPreferences: dbUser.notificationPreferences,
      privacySettings: dbUser.privacySettings,
      securitySettings: dbUser.securitySettings
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

    const userId = req.user.userId;
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

/**
 * Get recently viewed ads for user
 */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's recently viewed ads (last 10)
    const recentlyViewedAds = await Ad.find({
      owner: userId
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .select('id title brand model price status images mainImage mainImageIndex createdAt updatedAt');

    const recentlyViewedData = {
      success: true,
      recentlyViewed: recentlyViewedAds.map(ad => ({
        id: ad._id,
        title: ad.title,
        brand: ad.brand,
        model: ad.model,
        price: ad.price,
        status: ad.status,
        images: ad.images,
        mainImage: ad.mainImage,
        mainImageIndex: ad.mainImageIndex,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt
      }))
    };

    res.status(200).json(recentlyViewedData);

  } catch (error) {
    console.error('❌ Get recently viewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania ostatnio oglądanych ogłoszeń',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user dashboard with complete ad data
 */
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's ads with complete data - NO FILTERING, return all fields
    const userAds = await Ad.find({
      owner: userId
    })
    .sort({ createdAt: -1 });

    // Return complete ad objects without any field filtering
    const dashboardData = {
      success: true,
      ads: userAds.map(ad => ad.toObject()), // Convert to plain objects with all fields
      totalAds: userAds.length,
      activeAds: userAds.filter(ad => ad.status === 'active').length,
      pendingAds: userAds.filter(ad => ad.status === 'pending').length,
      archivedAds: userAds.filter(ad => ad.status === 'archived').length
    };

    console.log(`✅ Dashboard data for user ${userId}: ${userAds.length} ads returned with complete data`);
    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('❌ Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania danych dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
