import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import auth from "../../middleware/auth.js";
import { requireAdminAuth } from "../../admin/middleware/adminAuth.js";
import Comment from "../../models/listings/comment.js";
import Ad from "../../models/listings/ad.js";
import Notification from "../../models/communication/notification.js";
import { uploadToSupabase } from "../../utils/supabaseUpload.js";

const router = express.Router();

// Konfiguracja multer dla przesyłania zdjęć - używamy memory storage dla Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Dozwolone są tylko pliki graficzne!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
  },
});

// Max 3 zdjęcia w jednym komentarzu
const uploadMultiple = upload.array("images", 3);

const createNotification = async (
  userId,
  title,
  message,
  type = "new_comment",
  adId = null
) => {
  try {
    const notification = new Notification({
      userId: userId,
      user: userId, // Dla kompatybilności wstecznej
      type: type,
      title: title,
      message: message,
      isRead: false,
      adId: adId,
    });
    await notification.save();
  } catch (error) {
    console.error("Błąd podczas tworzenia powiadomienia:", error);
  }
};

// Dodawanie komentarza - UŻYWA SUPABASE STORAGE + WIELE ZDJĘĆ
router.post("/:adId", auth, uploadMultiple, async (req, res) => {
  console.log("🔍 === DEBUG UPLOAD ===");
  console.log("req.files:", req.files);
  console.log("req.file:", req.file);
  console.log("req.body:", req.body);
  console.log("Content-Type:", req.get("Content-Type"));
  console.log("🔍 === END DEBUG ===");

  try {
    console.log("🚀 === BACKEND V2.0: NOWY KOD COMMENT UPLOAD ===");
    console.log("⚡ TIMESTAMP:", new Date().toISOString());
    console.log("📝 Content:", req.body.content);
    console.log("📦 req.body keys:", Object.keys(req.body));
    console.log("📦 req.files:", req.files);
    console.log("📦 req.file:", req.file);
    console.log("📷 Files count:", req.files ? req.files.length : 0);
    console.log("📷 req.files is Array:", Array.isArray(req.files));

    if (req.files && req.files.length > 0) {
      console.log("✅ PLIKI DOTARŁY DO BACKENDU:");
      req.files.forEach((file, i) => {
        console.log(
          `  Plik ${i + 1}: ${file.originalname} (${file.size} bajtów, ${
            file.mimetype
          })`
        );
        console.log(`    - buffer length: ${file.buffer?.length || 0}`);
        console.log(`    - fieldname: ${file.fieldname}`);
      });
    } else {
      console.log("❌ BRAK PLIKÓW W req.files!");
      console.log("❌ req.files value:", req.files);
    }

    console.log("🔑 Ad ID:", req.params.adId);
    console.log("👤 User ID:", req.user.userId);

    const { content } = req.body;
    const { adId } = req.params;

    console.log("✅ Sprawdzam ogłoszenie...");
    const ad = await Ad.findById(adId);
    if (!ad) {
      console.log("❌ BŁĄD: Ogłoszenie nie istnieje");
      return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
    }
    console.log("✅ Ogłoszenie znalezione:", ad.make, ad.model);

    console.log("🔍 Sprawdzam limit komentarzy użytkownika...");
    const userCommentsCount = await Comment.countDocuments({
      ad: adId,
      user: req.user.userId,
    });

    if (userCommentsCount >= 5) {
      console.log("❌ BŁĄD: Użytkownik osiągnął limit 5 komentarzy");
      return res.status(400).json({
        message: "Osiągnięto maksymalny limit 5 komentarzy do tego ogłoszenia",
      });
    }

    // Sprawdź antyspam - ostatni komentarz nie wcześniej niż 5 minut temu
    const lastComment = await Comment.findOne({
      ad: adId,
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    if (lastComment) {
      const timeDiff = Date.now() - new Date(lastComment.createdAt).getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff < 5) {
        const remainingTime = Math.ceil(5 - minutesDiff);
        console.log(
          `❌ BŁĄD: Antyspam - użytkownik musi poczekać ${remainingTime} min`
        );
        return res.status(429).json({
          message: `Poczekaj ${remainingTime} minut(y) przed dodaniem kolejnego komentarza`,
        });
      }
    }

    console.log(
      "✅ Użytkownik może dodać komentarz (limit: " + userCommentsCount + "/5)"
    );

    // WALIDACJA: Komentarz musi mieć przynajmniej jedno zdjęcie
    if (!req.files || req.files.length === 0) {
      console.log("❌ BŁĄD: Brak zdjęć w komentarzu");
      return res.status(400).json({
        message: "Komentarz musi zawierać przynajmniej jedno zdjęcie",
      });
    }

    // Upload zdjęć do Supabase Storage (jeśli są)
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 3) {
        console.log("❌ BŁĄD: Zbyt wiele plików");
        return res
          .status(400)
          .json({ message: "Maksymalnie 3 zdjęcia na komentarz" });
      }

      console.log(
        `📤 Rozpoczynam upload ${req.files.length} zdjęć do Supabase...`
      );
      console.log("📦 Bucket: autosell, Folder: comments");

      try {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          console.log(
            `📷 Plik ${i + 1}/${req.files.length}:`,
            file.originalname
          );
          console.log(
            `  - MIME: ${file.mimetype}, Rozmiar: ${file.size} bajtów`
          );
          console.log(`  - Buffer size: ${file.buffer?.length || 0} bajtów`);

          // Upload to Supabase - directly to 'autosell' bucket (no subfolder)
          // Add "comment-" prefix to filename to distinguish from listing photos
          const prefixedFilename = `comment-${file.originalname}`;
          const imageUrl = await uploadToSupabase(
            file.buffer,
            prefixedFilename,
            "autosell", // Main bucket name
            file.mimetype,
            null // No subfolder - upload directly to bucket root
          );

          imageUrls.push(imageUrl);
          console.log(
            `✅ Upload ${i + 1}/${req.files.length} sukces:`,
            imageUrl
          );
        }

        console.log(
          `🎉 Wszystkie ${imageUrls.length} zdjęć uploadowane pomyślnie!`
        );
        console.log(`📋 Lista URL-i:`, imageUrls);
      } catch (uploadError) {
        console.error("❌ BŁĄD UPLOADU DO SUPABASE:");
        console.error("  - Message:", uploadError.message);
        console.error("  - Stack:", uploadError.stack);
        console.error("  - Full error:", uploadError);

        // More detailed error info
        if (uploadError.statusCode) {
          console.error("  - Status Code:", uploadError.statusCode);
        }
        if (uploadError.error) {
          console.error("  - Error details:", uploadError.error);
        }

        return res.status(500).json({
          message:
            "Błąd podczas przesyłania zdjęć do Supabase. Sprawdź uprawnienia bucketu.",
          error: uploadError.message,
          details:
            process.env.NODE_ENV === "development"
              ? uploadError.stack
              : undefined,
        });
      }
    }

    console.log("💾 Zapisuję komentarz do bazy danych...");
    const comment = new Comment({
      ad: adId,
      user: new mongoose.Types.ObjectId(req.user.userId || req.user.id),
      content,
      images: imageUrls,
      status: "pending",
    });

    await comment.save();
    console.log("✅ Komentarz zapisany z ID:", comment._id);

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name lastName"
    );

    console.log("🎉 === BACKEND: KOMENTARZ DODANY POMYŚLNIE ===");
    res.status(201).json({
      message:
        "Komentarz wysłany do moderacji. Pojawi się po akceptacji przez administratora.",
      comment: populatedComment,
      success: true,
    });
  } catch (err) {
    console.error("❌ === BACKEND: BŁĄD PODCZAS DODAWANIA KOMENTARZA ===");
    console.error("❌ Error:", err);
    console.error("❌ Message:", err.message);
    console.error("❌ Stack:", err.stack);
    res.status(500).json({
      message: "Błąd serwera podczas dodawania komentarza",
      error: err.message,
    });
  }
});

