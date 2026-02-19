// config/smsapi.js
import dotenv from "dotenv";
import https from "https";

dotenv.config();

// SMSAPI configuration
const smsapiToken = process.env.SMSAPI_TOKEN;
const smsapiSender = process.env.SMSAPI_SENDER || ""; // Empty string = use SMSAPI default
const mockSms = process.env.MOCK_SMS === "true";

// Check if SMSAPI is configured
const isSMSAPIConfigured = () => {
  return smsapiToken && smsapiToken.length > 0;
};

// Initialize check
if (isSMSAPIConfigured()) {
  console.log("✅ SMSAPI client initialized successfully");
  console.log(`📤 Sender name: ${smsapiSender}`);
  console.log(`🔧 Mock mode: ${mockSms ? "ENABLED" : "DISABLED"}`);
} else {
  console.warn(
    "⚠️ SMSAPI not configured - SMS functionality will be simulated",
  );
}

/**
 * Send verification code via SMS using SMSAPI
 * @param {string} phone - Recipient phone number (format: +48XXXXXXXXX)
 * @param {string} code - Verification code to send
 * @returns {Promise<object>} - Object with message information
 */
export const sendVerificationCode = async (phone, code) => {
  try {
    // Validate phone number format
    if (!phone || !phone.startsWith("+")) {
      throw new Error(
        "Phone number must be in international format (e.g., +48732108041)",
      );
    }

    // Validate code (accept 4-6 digit codes)
    if (!code || code.length < 4 || code.length > 6) {
      throw new Error("Verification code must be 4-6 digits");
    }

    // Format phone number for SMSAPI (remove + sign)
    const formattedPhone = phone.replace("+", "");

    // Message content
    const message = `Twój kod weryfikacyjny AutoSell: ${code}\n\nKod jest ważny przez 10 minut.`;

    // If SMSAPI is not configured OR mock mode is enabled, use simulation
    if (!isSMSAPIConfigured() || mockSms) {
      console.log("====================================");
      console.log(
        `⚠️ ${mockSms ? "MOCK MODE" : "SIMULATION MODE"}: Sending verification code to ${phone.substring(0, 6)}***`,
      );
      console.log(`📱 Code: ${code}`);
      console.log(`📝 Message: ${message}`);
      console.log("====================================");

      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        id: "MOCK_" + Math.random().toString(36).substring(2, 15),
        to: phone,
        message: message,
        status: "delivered",
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: true,
      };
    }

    // Send real SMS via SMSAPI
    console.log(
      `📤 Sending verification code via SMSAPI to ${phone.substring(0, 6)}***`,
    );

    const smsData = JSON.stringify({
      to: formattedPhone,
      message: message,
      ...(smsapiSender && { from: smsapiSender }), // Only include 'from' if sender is set
      format: "json",
    });

    const options = {
      hostname: "api.smsapi.pl",
      port: 443,
      path: "/sms.do",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(smsData),
        Authorization: `Bearer ${smsapiToken}`,
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsedData });
          } catch (error) {
            reject(new Error(`Failed to parse SMSAPI response: ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(smsData);
      req.end();
    });

    // Check if SMS was sent successfully
    if (response.statusCode === 200 && response.data.count > 0) {
      const smsInfo = response.data.list[0];
      console.log(`✅ SMS sent successfully via SMSAPI. ID: ${smsInfo.id}`);

      return {
        id: smsInfo.id,
        to: phone,
        message: message,
        status: smsInfo.status,
        points: smsInfo.points,
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: false,
      };
    } else {
      throw new Error(
        `SMSAPI error: ${response.data.error || "Unknown error"} (Code: ${response.data.error_code || "N/A"})`,
      );
    }
  } catch (error) {
    console.error(
      "❌ Error sending verification code via SMSAPI:",
      error.message,
    );

    // Throw error instead of returning error object
    // This ensures proper error handling in the calling code
    throw new Error(`SMS sending failed: ${error.message}`);
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
  const isValid = code && code.length >= 4 && /^\d+$/.test(code);

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

    const message = `Witaj ${name}! 🎉\n\nDziękujemy za rejestrację w AutoSell. Twoje konto zostało pomyślnie utworzone.\n\nMiłego korzystania z naszej platformy!`;

    // If SMSAPI is not configured OR mock mode is enabled, use simulation
    if (!isSMSAPIConfigured() || mockSms) {
      console.log("====================================");
      console.log(
        `⚠️ ${mockSms ? "MOCK MODE" : "SIMULATION MODE"}: Sending welcome message to ${name}`,
      );
      console.log("====================================");

      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        id: "MOCK_" + Math.random().toString(36).substring(2, 15),
        to: phone,
        message: message,
        status: "delivered",
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: true,
      };
    }

    // Send real SMS via SMSAPI
    console.log(`📤 Sending welcome message to ${name}`);

    const formattedPhone = phone.replace("+", "");

    const smsData = JSON.stringify({
      to: formattedPhone,
      message: message,
      ...(smsapiSender && { from: smsapiSender }), // Only include 'from' if sender is set
      format: "json",
    });

    const options = {
      hostname: "api.smsapi.pl",
      port: 443,
      path: "/sms.do",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(smsData),
        Authorization: `Bearer ${smsapiToken}`,
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsedData });
          } catch (error) {
            reject(new Error(`Failed to parse SMSAPI response: ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(smsData);
      req.end();
    });

    if (response.statusCode === 200 && response.data.count > 0) {
      const smsInfo = response.data.list[0];
      console.log(`✅ Welcome SMS sent successfully. ID: ${smsInfo.id}`);

      return {
        id: smsInfo.id,
        to: phone,
        message: message,
        status: smsInfo.status,
        points: smsInfo.points,
        dateCreated: new Date().toISOString(),
        success: true,
        simulated: false,
      };
    } else {
      throw new Error(
        `SMSAPI error: ${response.data.error || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error("❌ Error sending welcome message:", error.message);

    return {
      success: false,
      error: error.message,
      code: error.code || "SMSAPI_ERROR",
    };
  }
};

/**
 * Get SMSAPI configuration status
 * @returns {object} - Configuration status
 */
export const getSMSAPIStatus = () => {
  return {
    configured: isSMSAPIConfigured(),
    token: smsapiToken ? `${smsapiToken.substring(0, 8)}...` : "Not set",
    sender: smsapiSender,
    mockMode: mockSms,
  };
};

// Export default object
export default {
  sendVerificationCode,
  verifyCode,
  sendWelcomeMessage,
  getSMSAPIStatus,
};
