import { Resend } from "resend";
import crypto from "crypto";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Email Service using Resend for sending various types of emails
 * Resend is a modern email API with better deliverability than traditional SMTP
 */

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AutoSell <onboarding@resend.dev>",
      to: [email],
      subject: "Reset hasła - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #35530A 0%, #5A7D2A 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
              background: white;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background: linear-gradient(135deg, #35530A 0%, #5A7D2A 100%);
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .link-box {
              background: #f9f9f9;
              padding: 16px;
              border-radius: 8px;
              margin: 24px 0;
              word-break: break-all;
              font-size: 14px;
              color: #35530A;
              border: 1px solid #e0e0e0;
            }
            .warning { 
              background: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 16px; 
              margin: 24px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #856404;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              font-size: 14px; 
              color: #666;
              background: #f9f9f9;
              border-top: 1px solid #e0e0e0;
            }
            .footer a {
              color: #35530A;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset hasła</h1>
            </div>
            <div class="content">
              <p>Cześć <strong>${userName}</strong>,</p>
              <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta w serwisie <strong>AutoSell</strong>.</p>
              <p>Kliknij w poniższy przycisk, aby ustawić nowe hasło:</p>
              <div class="button-container">
                <a href="${resetUrl}" class="button">Zresetuj hasło</a>
              </div>
              <p style="font-size: 14px; color: #666;">Lub skopiuj i wklej ten link w przeglądarce:</p>
              <div class="link-box">${resetUrl}</div>
              <div class="warning">
                <strong>⚠️ Uwaga!</strong> Link jest ważny przez <strong>1 godzinę</strong>. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
              </div>
              <p>Jeśli masz pytania, skontaktuj się z nami: <a href="mailto:kontakt@autosell.pl" style="color: #35530A;">kontakt@autosell.pl</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AutoSell. Wszystkie prawa zastrzeżone.</p>
              <p><a href="${config.app.frontendUrl}">Odwiedź autosell.pl</a></p>
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
    });

    if (error) {
      logger.error("Failed to send password reset email via Resend", {
        error: error.message,
        email,
      });
      throw error;
    }

    logger.info("Password reset email sent successfully via Resend", {
      to: email,
      userName,
      emailId: data?.id,
    });

    return { success: true, data };
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
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AutoSell <onboarding@resend.dev>",
      to: [newEmail],
      subject: "Weryfikacja nowego adresu email - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #35530A 0%, #5A7D2A 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
              background: white;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
            }
            .code-container {
              text-align: center;
              margin: 32px 0;
            }
            .code { 
              display: inline-block;
              font-size: 42px; 
              font-weight: bold; 
              color: #35530A;
              padding: 24px 40px; 
              background: linear-gradient(135deg, #f0f7e8 0%, #e8f3dc 100%);
              border-radius: 12px;
              letter-spacing: 12px;
              border: 2px solid #35530A;
              font-family: 'Courier New', monospace;
            }
            .timer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 16px;
              font-weight: 500;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              font-size: 14px; 
              color: #666;
              background: #f9f9f9;
              border-top: 1px solid #e0e0e0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Weryfikacja email</h1>
            </div>
            <div class="content">
              <p>Cześć <strong>${userName}</strong>,</p>
              <p>Otrzymaliśmy prośbę o zmianę adresu email w Twoim koncie <strong>AutoSell</strong>.</p>
              <p>Użyj poniższego kodu weryfikacyjnego:</p>
              <div class="code-container">
                <div class="code">${verificationCode}</div>
                <div class="timer">⏱️ Kod jest ważny przez <strong>15 minut</strong></div>
              </div>
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
    });

    if (error) {
      logger.error("Failed to send email change verification via Resend", {
        error: error.message,
        email: newEmail,
      });
      throw error;
    }

    logger.info("Email change verification sent successfully via Resend", {
      to: newEmail,
      userName,
      emailId: data?.id,
    });

    return { success: true, data };
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
    const changesList = changes.map((change) => `<li>${change}</li>`).join("");

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AutoSell <onboarding@resend.dev>",
      to: [email],
      subject: "Powiadomienie o zmianie danych - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #35530A 0%, #5A7D2A 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
              background: white;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
            }
            .changes-list {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 24px 0;
            }
            .changes-list ul {
              margin: 0;
              padding-left: 20px;
            }
            .changes-list li {
              margin: 8px 0;
              color: #35530A;
              font-weight: 500;
            }
            .warning { 
              background: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 16px; 
              margin: 24px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #856404;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              font-size: 14px; 
              color: #666;
              background: #f9f9f9;
              border-top: 1px solid #e0e0e0;
            }
            .footer a {
              color: #35530A;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Zmiana danych konta</h1>
            </div>
            <div class="content">
              <p>Cześć <strong>${userName}</strong>,</p>
              <p>Informujemy, że w Twoim koncie <strong>AutoSell</strong> zostały zmienione następujące dane:</p>
              <div class="changes-list">
                <ul>${changesList}</ul>
              </div>
              <div class="warning">
                <strong>⚠️ Uwaga!</strong> Jeśli to nie Ty dokonałeś tych zmian, natychmiast skontaktuj się z nami!
              </div>
              <p>Kontakt: <a href="mailto:kontakt@autosell.pl" style="color: #35530A;">kontakt@autosell.pl</a></p>
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
    });

    if (error) {
      logger.error("Failed to send profile change notification via Resend", {
        error: error.message,
        email,
      });
      throw error;
    }

    logger.info("Profile change notification sent successfully via Resend", {
      to: email,
      userName,
      changes,
      emailId: data?.id,
    });

    return { success: true, data };
  } catch (error) {
    logger.error("Failed to send profile change notification", {
      error: error.message,
      email,
    });
    throw error;
  }
};

