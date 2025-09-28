import mongoose from "mongoose";

const TargetCriteriaSchema = new mongoose.Schema(
  {
    categories: [{ type: String }],
    locations: [{ type: String }],
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    roles: [{ type: String }],
    minPrice: { type: Number },
    maxPrice: { type: Number },
  },
  { _id: false }
);

const ConditionsSchema = new mongoose.Schema(
  {
    minOrderValue: { type: Number, default: 0 },
    onlyForNewUsers: { type: Boolean, default: false },
  },
  { _id: false }
);

const PromotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },

    // percentage | fixed_amount | free_listing
    type: {
      type: String,
      enum: ["percentage", "fixed_amount", "free_listing"],
      required: true,
    },
    value: { type: Number, default: 0 },

    promoCode: { type: String, trim: true },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },

    // kontroler używa: draft | active | paused
    status: {
      type: String,
      enum: ["draft", "active", "paused"],
      default: "draft",
      index: true,
    },

    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    maxUsagePerUser: { type: Number, default: 1 },

    targetType: {
      type: String,
      enum: [
        "all_users",
        "category",
        "location",
        "specific_users",
        "user_role",
      ],
      default: "all_users",
      index: true,
    },
    targetCriteria: { type: TargetCriteriaSchema, default: {} },
    conditions: { type: ConditionsSchema, default: {} },

    appliedAdIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ad" }],
    priority: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Promotion", PromotionSchema);
