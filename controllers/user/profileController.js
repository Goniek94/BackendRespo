import { validationResult } from "express-validator";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import Message from "../../models/communication/message.js";
import Notification from "../../models/communication/notification.js";

/**
 * Get user profile
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Nie jesteś zalogowany",
      });
    }

    // Get fresh user data from database
    const dbUser = await User.findById(user.userId).select("-password");

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Check if account is still active
    if (dbUser.status === "suspended" || dbUser.status === "banned") {
      return res.status(403).json({
        success: false,
        message: "Konto zostało zawieszone",
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
      registrationType: dbUser.registrationType || "standard",
      // Address fields
      street: dbUser.street,
      city: dbUser.city,
      postalCode: dbUser.postalCode,
      country: dbUser.country,
      // Preferences
      notificationPreferences: dbUser.notificationPreferences,
      privacySettings: dbUser.privacySettings,
      securitySettings: dbUser.securitySettings,
    };

    return res.status(200).json({
      success: true,
      message: "Profil użytkownika pobrany pomyślnie",
      user: profileData,
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return next(error);
  }
};

/**
 * Update basic user profile data (name, lastName)
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Błędy walidacji",
        errors: errors.array(),
      });
    }

    const userId = req.user.userId;
    const { name, lastName } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Track changes for notification
    const changes = [];
    if (name && name !== user.name) {
      changes.push(`Imię zmienione z "${user.name}" na "${name}"`);
      user.name = name.trim();
    }
    if (lastName && lastName !== user.lastName) {
      changes.push(`Nazwisko zmienione z "${user.lastName}" na "${lastName}"`);
      user.lastName = lastName.trim();
    }

    await user.save();

    // Return updated profile data
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
      dob: user.dob,
    };

    console.log(`✅ Profile updated successfully for user: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Profil zaktualizowany pomyślnie",
      user: profileData,
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return next(error);
  }
};

/**
 * Request email change - sends verification code to new email
 */
export const requestEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Nowy adres email jest wymagany",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Check if email is already taken
    const emailExists = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: userId },
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Ten adres email jest już zajęty",
      });
    }

    // Generate verification code
    const { generateVerificationCode, sendEmailChangeVerification } =
      await import("../../services/emailService.js");
    const verificationCode = generateVerificationCode();

    // Save verification code with expiry (15 minutes)
    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.pendingEmail = newEmail.toLowerCase();
    await user.save();

    // Send verification email
    await sendEmailChangeVerification(newEmail, verificationCode, user.name);

    return res.status(200).json({
      success: true,
      message: "Kod weryfikacyjny został wysłany na nowy adres email",
    });
  } catch (error) {
    console.error("❌ Request email change error:", error);
    return next(error);
  }
};

/**
 * Verify email change with code
 */
export const verifyEmailChange = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny jest wymagany",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Check if code is valid
    if (
      !user.emailVerificationCode ||
      user.emailVerificationCode !== code ||
      !user.emailVerificationCodeExpires ||
      user.emailVerificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny jest nieprawidłowy lub wygasł",
      });
    }

    if (!user.pendingEmail) {
      return res.status(400).json({
        success: false,
        message: "Brak oczekującego adresu email",
      });
    }

    // Update email
    const oldEmail = user.email;
    user.email = user.pendingEmail;
    user.isEmailVerified = true;
    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    user.pendingEmail = undefined;
    await user.save();

    // Send notification to old email
    const { sendProfileChangeNotification } = await import(
      "../../services/emailService.js"
    );
    await sendProfileChangeNotification(oldEmail, user.name, [
      `Email zmieniony z ${oldEmail} na ${user.email}`,
    ]);

    return res.status(200).json({
      success: true,
      message: "Adres email został zmieniony pomyślnie",
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("❌ Verify email change error:", error);
    return next(error);
  }
};

/**
 * Request phone change - sends verification code to new phone
 */
