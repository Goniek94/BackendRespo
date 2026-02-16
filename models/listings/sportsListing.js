/**
 * Sports Listing Model
 * Model for sports equipment and memorabilia listings (jerseys, shoes, accessories, etc.)
 */

import mongoose from "mongoose";

const SportsListingSchema = new mongoose.Schema(
  {
    // Basic Information
    title: { type: String, required: true, index: true },
    description: { type: String, default: "" },

    // Category
    category: { type: String, required: true, index: true }, // jerseys, footwear, pants, jackets, accessories
    categorySlug: { type: String, required: true, index: true },

    // Product Details
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    club: { type: String, default: "" },
    season: { type: String, default: "" },
    size: { type: String, default: "" },
    condition: { type: String, default: "excellent" }, // excellent, very_good, good, fair

    // Verification Fields
    verification: {
      hasAutograph: { type: Boolean, default: false },
      autographDetails: { type: String, default: "" },
      isVintage: { type: Boolean, default: false },
      vintageYear: { type: String, default: "" },
      tagCondition: {
        type: String,
        enum: ["intact", "cut", "washed_out", "missing"],
        default: "intact",
      },
      hasDefects: { type: Boolean, default: false },
      defects: [
        {
          type: { type: String, default: "" },
          description: { type: String, default: "" },
          photoId: { type: String, default: null },
        },
      ],
    },

    // AI Analysis Data (optional)
    aiData: {
      recognition: {
        productType: { type: String, default: "" },
        brand: { type: String, default: "" },
        model: { type: String, default: "" },
        season: { type: String, default: "" },
        year: { type: String, default: "" },
        club: { type: String, default: "" },
        productionCountry: { type: String, default: "" },
        barcodeOrSku: { type: String, default: "" },
      },
      generatedContent: {
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        bulletPoints: [{ type: String }],
      },
      pricing: {
        marketMin: { type: Number, default: 0 },
        marketMax: { type: Number, default: 0 },
        suggestedPrice: { type: Number, default: 0 },
      },
      authenticity: {
        score: { type: Number, default: 0 },
        verdict: {
          type: String,
          enum: ["very_high", "high", "medium", "low"],
          default: "medium",
        },
        reasons: [{ type: String }],
      },
      assets: {
        generatedModelImageUrl: { type: String, default: "" },
      },
    },

    // Verification Status
    verificationStatus: {
      type: String,
      enum: [
        "NOT_AI_VERIFIED",
        "AI_VERIFIED_HIGH",
        "AI_VERIFIED_MEDIUM",
        "FLAGGED",
      ],
      default: "NOT_AI_VERIFIED",
    },

    // Listing Type & Pricing
    listingType: {
      type: String,
      enum: ["auction", "buy_now"],
      default: "auction",
    },
    price: { type: Number, default: 0, min: 0 }, // Buy now price
    startPrice: { type: Number, default: 0, min: 0 }, // Auction start price
    bidStep: { type: Number, default: 0, min: 0 }, // Minimum bid increment
    duration: { type: String, default: "7d" }, // Auction duration

    // Current auction state (if auction)
    currentBid: { type: Number, default: 0 },
    bidCount: { type: Number, default: 0 },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    auctionEndDate: { type: Date, default: null },

    // Photos
    photos: [
      {
        id: { type: String, required: true },
        url: { type: String, required: true },
        typeHint: {
          type: String,
          enum: [
            "front_far",
            "front_close",
            "back_far",
            "back_close",
            "sponsor",
            "brand",
            "size_tag",
            "country_tag",
            "serial_code",
            "player_name",
            "player_number",
            "seams",
            "club_logo",
            "label",
            "detail",
            "sole",
            "inside",
            "box",
            "barcode",
            "autograph",
            "defect",
            null,
          ],
          default: null,
        },
      },
    ],
    mainImage: { type: String, default: "" },

    // Owner Information
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerName: { type: String, default: "" },
    ownerEmail: { type: String, default: "" },
    ownerPhone: { type: String, default: "" },

    // Status & Moderation
    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending",
        "approved",
        "rejected",
        "active",
        "hidden",
        "archived",
        "sold",
      ],
      default: "pending_payment",
      index: true,
    },

    moderation: {
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectedAt: { type: Date },
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectReason: { type: String, default: "" },
      hiddenAt: { type: Date },
      hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      hideReason: { type: String, default: "" },
    },

    // Featured & Expiration
    featured: { type: Boolean, default: false, index: true },
    featuredAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },

    // Analytics
    views: { type: Number, default: 0, min: 0 },
    favorites: { type: Number, default: 0, min: 0 },
    favoritedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better query performance
SportsListingSchema.index({ category: 1, status: 1 });
SportsListingSchema.index({ brand: 1, status: 1 });
SportsListingSchema.index({ club: 1, status: 1 });
SportsListingSchema.index({ listingType: 1, status: 1 });
SportsListingSchema.index({ createdAt: -1 });
SportsListingSchema.index({ price: 1 });
SportsListingSchema.index({ auctionEndDate: 1 });

// Method to extend listing expiration
SportsListingSchema.methods.extendDays = function (days = 30) {
  const d = Math.max(1, Number(days) || 30);
  const base =
    this.expiresAt && this.expiresAt > new Date() ? this.expiresAt : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + d);
  this.expiresAt = next;
};

// Method to place a bid (for auctions)
SportsListingSchema.methods.placeBid = function (userId, bidAmount) {
  if (this.listingType !== "auction") {
    throw new Error("This listing is not an auction");
  }

  const minBid =
    this.currentBid > 0 ? this.currentBid + this.bidStep : this.startPrice;

  if (bidAmount < minBid) {
    throw new Error(`Bid must be at least ${minBid}`);
  }

  this.currentBid = bidAmount;
  this.bidCount += 1;
  this.highestBidder = userId;
};

const SportsListing = mongoose.model("SportsListing", SportsListingSchema);
export default SportsListing;
