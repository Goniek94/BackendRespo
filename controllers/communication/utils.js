import Message from "../../models/communication/message.js";
import User from "../../models/user/user.js";
import mongoose from "mongoose";
import {
  uploadMessageImages,
  validateMessageFiles,
  isImageUploadAvailable,
} from "./messageImageUpload.js";

// Cache dla liczby nieprzeczytanych wiadomości
const unreadCountCache = new Map();
const CACHE_TTL = 30000; // 30 sekund

// Pobieranie liczby nieprzeczytanych wiadomości z cachowaniem
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `unread_${userId}`;

    // Sprawdź cache
    const cachedData = unreadCountCache.get(cacheKey);
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      return res
        .status(200)
        .json({ unreadCount: cachedData.count, fromCache: true });
    }

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Pobierz liczbę nieprzeczytanych konwersacji z optymalizacją
    const result = await Message.aggregate([
      {
        $match: {
          recipient: userObjectId,
          sender: { $ne: userObjectId },
          read: false,
          deletedBy: { $ne: userObjectId },
        },
      },
      {
        $group: {
          _id: { sender: "$sender", adId: "$adId" },
        },
      },
      { $count: "unreadConversations" },
    ]);

    const unreadCount = result[0]?.unreadConversations || 0;

    // Zapisz do cache
    unreadCountCache.set(cacheKey, {
      count: unreadCount,
      timestamp: now,
    });

    // Automatyczne czyszczenie cache po TTL
    setTimeout(() => {
      if (unreadCountCache.has(cacheKey)) {
        unreadCountCache.delete(cacheKey);
      }
    }, CACHE_TTL);

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error(
      "Błąd podczas pobierania liczby nieprzeczytanych wiadomości:",
      error
    );

    // Obsługa timeoutu zapytania MongoDB
    if (error.name === "MongooseError" && error.message.includes("timed out")) {
      return res.status(200).json({ unreadCount: 0, error: "timeout" });
    }

    // Domyślna odpowiedź w przypadku błędu - zwracamy 0 zamiast błędu 500
    // aby nie przerywać działania aplikacji
    res.status(200).json({ unreadCount: 0, error: "server_error" });
  }
};

// Wyszukiwanie wiadomości
export const searchMessages = async (req, res) => {
  try {
    const { query, folder } = req.query;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    if (!query) {
      return res.status(400).json({ message: "Brak parametru wyszukiwania" });
    }

    let searchCriteria = {
      $or: [
        { subject: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ],
    };

    // Dodaj kryteria folderu
    if (folder === "inbox") {
      searchCriteria = {
        $and: [
          searchCriteria,
          { recipient: userObjectId, deletedBy: { $ne: userObjectId } },
        ],
      };
    } else if (folder === "sent") {
      searchCriteria = {
        $and: [
          searchCriteria,
          {
            sender: userObjectId,
            draft: false,
            deletedBy: { $ne: userObjectId },
          },
        ],
      };
    } else if (folder === "drafts") {
      searchCriteria = {
        $and: [
          searchCriteria,
          {
            sender: userObjectId,
            draft: true,
            deletedBy: { $ne: userObjectId },
          },
        ],
      };
    } else if (folder === "starred") {
      searchCriteria = {
        $and: [
          searchCriteria,
          {
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            starred: true,
            deletedBy: { $ne: userObjectId },
          },
        ],
      };
    } else if (folder === "trash") {
      searchCriteria = { $and: [searchCriteria, { deletedBy: userObjectId }] };
    } else if (folder === "archived") {
      searchCriteria = {
        $and: [
          searchCriteria,
          {
            $or: [{ recipient: userObjectId }, { sender: userObjectId }],
            archived: true,
            deletedBy: { $ne: userObjectId },
          },
        ],
      };
    } else {
      // Wszystkie foldery
      searchCriteria = {
        $and: [
          searchCriteria,
          { $or: [{ recipient: userObjectId }, { sender: userObjectId }] },
          { deletedBy: { $ne: userObjectId } },
        ],
      };
    }

    const messages = await Message.find(searchCriteria)
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Błąd podczas wyszukiwania wiadomości:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

// Sugestie użytkowników
export const getUserSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      _id: { $ne: userObjectId },
      $or: [
        { email: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    })
      .select("name email")
      .limit(5);

    res.status(200).json(users);
  } catch (error) {
    console.error("Błąd podczas pobierania sugestii użytkowników:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

// Zapisywanie wiadomości roboczej
export const saveDraft = async (req, res) => {
  try {
    const { recipient, subject, content, draftId } = req.body;
    const senderId = req.user.userId;

    console.log("=== saveDraft START ===");
    console.log("senderId:", senderId, "draftId:", draftId);
    console.log(
      "📎 req.files:",
      req.files ? `${req.files.length} plików` : "BRAK/undefined"
    );

    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId;

    // Przygotuj dane
    const draftData = {
      sender: senderObjectId,
      subject: subject || "",
      content: content || "",
      draft: true,
      attachments: [],
    };

    // Znajdź odbiorcę, jeśli podano
    if (recipient) {
      let recipientUser;
      if (mongoose.Types.ObjectId.isValid(recipient)) {
        recipientUser = await User.findById(recipient);
      } else {
        recipientUser = await User.findOne({ email: recipient });
      }

      if (recipientUser) {
        draftData.recipient = recipientUser._id;
      }
    } else {
      // Wymagane pole w MongoDB
      draftData.recipient = senderId; // Tymczasowo, odbiorca to nadawca
    }

    // Aktualizuj lub utwórz szkic
    let draft;
    if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
      draft = await Message.findOneAndUpdate(
        { _id: draftId, sender: senderId, draft: true },
        draftData,
        { new: true }
      );

      if (!draft) {
        return res.status(404).json({ message: "Szkic nie znaleziony" });
      }
    } else {
      draft = new Message(draftData);
      await draft.save();
    }

    console.log("Szkic zapisany:", draft._id);

    // Przetwarzanie załączników - upload do Supabase AFTER saving draft
    if (req.files && req.files.length > 0) {
      if (!isImageUploadAvailable()) {
        console.log("⚠️ Supabase niedostępny - szkic zapisany bez załączników");
      } else {
        const validation = validateMessageFiles(req.files);
        if (validation.valid) {
          try {
            console.log(
              `🔄 Uploading ${validation.files.length} images to Supabase for draft ${draft._id}`
            );
            const uploadedImages = await uploadMessageImages(
              validation.files,
              senderId,
              draft._id.toString()
            );

            // Aktualizuj szkic z załącznikami
            draft.attachments = uploadedImages;
            await draft.save();

            console.log(
              `✅ Successfully uploaded ${uploadedImages.length} images for draft ${draft._id}`
            );
          } catch (uploadError) {
            console.error("❌ Błąd uploadu załączników:", uploadError);
            console.log("⚠️ Szkic został zapisany bez załączników");
          }
        } else {
          console.log(
            "⚠️ Walidacja plików nie powiodła się:",
            validation.errors
          );
        }
      }
    }

    console.log("=== saveDraft END ===");
    res.status(200).json({
      draftId: draft._id,
      attachments: draft.attachments,
    });
  } catch (error) {
    console.error("Błąd podczas zapisywania szkicu:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};
