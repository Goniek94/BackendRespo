// models/activity/AdminActivityLog.js
import mongoose from "mongoose";

const AdminActivityLogSchema = new mongoose.Schema(
  {
    // kto wykonał akcję (może być null dla systemu/webhooków)
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      email: { type: String, default: "" },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    // cel/obiekt akcji
    target: {
      resourceType: {
        type: String,
        enum: [
          "listing",
          "user",
          "report",
          "message",
          "promotion",
          "system",
          "other",
        ],
        required: true,
        index: true,
      },
      resourceId: { type: String, default: "", index: true }, // np. ObjectId string
      title: { type: String, default: "" }, // np. tytuł ogłoszenia
    },

    // typ akcji (kanoniczne klucze; używamy do ikon i tłumaczeń)
    action: {
      type: String,
      enum: [
        // listings
        "listing.created",
        "listing.updated",
        "listing.approved",
        "listing.rejected",
        "listing.featured",
        "listing.unfeatured",
        "listing.hidden",
        "listing.visible",
        "listing.extended",
        "listing.deleted",

        // users
        "user.registered",
        "user.login",
        "user.blocked",
        "user.unblocked",
        "user.role_changed",

        // reports
        "report.created",
        "report.resolved",

        // messages (bez treści)
        "message.sent",

        // promotions
        "promotion.activated",
        "promotion.deactivated",

        // system / other
        "system.alert",
        "other",
      ],
      required: true,
      index: true,
    },

    // dowolne metadane do wyświetlenia (nie wrażliwe!):
    meta: {
      ip: { type: String, default: "" },
      note: { type: String, default: "" },
      price: { type: Number, default: null },
      // … cokolwiek lekkiego; nie logujemy danych wrażliwych
    },
  },
  { timestamps: true }
);

AdminActivityLogSchema.index({ createdAt: -1 });
export default mongoose.model("AdminActivityLog", AdminActivityLogSchema);
