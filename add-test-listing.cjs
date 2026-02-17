// Script to add a test listing to the database
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Define Ad schema (simplified)
const adSchema = new mongoose.Schema(
  {
    title: String,
    headline: String,
    description: String,
    brand: String,
    model: String,
    year: Number,
    mileage: Number,
    fuelType: String,
    transmission: String,
    power: Number,
    engineSize: Number,
    drive: String,
    bodyType: String,
    color: String,
    condition: String,
    countryOfOrigin: String,
    imported: String,
    sellerType: String,
    voivodeship: String,
    city: String,
    listingType: String,
    price: Number,
    images: [String],
    mainImage: String,
    status: { type: String, default: "active" },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    userId: mongoose.Schema.Types.ObjectId,
    moderation: {
      rejectReason: String,
      hideReason: String,
    },
  },
  { timestamps: true },
);

const Ad = mongoose.model("Ad", adSchema);

// Test listing data
const testListing = {
  title:
    "Mercedes-Benz C-Class C 220 CDI • 2.2 125 kW • Sedan • 2015 • Bezwypadkowy • Serwisowany",
  headline:
    "Mercedes-Benz C-Class C 220 CDI • 2.2 125 kW • Sedan • 2015 • Bezwypadkowy • Serwisowany",
  description:
    "Piękny Mercedes C-Class w doskonałym stanie technicznym. Regularnie serwisowany w ASO. Pierwszy właściciel w Polsce. Pełna dokumentacja serwisowa. Auto bezwypadkowe, zadbane. Wyposażenie: skórzana tapicerka, nawigacja, kamera cofania, czujniki parkowania, tempomat, klimatyzacja automatyczna.",
  brand: "MERCEDES-BENZ",
  model: "C-Class",
  year: 2015,
  mileage: 145000,
  fuelType: "DIESEL",
  transmission: "AUTOMATYCZNA",
  power: 170,
  engineSize: 2143,
  drive: "RWD (Tylny)",
  bodyType: "Sedan",
  color: "CZARNY",
  condition: "Używany",
  countryOfOrigin: "Niemcy",
  imported: "Tak",
  sellerType: "PRYWATNY",
  voivodeship: "Mazowieckie",
  city: "Warszawa",
  listingType: "standardowe",
  price: 65000,
  images: [
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800",
    "https://images.unsplash.com/photo-1617531653520-bd788a3a6c1e?w=800",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800",
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
  ],
  mainImage:
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
  status: "active",
  featured: false,
  views: 0,
  favorites: 0,
  moderation: {
    rejectReason: "",
    hideReason: "",
  },
};

// Add the listing
async function addTestListing() {
  try {
    const newAd = new Ad(testListing);
    await newAd.save();
    console.log("✅ Test listing added successfully!");
    console.log("📝 Listing ID:", newAd._id);
    console.log("🚗 Title:", newAd.title);
    console.log("💰 Price:", newAd.price, "zł");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding test listing:", error);
    process.exit(1);
  }
}

addTestListing();
