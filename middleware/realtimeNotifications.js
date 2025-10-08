import notificationManager from "../services/notificationManager.js";
import { NotificationType } from "../utils/notificationTypes.js";
import logger from "../utils/logger.js";
import Notification from "../models/communication/notification.js";
import Message from "../models/communication/message.js";
import socketService from "../services/socketService.js";

/**
 * Middleware do automatycznego generowania powiadomień w czasie rzeczywistym
 * Integruje się z rzeczywistymi zdarzeniami w aplikacji
 */

/**
 * Middleware dla powiadomień o nowych wiadomościach
 * Używane w kontrolerach wiadomości
 */
export const notifyNewMessage = async (req, res, next) => {
  // Zapisz oryginalną metodę send
  const originalSend = res.send;

  res.send = async function (data) {
    // Wywołaj oryginalną metodę
    const result = originalSend.call(this, data);

    // Jeśli wiadomość została pomyślnie utworzona
    if (res.statusCode === 201 && req.method === "POST") {
      try {
        const messageData = typeof data === "string" ? JSON.parse(data) : data;

        if (messageData.success && messageData.message) {
          const message = messageData.message;
          const recipientId = message.recipientId || message.recipient;
          const senderId = message.senderId || message.sender;
          const senderName =
            req.user?.name || req.user?.email || "Nieznany użytkownik";

          if (recipientId && recipientId !== senderId) {
            // 🔥 KLUCZOWE: Sprawdź czy odbiorca ma AKTYWNIE otwartą konwersację z nadawcą
            const isUserInActiveChat = socketService.isUserInActiveConversation(
              recipientId.toString(),
              senderId.toString()
            );

            if (isUserInActiveChat) {
              logger.info(
                `[RealtimeNotifications] User ${recipientId} ma aktywnie otwartą konwersację z ${senderId} - pomijam powiadomienie`
              );
              return result; // NIE wysyłaj powiadomienia
            }

            // 1. Sprawdź ile nieprzeczytanych wiadomości od tego nadawcy
            const unreadMessagesCount = await Message.countDocuments({
              sender: senderId,
              recipient: recipientId,
              read: false,
            });

            // 2. Jeśli są nieprzeczytane wiadomości, zaktualizuj istniejące powiadomienie
            if (unreadMessagesCount > 0) {
              // Znajdź istniejące nieprzeczytane powiadomienie od tego nadawcy
              const existingNotification = await Notification.findOne({
                user: recipientId,
                type: NotificationType.NEW_MESSAGE,
                isRead: false,
                "metadata.senderId": senderId,
              }).sort({ createdAt: -1 });

              if (existingNotification) {
                // Zaktualizuj licznik i datę
                existingNotification.unreadCount = unreadMessagesCount;
                existingNotification.message =
                  unreadMessagesCount === 1
                    ? `Masz nową wiadomość od ${senderName}`
                    : `Masz ${unreadMessagesCount} nowe wiadomości od ${senderName}`;
                existingNotification.updatedAt = new Date();
                await existingNotification.save();

                logger.info(
                  `[RealtimeNotifications] Zaktualizowano powiadomienie (licznik: ${unreadMessagesCount}) dla użytkownika ${recipientId}`
                );
                return result;
              }
            }

            // 3. Jeśli nie ma nieprzeczytanego powiadomienia, utwórz nowe
            await notificationManager.createNotification(
              recipientId,
              "Nowa wiadomość",
              `Masz nową wiadomość od ${senderName}`,
              NotificationType.NEW_MESSAGE,
              {
                link: "/profile/messages",
                metadata: {
                  senderId: senderId,
                  senderName: senderName,
                  messageId: message._id || message.id,
                  conversationId: message.conversationId,
                },
                source: "message_system",
              }
            );

            logger.info(
              `[RealtimeNotifications] Utworzono nowe powiadomienie o wiadomości dla użytkownika ${recipientId}`
            );
          }
        }
      } catch (error) {
        logger.error(
          "[RealtimeNotifications] Błąd podczas tworzenia powiadomienia o nowej wiadomości:",
          error
        );
      }
    }

    return result;
  };

  next();
};

/**
 * Middleware dla powiadomień o nowych ogłoszeniach
 * Używane w kontrolerach ogłoszeń
 */
