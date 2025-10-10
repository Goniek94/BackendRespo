/**
 * Handler do zarządzania statusami ogłoszeń
 * Odpowiada za: zmianę statusu, przedłużanie, usuwanie ogłoszeń
 */

import Ad from "../../../models/listings/ad.js";
import auth from "../../../middleware/auth.js";
import errorHandler from "../../../middleware/errors/errorHandler.js";
import notificationManager from "../../../services/notificationManager.js";

/**
 * PUT /ads/:id/status - Zmiana statusu ogłoszenia
 */
export const changeStatus = [
  auth,
  async (req, res, next) => {
    try {
      const { status } = req.body;

      // Walidacja statusu
      const allowedStatuses = ["active", "archived", "sold", "pending"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Nieprawidłowy status. Dozwolone wartości: active, archived, sold, pending",
        });
      }

      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      // Obsługa zarówno pola 'user' (nowe) jak i 'owner' (stare)
      const adOwnerId = (ad.user || ad.owner)?.toString();
      if (
        !adOwnerId ||
        (adOwnerId !== req.user.userId.toString() && req.user.role !== "admin")
      ) {
        return res.status(403).json({
          message: "Brak uprawnień do zmiany statusu tego ogłoszenia",
        });
      }

      // Aktualizuj status
      ad.status = status;

      // Jeśli status to 'archived', ustaw datę archiwizacji
      if (status === "archived") {
        ad.archivedAt = new Date();
      }

      await ad.save();

      // Tworzenie powiadomienia o zmianie statusu
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        const statusText =
          status === "archived"
            ? "zarchiwizowane"
            : status === "sold"
            ? "sprzedane"
            : status === "active"
            ? "aktywne"
            : status;
        await notificationManager.notifyAdStatusChange(
          adOwnerId,
          adTitle,
          statusText
        );
        console.log(
          `Utworzono powiadomienie o zmianie statusu ogłoszenia dla użytkownika ${adOwnerId}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      res.status(200).json({
        message: `Status ogłoszenia został zmieniony na ${status}`,
        ad,
      });
    } catch (err) {
      console.error("Błąd podczas zmiany statusu ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler,
];

/**
 * POST /ads/:id/extend - Przedłużenie ogłoszenia o 30 dni
 */
export const extendAd = [
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      // Obsługa zarówno pola 'user' (nowe) jak i 'owner' (stare)
      const adOwnerId = (ad.user || ad.owner)?.toString();
      if (
        !adOwnerId ||
        (adOwnerId !== req.user.userId.toString() && req.user.role !== "admin")
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do przedłużenia tego ogłoszenia" });
      }

      // Sprawdź czy ogłoszenie można przedłużyć (tylko aktywne ogłoszenia)
      if (ad.status !== "active") {
        return res
          .status(400)
          .json({ message: "Można przedłużyć tylko aktywne ogłoszenia" });
      }

      // Przedłuż ogłoszenie o 30 dni od dzisiaj
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 30);

      ad.expiresAt = newExpiryDate;
      ad.createdAt = new Date(); // Resetuj datę utworzenia dla licznika dni

      await ad.save();

      // Tworzenie powiadomienia o przedłużeniu
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationManager.notifyAdStatusChange(
          adOwnerId,
          adTitle,
          "przedłużone o 30 dni"
        );
        console.log(
          `Utworzono powiadomienie o przedłużeniu ogłoszenia dla użytkownika ${adOwnerId}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      console.log(
        `Przedłużono ogłoszenie ${req.params.id} do ${newExpiryDate}`
      );
      res.status(200).json({
        message: "Ogłoszenie zostało przedłużone o 30 dni",
        expiresAt: newExpiryDate,
        ad,
      });
    } catch (err) {
      console.error("Błąd podczas przedłużania ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler,
];

/**
 * DELETE /ads/:id - Usuwanie ogłoszenia
 */
export const deleteAd = [
  auth,
  async (req, res, next) => {
    try {
      const ad = await Ad.findById(req.params.id);

      if (!ad) {
        return res.status(404).json({ message: "Ogłoszenie nie znalezione" });
      }

      // Sprawdź czy użytkownik jest właścicielem lub adminem
      // Obsługa zarówno pola 'user' (nowe) jak i 'owner' (stare)
      const adOwnerId = (ad.user || ad.owner)?.toString();
      if (
        !adOwnerId ||
        (adOwnerId !== req.user.userId.toString() && req.user.role !== "admin")
      ) {
        return res
          .status(403)
          .json({ message: "Brak uprawnień do usunięcia tego ogłoszenia" });
      }

      // Usuń ogłoszenie z bazy danych
      await Ad.findByIdAndDelete(req.params.id);

      // Tworzenie powiadomienia o usunięciu ogłoszenia
      try {
        const adTitle = ad.headline || `${ad.brand} ${ad.model}`;
        await notificationManager.notifyAdStatusChange(
          adOwnerId,
          adTitle,
          "usunięte"
        );
        console.log(
          `Utworzono powiadomienie o usunięciu ogłoszenia dla użytkownika ${adOwnerId}`
        );
      } catch (notificationError) {
        console.error(
          "Błąd podczas tworzenia powiadomienia:",
          notificationError
        );
        // Nie przerywamy głównego procesu w przypadku błędu powiadomienia
      }

      res.status(200).json({ message: "Ogłoszenie zostało usunięte" });
    } catch (err) {
      console.error("Błąd podczas usuwania ogłoszenia:", err);
      next(err);
    }
  },
  errorHandler,
];

export default { changeStatus, extendAd, deleteAd };
