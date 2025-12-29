// config/twilio.js
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
let twilioClient = null;

// Check if Twilio is configured
const isTwilioConfigured = () => {
  return accountSid && authToken && twilioPhoneNumber;
};

// Initialize client only if configured
if (isTwilioConfigured()) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log("✅ Twilio client initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing Twilio client:", error.message);
  }
} else {
  console.warn(
    "⚠️ Twilio not configured - SMS functionality will be simulated"
  );
}

/**
 * Send verification code via SMS using Twilio
 * @param {string} phone - Recipient phone number (format: +48XXXXXXXXX)
 * @param {string} code - Verification code to send
 * @returns {Promise<object>} - Object with message information
 */
export const sendVerificationCode = async (phone, code) => {
  try {
    // Validate phone number format
    if (!phone || !phone.startsWith("+")) {
      throw new Error(
        "Phone number must be in international format (e.g., +48732108041)"
      );
    }

    // Validate code (accept 4-6 digit codes)
    if (!code || code.length < 4 || code.length > 6) {
      throw new Error("Verification code must be 4-6 digits");
    }

    // If Twilio is not configured, use simulation
    if (!twilioClient) {
      console.log("====================================");
      console.log(
        `⚠️ SIMULATION MODE: Sending verification code to ${phone.substring(
          0,
          6
        )}***`
      );
      console.log(`📱 Code: ${code}`);
      console.log("====================================");

      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        sid: "SM_SIMULATED_" + Math.random().toString(36).substring(2, 15),
        to: phone,
        body: `Twój kod weryfikacyjny AutoSell: ${code}`,
        status: "delivered",
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: true,
      };
    }

    // Send real SMS via Twilio
    console.log(`📤 Sending verification code to ${phone.substring(0, 6)}***`);

    const message = await twilioClient.messages.create({
      body: `Twój kod weryfikacyjny AutoSell: ${code}\n\nKod jest ważny przez 10 minut.`,
      from: twilioPhoneNumber,
      to: phone,
    });

    console.log(`✅ SMS sent successfully. SID: ${message.sid}`);

    return {
      sid: message.sid,
      to: message.to,
      body: message.body,
      status: message.status,
      dateCreated: message.dateCreated,
      success: true,
      simulated: false,
    };
  } catch (error) {
    console.error("❌ Error sending verification code:", error.message);

    // Return error object
    return {
      success: false,
      error: error.message,
      code: error.code || "TWILIO_ERROR",
    };
  }
};

/**
 * Verify SMS code (this is handled by your backend logic)
 * This function is kept for compatibility but verification is done in the controller
 * @param {string} phone - Phone number
 * @param {string} code - Code to verify
 * @returns {Promise<object>} - Verification result
 */
export const verifyCode = async (phone, code) => {
  console.log(`🔍 Verifying code for ${phone.substring(0, 6)}***`);

  // This is just a placeholder - actual verification happens in the controller
  // by comparing with the code stored in the database
  const isValid = code && code.length === 4 && /^\d+$/.test(code);

  return {
    valid: isValid,
    status: isValid ? "approved" : "denied",
    phone: phone,
  };
};

/**
 * Send welcome message via SMS
 * @param {string} phone - Recipient phone number
 * @param {string} name - User's name
 * @returns {Promise<object>} - Object with message information
 */
export const sendWelcomeMessage = async (phone, name) => {
  try {
    // Validate phone number format
    if (!phone || !phone.startsWith("+")) {
      throw new Error("Phone number must be in international format");
    }

    // If Twilio is not configured, use simulation
    if (!twilioClient) {
      console.log("====================================");
      console.log(`⚠️ SIMULATION MODE: Sending welcome message to ${name}`);
      console.log("====================================");

      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        sid: "SM_SIMULATED_" + Math.random().toString(36).substring(2, 15),
        to: phone,
        body: `Witaj ${name}! Dziękujemy za rejestrację w AutoSell.`,
        status: "delivered",
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: true,
      };
    }

    // Send real SMS via Twilio
    console.log(`📤 Sending welcome message to ${name}`);

    const message = await twilioClient.messages.create({
      body: `Witaj ${name}! 🎉\n\nDziękujemy za rejestrację w AutoSell. Twoje konto zostało pomyślnie utworzone.\n\nMiłego korzystania z naszej platformy!`,
      from: twilioPhoneNumber,
      to: phone,
    });

    console.log(`✅ Welcome SMS sent successfully. SID: ${message.sid}`);

    return {
      sid: message.sid,
      to: message.to,
      body: message.body,
      status: message.status,
      dateCreated: message.dateCreated,
      success: true,
      simulated: false,
    };
  } catch (error) {
    console.error("❌ Error sending welcome message:", error.message);

    return {
      success: false,
      error: error.message,
      code: error.code || "TWILIO_ERROR",
    };
  }
};

/**
 * Get Twilio configuration status
 * @returns {object} - Configuration status
 */
export const getTwilioStatus = () => {
  return {
    configured: isTwilioConfigured(),
    accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : "Not set",
    phoneNumber: twilioPhoneNumber || "Not set",
    clientInitialized: twilioClient !== null,
  };
};

// Export default object
export default {
  sendVerificationCode,
  verifyCode,
  sendWelcomeMessage,
  getTwilioStatus,
};
