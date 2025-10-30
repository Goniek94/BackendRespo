import User from "../../models/user/user.js";

/**
 * Check if email exists
 */
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email jest wymagany",
      });
    }

    // Check if user with this email exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    res.status(200).json({
      success: true,
      exists: !!existingUser,
      message: existingUser ? "Email już istnieje" : "Email jest dostępny",
    });
  } catch (error) {
    console.error("❌ Check email error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas sprawdzania email",
    });
  }
};

/**
 * Check if phone exists
 */
export const checkPhoneExists = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Numer telefonu jest wymagany",
      });
    }

    // Check if user with this phone exists
    const existingUser = await User.findOne({
      phoneNumber: phone,
    });

    res.status(200).json({
      success: true,
      exists: !!existingUser,
      message: existingUser
        ? "Numer telefonu już istnieje"
        : "Numer telefonu jest dostępny",
    });
  } catch (error) {
    console.error("❌ Check phone error:", error);
    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas sprawdzania numeru telefonu",
    });
  }
};

/**
 * Verify email code - registration verification
 */
export const verifyEmailCode = async (req, res) => {
  console.log("\n🟢 ==========================================");
  console.log("🟢 [BACKEND] /verify-email - START");
  console.log("🟢 ==========================================");

  try {
    const { email, code } = req.body;
    console.log("📧 Otrzymany email:", email);
    console.log("🔑 Otrzymany kod:", code);

    if (!email || !code) {
      console.log("❌ Brak emaila lub kodu w request body");
      return res.status(400).json({
        success: false,
        message: "Email i kod są wymagane",
      });
    }

    // Find user by email
    console.log("🔍 Szukam użytkownika w bazie...");
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      console.log("❌ Użytkownik nie znaleziony");
      return res.status(404).json({
        success: false,
        message: "Użytkownik nie został znaleziony",
      });
    }

    console.log("✅ Użytkownik znaleziony:", {
      id: user._id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      hasCode: !!user.emailVerificationCode,
      codeExpires: user.emailVerificationCodeExpires,
    });

    // Check if email is already verified
    if (user.isEmailVerified) {
      console.log("⚠️ Email już zweryfikowany");
      return res.status(400).json({
        success: false,
        message: "Email jest już zweryfikowany",
      });
    }

    // Check if code exists
    if (!user.emailVerificationCode) {
      console.log("❌ Brak kodu weryfikacyjnego w bazie");
      return res.status(400).json({
        success: false,
        message: "Brak aktywnego kodu weryfikacyjnego. Poproś o nowy kod.",
      });
    }

    // Check if code has expired
    const now = new Date();
    console.log("⏰ Sprawdzam ważność kodu...");
    console.log("   Teraz:", now);
    console.log("   Kod wygasa:", user.emailVerificationCodeExpires);

    if (now > user.emailVerificationCodeExpires) {
      console.log("❌ Kod wygasł!");
      return res.status(400).json({
        success: false,
        message: "Kod weryfikacyjny wygasł. Poproś o nowy kod.",
        expired: true,
      });
    }
    console.log("✅ Kod jest jeszcze ważny");

    // Verify code
    console.log("🔍 Porównuję kody...");
    console.log("   Kod z bazy:", user.emailVerificationCode);
    console.log("   Kod od użytkownika:", code.trim());

    if (user.emailVerificationCode !== code.trim()) {
      console.log("❌ Kody się nie zgadzają!");
      return res.status(400).json({
        success: false,
        message: "Nieprawidłowy kod weryfikacyjny",
      });
    }
    console.log("✅ Kod poprawny!");

    // Mark email as verified
    console.log("💾 Aktualizuję status weryfikacji w bazie...");
    user.isEmailVerified = true;
    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpires = null;

    // Update verification status
    user.isVerified = user.isEmailVerified && user.isPhoneVerified;
    user.registrationStep = user.isVerified ? "completed" : "sms_verification";
    console.log("   isEmailVerified:", user.isEmailVerified);
    console.log("   isVerified:", user.isVerified);
    console.log("   registrationStep:", user.registrationStep);

    await user.save();
    console.log("✅ Status zapisany w bazie");

    console.log(`✅ Email verified successfully for: ${email}`);
    console.log("🟢 ==========================================");
    console.log("🟢 [BACKEND] /verify-email - SUCCESS");
    console.log("🟢 ==========================================\n");

    res.status(200).json({
      success: true,
      message: "Email został pomyślnie zweryfikowany!",
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isVerified: user.isVerified,
        registrationStep: user.registrationStep,
      },
    });
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ [BACKEND] /verify-email - ERROR");
    console.error("❌ ==========================================");
    console.error("❌ Verify email error:", error);
    console.error("❌ Message:", error.message);
    console.error("❌ Stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji email",
    });
  }
};
