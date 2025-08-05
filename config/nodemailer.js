// config/nodemailer.js
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Konfiguracja transportera nodemailer z Brevo
const createTransporter = () => {
  // Sprawdź czy MOCK_EMAIL jest wyłączone
  if (process.env.MOCK_EMAIL === 'false') {
    logger.info('Using Brevo SMTP for real email sending', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      mockEmail: process.env.MOCK_EMAIL
    });
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.BREVO_API_KEY
      }
    });
  } 
  // W trybie mock używamy ethereal.email do testowania
  else {
    logger.info('Using test email account (ethereal.email) - MOCK MODE', {
      mockEmail: process.env.MOCK_EMAIL,
      reason: 'MOCK_EMAIL is not set to false'
    });
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'mock@ethereal.email',
        pass: process.env.ETHEREAL_PASSWORD || 'mockpassword'
      }
    });
  }
};

/**
 * Wysyła email z resetem hasła
 * @param {string} email - Adres email odbiorcy
 * @param {string} token - Token resetowania hasła
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendResetPasswordEmail = async (email, token) => {
  try {
    // W trybie deweloperskim tylko logujemy
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Password reset email sent (development mode)', { 
        email: email,
        tokenLength: token.length 
      });
      return true;
    }

    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@marketplace.com',
      to: email,
      subject: 'Reset hasła',
      html: `
        <h1>Reset hasła</h1>
        <p>Otrzymujesz tę wiadomość, ponieważ Ty (lub ktoś inny) zażądał zresetowania hasła do Twojego konta.</p>
        <p>Kliknij poniższy link, aby zresetować hasło:</p>
        <a href="${resetUrl}" target="_blank">Resetuj hasło</a>
        <p>Jeśli to nie Ty zażądałeś zresetowania hasła, zignoruj tę wiadomość, a Twoje hasło pozostanie niezmienione.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', { email: email });
    return true;
  } catch (error) {
    logger.error('Error sending password reset email', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    return false;
  }
};

/**
 * Wysyła email z linkiem resetowania hasła
 * @param {string} email - Adres email odbiorcy
 * @param {string} resetLink - Link resetowania hasła
 * @param {string} name - Imię użytkownika (opcjonalnie)
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendPasswordResetEmail = async (email, resetLink, name = null) => {
  try {
    const transporter = createTransporter();
    
    const greeting = name ? `Cześć ${name}!` : 'Cześć!';
    const fromName = process.env.EMAIL_FROM_NAME || process.env.FROM_NAME || 'AutoSell.pl';
    const fromEmail = process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'noreply@marketplace.com';
    
    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Resetowanie hasła - AutoSell.pl',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #007bff; margin: 0; font-size: 28px;">AutoSell.pl</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Marketplace samochodowy</p>
            </div>
            
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Resetowanie hasła</h2>
            <p style="color: #555; line-height: 1.6;">${greeting}</p>
            <p style="color: #555; line-height: 1.6;">Otrzymujesz tę wiadomość, ponieważ zażądano zresetowania hasła do Twojego konta w AutoSell.pl.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                🔑 Resetuj hasło
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6;">Lub skopiuj i wklej poniższy link do przeglądarki:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #dee2e6;">
              ${resetLink}
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>⏰ Link jest ważny przez 1 godzinę.</strong></p>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24;"><strong>⚠️ Jeśli to nie Ty zażądałeś zresetowania hasła, zignoruj tę wiadomość. Twoje hasło pozostanie niezmienione.</strong></p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Ta wiadomość została wysłana automatycznie przez AutoSell.pl<br>
              Proszę nie odpowiadać na ten email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully via Brevo', { 
      email: email,
      from: `${fromName} <${fromEmail}>`,
      linkLength: resetLink.length
    });
    return true;
  } catch (error) {
    logger.error('Error sending password reset email via Brevo', {
      error: error.message,
      stack: error.stack,
      email: email,
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER
      }
    });
    return false;
  }
};

/**
 * Wysyła email z kodem weryfikacyjnym
 * @param {string} email - Adres email odbiorcy
 * @param {string} code - 6-cyfrowy kod weryfikacyjny
 * @param {string} name - Imię użytkownika (opcjonalnie)
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendVerificationEmail = async (email, code, name = null) => {
  try {
    // W trybie deweloperskim tylko logujemy
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Verification email sent (development mode)', {
        email: email,
        codeLength: code.length,
        userName: name || 'anonymous'
      });
      return true;
    }

    const transporter = createTransporter();
    
    const greeting = name ? `Cześć ${name}!` : 'Cześć!';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@marketplace.com',
      to: email,
      subject: 'Kod weryfikacyjny - Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Weryfikacja adresu email</h1>
          <p>${greeting}</p>
          <p>Aby dokończyć rejestrację w naszym serwisie, wprowadź poniższy kod weryfikacyjny:</p>
          
          <div style="background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h2 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${code}</h2>
          </div>
          
          <p><strong>Kod jest ważny przez 10 minut.</strong></p>
          <p>Jeśli to nie Ty próbujesz się zarejestrować, zignoruj tę wiadomość.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            Ta wiadomość została wysłana automatycznie. Proszę nie odpowiadać na ten email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent successfully', { email: email });
    return true;
  } catch (error) {
    logger.error('Error sending verification email', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    return false;
  }
};

/**
 * Wysyła email z linkiem weryfikacyjnym
 * @param {string} email - Adres email odbiorcy
 * @param {string} verificationLink - Link weryfikacyjny
 * @param {string} name - Imię użytkownika (opcjonalnie)
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendVerificationLinkEmail = async (email, verificationLink, name = null) => {
  try {
    const transporter = createTransporter();
    
    const greeting = name ? `Cześć ${name}!` : 'Cześć!';
    const fromName = process.env.EMAIL_FROM_NAME || process.env.FROM_NAME || 'AutoSell.pl';
    const fromEmail = process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'noreply@marketplace.com';
    
    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Weryfikacja adresu email - AutoSell.pl',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #007bff; margin: 0; font-size: 28px;">AutoSell.pl</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Marketplace samochodowy</p>
            </div>
            
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Weryfikacja adresu email</h2>
            <p style="color: #555; line-height: 1.6;">${greeting}</p>
            <p style="color: #555; line-height: 1.6;">Aby dokończyć rejestrację w AutoSell.pl, kliknij poniższy link weryfikacyjny:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                ✅ Zweryfikuj adres email
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.6;">Lub skopiuj i wklej poniższy link do przeglądarki:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #dee2e6;">
              ${verificationLink}
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>⏰ Link jest ważny przez 24 godziny.</strong></p>
            </div>
            
            <p style="color: #555; line-height: 1.6;">Jeśli to nie Ty próbujesz się zarejestrować, zignoruj tę wiadomość.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Ta wiadomość została wysłana automatycznie przez AutoSell.pl<br>
              Proszę nie odpowiadać na ten email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Verification link email sent successfully via Brevo', { 
      email: email,
      from: `${fromName} <${fromEmail}>`,
      linkLength: verificationLink.length
    });
    return true;
  } catch (error) {
    logger.error('Error sending verification link email via Brevo', {
      error: error.message,
      stack: error.stack,
      email: email,
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER
      }
    });
    return false;
  }
};

/**
 * Wysyła email z powiadomieniem o nowej wiadomości
 * @param {string} email - Adres email odbiorcy
 * @param {string} senderName - Nazwa nadawcy
 * @param {string} messageSubject - Temat wiadomości
 * @param {string} messagePreview - Podgląd treści wiadomości
 * @param {string} adTitle - Tytuł ogłoszenia (opcjonalnie)
 * @returns {Promise<boolean>} - Czy email został wysłany
 */
