// middleware/analytics/trackDailyActive.js
import DailyActiveUser from "../../models/analytics/DailyActiveUser.js";

/** Zwraca początek dnia w UTC */
const startOfUTCDay = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const trackDailyActive = async (req, _res, next) => {
  try {
    const u = req.user; // musi być ustawione przez middleware auth
    if (!u?.userId) return next(); // ✅ Zmieniono _id na userId

    const day = startOfUTCDay();
    const filter = { user: u.userId, day }; // ✅ Zmieniono u._id na u.userId

    // Jednorazowy upsert w danym dniu – nie zwiększy liczby „aktywnych" powyżej 1
    await DailyActiveUser.updateOne(
      filter,
      {
        $setOnInsert: { firstSeenAt: new Date() },
        $set: { lastSeenAt: new Date() },
        $inc: { loginCount: 1 }, // zliczamy logowania, ale DAU liczy unikalnie
      },
      { upsert: true }
    );

    next(); // ✅ Wywołanie next() po sukcesie
  } catch (err) {
    // nie blokujemy żądania gdy analityka padnie
    console.error("trackDailyActive error:", err); // ✅ Dodano log błędu
    next(); // ✅ Wywołanie next() po błędzie
  }
  // ✅ Usunięto finally block który powodował podwójne next()
};

export default trackDailyActive;
export { startOfUTCDay };