export const notifyListingCreated = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const result = originalSend.call(this, data);

    if (res.statusCode === 201 && req.method === "POST") {
      try {
        const responseData = typeof data === "string" ? JSON.parse(data) : data;

        if (responseData.success && responseData.ad) {
          const ad = responseData.ad;
          const userId = req.user?.id || req.user?._id;

          if (userId) {
            // Powiadomienie dla właściciela ogłoszenia
            notificationManager.createNotification(
              userId,
              "Ogłoszenie opublikowane!",
              `Twoje ogłoszenie "${ad.title}" zostało pomyślnie opublikowane`,
              NotificationType.LISTING_ADDED,
              {
                link: `/ads/${ad._id || ad.id}`,
                adId: ad._id || ad.id,
                metadata: {
                  adTitle: ad.title,
                  adId: ad._id || ad.id,
                  category: ad.category,
                },
                source: "listing_system",
              }
            );

            logger.info(
              `[RealtimeNotifications] Utworzono powiadomienie o nowym ogłoszeniu dla użytkownika ${userId}`
            );
          }
        }
      } catch (error) {
        logger.error(
          "[RealtimeNotifications] Błąd podczas tworzenia powiadomienia o nowym ogłoszeniu:",
          error
        );
      }
    }

    return result;
  };

  next();
};

/**
 * Middleware dla powiadomień o dodaniu do ulubionych
 * Używane w kontrolerach ulubionych
 */
export const notifyFavoriteAdded = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const result = originalSend.call(this, data);

    if (res.statusCode === 200 && req.method === "POST") {
      try {
        const responseData = typeof data === "string" ? JSON.parse(data) : data;

        if (responseData.success) {
          const adId = req.params.adId || req.body.adId;
          const userId = req.user?.id || req.user?._id;

          // Pobierz dane ogłoszenia i właściciela
          if (adId && userId) {
            // Tutaj można dodać logikę pobierania danych ogłoszenia
            // Na razie używamy danych z requesta
            const adTitle = req.body.adTitle || "Twoje ogłoszenie";
            const ownerId = req.body.ownerId;

            if (ownerId && ownerId !== userId) {
              notificationManager.createNotification(
                ownerId,
                "Dodano do ulubionych",
                `Ktoś dodał Twoje ogłoszenie "${adTitle}" do ulubionych!`,
                NotificationType.LISTING_LIKED,
                {
                  link: `/ads/${adId}`,
                  adId: adId,
                  metadata: {
                    adTitle: adTitle,
                    adId: adId,
                    likedBy: userId,
                  },
                  source: "favorites_system",
                }
              );

              logger.info(
                `[RealtimeNotifications] Utworzono powiadomienie o dodaniu do ulubionych dla użytkownika ${ownerId}`
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          "[RealtimeNotifications] Błąd podczas tworzenia powiadomienia o dodaniu do ulubionych:",
          error
        );
      }
    }

    return result;
  };

  next();
};

/**
 * Middleware dla powiadomień o płatnościach
 * Używane w kontrolerach płatności
 */
export const notifyPaymentStatus = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const result = originalSend.call(this, data);

    if (res.statusCode === 200) {
      try {
        const responseData = typeof data === "string" ? JSON.parse(data) : data;

        if (responseData.success && responseData.payment) {
          const payment = responseData.payment;
          const userId = payment.userId || req.user?.id || req.user?._id;
          const status = payment.status;

          if (userId && status) {
            let notificationType, title, message;

            switch (status) {
              case "completed":
              case "succeeded":
                notificationType = NotificationType.PAYMENT_COMPLETED;
                title = "Płatność zakończona sukcesem";
                message = `Twoja płatność w wysokości ${
                  payment.amount || "N/A"
                } została zrealizowana pomyślnie`;
                break;
              case "failed":
              case "canceled":
                notificationType = NotificationType.PAYMENT_FAILED;
                title = "Płatność nieudana";
                message = `Twoja płatność nie powiodła się. ${
                  payment.failureReason || "Spróbuj ponownie później"
                }`;
                break;
              case "refunded":
                notificationType = NotificationType.PAYMENT_REFUNDED;
                title = "Zwrot płatności";
                message = `Otrzymałeś zwrot płatności w wysokości ${
                  payment.refundAmount || payment.amount || "N/A"
                }`;
                break;
              default:
                return result; // Nie obsługujemy innych statusów
            }

            notificationManager.createNotification(
              userId,
              title,
              message,
              notificationType,
              {
                link: "/profile/payments",
                metadata: {
                  paymentId: payment._id || payment.id,
                  amount: payment.amount,
                  status: status,
                  transactionId: payment.transactionId,
                },
                source: "payment_system",
              }
            );

            logger.info(
              `[RealtimeNotifications] Utworzono powiadomienie o płatności (${status}) dla użytkownika ${userId}`
            );
          }
        }
      } catch (error) {
        logger.error(
          "[RealtimeNotifications] Błąd podczas tworzenia powiadomienia o płatności:",
          error
        );
      }
    }

    return result;
  };

  next();
};

