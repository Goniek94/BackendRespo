import Message from "../../models/communication/message.js";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import mongoose from "mongoose";
import notificationManager from "../../services/notificationManager.js";
import {
  uploadMessageImages,
  validateMessageFiles,
  isImageUploadAvailable,
} from "./messageImageUpload.js";

// Pobieranie konwersacji między dwoma użytkownikami (opcjonalnie dla konkretnego ogłoszenia)
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { adId, page = 1, limit = 50 } = req.query; // Dodano paginację
    const currentUserId = req.user.userId;

    console.log("=== getConversation START ===");
    console.log(
      "userId:",
      userId,
      "adId:",
      adId,
      "currentUserId:",
      currentUserId
    );

    // Konwertuj userId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const currentUserObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;
    const otherUserObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Sprawdź czy użytkownik istnieje
    const otherUser = await User.findById(otherUserObjectId);
    if (!otherUser) {
      return res.status(404).json({ message: "Nie znaleziono użytkownika" });
    }

    // Przygotuj zapytanie - jeśli podano adId, filtruj według niego
    let messageQuery = {
      $or: [
        {
          sender: currentUserObjectId,
          recipient: otherUserObjectId,
          deletedBy: { $nin: [currentUserObjectId] },
        },
        {
          sender: otherUserObjectId,
          recipient: currentUserObjectId,
          deletedBy: { $nin: [currentUserObjectId] },
        },
      ],
    };

    // Jeśli podano konkretne ogłoszenie, filtruj tylko wiadomości dotyczące tego ogłoszenia
    if (adId && adId !== "no-ad") {
      const adObjectId = mongoose.Types.ObjectId.isValid(adId)
        ? new mongoose.Types.ObjectId(adId)
        : adId;
      messageQuery.relatedAd = adObjectId;
      console.log("Filtrowanie według ogłoszenia:", adId);
    } else if (adId === "no-ad") {
      // Jeśli adId to 'no-ad', pokaż tylko wiadomości bez powiązanego ogłoszenia
      messageQuery.relatedAd = { $exists: false };
      console.log("Filtrowanie wiadomości bez ogłoszenia");
    }

    console.log("Query do wiadomości:", JSON.stringify(messageQuery));

    // PAGINACJA: Oblicz skip
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Pobierz wiadomości + total count równolegle
    const [messages, totalCount] = await Promise.all([
      Message.find(messageQuery)
        .populate("sender", "name email")
        .populate("recipient", "name email")
        .populate("relatedAd", "headline brand model")
        .sort({ createdAt: -1 }) // Najnowsze najpierw dla paginacji
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Lepsza wydajność
      Message.countDocuments(messageQuery),
    ]);

    // Odwróć kolejność dla wyświetlenia (najstarsze na górze)
    messages.reverse();

    console.log(
      `Znaleziono ${messages.length} wiadomości (strona ${page}, total: ${totalCount})`
    );

    // Oznacz wszystkie wiadomości od drugiego użytkownika jako przeczytane
    const unreadMessages = messages.filter(
      (msg) => msg.recipient._id.toString() === currentUserId && !msg.read
    );

    if (unreadMessages.length > 0) {
      console.log(
        `Oznaczanie ${unreadMessages.length} wiadomości jako przeczytane`
      );
      await Message.updateMany(
        { _id: { $in: unreadMessages.map((msg) => msg._id) } },
        { read: true }
      );
    }

    // Format odpowiedzi z paginacją
    const response = {
      otherUser: {
        id: otherUser._id,
        name: otherUser.name,
        email: otherUser.email,
      },
      messages: messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalMessages: totalCount,
        hasMore: skip + messages.length < totalCount,
        messagesPerPage: parseInt(limit),
      },
      adInfo:
        messages.length > 0 && messages[0].relatedAd
          ? messages[0].relatedAd
          : null,
    };

    console.log("=== getConversation END ===");
    res.status(200).json(response);
  } catch (error) {
    console.error("Błąd podczas pobierania konwersacji:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

// Odpowiadanie w konwersacji z konkretnym użytkownikiem (opcjonalnie dla konkretnego ogłoszenia)
export const replyToConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, adId } = req.body; // adId jest opcjonalne
    const senderId = req.user.userId;

    console.log("=== replyToConversation START ===");
    console.log("userId:", userId, "adId:", adId, "senderId:", senderId);
    console.log(
      "📎 req.files:",
      req.files ? `${req.files.length} plików` : "BRAK/undefined"
    );
    console.log("📎 req.file:", req.file ? "1 plik" : "BRAK/undefined");
    console.log("📎 req.body keys:", Object.keys(req.body));

    // Sprawdź czy użytkownik nie próbuje wysłać wiadomości do samego siebie
    if (senderId === userId || senderId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Nie możesz wysłać wiadomości do samego siebie",
      });
    }

    // Konwertuj senderId na ObjectId
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId;
    const recipientObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Sprawdź czy odbiorca istnieje
    const recipient = await User.findById(recipientObjectId);
    if (!recipient) {
      return res.status(404).json({ message: "Nie znaleziono odbiorcy" });
    }

    // Sprawdź czy nadawca istnieje
    const sender = await User.findById(senderObjectId);
    if (!sender) {
      return res.status(404).json({ message: "Nie znaleziono nadawcy" });
    }

    // Przygotuj dane wiadomości (bez załączników na razie)
    const messageData = {
      sender: senderObjectId,
      recipient: recipientObjectId,
      attachments: [], // Początkowo puste
    };

    // Dodaj content tylko jeśli istnieje (nie pusty string)
    if (content && content.trim()) {
      messageData.content = content.trim();
    }

    // Jeśli podano adId, dodaj powiązanie z ogłoszeniem
    if (adId && adId !== "no-ad") {
      const adObjectId = mongoose.Types.ObjectId.isValid(adId)
        ? new mongoose.Types.ObjectId(adId)
        : adId;

      // Sprawdź czy ogłoszenie istnieje
      const ad = await Ad.findById(adObjectId);
      if (ad) {
        messageData.relatedAd = adObjectId;
        messageData.subject = `Wiadomość dotycząca: ${
          ad.headline || `${ad.brand} ${ad.model}`
        }`;
      } else {
        console.log("Nie znaleziono ogłoszenia o ID:", adId);
        messageData.subject = "Nowa wiadomość";
      }
    } else {
      messageData.subject = "Nowa wiadomość";
    }

    console.log("Dane wiadomości:", messageData);

    // Utwórz nową wiadomość
    const newMessage = new Message(messageData);
    await newMessage.save();

    console.log("Wiadomość zapisana:", newMessage._id);

    // Przetwarzanie załączników - upload do Supabase AFTER saving message
    console.log("📎 Sprawdzanie załączników...");
    console.log("📎 req.files:", req.files);
    console.log(
      "📎 req.files length:",
      req.files ? req.files.length : "undefined"
    );

    if (req.files && req.files.length > 0) {
      console.log("📎 Pierwszy plik:", {
        originalname: req.files[0].originalname,
        mimetype: req.files[0].mimetype,
        size: req.files[0].size,
        hasBuffer: !!req.files[0].buffer,
        bufferLength: req.files[0].buffer ? req.files[0].buffer.length : 0,
        path: req.files[0].path,
      });

      try {
        console.log(
          `🔄 Uploading ${req.files.length} images to Supabase for message ${newMessage._id}`
        );
        const uploadedImages = await uploadMessageImages(
          req.files,
          senderId,
          newMessage._id.toString()
        );

        // Aktualizuj wiadomość z załącznikami
        newMessage.attachments = uploadedImages;
        await newMessage.save();

        console.log(
          `✅ Successfully uploaded ${uploadedImages.length} images for message ${newMessage._id}`
        );
      } catch (uploadError) {
        console.error("❌ Błąd uploadu załączników:", uploadError);
        // Nie usuwamy wiadomości, tylko logujemy błąd
        console.log("⚠️ Wiadomość została zapisana bez załączników");
      }
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;

      // Jeśli wiadomość dotyczy ogłoszenia, pobierz jego tytuł
      let adTitle = null;
      if (messageData.relatedAd) {
        const ad = await Ad.findById(messageData.relatedAd);
        if (ad) {
          adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        }
      }

      await notificationManager.notifyNewMessage(
        recipientObjectId.toString(),
        senderName,
        adTitle
      );

      console.log("Powiadomienie wysłane");
    } catch (notificationError) {
      console.error("Błąd podczas tworzenia powiadomienia:", notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    console.log("=== replyToConversation END ===");
    res.status(201).json({
      message: "Wiadomość wysłana",
      data: {
        _id: newMessage._id,
        content: newMessage.content,
        attachments: newMessage.attachments,
        createdAt: newMessage.createdAt,
        sender: {
          _id: sender._id,
          name: sender.name,
          email: sender.email,
        },
      },
    });
  } catch (error) {
    console.error("Błąd podczas wysyłania wiadomości w konwersacji:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

// Odpowiadanie na wiadomość
export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const senderId = req.user.userId;

    console.log("=== replyToMessage START ===");
    console.log("messageId:", messageId, "senderId:", senderId);
    console.log(
      "📎 req.files:",
      req.files ? `${req.files.length} plików` : "BRAK/undefined"
    );

    // Konwertuj senderId na ObjectId
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId;
    const senderIdStr = senderObjectId.toString();

    // Znajdź oryginalną wiadomość
    const originalMessage = await Message.findById(messageId)
      .populate("sender")
      .populate("recipient");
    if (!originalMessage) {
      return res.status(404).json({ message: "Nie znaleziono wiadomości" });
    }

    // Sprawdź czy użytkownik ma dostęp do tej wiadomości
    const originalSenderId =
      typeof originalMessage.sender === "object"
        ? originalMessage.sender._id.toString()
        : originalMessage.sender.toString();

    const originalRecipientId =
      typeof originalMessage.recipient === "object"
        ? originalMessage.recipient._id.toString()
        : originalMessage.recipient.toString();

    if (
      originalSenderId !== senderIdStr &&
      originalRecipientId !== senderIdStr
    ) {
      return res
        .status(403)
        .json({ message: "Brak dostępu do tej wiadomości" });
    }

    // Określ odbiorcę
    const recipientId =
      originalSenderId === senderIdStr
        ? originalMessage.recipient
        : originalMessage.sender;
    const recipientObjectId =
      typeof recipientId === "object" ? recipientId._id : recipientId;

    // Przygotuj dane wiadomości (bez załączników na razie)
    const messageData = {
      sender: senderObjectId,
      recipient: recipientObjectId,
      subject: originalMessage.subject.startsWith("Re:")
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`,
      attachments: [],
      relatedAd: originalMessage.relatedAd,
    };

    // Dodaj content tylko jeśli istnieje (nie pusty string)
    if (content && content.trim()) {
      messageData.content = content.trim();
    }

    // Utwórz nową wiadomość jako odpowiedź
    const newMessage = new Message(messageData);
    await newMessage.save();

    console.log("Wiadomość zapisana:", newMessage._id);

    // Przetwarzanie załączników - upload do Supabase AFTER saving message
    if (req.files && req.files.length > 0) {
      if (!isImageUploadAvailable()) {
        console.log(
          "⚠️ Supabase niedostępny - wiadomość zapisana bez załączników"
        );
      } else {
        const validation = validateMessageFiles(req.files);
        if (validation.valid) {
          try {
            console.log(
              `🔄 Uploading ${validation.files.length} images to Supabase for message ${newMessage._id}`
            );
            const uploadedImages = await uploadMessageImages(
              validation.files,
              senderId,
              newMessage._id.toString()
            );

            // Aktualizuj wiadomość z załącznikami
            newMessage.attachments = uploadedImages;
            await newMessage.save();

            console.log(
              `✅ Successfully uploaded ${uploadedImages.length} images for message ${newMessage._id}`
            );
          } catch (uploadError) {
            console.error("❌ Błąd uploadu załączników:", uploadError);
            console.log("⚠️ Wiadomość została zapisana bez załączników");
          }
        } else {
          console.log(
            "⚠️ Walidacja plików nie powiodła się:",
            validation.errors
          );
        }
      }
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Nie znaleziono nadawcy" });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;

      // Jeśli wiadomość dotyczy ogłoszenia, pobierz jego tytuł
      let adTitle = null;
      if (
        originalMessage.relatedAd &&
        mongoose.Types.ObjectId.isValid(originalMessage.relatedAd)
      ) {
        const ad = await Ad.findById(originalMessage.relatedAd);
        if (ad) {
          adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        }
      }

      await notificationManager.notifyNewMessage(
        recipientObjectId.toString(),
        senderName,
        adTitle
      );
    } catch (notificationError) {
      console.error("Błąd podczas tworzenia powiadomienia:", notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    console.log("=== replyToMessage END ===");
    res.status(201).json({
      message: "Odpowiedź wysłana",
      data: {
        _id: newMessage._id,
        content: newMessage.content,
        attachments: newMessage.attachments,
        createdAt: newMessage.createdAt,
        sender: {
          _id: sender._id,
          name: sender.name,
          email: sender.email,
        },
      },
    });
  } catch (error) {
    console.error("Błąd podczas wysyłania odpowiedzi:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

/**
 * Pobieranie listy konwersacji użytkownika (STARA DZIAŁAJĄCA WERSJA + PAGINACJA)
 */
export const getConversationsList = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { folder } = req.query;

    // Sprawdź, czy userId jest poprawnym ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Nieprawidłowy identyfikator użytkownika" });
    }

    // Konwertuj userId na ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Sprawdź czy użytkownik istnieje
    const user = await User.findById(userObjectId);
    if (!user) {
      return res.status(404).json({ message: "Nie znaleziono użytkownika" });
    }

    // Przygotuj zapytanie bazowe w zależności od folderu
    let query = {};

    switch (folder) {
      case "inbox":
        query = {
          recipient: userObjectId,
          deletedBy: { $nin: [userObjectId] },
          // NIE filtruj archived tutaj - zrobimy to po grupowaniu!
        };
        break;
      case "sent":
        query = {
          sender: userObjectId,
          draft: false,
          deletedBy: { $nin: [userObjectId] },
          // NIE filtruj archived tutaj - zrobimy to po grupowaniu!
        };
        break;
      case "starred":
        query = {
          $or: [
            { recipient: userObjectId, starred: true },
            { sender: userObjectId, starred: true },
          ],
          deletedBy: { $nin: [userObjectId] },
        };
        break;
      case "archived":
        query = {
          $or: [
            { recipient: userObjectId, archived: true },
            { sender: userObjectId, archived: true },
          ],
          deletedBy: { $nin: [userObjectId] },
        };
        break;
      default:
        // Domyślnie pobierz wszystkie wiadomości (inbox + sent)
        query = {
          $or: [
            { sender: userObjectId, deletedBy: { $nin: [userObjectId] } },
            { recipient: userObjectId, deletedBy: { $nin: [userObjectId] } },
          ],
        };
    }

    // Pobierz wszystkie wiadomości (STARA WERSJA - bez paginacji na razie)
    const messages = await Message.find(query)
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .populate("relatedAd", "headline brand model")
      .sort({ createdAt: -1 })
      .lean();

    // Grupuj wiadomości według użytkownika i ogłoszenia
    const conversationsByUser = {};

    messages.forEach((msg) => {
      const otherUserId =
        msg.sender._id.toString() === userId
          ? msg.recipient._id.toString()
          : msg.sender._id.toString();

      const otherUser =
        msg.sender._id.toString() === userId ? msg.recipient : msg.sender;

      // Utwórz unikalny klucz konwersacji (użytkownik + ogłoszenie)
      const adId = msg.relatedAd ? msg.relatedAd._id.toString() : "no-ad";
      const conversationKey = `${otherUserId}:${adId}`;

      // Jeśli to pierwsza wiadomość w tej konwersacji
      if (!conversationsByUser[conversationKey]) {
        conversationsByUser[conversationKey] = {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
          adInfo: msg.relatedAd || null,
          conversationId: conversationKey,
        };
      } else {
        // Aktualizuj lastMessage jeśli ta wiadomość jest nowsza
        if (
          new Date(msg.createdAt) >
          new Date(conversationsByUser[conversationKey].lastMessage.createdAt)
        ) {
          conversationsByUser[conversationKey].lastMessage = msg;
        }
      }

      // Zlicz nieprzeczytane wiadomości
      if (msg.recipient._id.toString() === userId && !msg.read) {
        conversationsByUser[conversationKey].unreadCount++;
      }
    });

    // Przekształć obiekt na tablicę
    let conversations = Object.values(conversationsByUser);

    console.log(`📊 Konwersacji przed filtrowaniem: ${conversations.length}`);
    console.log(`📁 Folder: ${folder}`);

    // ✅ WAŻNE: Filtruj konwersacje na podstawie lastMessage
    // Dla inbox i sent - wykluczaj konwersacje gdzie lastMessage jest archived
    if (folder === "inbox" || folder === "sent") {
      const beforeFilter = conversations.length;
      conversations = conversations.filter((conv) => {
        const isArchived = conv.lastMessage.archived === true;
        if (isArchived) {
          console.log(
            `🚫 Wykluczam konwersację ${conv.conversationId} - lastMessage.archived = true`
          );
        }
        return !isArchived;
      });
      console.log(
        `📊 Po filtrowaniu: ${conversations.length} (usunięto ${
          beforeFilter - conversations.length
        } zarchiwizowanych)`
      );
    }

    // Sortuj po dacie ostatniej wiadomości
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log(`✅ Zwracam ${conversations.length} konwersacji`);

    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("Błąd podczas pobierania listy konwersacji:", error);
    return res
      .status(500)
      .json({ message: "Błąd serwera", error: error.message });
  }
};