export const sendNewMessageEmail = async (email, senderName, messageSubject, messagePreview, adTitle = null) => {
  try {
    // W trybie deweloperskim tylko logujemy
    if (process.env.NODE_ENV !== 'production') {
      logger.info('New message email sent (development mode)', {
        email: email,
        senderName: senderName,
        messageSubject: messageSubject,
        messagePreviewLength: messagePreview.length,
        adTitle: adTitle || 'none'
      });
      return true;
    }

    const transporter = createTransporter();
    const inboxUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/messages`;

    // Przygotowanie treści emaila
    let subject = `Nowa wiadomość od ${senderName}`;
    let adInfo = '';
    
    if (adTitle) {
      subject += ` - ${adTitle}`;
      adInfo = `<p>Wiadomość dotyczy ogłoszenia: <strong>${adTitle}</strong></p>`;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@marketplace.com',
      to: email,
      subject: subject,
      html: `
        <h1>Nowa wiadomość</h1>
        <p>Otrzymałeś nową wiadomość od użytkownika <strong>${senderName}</strong>.</p>
        ${adInfo}
        <h2>Temat: ${messageSubject}</h2>
        <p><em>${messagePreview}...</em></p>
        <p>Aby przeczytać całą wiadomość i odpowiedzieć, kliknij poniższy link:</p>
        <a href="${inboxUrl}" target="_blank">Przejdź do skrzynki odbiorczej</a>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('New message email sent successfully', { email: email });
    return true;
  } catch (error) {
    logger.error('Error sending new message email', {
      error: error.message,
      stack: error.stack,
      email: email
    });
    return false;
  }
};