/**
 * Middleware dla powiadomień o wyświetleniach ogłoszeń
 * Używane w kontrolerach ogłoszeń (GET /ads/:id)
 */
export const notifyListingViewed = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const result = originalSend.call(this, data);

    if (res.statusCode === 200 && req.method === "GET") {
      try {
        const responseData = typeof data === "string" ? JSON.parse(data) : data;

        if (responseData.success && responseData.ad) {
          const ad = responseData.ad;
          const viewerId = req.user?.id || req.user?._id;
          const ownerId = ad.userId || ad.owner;

          // Nie powiadamiaj właściciela o własnych wyświetleniach
          if (ownerId && viewerId && ownerId !== viewerId) {
            // Sprawdź czy to nie bot/crawler
            const userAgent = req.get("User-Agent") || "";
            const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

            if (!isBot) {
              notificationManager.createNotification(
                ownerId,
                "Ogłoszenie wyświetlone",
                `Ktoś wyświetlił Twoje ogłoszenie "${ad.title}"`,
                NotificationType.LISTING_VIEWED,
                {
                  link: `/ads/${ad._id || ad.id}`,
                  adId: ad._id || ad.id,
                  metadata: {
                    adTitle: ad.title,
                    adId: ad._id || ad.id,
                    viewerId: viewerId,
                    viewedAt: new Date().toISOString(),
                  },
                  source: "listing_views",
                }
              );

              logger.debug(
                `[RealtimeNotifications] Utworzono powiadomienie o wyświetleniu ogłoszenia dla użytkownika ${ownerId}`
              );
            }
          }
        }
      } catch (error) {
        logger.error(
          "[RealtimeNotifications] Błąd podczas tworzenia powiadomienia o wyświetleniu:",
          error
        );
      }
    }

    return result;
  };

  next();
};

/**
 * Middleware dla powiadomień o wygasających ogłoszeniach
 * Używane w zadaniach cron lub schedulerach
 */
export const notifyExpiringListings = async (listings) => {
  try {
    for (const listing of listings) {
      const userId = listing.userId || listing.owner;
      const daysLeft = Math.ceil(
        (new Date(listing.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
      );

      if (userId && daysLeft > 0) {
        await notificationManager.createNotification(
          userId,
          "Ogłoszenie wkrótce wygaśnie",
          `Twoje ogłoszenie "${listing.title}" wygaśnie za ${daysLeft} ${
            daysLeft === 1 ? "dzień" : "dni"
          }. Przedłuż je teraz!`,
          NotificationType.LISTING_EXPIRING,
          {
            link: `/ads/${listing._id || listing.id}/extend`,
            adId: listing._id || listing.id,
            metadata: {
              adTitle: listing.title,
              adId: listing._id || listing.id,
              daysLeft: daysLeft,
              expiresAt: listing.expiresAt,
            },
            source: "listing_expiration_scheduler",
          }
        );

        logger.info(
          `[RealtimeNotifications] Utworzono powiadomienie o wygasającym ogłoszeniu dla użytkownika ${userId}`
        );
      }
    }
  } catch (error) {
    logger.error(
      "[RealtimeNotifications] Błąd podczas tworzenia powiadomień o wygasających ogłoszeniach:",
      error
    );
  }
};

/**
 * Eksportowane middleware
 */
export const realtimeNotifications = {
  notifyNewMessage,
  notifyListingCreated,
  notifyFavoriteAdded,
  notifyPaymentStatus,
  notifyListingViewed,
  notifyExpiringListings,
};

export default realtimeNotifications;
