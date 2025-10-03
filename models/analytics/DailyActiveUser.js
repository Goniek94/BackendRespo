// models/analytics/DailyActiveUser.js
import mongoose from "mongoose";

const DailyActiveUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    // Dzień w UTC (początek doby)
    day: { type: Date, required: true, index: true },

    // Metryki pomocnicze (opcjonalne)
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 1 }, // ile razy „odwiedził" danego dnia
  },
  { timestamps: true }
);

// Unikalność: jeden dokument na (user, day)
DailyActiveUserSchema.index({ user: 1, day: 1 }, { unique: true });

const DailyActiveUser = mongoose.model(
  "DailyActiveUser",
  DailyActiveUserSchema
);
export default DailyActiveUser;
