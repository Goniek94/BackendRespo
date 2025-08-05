// config/nodemailer.js
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Konfiguracja transportera nodemailer
const createTransporter = () => {
  // W środowisku produkcyjnym użyj rzeczywistych danych SMTP
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } 
  // W środowisku deweloperskim używamy ethereal.email do testowania
  else {
    logger.info('Using test email account (ethereal.email)');
    return nodemailer.createTransporter({
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
