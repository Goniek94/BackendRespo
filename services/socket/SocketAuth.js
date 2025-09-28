import jwt from "jsonwebtoken";
import cookie from "cookie";
import logger from "../../utils/logger.js";
import config from "../../config/index.js";

/**
 * Klasa SocketAuth - obsługuje uwierzytelnianie połączeń Socket.IO
 */
class SocketAuth {
  /**
   * Maskuje email dla bezpiecznego logowania
   * @param {string} email - Email do zamaskowania
   * @returns {string} - Zamaskowany email
   */
  static maskEmail(email) {
    if (!email || typeof email !== "string") return "unknown";
    const [local, domain] = email.split("@");
    if (!local || !domain) return "invalid-email";
    const maskedLocal =
      local.length > 2 ? local.substring(0, 2) + "***" : "***";
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Middleware do uwierzytelniania połączeń Socket.IO
   * @param {Object} socket - Socket klienta
   * @param {Function} next - Funkcja next
   */
  static authMiddleware(socket, next) {
    try {
      let token = null;

      // Priorytet 1: Token z cookie (bezpieczne parsowanie)
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        try {
          const parsedCookies = cookie.parse(cookieHeader);
          token = parsedCookies.token
            ? decodeURIComponent(parsedCookies.token)
            : null;
        } catch (cookieError) {
          logger.warn("Failed to parse cookies", {
            error: cookieError.message,
            ip: socket.handshake.address,
          });
        }
      }

      // Priorytet 2: Token z auth object (dla kompatybilności wstecznej)
      if (!token) {
        token = socket.handshake.auth.token;
      }

      // Priorytet 3: Token z Authorization header (fallback)
      if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        }
      }

      if (!token) {
        logger.warn("Socket.IO authentication failed - missing token", {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"],
          environment: process.env.NODE_ENV,
        });
        return next(new Error("Brak tokenu uwierzytelniającego"));
      }

      // Weryfikacja tokenu JWT z konfiguracją jak HTTP (issuer/audience, algorytm, TTL 15min)
      const jwtCfg = config.security?.jwt || {};
      const jwtOptions = {
        issuer: jwtCfg.issuer || "marketplace-app",
        audience: jwtCfg.audience || "marketplace-users",
        algorithms: [jwtCfg.algorithm || "HS256"], // poprawka: algorithms[]
        // Możesz zostawić lub usunąć. Jeśli zostawiasz, niech będzie spójne z expiresIn:
        maxAge: jwtCfg.accessTokenExpiry || "15m",
      };

      jwt.verify(
        token,
        jwtCfg.secret || process.env.JWT_SECRET,
        jwtOptions,
        (err, decoded) => {
          if (err) {
            logger.warn("Socket.IO authentication failed - invalid token", {
              error: err.message,
              ip: socket.handshake.address,
              userAgent: socket.handshake.headers["user-agent"],
            });
            return next(new Error("Nieprawidłowy token"));
          }

          // Zapisanie danych użytkownika w obiekcie socket
          socket.user = {
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role,
          };

          // Logowanie z zamaskowanym emailem
          logger.info("Socket.IO user authenticated", {
            userId: socket.user.userId,
            email: SocketAuth.maskEmail(socket.user.email),
            ip: socket.handshake.address,
          });
          next();
        }
      );
    } catch (error) {
      logger.error("Socket.IO authentication error", {
        error: error.message,
        stack: error.stack,
        ip: socket.handshake.address,
      });
      next(new Error("Błąd uwierzytelniania"));
    }
  }
}

export default SocketAuth;
