import logger from "../../../utils/logger.js";

/**
 * Send 2FA verification code (placeholder for future implementation)
 */
export const send2FACode = async (req, res) => {
  try {
    logger.info("2FA code send requested", {
      userId: req.user?.userId,
      ip: req.ip,
    });

    res.status(501).json({
      success: false,
      message: "Funkcja 2FA nie jest jeszcze zaimplementowana",
    });
  } catch (error) {
    logger.error("2FA send error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas wysyłania kodu 2FA",
    });
  }
};

/**
 * Verify 2FA code (placeholder for future implementation)
 */
export const verify2FACode = async (req, res) => {
  try {
    logger.info("2FA code verification requested", {
      userId: req.user?.userId,
      ip: req.ip,
    });

    res.status(501).json({
      success: false,
      message: "Funkcja 2FA nie jest jeszcze zaimplementowana",
    });
  } catch (error) {
    logger.error("2FA verify error", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      message: "Błąd serwera podczas weryfikacji kodu 2FA",
    });
  }
};
