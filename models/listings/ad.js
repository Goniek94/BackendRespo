import mongoose from "mongoose";

const AdSchema = new mongoose.Schema(
  {
    // Tytuł (stare rekordy mogą mieć 'headline' – obsługujemy w kontrolerze)
    title: { type: String, required: false, index: true }, // nie wymagamy, bo stare rekordy mogły nie mieć

    description: { type: String, default: "" },

    // Autor – nowe rekordy 'user', stare mogły mieć 'owner' (kontroler robi fallback)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    // Legacy: część danych w starych rekordach
    headline: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // Dane katalogowe (opcjonalne)
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    generation: { type: String, default: "" },
    version: { type: String, default: "" },
    year: { type: Number, default: null },
    mileage: { type: Number, default: null },
    fuelType: { type: String, default: "" },
    transmission: { type: String, default: "" },

    // Ceny / promocje
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 99 },
    discountedPrice: { type: Number, default: null },

    // Obrazy
    images: { type: [String], default: [] },
    mainImage: { type: String, default: "" },
    cover: { type: String, default: "" }, // legacy

    // Status moderacji
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "active"], // 'active' legacy
      default: "pending",
      index: true,
    },
    moderation: {
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectedAt: { type: Date },
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectReason: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

AdSchema.methods.applyPercentDiscount = function (pct) {
  const p = Number(pct) || 0;
  this.discount = Math.max(0, Math.min(99, p));
  this.discountedPrice = p > 0 ? Math.round(this.price * (1 - p / 100)) : null;
};

AdSchema.methods.applyFlatDiscount = function (amount) {
  const a = Math.max(0, Number(amount) || 0);
  const newPrice = Math.max(0, this.price - a);
  this.discount =
    this.price > 0 ? Math.round((1 - newPrice / this.price) * 100) : 0;
  this.discountedPrice = newPrice;
};

AdSchema.methods.clearDiscount = function () {
  this.discount = 0;
  this.discountedPrice = null;
};

const Ad = mongoose.model("Ad", AdSchema);
export default Ad;
