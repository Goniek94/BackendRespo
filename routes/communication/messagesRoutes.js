// backend/routes/messagesRoutes.js - NAPRAWIONY KOD
import express from "express";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import {
  getMessages,
  getMessage,
  sendMessage,
  sendMessageToUser,
  sendMessageToAd,
  saveDraft,
  markAsRead,
  toggleStar,
  deleteMessage,
  searchMessages,
  getUserSuggestions,
  getConversation,
  replyToMessage,
  replyToConversation,
  getConversationsList,
  archiveMessage,
  unarchiveMessage,
  getUnreadCount,
  unsendMessage,
  editMessage,
} from "../../controllers/communication/index.js";
import {
  starConversation,
  archiveConversation,
  deleteConversation,
} from "../../controllers/communication/messageFlags.js";
import auth from "../../middleware/auth.js";
import {
  messageRateLimiter,
  messageHourlyLimiter,
} from "../../middleware/rateLimiting.js";
import Message from "../../models/communication/message.js";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import notificationManager from "../../services/notificationManager.js";

const router = express.Router();

// Konfiguracja multera do obsługi załączników - MEMORY STORAGE dla Supabase
const upload = multer({
  storage: multer.memoryStorage(), // Przechowuj pliki w pamięci jako Buffer
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit 10MB
    files: 5, // Maksymalnie 5 plików na raz
  },
  fileFilter: (req, file, cb) => {
    // Akceptuj tylko obrazy
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Tylko pliki obrazów są dozwolone"), false);
    }
  },
});

// Zabezpiecz wszystkie ścieżki middleware'em autoryzacji
router.use(auth);

// ========== NOWE ENDPOINTY DLA KONWERSACJI ==========

// 🔥 GŁÓWNY ENDPOINT - Odpowiadanie w konwersacji z użytkownikiem
router.post(
  "/conversation/:userId/reply",
  messageRateLimiter, // 5s minimum
  messageHourlyLimiter, // 50/h max
  upload.array("attachments", 5),
  replyToConversation
);

