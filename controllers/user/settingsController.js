import User from '../../models/user/user.js';

/**
 * Get user settings (notification, privacy, security)
 */
export const getUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select(
      'name lastName email phoneNumber dob notificationPreferences privacySettings securitySettings'
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      // User data
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob,
      // Settings
      notificationPreferences: user.notificationPreferences,
      privacySettings: user.privacySettings,
      securitySettings: user.securitySettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user settings (notification, privacy, security)
 */
export const updateUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationPreferences, privacySettings, securitySettings } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update only provided fields
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }
    if (privacySettings) {
      user.privacySettings = {
        ...user.privacySettings,
        ...privacySettings
      };
    }
    if (securitySettings) {
      user.securitySettings = {
        ...user.securitySettings,
        ...securitySettings
      };
    }

    await user.save();
    res.json({
      notificationPreferences: user.notificationPreferences,
      privacySettings: user.privacySettings,
      securitySettings: user.securitySettings
    });
  } catch (error) {
    next(error);
  }
};
