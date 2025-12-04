import Message from "../../models/communication/message.js";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import mongoose from "mongoose";
import notificationManager from "../../services/notificationManager.js";
import socketService from "../../services/socketService.js";
import {
  uploadMessageImages,
  validateMessageFiles,
  isImageUploadAvailable,
} from "./messageImageUpload.js";

// Wysyłanie wiadomości do użytkownika (z profilu użytkownika)
export const sendMessageToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject, content } = req.body;
    const senderId = req.user.userId;

    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId;
    const recipientObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Sprawdź czy użytkownik istnieje
    const recipientUser = await User.findById(recipientObjectId);
    if (!recipientUser) {
      return res.status(404).json({ message: "Nie znaleziono użytkownika" });
    }

    // Sprawdź czy użytkownik nie wysyła wiadomości do samego siebie
    if (senderObjectId.toString() === recipientObjectId.toString()) {
      return res
        .status(400)
        .json({ message: "Nie możesz wysłać wiadomości do samego siebie" });
    }

    // Utwórz nową wiadomość (bez załączników na razie)
    const messageData = {
      sender: senderObjectId,
      recipient: recipientUser._id,
      subject:
        subject || `Wiadomość do ${recipientUser.name || recipientUser.email}`,
      attachments: [],
    };

    // Dodaj content tylko jeśli istnieje (nie pusty string)
    if (content && content.trim()) {
      messageData.content = content.trim();
    }

    const newMessage = new Message(messageData);

    await newMessage.save();

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

            newMessage.attachments = uploadedImages;
            await newMessage.save();

            console.log(
              `✅ Successfully uploaded ${uploadedImages.length} images for message ${newMessage._id}`
            );
          } catch (uploadError) {
            console.error("❌ Błąd uploadu załączników:", uploadError);
            console.log("⚠️ Wiadomość została zapisana bez załączników");
          }
        }
      }
    }

    // Emit realtime event do odbiorcy (socket.io)
    if (socketService.isUserOnline(recipientUser._id.toString())) {
      socketService.sendNotification(recipientUser._id.toString(), {
        type: "new_message",
      });
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Nie znaleziono nadawcy" });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      await notificationManager.notifyNewMessage(
        recipientUser._id.toString(),
        senderName,
        null
      );
    } catch (notificationError) {
      console.error("Błąd podczas tworzenia powiadomienia:", notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(201).json({ message: "Wiadomość wysłana" });
  } catch (error) {
    console.error("Błąd podczas wysyłania wiadomości:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};

// Wysyłanie wiadomości do właściciela ogłoszenia (ze szczegółów ogłoszenia)
export const sendMessageToAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { subject, content } = req.body;
    const senderId = req.user.userId;

    // Konwertuj senderId na ObjectId, aby zapewnić poprawne porównanie w MongoDB
    const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
      ? new mongoose.Types.ObjectId(senderId)
      : senderId;

    // Znajdź ogłoszenie
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Nie znaleziono ogłoszenia" });
    }

    // Znajdź właściciela ogłoszenia
    const ownerId = ad.owner;
    const ownerObjectId = mongoose.Types.ObjectId.isValid(ownerId)
      ? new mongoose.Types.ObjectId(ownerId)
      : ownerId;

    const owner = await User.findById(ownerObjectId);
    if (!owner) {
      return res
        .status(404)
        .json({ message: "Nie znaleziono właściciela ogłoszenia" });
    }

    // Możemy tymczasowo wyłączyć sprawdzanie, czy użytkownik wysyła wiadomość do siebie
    // To pozwala właścicielowi ogłoszenia przetestować funkcjonalność wiadomości
    /*
    if (senderId === ownerId.toString()) {
      return res.status(400).json({ message: 'Nie możesz wysłać wiadomości do samego siebie' });
    }
    */

    // Utwórz tytuł ogłoszenia
    const adTitle = ad.headline || `${ad.brand} ${ad.model}`;

    // Utwórz nową wiadomość (bez załączników na razie)
    const messageData = {
      sender: senderObjectId,
      recipient: ownerObjectId,
      subject: subject || `Pytanie o ogłoszenie: ${adTitle}`,
      attachments: [],
      relatedAd: adId,
    };

    // Dodaj content tylko jeśli istnieje (nie pusty string)
    if (content && content.trim()) {
      messageData.content = content.trim();
    }

    const newMessage = new Message(messageData);

    await newMessage.save();

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

            newMessage.attachments = uploadedImages;
            await newMessage.save();

            console.log(
              `✅ Successfully uploaded ${uploadedImages.length} images for message ${newMessage._id}`
            );
          } catch (uploadError) {
            console.error("❌ Błąd uploadu załączników:", uploadError);
            console.log("⚠️ Wiadomość została zapisana bez załączników");
          }
        }
      }
    }

    // Emit realtime event do odbiorcy (socket.io)
    if (socketService.isUserOnline(ownerObjectId.toString())) {
      socketService.sendNotification(ownerObjectId.toString(), {
        type: "new_message",
      });
    }

    // Znajdź dane nadawcy dla powiadomienia
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ message: "Nie znaleziono nadawcy" });
    }

    // Tworzenie powiadomienia o nowej wiadomości
    try {
      const senderName = sender.name || sender.email;
      await notificationManager.notifyNewMessage(
        ownerId.toString(),
        senderName,
        adTitle
      );
    } catch (notificationError) {
      console.error("Błąd podczas tworzenia powiadomienia:", notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    res.status(201).json({ message: "Wiadomość wysłana" });
  } catch (error) {
    console.error("Błąd podczas wysyłania wiadomości:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
};
