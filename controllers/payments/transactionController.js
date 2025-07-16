import Transaction from '../../models/Transaction.js';
import User from '../../models/user.js';
import Ad from '../../models/ad.js';
import { notificationService } from '../notifications/notificationController.js';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Kontroler do zarządzania transakcjami
 */
class TransactionController {
  
  /**
   * Pobieranie listy transakcji użytkownika
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getTransactions(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user.userId;
      
      console.log(`Pobieranie transakcji dla użytkownika: ${userId}`);
      
      // Pobierz transakcje z populacją danych ogłoszenia
      const transactions = await Transaction.findByUser(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      // Policz całkowitą liczbę transakcji
      const totalTransactions = await Transaction.countByUser(userId, status);
      
      // Konwertuj do formatu API
      const formattedTransactions = transactions.map(transaction => ({
        ...transaction.toApiResponse(),
        ad: transaction.adId ? {
          id: transaction.adId._id,
          headline: transaction.adId.headline,
          brand: transaction.adId.brand,
          model: transaction.adId.model,
          price: transaction.adId.price,
          images: transaction.adId.images
        } : null
      }));
      
      res.status(200).json({
        transactions: formattedTransactions,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalTransactions / parseInt(limit)),
        totalTransactions,
        hasNextPage: parseInt(page) < Math.ceil(totalTransactions / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      });
      
    } catch (error) {
      console.error('Błąd podczas pobierania transakcji:', error);
      res.status(500).json({
        message: 'Błąd podczas pobierania transakcji',
        error: error.message
      });
    }
  }
  
  /**
   * Tworzenie nowej transakcji
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async createTransaction(req, res) {
    try {
      const { adId, amount, type = 'listing_payment', paymentMethod } = req.body;
      const userId = req.user.userId;
      
      console.log('Tworzenie nowej transakcji:', { userId, adId, amount, type, paymentMethod });
      
      // Walidacja danych wejściowych
      if (!adId || !amount || !paymentMethod) {
        return res.status(400).json({
          message: 'Brak wymaganych danych: adId, amount, paymentMethod'
        });
      }
      
      // Sprawdź czy ogłoszenie istnieje
      const ad = await Ad.findById(adId);
      if (!ad) {
        return res.status(404).json({
          message: 'Ogłoszenie nie znalezione'
        });
      }
      
      // Generuj unikalny ID transakcji
      const transactionId = `TXN_${Date.now()}_${uuidv4().slice(0, 8)}`;
      
      // Utwórz nową transakcję
      const transaction = new Transaction({
        userId,
        adId,
        amount: parseFloat(amount),
        type,
        status: 'completed', // Symulacja udanej płatności
        paymentMethod,
        transactionId,
        metadata: {
          adTitle: ad.headline || `${ad.brand} ${ad.model}`,
          createdBy: 'payment_simulation'
        }
      });
      
      await transaction.save();
      
      // Utwórz powiadomienie o udanej płatności
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationService.notifyPaymentStatusChange(
          userId,
          'completed',
          adTitle,
          { transactionId: transaction.transactionId, amount }
        );
        console.log('Utworzono powiadomienie o udanej płatności');
      } catch (notificationError) {
        console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      }
      
      // Zwróć utworzoną transakcję
      const populatedTransaction = await Transaction.findById(transaction._id)
        .populate('adId', 'headline brand model price images');
      
      res.status(201).json({
        message: 'Transakcja utworzona pomyślnie',
        transaction: {
          ...populatedTransaction.toApiResponse(),
          ad: populatedTransaction.adId ? {
            id: populatedTransaction.adId._id,
            headline: populatedTransaction.adId.headline,
            brand: populatedTransaction.adId.brand,
            model: populatedTransaction.adId.model,
            price: populatedTransaction.adId.price,
            images: populatedTransaction.adId.images
          } : null
        }
      });
      
    } catch (error) {
      console.error('Błąd podczas tworzenia transakcji:', error);
      res.status(500).json({
        message: 'Błąd podczas tworzenia transakcji',
        error: error.message
      });
    }
  }
  
  /**
   * Żądanie faktury dla transakcji
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async requestInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      console.log(`Żądanie faktury dla transakcji: ${id}, użytkownik: ${userId}`);
      
      // Znajdź transakcję
      const transaction = await Transaction.findOne({ _id: id, userId })
        .populate('adId', 'headline brand model price')
        .populate('userId', 'name lastName email');
      
      if (!transaction) {
        return res.status(404).json({
          message: 'Transakcja nie znaleziona'
        });
      }
      
      // Sprawdź czy można zażądać faktury
      if (!transaction.canRequestInvoice()) {
        return res.status(400).json({
          message: 'Nie można zażądać faktury dla tej transakcji'
        });
      }
      
      // Oznacz jako zażądaną
      transaction.invoiceRequested = true;
      await transaction.save();
      
      // Generuj PDF faktury
      const invoicePath = await this.generateInvoicePDF(transaction);
      
      // Wyślij email z fakturą
      await this.sendInvoiceEmail(transaction, invoicePath);
      
      // Oznacz fakturę jako wygenerowaną
      transaction.invoiceGenerated = true;
      transaction.invoicePdfPath = invoicePath;
      await transaction.save();
      
      // Utwórz powiadomienie o wysłaniu faktury
      try {
        await notificationService.createNotification(
          userId,
          'Faktura wysłana',
          'Faktura została wygenerowana i wysłana na Twój adres email',
          'invoice_ready',
          {
            transactionId: transaction.transactionId,
            invoiceNumber: transaction.invoiceNumber,
            link: `/profile/transactions`
          }
        );
        console.log('Utworzono powiadomienie o wysłaniu faktury');
      } catch (notificationError) {
        console.error('Błąd podczas tworzenia powiadomienia:', notificationError);
      }
      
      res.status(200).json({
        message: 'Faktura została wygenerowana i wysłana na email',
        transaction: transaction.toApiResponse()
      });
      
    } catch (error) {
      console.error('Błąd podczas żądania faktury:', error);
      res.status(500).json({
        message: 'Błąd podczas generowania faktury',
        error: error.message
      });
    }
  }
  
  /**
   * Pobieranie faktury PDF
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async downloadInvoice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      console.log(`Pobieranie faktury dla transakcji: ${id}`);
      
      // Znajdź transakcję
      const transaction = await Transaction.findOne({ _id: id, userId });
      
      if (!transaction) {
        return res.status(404).json({
          message: 'Transakcja nie znaleziona'
        });
      }
      
      // Sprawdź czy faktura jest dostępna
      if (!transaction.isInvoiceAvailable()) {
        return res.status(400).json({
          message: 'Faktura nie jest dostępna do pobrania'
        });
      }
      
      // Sprawdź czy plik istnieje
      if (!fs.existsSync(transaction.invoicePdfPath)) {
        return res.status(404).json({
          message: 'Plik faktury nie został znaleziony'
        });
      }
      
      // Wyślij plik PDF
      const fileName = `Faktura_${transaction.invoiceNumber?.replace(/\//g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(transaction.invoicePdfPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Błąd podczas pobierania faktury:', error);
      res.status(500).json({
        message: 'Błąd podczas pobierania faktury',
        error: error.message
      });
    }
  }
  
  /**
   * Generowanie PDF faktury
   * @param {Object} transaction - Obiekt transakcji
   * @returns {Promise<string>} - Ścieżka do wygenerowanego pliku PDF
   */
  async generateInvoicePDF(transaction) {
    return new Promise((resolve, reject) => {
      try {
        // Utwórz folder na faktury jeśli nie istnieje
        const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true });
        }
        
        // Ścieżka do pliku PDF
        const fileName = `invoice_${transaction._id}_${Date.now()}.pdf`;
        const filePath = path.join(invoicesDir, fileName);
        
        // Utwórz dokument PDF
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Nagłówek faktury
        doc.fontSize(20).text('FAKTURA', 50, 50);
        doc.fontSize(12);
        
        // Informacje o firmie (dane przykładowe)
        doc.text('AutoMarketplace Sp. z o.o.', 50, 100);
        doc.text('ul. Przykładowa 123', 50, 115);
        doc.text('00-001 Warszawa', 50, 130);
        doc.text('NIP: 123-456-78-90', 50, 145);
        
        // Numer i data faktury
        doc.text(`Numer faktury: ${transaction.invoiceNumber}`, 350, 100);
        doc.text(`Data wystawienia: ${new Date().toLocaleDateString('pl-PL')}`, 350, 115);
        doc.text(`Data sprzedaży: ${transaction.createdAt.toLocaleDateString('pl-PL')}`, 350, 130);
        
        // Dane nabywcy
        doc.text('Nabywca:', 50, 200);
        doc.text(`${transaction.userId.name} ${transaction.userId.lastName}`, 50, 215);
        doc.text(`${transaction.userId.email}`, 50, 230);
        
        // Tabela z pozycjami
        const tableTop = 280;
        doc.text('Lp.', 50, tableTop);
        doc.text('Nazwa usługi', 100, tableTop);
        doc.text('Ilość', 300, tableTop);
        doc.text('Cena netto', 350, tableTop);
        doc.text('VAT', 420, tableTop);
        doc.text('Cena brutto', 470, tableTop);
        
        // Linia pod nagłówkami
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        // Pozycja faktury
        const itemY = tableTop + 30;
        const serviceName = transaction.type === 'listing_payment' 
          ? 'Opłata za publikację ogłoszenia' 
          : 'Opłata za promocję ogłoszenia';
        
        const netAmount = (transaction.amount / 1.23).toFixed(2); // Zakładając VAT 23%
        const vatAmount = (transaction.amount - netAmount).toFixed(2);
        
        doc.text('1.', 50, itemY);
        doc.text(serviceName, 100, itemY);
        doc.text('1', 300, itemY);
        doc.text(`${netAmount} PLN`, 350, itemY);
        doc.text('23%', 420, itemY);
        doc.text(`${transaction.amount.toFixed(2)} PLN`, 470, itemY);
        
        // Podsumowanie
        const summaryY = itemY + 50;
        doc.text(`Razem netto: ${netAmount} PLN`, 350, summaryY);
        doc.text(`VAT 23%: ${vatAmount} PLN`, 350, summaryY + 15);
        doc.text(`RAZEM BRUTTO: ${transaction.amount.toFixed(2)} PLN`, 350, summaryY + 30);
        
        // Sposób płatności
        doc.text(`Sposób płatności: ${this.getPaymentMethodName(transaction.paymentMethod)}`, 50, summaryY + 60);
        doc.text('Status: OPŁACONE', 50, summaryY + 75);
        
        // Stopka
        doc.text('Dziękujemy za skorzystanie z naszych usług!', 50, summaryY + 120);
        
        // Zakończ dokument
        doc.end();
        
        // Czekaj na zakończenie zapisu
        stream.on('finish', () => {
          console.log(`Faktura PDF wygenerowana: ${filePath}`);
          resolve(filePath);
        });
        
        stream.on('error', (error) => {
          console.error('Błąd podczas generowania PDF:', error);
          reject(error);
        });
        
      } catch (error) {
        console.error('Błąd podczas tworzenia PDF:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Wysyłanie faktury email
   * @param {Object} transaction - Obiekt transakcji
   * @param {string} invoicePath - Ścieżka do pliku PDF
   */
  async sendInvoiceEmail(transaction, invoicePath) {
    try {
      // Konfiguracja transportera email
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      // Opcje email
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: transaction.userId.email,
        subject: `Faktura ${transaction.invoiceNumber} - AutoMarketplace`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Faktura za usługę AutoMarketplace</h2>
            
            <p>Dzień dobry ${transaction.userId.name},</p>
            
            <p>W załączniku przesyłamy fakturę za opłatę za publikację ogłoszenia w serwisie AutoMarketplace.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Szczegóły transakcji:</h3>
              <p><strong>Numer faktury:</strong> ${transaction.invoiceNumber}</p>
              <p><strong>Data transakcji:</strong> ${transaction.createdAt.toLocaleDateString('pl-PL')}</p>
              <p><strong>Kwota:</strong> ${transaction.amount.toFixed(2)} PLN</p>
              <p><strong>Sposób płatności:</strong> ${this.getPaymentMethodName(transaction.paymentMethod)}</p>
              <p><strong>Status:</strong> Opłacone</p>
            </div>
            
            <p>Faktura została załączona do tej wiadomości w formacie PDF.</p>
            
            <p>W razie pytań prosimy o kontakt.</p>
            
            <p>Pozdrawiamy,<br>
            Zespół AutoMarketplace</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
              Ta wiadomość została wygenerowana automatycznie. Prosimy nie odpowiadać na ten email.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Faktura_${transaction.invoiceNumber.replace(/\//g, '_')}.pdf`,
            path: invoicePath
          }
        ]
      };
      
      // Wyślij email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email z fakturą wysłany:', info.messageId);
      
    } catch (error) {
      console.error('Błąd podczas wysyłania email:', error);
      throw error;
    }
  }
  
  /**
   * Pobieranie nazwy metody płatności
   * @param {string} method - Kod metody płatności
   * @returns {string} - Nazwa metody płatności
   */
  getPaymentMethodName(method) {
    const methods = {
      'card': 'Karta płatnicza',
      'blik': 'BLIK',
      'transfer': 'Przelew bankowy',
      'paypal': 'PayPal',
      'przelewy24': 'Przelewy24',
      'payu': 'PayU'
    };
    
    return methods[method] || method;
  }
}

// Eksport instancji kontrolera
const transactionController = new TransactionController();
export default transactionController;
