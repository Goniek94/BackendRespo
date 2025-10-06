import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// User model schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  lastName: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  status: { type: String, default: "active" },
  isVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  phoneNumber: String,
  phone: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test user credentials
    const testUser = {
      name: "Jan",
      lastName: "Testowy",
      email: "test@autosell.pl",
      password: "Test123!",
      role: "user",
      status: "active",
      isVerified: true,
      isEmailVerified: true,
      emailVerified: true,
      isPhoneVerified: false,
      phoneVerified: false,
      phoneNumber: "+48123456789",
      phone: "+48123456789",
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      console.log("⚠️  User already exists!");
      console.log("📧 Email:", testUser.email);
      console.log("🔑 Password: Test123!");
      console.log("\nUpdating existing user...");

      // Hash new password
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      // Update user
      await User.findByIdAndUpdate(existingUser._id, {
        ...testUser,
        password: hashedPassword,
        updatedAt: new Date(),
      });

      console.log("✅ User updated successfully!");
    } else {
      console.log("🆕 Creating new test user...");

      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      // Create user
      const newUser = new User({
        ...testUser,
        password: hashedPassword,
      });

      await newUser.save();
      console.log("✅ Test user created successfully!");
    }

    console.log("\n📋 TEST USER CREDENTIALS:");
    console.log("========================");
    console.log("📧 Email: test@autosell.pl");
    console.log("🔑 Password: Test123!");
    console.log("👤 Role: user");
    console.log("✅ Status: active");
    console.log("✔️  Verified: true");
    console.log("========================\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
}

createTestUser();
