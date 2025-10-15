import express from "express";
import { Router } from "express";
import auth from "../../middleware/auth.js";
import User from "../../models/user/user.js";
import Ad from "../../models/listings/ad.js";
import mongoose from "mongoose";
import notificationManager from "../../services/notificationManager.js";

const router = Router();

// Pobieranie ulubionych ogłoszeń użytkownika
router.get("/", auth, async (req, res) => {
  try {
    console.log("Pobieranie ulubionych dla użytkownika:", req.user);

    // Poprawione użycie req.user.userId zamiast req.user._id
    const user = await User.findById(req.user.userId).populate("favorites");

    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie znaleziony" });
    }

    console.log("Znaleziono ulubione:", user.favorites);
    res.status(200).json({
      success: true,
      data: {
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Błąd podczas pobierania ulubionych:", error);
    res.status(500).json({ message: "Wystąpił błąd serwera" });
  }
});

// Dodawanie ogłoszenia do ulubionych
router.post("/add/:id", auth, async (req, res) => {
  try {
    const adId = req.params.id;
    console.log(
      "Dodawanie ogłoszenia do ulubionych:",
      adId,
      "dla użytkownika:",
      req.user.userId
    );

    // Sprawdź, czy ogłoszenie istnieje i ma odpowiedni status
    let ad;
    try {
      ad = await Ad.findOne({
        _id: adId,
        status: { $in: ["active", "approved", "opublikowane", "pending"] },
      });
      if (!ad) {
        console.log("Ogłoszenie nie znalezione lub nie jest aktywne:", adId);
        return res.status(404).json({
          message: "Ogłoszenie nie znalezione lub nie jest opublikowane",
        });
      }
      console.log("Znaleziono ogłoszenie:", ad._id, "właściciel:", ad.owner);
    } catch (adError) {
      console.error("Błąd podczas wyszukiwania ogłoszenia:", adError);
      return res.status(500).json({
        message: "Błąd podczas wyszukiwania ogłoszenia",
        error: adError.message,
      });
    }

    // Dodaj ogłoszenie do ulubionych użytkownika
    let user;
    try {
      user = await User.findById(req.user.userId);
      if (!user) {
        console.log("Użytkownik nie znaleziony:", req.user.userId);
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }
      console.log("Znaleziono użytkownika:", user._id);
    } catch (userError) {
      console.error("Błąd podczas wyszukiwania użytkownika:", userError);
      return res.status(500).json({
        message: "Błąd podczas wyszukiwania użytkownika",
        error: userError.message,
      });
    }

    // Sprawdź, czy ogłoszenie już jest w ulubionych
    const isAlreadyFavorite = user.favorites.some(
      (favId) => favId && favId.toString() === adId
    );
    if (isAlreadyFavorite) {
      console.log("Ogłoszenie już jest w ulubionych:", adId);
      return res
        .status(400)
        .json({ message: "Ogłoszenie już jest w ulubionych" });
    }

    console.log("Dodawanie ogłoszenia do ulubionych - szczegóły:", {
      userId: user._id,
      adId: adId,
      currentFavorites: user.favorites,
    });

    // Dodaj do ulubionych używając updateOne (omija walidację)
    try {
      // Używamy updateOne zamiast save(), aby ominąć walidację modelu
      const result = await User.updateOne(
        { _id: user._id },
        { $addToSet: { favorites: new mongoose.Types.ObjectId(adId) } } // $addToSet zapobiega duplikatom
      );
      console.log("Wynik aktualizacji ulubionych:", result);
      console.log("Ogłoszenie dodane do ulubionych użytkownika:", user._id);
    } catch (saveError) {
      console.error(
        "Błąd podczas aktualizacji ulubionych użytkownika:",
        saveError
      );
      return res.status(500).json({
        message: "Błąd podczas aktualizacji ulubionych",
        error: saveError.message,
      });
    }

    // Powiadomienie dla właściciela ogłoszenia o dodaniu do ulubionych (z throttlingiem)
    try {
      // Sprawdź, czy właściciel ogłoszenia istnieje
      if (!ad.owner) {
        console.warn("Ogłoszenie nie ma przypisanego właściciela:", adId);
      }
      // Tylko jeśli właściciel ogłoszenia nie jest tym samym użytkownikiem, który dodaje do ulubionych
      else if (ad.owner.toString() !== req.user.userId) {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        console.log(
          "Tworzenie powiadomienia dla właściciela:",
          ad.owner,
          "tytuł:",
          adTitle
        );

        // THROTTLING: Sprawdź czy nie wysłano już powiadomienia w ciągu ostatnich 10 minut
        const Notification = (
          await import("../../models/communication/notification.js")
        ).default;
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const recentNotification = await Notification.findOne({
          recipient: ad.owner,
          relatedListing: ad._id,
          sender: req.user.userId,
          type: "listing_liked",
          createdAt: { $gte: tenMinutesAgo },
        });

        if (recentNotification) {
          console.log(
            `Pomijanie powiadomienia - już wysłano w ciągu ostatnich 10 minut (${recentNotification._id})`
          );
        } else {
          // Używamy try/catch wewnątrz, aby złapać błędy z NotificationService
          try {
            const notification =
              await notificationManager.createListingLikedNotification(
                ad.owner,
                ad,
                req.user.userId
              );
            if (notification) {
              console.log(
                `Utworzono powiadomienie o dodaniu do ulubionych dla użytkownika ${ad.owner}, ID powiadomienia: ${notification._id}`
              );

              // 🔥 Wyślij powiadomienie przez Socket.IO z aktualnym licznikiem
              if (req.app.locals.io) {
                req.app.locals.io
                  .to(`user_${ad.owner.toString()}`)
                  .emit("notification", {
                    ...notification.toObject(),
                    // Dodaj aktualny licznik favorites do powiadomienia
                    listingStats: {
                      favorites: ad.favorites,
                      views: ad.views || 0,
                    },
                  });
                console.log(
                  `📡 Wysłano powiadomienie z licznikiem favorites=${ad.favorites} do właściciela ${ad.owner}`
                );
              }
            } else {
              console.log(
                `Nie utworzono powiadomienia dla użytkownika ${ad.owner} (zwrócono null)`
              );
            }
          } catch (innerNotificationError) {
            console.error(
              "Błąd wewnątrz createListingLikedNotification:",
              innerNotificationError
            );
          }
        }
      } else {
        console.log(
          "Pomijanie powiadomienia - użytkownik dodaje własne ogłoszenie do ulubionych"
        );
      }
    } catch (notificationError) {
      console.error("Błąd podczas tworzenia powiadomienia:", notificationError);
      // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
    }

    // Aktualizuj licznik ulubionych i akcji ulubionych w ogłoszeniu
    try {
      ad.favorites = (ad.favorites || 0) + 1;
      ad.favoriteActions = (ad.favoriteActions || 0) + 1;
      await ad.save();
      console.log(
        "Zaktualizowano liczniki dla ogłoszenia:",
        ad._id,
        "ulubione:",
        ad.favorites,
        "akcje:",
        ad.favoriteActions
      );
    } catch (updateAdError) {
      console.error(
        "Błąd podczas aktualizacji liczników ulubionych w ogłoszeniu:",
        updateAdError
      );
      // Nie przerywamy głównego procesu w przypadku błędu aktualizacji licznika
    }

    res.status(200).json({
      success: true,
      message: "Ogłoszenie dodane do ulubionych",
      data: {
        adId,
        action: "added",
      },
    });
  } catch (error) {
    console.error("Błąd podczas dodawania do ulubionych:", error);
    res
      .status(500)
      .json({ message: "Wystąpił błąd serwera", error: error.message });
  }
});

// Usuwanie ogłoszenia z ulubionych
router.delete("/remove/:id", auth, async (req, res) => {
  try {
    const adId = req.params.id;
    console.log(
      "Usuwanie ogłoszenia z ulubionych:",
      adId,
      "dla użytkownika:",
      req.user.userId
    );

    // Usuń ogłoszenie z ulubionych użytkownika
    let user;
    try {
      user = await User.findById(req.user.userId);
      if (!user) {
        console.log("Użytkownik nie znaleziony:", req.user.userId);
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }
    } catch (userError) {
      console.error("Błąd podczas wyszukiwania użytkownika:", userError);
      return res.status(500).json({
        message: "Błąd podczas wyszukiwania użytkownika",
        error: userError.message,
      });
    }

    // Sprawdź, czy ogłoszenie jest w ulubionych
    const favoriteIndex = user.favorites.findIndex(
      (id) => id.toString() === adId
    );
    if (favoriteIndex === -1) {
      console.log("Ogłoszenie nie jest w ulubionych:", adId);
      return res
        .status(400)
        .json({ message: "Ogłoszenie nie jest w ulubionych" });
    }

    // Usuń z ulubionych używając updateOne (omija walidację)
    try {
      // Używamy updateOne zamiast save(), aby ominąć walidację modelu
      await User.updateOne({ _id: user._id }, { $pull: { favorites: adId } });
      console.log("Ogłoszenie usunięte z ulubionych użytkownika:", user._id);
    } catch (saveError) {
      console.error(
        "Błąd podczas aktualizacji ulubionych użytkownika:",
        saveError
      );
      return res.status(500).json({
        message: "Błąd podczas aktualizacji ulubionych",
        error: saveError.message,
      });
    }

    // Aktualizuj licznik ulubionych i akcji ulubionych w ogłoszeniu
    try {
      const ad = await Ad.findById(adId);
      if (ad) {
        ad.favorites = Math.max((ad.favorites || 0) - 1, 0);
        ad.favoriteActions = (ad.favoriteActions || 0) + 1;
        await ad.save();
        console.log(
          "Zaktualizowano liczniki dla ogłoszenia:",
          ad._id,
          "ulubione:",
          ad.favorites,
          "akcje:",
          ad.favoriteActions
        );

        // 🔥 USUWANIE: Wyślij Socket.IO event z nowym licznikiem (bez powiadomienia)
        if (req.app.locals.io && ad.owner) {
          req.app.locals.io
            .to(`user_${ad.owner.toString()}`)
            .emit("listing_stats_updated", {
              listingId: ad._id.toString(),
              favorites: ad.favorites,
              views: ad.views || 0,
            });
          console.log(
            `📡 Wysłano update licznika favorites=${ad.favorites} dla ogłoszenia ${ad._id}`
          );
        }
      }
    } catch (updateAdError) {
      console.error(
        "Błąd podczas aktualizacji liczników ulubionych w ogłoszeniu:",
        updateAdError
      );
      // Nie przerywamy głównego procesu w przypadku błędu aktualizacji licznika
    }

    res.status(200).json({
      success: true,
      message: "Ogłoszenie usunięte z ulubionych",
      data: {
        adId,
        action: "removed",
      },
    });
  } catch (error) {
    console.error("Błąd podczas usuwania z ulubionych:", error);
    res
      .status(500)
      .json({ message: "Wystąpił błąd serwera", error: error.message });
  }
});

// Sprawdzanie, czy ogłoszenie jest w ulubionych
router.get("/check/:id", auth, async (req, res) => {
  try {
    const adId = req.params.id;
    console.log(
      "Sprawdzanie, czy ogłoszenie jest w ulubionych:",
      adId,
      "dla użytkownika:",
      req.user.userId
    );

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Użytkownik nie znaleziony" });
    }

    const isFavorite = user.favorites.includes(adId);

    res.status(200).json({
      success: true,
      data: {
        adId,
        isFavorite,
      },
    });
  } catch (error) {
    console.error("Błąd podczas sprawdzania ulubionych:", error);
    res.status(500).json({ message: "Wystąpił błąd serwera" });
  }
});

export default router;