// Pobieranie komentarzy - zwraca approved dla wszystkich + pending dla zalogowanego użytkownika
router.get("/:adId", async (req, res) => {
  const { adId } = req.params;

  try {
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
    }

    // Pobierz zatwierdzone komentarze
    let comments = await Comment.find({
      ad: adId,
      status: "approved",
    }).populate("user", "name lastName");

    // Jeśli użytkownik jest zalogowany, dodaj jego pending komentarze
    const userId = req.headers.authorization
      ? req.headers.userId || req.user?.userId
      : null;

    if (userId) {
      const userPendingComments = await Comment.find({
        ad: adId,
        user: userId,
        status: "pending",
      }).populate("user", "name lastName");

      comments = [...comments, ...userPendingComments];
    }

    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Sprawdzenie, czy użytkownik już skomentował
router.get("/:adId/user", auth, async (req, res) => {
  const { adId } = req.params;
  const userId = req.user.userId;

  try {
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
    }

    const existingComment = await Comment.findOne({ ad: adId, user: userId });

    res.status(200).json({
      hasCommented: !!existingComment,
      comment: existingComment,
    });
  } catch (err) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// === NOWE ENDPOINTY DLA ADMINA ===

// Pobieranie komentarzy oczekujących na moderację
router.get("/admin/pending", requireAdminAuth, async (req, res) => {
  try {
    const pendingComments = await Comment.find({ status: "pending" })
      .populate("user", "name lastName email")
      .populate("ad", "make model title")
      .sort({ createdAt: -1 });

    res.status(200).json(pendingComments);
  } catch (err) {
    console.error("Błąd podczas pobierania komentarzy:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Pobieranie wszystkich komentarzy (dla admina) z filtrem
router.get("/admin/all", requireAdminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const comments = await Comment.find(filter)
      .populate("user", "name lastName email")
      .populate("ad", "make model title")
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (err) {
    console.error("Błąd podczas pobierania komentarzy:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Zatwierdzenie komentarza
router.patch("/admin/:id/approve", requireAdminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("user", "name lastName")
      .populate("ad", "make model owner");

    if (!comment) {
      return res.status(404).json({ message: "Komentarz nie znaleziony" });
    }

    comment.status = "approved";
    await comment.save();

    await createNotification(
      comment.user._id,
      "Komentarz zaakceptowany",
      `Twój komentarz do ogłoszenia "${comment.ad.make} ${comment.ad.model}" został zaakceptowany!`,
      "comment_added",
      comment.ad._id
    );

    await createNotification(
      comment.ad.owner,
      "Nowy komentarz",
      `Nowy komentarz do Twojego ogłoszenia "${comment.ad.make} ${comment.ad.model}" został opublikowany.`,
      "comment_added",
      comment.ad._id
    );

    res.status(200).json({
      message: "Komentarz zatwierdzony",
      comment,
    });
  } catch (err) {
    console.error("Błąd podczas zatwierdzania komentarza:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Odrzucenie komentarza
router.patch("/admin/:id/reject", requireAdminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate("user", "name lastName")
      .populate("ad", "make model");

    if (!comment) {
      return res.status(404).json({ message: "Komentarz nie znaleziony" });
    }

    comment.status = "rejected";
    await comment.save();

    await createNotification(
      comment.user._id,
      "Komentarz odrzucony",
      `Twój komentarz do ogłoszenia "${comment.ad.make} ${comment.ad.model}" został odrzucony przez moderatora.`,
      "comment_added",
      comment.ad._id
    );

    res.status(200).json({
      message: "Komentarz odrzucony",
      comment,
    });
  } catch (err) {
    console.error("Błąd podczas odrzucania komentarza:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Edycja komentarza (user) - wraca do pending po edycji
router.patch("/:id", auth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Komentarz nie znaleziony" });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Brak dostępu do tego komentarza" });
    }

    // Aktualizuj treść i zmień status na pending
    comment.content = content;
    comment.status = "pending";
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name lastName"
    );

    res.status(200).json({
      message: "Komentarz zaktualizowany. Czeka na ponowną moderację.",
      comment: populatedComment,
    });
  } catch (err) {
    console.error("Błąd podczas edycji komentarza:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Usuwanie komentarza (user może usunąć swój)
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Komentarz nie znaleziony" });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Brak dostępu do tego komentarza" });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Komentarz usunięty pomyślnie" });
  } catch (err) {
    console.error("Błąd podczas usuwania komentarza:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// Usuwanie komentarza przez admina
router.delete("/admin/:id", requireAdminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Komentarz nie znaleziony" });
    }

    const userId = comment.user;
    await Comment.findByIdAndDelete(req.params.id);

    await createNotification(
      userId,
      "Komentarz usunięty",
      "Twój komentarz został usunięty przez administratora.",
      "comment_added"
    );

    res.status(200).json({ message: "Komentarz usunięty" });
  } catch (err) {
    console.error("Błąd podczas usuwania komentarza przez admina:", err);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

export default router;
