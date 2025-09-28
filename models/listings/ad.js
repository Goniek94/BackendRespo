import mongoose from "mongoose";

const AdSchema = new mongoose.Schema(
  {
    // Tytuł (stare rekordy mogą mieć 'headline' – obsługujemy w kontrolerze)
    title: { type: String, required: false, index: true },

    description: { type: String, default: "" },

    // Autor – nowe rekordy 'user', stare mogły mieć 'owner'
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    // Legacy
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
      enum: ["pending", "approved", "rejected", "active", "hidden"], // + hidden
      default: "pending",
      index: true,
    },

    // Wyróżnienia & ekspozycja
    featured: { type: Boolean, default: false, index: true },
    featuredAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true }, // do „przedłuż”

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

/* ----------------------------- Metody rabatów ----------------------------- */
AdSchema.methods.applyPercentDiscount = function (pct) {
  const p = Number(pct) || 0;
  const clamped = Math.max(0, Math.min(99, p));
  this.discount = clamped;
  this.discountedPrice =
    clamped > 0 ? Math.round(this.price * (1 - clamped / 100)) : null;
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

/* --------------------------- Przedłużanie ekspozycji --------------------------- */
AdSchema.methods.extendDays = function (days = 30) {
  const d = Math.max(1, Number(days) || 30);
  const base =
    this.expiresAt && this.expiresAt > new Date() ? this.expiresAt : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + d);
  this.expiresAt = next;
};

/* ---------------------- Spójność rabatu przy zapisie ---------------------- */
AdSchema.pre("save", function (next) {
  if (typeof this.discount !== "number") this.discount = 0;
  this.discount = Math.max(0, Math.min(99, this.discount));
  if (this.discount > 0) {
    this.discountedPrice = Math.round(this.price * (1 - this.discount / 100));
  } else {
    this.discountedPrice = null;
  }
  next();
});

const Ad = mongoose.model("Ad", AdSchema);
export default Ad;