export const requestPhoneChange = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { newPhone } = req.body;

    if (!newPhone) {
      return res.status(400).json({
        success: false,
        message: "Nowy numer telefonu jest wymagany",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Check if phone is already taken
    const phoneExists = await User.findOne({
      phoneNumber: newPhone,
      _id: { $ne: userId },
    });

    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Ten numer telefonu jest już zajęty",
      });
    }

    // Generate verification code
    const { generateVerificationCode, sendPhoneChangeVerification } =
      await import("../../services/emailService.js");
    const verificationCode = generateVerificationCode();

    // Save verification code with expiry (15 minutes)
    user.smsVerificationCode = verificationCode;
    user.smsVerificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.pendingPhone = newPhone;
    await user.save();

    // Send verification SMS
    await sendPhoneChangeVerification(newPhone, verificationCode);

    return res.status(200).json({
      success: true,
      message: "Kod weryfikacyjny został wysłany SMS",
    });
  } catch (error) {
    console.error("❌ Request phone change error:", error);
    return next(error);
  }
};

/**
 * Verify phone change with code
 */
export const verifyPhoneChange = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny jest wymagany",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    // Check if code is valid
    if (
      !user.smsVerificationCode ||
      user.smsVerificationCode !== code ||
      !user.smsVerificationCodeExpires ||
      user.smsVerificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny jest nieprawidłowy lub wygasł",
      });
    }

    if (!user.pendingPhone) {
      return res.status(400).json({
        success: false,
        message: "Brak oczekującego numeru telefonu",
      });
    }

    // Update phone
    const oldPhone = user.phoneNumber;
    user.phoneNumber = user.pendingPhone;
    user.isPhoneVerified = true;
    user.phoneVerified = true;
    user.smsVerificationCode = undefined;
    user.smsVerificationCodeExpires = undefined;
    user.pendingPhone = undefined;
    await user.save();

    // Send notification to email
    const { sendProfileChangeNotification } = await import(
      "../../services/emailService.js"
    );
    await sendProfileChangeNotification(user.email, user.name, [
      `Telefon zmieniony z ${oldPhone} na ${user.phoneNumber}`,
    ]);

    return res.status(200).json({
      success: true,
      message: "Numer telefonu został zmieniony pomyślnie",
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("❌ Verify phone change error:", error);
    return next(error);
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Adres email jest wymagany",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "Jeśli konto istnieje, link do resetu hasła został wysłany",
      });
    }

    // Generate reset token
    const { generateResetToken, sendPasswordResetEmail } = await import(
      "../../services/emailService.js"
    );
    const resetToken = generateResetToken();

    // Save token with expiry (1 hour)
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken, user.name);

    return res.status(200).json({
      success: true,
      message: "Jeśli konto istnieje, link do resetu hasła został wysłany",
    });
  } catch (error) {
    console.error("❌ Request password reset error:", error);
    return res.status(200).json({
      success: true,
      message: "Jeśli konto istnieje, link do resetu hasła został wysłany",
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password, newPassword } = req.body;
    const finalPassword = password || newPassword; // Akceptuj oba

    if (!token || !finalPassword) {
      return res.status(400).json({
        success: false,
        message: "Token i nowe hasło są wymagane",
      });
    }

    if (finalPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Hasło musi mieć co najmniej 8 znaków",
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token resetowania hasła jest nieprawidłowy lub wygasł",
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = finalPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    await user.save();

    // Send notification
    const { sendProfileChangeNotification } = await import(
      "../../services/emailService.js"
    );
    await sendProfileChangeNotification(user.email, user.name, [
      "Hasło zostało zmienione",
    ]);

    return res.status(200).json({
      success: true,
      message: "Hasło zostało zmienione pomyślnie. Możesz się teraz zalogować.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return next(error);
  }
};

/**
 * Get recently viewed ads for user
 */
export const getRecentlyViewed = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get user's recently viewed ads (last 10)
    const recentlyViewedAds = await Ad.find({
      owner: userId,
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select(
        "id title brand model price status images mainImage mainImageIndex createdAt updatedAt"
      );

    const recentlyViewedData = {
      success: true,
      recentlyViewed: recentlyViewedAds.map((ad) => ({
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
        updatedAt: ad.updatedAt,
      })),
    };

    return res.status(200).json(recentlyViewedData);
  } catch (error) {
    console.error("❌ Get recently viewed error:", error);
    return next(error);
  }
};
