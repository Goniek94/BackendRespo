import config from "./config/index.js";
import jwt from "jsonwebtoken";

console.log("🔍 FULL JWT DIAGNOSIS - P0 Priority");
console.log("=====================================");
console.log("");

// 1. Environment & Runtime Info
console.log("📋 ENVIRONMENT & RUNTIME:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- Server Time:", new Date().toISOString());
console.log("- Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("");

// 2. Environment Variables (JWT related)
console.log("🔑 ENVIRONMENT VARIABLES:");
console.log(
  "- JWT_SECRET:",
  process.env.JWT_SECRET
    ? "[SET - " + process.env.JWT_SECRET.length + " chars]"
    : "[NOT SET]"
);
console.log(
  "- JWT_REFRESH_SECRET:",
  process.env.JWT_REFRESH_SECRET
    ? "[SET - " + process.env.JWT_REFRESH_SECRET.length + " chars]"
    : "[NOT SET]"
);
console.log("- JWT_ISSUER:", process.env.JWT_ISSUER || "[NOT SET]");
console.log("- JWT_AUDIENCE:", process.env.JWT_AUDIENCE || "[NOT SET]");
console.log("- JWT_ALGORITHM:", process.env.JWT_ALGORITHM || "[NOT SET]");
console.log(
  "- ACCESS_TOKEN_EXPIRY:",
  process.env.ACCESS_TOKEN_EXPIRY || "[NOT SET]"
);
console.log("");

// 3. Config Object Values
console.log("⚙️  CONFIG OBJECT VALUES:");
console.log("- Environment:", config.environment);
console.log("- Is Production:", config.isProduction);
console.log("- Is Development:", config.isDevelopment);
console.log("");

console.log("🔐 JWT CONFIG FROM config.security.jwt:");
const jwtCfg = config.security?.jwt || {};
console.log(
  "- secret:",
  jwtCfg.secret ? "[SET - " + jwtCfg.secret.length + " chars]" : "[NOT SET]"
);
console.log(
  "- refreshSecret:",
  jwtCfg.refreshSecret
    ? "[SET - " + jwtCfg.refreshSecret.length + " chars]"
    : "[NOT SET]"
);
console.log("- algorithm:", jwtCfg.algorithm);
console.log("- issuer:", jwtCfg.issuer);
console.log("- audience:", jwtCfg.audience);
console.log("- accessTokenExpiry:", jwtCfg.accessTokenExpiry);
console.log("- refreshTokenExpiry:", jwtCfg.refreshTokenExpiry);
console.log("- clockTolerance:", jwtCfg.clockTolerance);
console.log("- maxAge:", jwtCfg.maxAge);
console.log("");

// 4. Test Token Generation
console.log("🧪 TEST TOKEN GENERATION:");
try {
  const testPayload = {
    userId: "test-user-id",
    role: "user",
    type: "access",
  };

  // Test with current config
  const testToken = jwt.sign(testPayload, jwtCfg.secret, {
    expiresIn: jwtCfg.accessTokenExpiry || "15m",
    algorithm: jwtCfg.algorithm || "HS256",
    issuer: jwtCfg.issuer || "marketplace-app",
    audience: jwtCfg.audience || "marketplace-users",
  });

  console.log("✅ Token generation successful");

  // Decode without verification to see structure
  const decoded = jwt.decode(testToken, { complete: true });
  console.log("📄 Token Structure:");
  console.log("  Header:", JSON.stringify(decoded.header, null, 2));
  console.log("  Payload:", JSON.stringify(decoded.payload, null, 2));

  // Test verification
  try {
    const verified = jwt.verify(testToken, jwtCfg.secret, {
      issuer: jwtCfg.issuer || "marketplace-app",
      audience: jwtCfg.audience || "marketplace-users",
      algorithms: [jwtCfg.algorithm || "HS256"],
    });
    console.log("✅ Token verification successful");
  } catch (verifyError) {
    console.log("❌ Token verification failed:", verifyError.message);
  }
} catch (error) {
  console.log("❌ Token generation failed:", error.message);
}

console.log("");
console.log("🔍 DIAGNOSIS COMPLETE");
