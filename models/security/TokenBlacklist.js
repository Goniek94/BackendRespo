// models/security/TokenBlacklist.js
import mongoose from "mongoose";

// --- fallback in-memory cache (szybkie sprawdzanie) ---
const memoryCache = new Set();

// --- opcjonalny model w Mongo (jeśli DB jest podłączona) ---
const TokenBlacklistSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, index: true, unique: true },
    reason: { type: String, default: "OTHER" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    expiresAt: { type: Date }, // opcjonalnie TTL (jeżeli tworzysz z exp)
  },
  { timestamps: true }
);

// unikamy redefinicji w nodemon
const TokenBlacklistModel =
  mongoose.models.TokenBlacklist ||
  mongoose.model("TokenBlacklist", TokenBlacklistSchema);

// sprawdź czy Mongoose ma aktywne połączenie
const isDbConnected = () => mongoose.connection?.readyState === 1;

/** Dodaj token do blacklisty */
export const addToBlacklist = async (
  token,
  { reason = "OTHER", userId = null, expiresAt = null } = {}
) => {
  try {
    // zawsze wrzucamy do pamięci
    memoryCache.add(token);

    if (isDbConnected()) {
      // zabezpieczenie: uniknij E11000
      await TokenBlacklistModel.updateOne(
        { token },
        {
          $set: { token, reason, userId, ...(expiresAt ? { expiresAt } : {}) },
        },
        { upsert: true }
      );
    }
    return true;
  } catch (err) {
    console.error("addToBlacklist error:", err.message);
    return false;
  }
};

/** Sprawdź czy token jest zablokowany */
export const isBlacklisted = async (token) => {
  if (!token) return false;

  // szybka ścieżka (RAM)
  if (memoryCache.has(token)) return true;

  if (!isDbConnected()) {
    // bez DB opieramy się wyłącznie na RAM
    return memoryCache.has(token);
  }

  try {
    const doc = await TokenBlacklistModel.findOne({ token }).lean();
    if (doc) {
      // dopisz do cache, by kolejne sprawdzenia były szybkie
      memoryCache.add(token);
      return true;
    }
    return false;
  } catch (err) {
    console.error("isBlacklisted error:", err.message);
    // w razie błędu DB – nie blokuj (albo oprzyj się na RAM)
    return memoryCache.has(token);
  }
};

/** Wyczyść blacklistę (do testów) */
export const clearBlacklist = async () => {
  try {
    memoryCache.clear();
    if (isDbConnected()) {
      await TokenBlacklistModel.deleteMany({});
    }
    return true;
  } catch (err) {
    console.error("clearBlacklist error:", err.message);
    return false;
  }
};

export default { addToBlacklist, isBlacklisted, clearBlacklist };
