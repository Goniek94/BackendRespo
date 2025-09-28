import jwt from "jsonwebtoken";
import config from "./config/index.js";

console.log("🔍 DECODING EXISTING TOKENS");
console.log("============================");
console.log("");

// Simulate tokens that might exist in cookies
const jwtCfg = config.security?.jwt || {};

// Test different token scenarios
const testScenarios = [
  {
    name: "Old Token (without issuer/audience)",
    payload: { userId: "test-user", role: "admin", type: "access" },
    options: {
      expiresIn: "15m",
      algorithm: "HS256",
      // NO issuer/audience
    },
  },
  {
    name: "New Token (with issuer/audience)",
    payload: { userId: "test-user", role: "admin", type: "access" },
    options: {
      expiresIn: "15m",
      algorithm: "HS256",
      issuer: jwtCfg.issuer || "marketplace-app",
      audience: jwtCfg.audience || "marketplace-users",
    },
  },
];

console.log("🧪 TESTING TOKEN SCENARIOS:");
console.log("");

for (const scenario of testScenarios) {
  console.log(`📋 ${scenario.name}:`);

  try {
    // Generate token
    const token = jwt.sign(scenario.payload, jwtCfg.secret, scenario.options);
    console.log("✅ Token generated successfully");

    // Decode without verification
    const decoded = jwt.decode(token, { complete: true });
    console.log("📄 Token structure:");
    console.log("  Header:", JSON.stringify(decoded.header, null, 2));
    console.log("  Payload:", JSON.stringify(decoded.payload, null, 2));

    // Test verification with Socket.IO settings
    console.log("🔍 Testing Socket.IO verification:");
    try {
      const socketVerified = jwt.verify(token, jwtCfg.secret, {
        issuer: jwtCfg.issuer || "marketplace-app",
        audience: jwtCfg.audience || "marketplace-users",
        algorithms: [jwtCfg.algorithm || "HS256"],
      });
      console.log("✅ Socket.IO verification: SUCCESS");
    } catch (socketError) {
      console.log("❌ Socket.IO verification: FAILED");
      console.log("   Error:", socketError.message);
    }

    // Test verification with admin middleware settings
    console.log("🔍 Testing Admin middleware verification:");
    try {
      const adminVerified = jwt.verify(token, jwtCfg.secret);
      console.log("✅ Admin middleware verification: SUCCESS");
    } catch (adminError) {
      console.log("❌ Admin middleware verification: FAILED");
      console.log("   Error:", adminError.message);
    }
  } catch (error) {
    console.log("❌ Token generation failed:", error.message);
  }

  console.log("");
}

console.log("🔍 ANALYSIS COMPLETE");
console.log("");
console.log("💡 RECOMMENDATIONS:");
console.log("1. All token generation should use issuer/audience");
console.log("2. All token verification should use issuer/audience");
console.log(
  "3. Admin middleware should use config.security.jwt instead of process.env.JWT_SECRET"
);
console.log(
  "4. Existing tokens without issuer/audience will fail Socket.IO verification"
);
