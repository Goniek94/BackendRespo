// models/admin/SystemSettings.js
import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    displayName: { type: String, default: "" },
    description: { type: String, default: "" },
    category: {
      type: String,
      default: "general",
      index: true,
      enum: [
        "general",
        "notifications",
        "security",
        "payment",
        "moderation",
        "listing",
        "user",
        "analytics",
        "maintenance",
      ],
    },
    valueType: {
      type: String,
      required: true,
      enum: ["string", "number", "boolean", "array", "object"],
      index: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    defaultValue: { type: mongoose.Schema.Types.Mixed, required: true },
    // meta
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// prosta “efektywna” wartość
systemSettingsSchema.virtual("effectiveValue").get(function () {
  return this.value;
});

export default mongoose.model("SystemSettings", systemSettingsSchema);