// 🔥 Oznaczanie konwersacji jako przeczytanej
router.patch("/conversation/:userId/read", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    console.log("📖 Oznaczanie konwersacji jako przeczytanej:", {
      userId,
      currentUserId,
    });

    // Oznacz wszystkie wiadomości od tego użytkownika jako przeczytane
    const result = await Message.updateMany(
      {
        sender: userId,
        recipient: currentUserId,
        read: false,
      },
      { read: true }
    );

    console.log(
      "✅ Oznaczono jako przeczytane:",
      result.modifiedCount,
      "wiadomości"
    );

    res.status(200).json({
      message: "Konwersacja oznaczona jako przeczytana",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas oznaczania konwersacji:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Przełączanie gwiazdki konwersacji
router.patch("/conversation/:userId/star", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // Znajdź ostatnią wiadomość w konwersacji
    const lastMessage = await Message.findOne({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    }).sort({ createdAt: -1 });

    if (!lastMessage) {
      return res.status(404).json({ message: "Konwersacja nie znaleziona" });
    }

    // Przełącz gwiazdkę
    lastMessage.starred = !lastMessage.starred;
    await lastMessage.save();

    res.status(200).json({
      message: "Gwiazdka przełączona",
      starred: lastMessage.starred,
    });
  } catch (error) {
    console.error("💥 Błąd podczas przełączania gwiazdki:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Usuwanie konwersacji (SOFT DELETE - dodaje do deletedBy)
router.delete("/conversation/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    // SOFT DELETE - dodaj currentUserId do deletedBy array
    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
        deletedBy: { $ne: currentUserId }, // Tylko wiadomości nie usunięte przez tego usera
      },
      { $addToSet: { deletedBy: currentUserId } }
    );

    res.status(200).json({
      message: "Konwersacja usunięta (ukryta dla Ciebie)",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas usuwania konwersacji:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Archiwizowanie konwersacji
router.patch("/conversation/:userId/archive", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      },
      { archived: true }
    );

    res.status(200).json({
      message: "Konwersacja zarchiwizowana",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas archiwizowania:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Przywracanie z archiwum
router.patch("/conversation/:userId/unarchive", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      },
      { archived: false }
    );

    res.status(200).json({
      message: "Konwersacja przywrócona z archiwum",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas przywracania:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Przenoszenie do kosza
router.patch("/conversation/:userId/trash", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      },
      { $addToSet: { deletedBy: currentUserId } }
    );

    res.status(200).json({
      message: "Konwersacja przeniesiona do kosza",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas przenoszenia do kosza:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Przenoszenie do folderu
router.patch("/conversation/:userId/move", async (req, res) => {
  try {
    const { userId } = req.params;
    const { folder } = req.body;
    const currentUserId = req.user.userId;

    let updateData = {};

    switch (folder) {
      case "archived":
        updateData = { archived: true };
        break;
      case "trash":
        updateData = { $addToSet: { deletedBy: currentUserId } };
        break;
      case "inbox":
        updateData = { archived: false, $pull: { deletedBy: currentUserId } };
        break;
      default:
        return res.status(400).json({ message: "Nieprawidłowy folder" });
    }

    const result = await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, recipient: userId },
          { sender: userId, recipient: currentUserId },
        ],
      },
      updateData
    );

    res.status(200).json({
      message: `Konwersacja przeniesiona do ${folder}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("💥 Błąd podczas przenoszenia:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🔥 Wyszukiwanie konwersacji
router.get("/conversations/search", async (req, res) => {
  try {
    const { query, folder = "inbox" } = req.query;
    const userId = req.user.userId;

    if (!query || query.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Zapytanie musi mieć co najmniej 2 znaki" });
    }

    // Wyszukaj wiadomości
    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ],
    };

    // Dodaj filtr folderu
    switch (folder) {
      case "inbox":
        searchCriteria = {
          ...searchCriteria,
          recipient: userId,
          deletedBy: { $ne: userId },
        };
        break;
      case "sent":
        searchCriteria = {
          ...searchCriteria,
          sender: userId,
          deletedBy: { $ne: userId },
        };
        break;
      default:
        searchCriteria = {
          ...searchCriteria,
          $or: [{ sender: userId }, { recipient: userId }],
          deletedBy: { $ne: userId },
        };
    }

    const messages = await Message.find(searchCriteria)
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .populate("relatedAd", "headline brand model")
      .sort({ createdAt: -1 })
      .limit(50);

    // Grupuj według użytkowników
    const conversationsByUser = {};

    messages.forEach((msg) => {
      const otherUserId =
        msg.sender._id.toString() === userId
          ? msg.recipient._id.toString()
          : msg.sender._id.toString();

      const otherUser =
        msg.sender._id.toString() === userId ? msg.recipient : msg.sender;

      if (!conversationsByUser[otherUserId]) {
        conversationsByUser[otherUserId] = {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null,
        };
      }
    });

    const conversations = Object.values(conversationsByUser);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("💥 Błąd podczas wyszukiwania konwersacji:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ========== NOWE ENDPOINTY DO ZARZĄDZANIA KONWERSACJAMI ==========

// 🌟 Oznaczanie całej konwersacji jako ważnej
router.patch("/conversations/:userId/star", starConversation);

// 📦 Przenoszenie całej konwersacji do archiwum
router.patch("/conversations/:userId/archive", archiveConversation);

// 🗑️ Usuwanie całej konwersacji
router.delete("/conversations/:userId", deleteConversation);

// ========== ISTNIEJĄCE ENDPOINTY ==========

// WAŻNE: Trasy z wzorcami muszą być przed parametryzowanymi trasami
// Wyszukiwanie wiadomości
router.get("/search", searchMessages);

// Pobieranie liczby nieprzeczytanych wiadomości
router.get("/unread-count", getUnreadCount);

// Pobieranie sugestii użytkowników
router.get("/users/suggestions", getUserSuggestions);

// Pobieranie listy konwersacji użytkownika
router.get("/conversations", getConversationsList);

// Pobieranie konwersacji z konkretnym użytkownikiem
router.get("/conversation/:userId", getConversation);

// Skrócona wersja trasy dla konwersacji (dla kompatybilności z frontendem)
router.get("/c/:userId", getConversation);

// Pobieranie pojedynczej wiadomości
router.get("/message/:id", getMessage);

// Pobieranie wiadomości dla danego folderu (musi być na końcu, po innych trasach GET)
router.get("/:folder", getMessages);

// Wysyłanie nowej wiadomości - obsługuje wszystkie przypadki
router.post(
  "/send",
  messageRateLimiter, // 5s minimum
  messageHourlyLimiter, // 50/h max
  upload.array("attachments", 5),
  async (req, res) => {
    try {
      const { recipient, subject, content, adId } = req.body;

      // Sprawdź, czy mamy adId - wtedy wysyłamy wiadomość do właściciela ogłoszenia
      if (adId) {
        req.params.adId = adId;
        return sendMessageToAd(req, res);
      }

      // Sprawdź, czy recipient jest ID użytkownika - wtedy wysyłamy wiadomość do użytkownika
      if (recipient && mongoose.Types.ObjectId.isValid(recipient)) {
        req.params.userId = recipient;
        return sendMessageToUser(req, res);
      }

      // W przeciwnym razie używamy standardowej funkcji sendMessage
      return sendMessage(req, res);
    } catch (error) {
      console.error("Błąd podczas wysyłania wiadomości:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  }
);

// Wysyłanie wiadomości do użytkownika (z profilu użytkownika)
router.post(
  "/send-to-user/:userId",
  messageRateLimiter,
  messageHourlyLimiter,
  upload.array("attachments", 5),
  sendMessageToUser
);

// Wysyłanie wiadomości do właściciela ogłoszenia (ze szczegółów ogłoszenia)
router.post(
  "/send-to-ad/:adId",
  messageRateLimiter,
  messageHourlyLimiter,
  upload.array("attachments", 5),
  sendMessageToAd
);

// Odpowiadanie na wiadomość
router.post(
  "/reply/:messageId",
  messageRateLimiter,
  messageHourlyLimiter,
  upload.array("attachments", 5),
  replyToMessage
);

// Zapisywanie wiadomości roboczej
router.post("/draft", upload.array("attachments", 5), saveDraft);

// Oznaczanie wiadomości jako przeczytana
router.patch("/read/:id", markAsRead);

// Oznaczanie wiadomości gwiazdką
router.patch("/star/:id", toggleStar);

// Przenoszenie wiadomości do archiwum
router.patch("/archive/:id", archiveMessage);

// Przywracanie wiadomości z archiwum
router.patch("/unarchive/:id", unarchiveMessage);

// ========== NOWE ENDPOINTY DLA WIADOMOŚCI ==========

// 🔄 Cofanie wiadomości (unsend)
router.patch("/unsend/:id", unsendMessage);

// ✏️ Edytowanie wiadomości (używa kontrolera zamiast duplikacji kodu)
router.put("/:id", editMessage);

// Usuwanie wiadomości
router.delete("/:id", deleteMessage);

export default router;
