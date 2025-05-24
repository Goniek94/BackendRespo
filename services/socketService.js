import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

/**
 * Klasa SocketService - zarządza połączeniami WebSocket i powiadomieniami w czasie rzeczywistym
 * @class
 */
class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Mapa przechowująca połączenia użytkowników: userId -> Set of socket.id
    this.socketUsers = new Map(); // Mapa przechowująca użytkowników dla socketów: socket.id -> userId
  }

  /**
   * Inicjalizuje serwer Socket.IO
   * @param {Object} server - Serwer HTTP
   * @returns {Object} - Instancja Socket.IO
   */
  initialize(server) {
    if (this.io) {
      console.log('Socket.IO już zainicjalizowany');
      return this.io;
    }

    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000, // 60 sekund timeout dla ping
    });

    // Middleware do uwierzytelniania połączeń
    this.io.use(this.authMiddleware.bind(this));

    // Obsługa połączeń
    this.io.on('connection', this.handleConnection.bind(this));

    console.log('✅ Socket.IO zainicjalizowany');
    return this.io;
  }

  /**
   * Middleware do uwierzytelniania połączeń Socket.IO
   * @param {Object} socket - Socket klienta
   * @param {Function} next - Funkcja next
   */
  authMiddleware(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Brak tokenu uwierzytelniającego'));
      }

      // Weryfikacja tokenu JWT
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error('Nieprawidłowy token'));
        }

        // Zapisanie danych użytkownika w obiekcie socket
        socket.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };

        next();
      });
    } catch (error) {
      console.error('Błąd uwierzytelniania Socket.IO:', error);
      next(new Error('Błąd uwierzytelniania'));
    }
  }

  /**
   * Obsługa nowego połączenia
   * @param {Object} socket - Socket klienta
   */
  handleConnection(socket) {
    const userId = socket.user?.userId;

    if (!userId) {
      console.warn('Połączenie bez ID użytkownika');
      socket.disconnect();
      return;
    }

    console.log(`Nowe połączenie Socket.IO: ${socket.id} dla użytkownika ${userId}`);

    // Zapisanie połączenia w mapach
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Dołączenie do pokoju specyficznego dla użytkownika
    socket.join(`user:${userId}`);

    // Wysłanie potwierdzenia połączenia
    socket.emit('connection_success', {
      message: 'Połączono z systemem powiadomień',
      userId: userId
    });

    // Obsługa rozłączenia
    socket.on('disconnect', () => {
      console.log(`Rozłączenie Socket.IO: ${socket.id} dla użytkownika ${userId}`);
      
      // Usunięcie połączenia z map
      if (this.userSockets.has(userId)) {
        this.userSockets.get(userId).delete(socket.id);
        if (this.userSockets.get(userId).size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(socket.id);
    });

    // Obsługa żądania oznaczenia powiadomienia jako przeczytane
    socket.on('mark_notification_read', async (data) => {
      try {
        const { notificationId } = data;
        if (!notificationId) return;

        // Tutaj można dodać kod do oznaczenia powiadomienia jako przeczytane
        // np. wywołanie metody z notificationService
        
        // Emitowanie potwierdzenia
        socket.emit('notification_marked_read', { notificationId });
      } catch (error) {
        console.error('Błąd podczas oznaczania powiadomienia jako przeczytane:', error);
      }
    });
  }

  /**
   * Wysyła powiadomienie do konkretnego użytkownika
   * @param {string} userId - ID użytkownika
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotification(userId, notification) {
    if (!this.io) {
      console.warn('Socket.IO nie zainicjalizowany');
      return;
    }

    try {
      // Wysłanie powiadomienia do wszystkich połączeń użytkownika
      this.io.to(`user:${userId}`).emit('new_notification', notification);
      console.log(`Wysłano powiadomienie do użytkownika ${userId}`);
    } catch (error) {
      console.error(`Błąd podczas wysyłania powiadomienia do użytkownika ${userId}:`, error);
    }
  }

  /**
   * Wysyła powiadomienie do wielu użytkowników
   * @param {Array<string>} userIds - Tablica ID użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToMany(userIds, notification) {
    if (!this.io || !userIds || !Array.isArray(userIds)) {
      return;
    }

    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Wysyła powiadomienie do wszystkich użytkowników
   * @param {Object} notification - Obiekt powiadomienia
   */
  sendNotificationToAll(notification) {
    if (!this.io) {
      console.warn('Socket.IO nie zainicjalizowany');
      return;
    }

    try {
      this.io.emit('new_notification', notification);
      console.log('Wysłano powiadomienie do wszystkich użytkowników');
    } catch (error) {
      console.error('Błąd podczas wysyłania powiadomienia do wszystkich użytkowników:', error);
    }
  }

  /**
   * Sprawdza, czy użytkownik jest online
   * @param {string} userId - ID użytkownika
   * @returns {boolean} - Czy użytkownik jest online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Zwraca liczbę aktywnych połączeń dla użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {number} - Liczba aktywnych połączeń
   */
  getUserConnectionCount(userId) {
    if (!this.userSockets.has(userId)) {
      return 0;
    }
    return this.userSockets.get(userId).size;
  }

  /**
   * Zwraca liczbę wszystkich aktywnych połączeń
   * @returns {number} - Liczba aktywnych połączeń
   */
  getTotalConnectionCount() {
    return this.socketUsers.size;
  }
}

// Eksport instancji serwisu jako singleton
const socketService = new SocketService();
export default socketService;
