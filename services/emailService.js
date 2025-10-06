import nodemailer from "nodemailer";
import crypto from "crypto";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Email Service for sending various types of emails
 */

// Create transporter with configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
};

/**
 * Generate a secure reset token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Generate a 6-digit verification code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"AutoSell" <${config.email.from}>`,
      to: email,
      subject: "Reset hasła - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #35530A; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #35530A; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset hasła</h1>
            </div>
            <div class="content">
              <p>Cześć ${userName},</p>
              <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta w serwisie AutoSell.</p>
              <p>Kliknij w poniższy przycisk, aby ustawić nowe hasło:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Zresetuj hasło</a>
              </div>
              <p>Lub skopiuj i wklej ten link w przeglądarce:</p>
              <p style="word-break: break-all; color: #35530A;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Uwaga!</strong> Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
              </div>
              <p>Jeśli masz pytania, skontaktuj się z nami: <a href="mailto:kontakt@autosell.pl">kontakt@autosell.pl</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AutoSell. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset hasła - AutoSell
        
        Cześć ${userName},
        
        Otrzymaliśmy prośbę o reset hasła do Twojego konta.
        
        Użyj poniższego linku, aby ustawić nowe hasło:
        ${resetUrl}
        
        Link jest ważny przez 1 godzinę.
        
        Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
        
        © ${new Date().getFullYear()} AutoSell
      `,
    };

    await transporter.sendMail(mailOptions);

    logger.info("Password reset email sent successfully", {
      to: email,
      userName,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to send password reset email", {
      error: error.message,
      email,
    });
    throw error;
  }
};

/**
 * Send email change verification
 */
export const sendEmailChangeVerification = async (
  newEmail,
  verificationCode,
  userName
) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"AutoSell" <${config.email.from}>`,
      to: newEmail,
      subject: "Weryfikacja nowego adresu email - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #35530A; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code { font-size: 32px; font-weight: bold; color: #35530A; text-align: center; padding: 20px; background: white; border-radius: 5px; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Weryfikacja email</h1>
            </div>
            <div class="content">
              <p>Cześć ${userName},</p>
              <p>Otrzymaliśmy prośbę o zmianę adresu email w Twoim koncie AutoSell.</p>
              <p>Użyj poniższego kodu weryfikacyjnego:</p>
              <div class="code">${verificationCode}</div>
              <p style="text-align: center; color: #666; margin-top: 20px;">Kod jest ważny przez 15 minut</p>
              <p>Jeśli nie prosiłeś o zmianę email, zignoruj tę wiadomość.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AutoSell. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Weryfikacja nowego adresu email - AutoSell
        
        Cześć ${userName},
        
        Kod weryfikacyjny: ${verificationCode}
        
        Kod jest ważny przez 15 minut.
        
        © ${new Date().getFullYear()} AutoSell
      `,
    };

    await transporter.sendMail(mailOptions);

    logger.info("Email change verification sent successfully", {
      to: newEmail,
      userName,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to send email change verification", {
      error: error.message,
      email: newEmail,
    });
    throw error;
  }
};

/**
 * Send phone change verification SMS (placeholder - requires SMS provider)
 */
export const sendPhoneChangeVerification = async (
  phoneNumber,
  verificationCode
) => {
  try {
    // TODO: Implement SMS sending with provider like Twilio, AWS SNS, etc.
    logger.info("Phone verification code generated", {
      phoneNumber,
      code: verificationCode,
    });

    // For now, just log - in production, use SMS provider
    console.log(
      `📱 SMS to ${phoneNumber}: Your verification code is ${verificationCode}`
    );

    return { success: true };
  } catch (error) {
    logger.error("Failed to send phone verification", {
      error: error.message,
      phoneNumber,
    });
    throw error;
  }
};

/**
 * Send profile data change notification
 */
export const sendProfileChangeNotification = async (
  email,
  userName,
  changes
) => {
  try {
    const transporter = createTransporter();

    const changesList = changes.map((change) => `<li>${change}</li>`).join("");

    const mailOptions = {
      from: `"AutoSell" <${config.email.from}>`,
      to: email,
      subject: "Powiadomienie o zmianie danych - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #35530A; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            ul { background: white; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Zmiana danych konta</h1>
            </div>
            <div class="content">
              <p>Cześć ${userName},</p>
              <p>Informujemy, że w Twoim koncie AutoSell zostały zmienione następujące dane:</p>
              <ul>${changesList}</ul>
              <div class="warning">
                <strong>⚠️ Uwaga!</strong> Jeśli to nie Ty dokonałeś tych zmian, natychmiast skontaktuj się z nami!
              </div>
              <p>Kontakt: <a href="mailto:kontakt@autosell.pl">kontakt@autosell.pl</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AutoSell. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Zmiana danych konta - AutoSell
        
        Cześć ${userName},
        
        W Twoim koncie zostały zmienione następujące dane:
        ${changes.join("\n")}
        
        Jeśli to nie Ty, skontaktuj się z nami: kontakt@autosell.pl
        
        © ${new Date().getFullYear()} AutoSell
      `,
    };

    await transporter.sendMail(mailOptions);

    logger.info("Profile change notification sent successfully", {
      to: email,
      userName,
      changes,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to send profile change notification", {
      error: error.message,
      email,
    });
    throw error;
  }
};

export default {
  sendPasswordResetEmail,
  sendEmailChangeVerification,
  sendPhoneChangeVerification,
  sendProfileChangeNotification,
  generateResetToken,
  generateVerificationCode,
};