/**
 * Send registration verification code email
 */
export const sendRegistrationVerificationCode = async (
  email,
  verificationCode,
  userName
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AutoSell <onboarding@resend.dev>",
      to: [email],
      subject: "Kod weryfikacyjny rejestracji - AutoSell",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #35530A 0%, #5A7D2A 100%);
              color: white; 
              padding: 40px 30px; 
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px;
              background: white;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
            }
            .code-container {
              text-align: center;
              margin: 32px 0;
            }
            .code { 
              display: inline-block;
              font-size: 42px; 
              font-weight: bold; 
              color: #35530A;
              padding: 24px 40px; 
              background: linear-gradient(135deg, #f0f7e8 0%, #e8f3dc 100%);
              border-radius: 12px;
              letter-spacing: 12px;
              border: 2px solid #35530A;
              font-family: 'Courier New', monospace;
            }
            .timer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 16px;
              font-weight: 500;
            }
            .warning { 
              background: #e3f2fd; 
              border-left: 4px solid #2196f3; 
              padding: 16px; 
              margin: 24px 0;
              border-radius: 4px;
            }
            .warning strong {
              color: #1565c0;
            }
            .footer { 
              text-align: center; 
              padding: 24px 30px;
              font-size: 14px; 
              color: #666;
              background: #f9f9f9;
              border-top: 1px solid #e0e0e0;
            }
            .footer a {
              color: #35530A;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Witaj w AutoSell!</h1>
            </div>
            <div class="content">
              <p>Cześć <strong>${userName}</strong>,</p>
              <p>Dziękujemy za rejestrację w serwisie <strong>AutoSell</strong>!</p>
              <p>Aby dokończyć proces rejestracji, wprowadź poniższy kod weryfikacyjny:</p>
              <div class="code-container">
                <div class="code">${verificationCode}</div>
                <div class="timer">⏱️ Kod jest ważny przez <strong>15 minut</strong></div>
              </div>
              <div class="warning">
                <strong>ℹ️ Ważne!</strong> Jeśli nie prosiłeś o rejestrację w AutoSell, zignoruj tę wiadomość.
              </div>
              <p>Jeśli masz pytania, skontaktuj się z nami: <a href="mailto:kontakt@autosell.pl" style="color: #35530A;">kontakt@autosell.pl</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AutoSell. Wszystkie prawa zastrzeżone.</p>
              <p><a href="${config.app.frontendUrl}">Odwiedź autosell.pl</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Witaj w AutoSell!
        
        Cześć ${userName},
        
        Dziękujemy za rejestrację w serwisie AutoSell.
        
        Kod weryfikacyjny: ${verificationCode}
        
        Kod jest ważny przez 15 minut.
        
        Jeśli nie prosiłeś o rejestrację, zignoruj tę wiadomość.
        
        © ${new Date().getFullYear()} AutoSell
      `,
    });

    if (error) {
      logger.error("Failed to send registration verification code via Resend", {
        error: error.message,
        email,
      });
      throw error;
    }

    logger.info("Registration verification code sent successfully via Resend", {
      to: email,
      userName,
      emailId: data?.id,
    });

    return { success: true, data };
  } catch (error) {
    logger.error("Failed to send registration verification code", {
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
  sendRegistrationVerificationCode,
  generateResetToken,
  generateVerificationCode,
};
