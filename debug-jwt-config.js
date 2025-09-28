import config from "./config/index.js";

console.log("🔍 JWT Configuration Debug:");
console.log("Environment:", config.environment);
console.log("Is Production:", config.isProduction);
console.log("Is Development:", config.isDevelopment);
console.log("");

console.log("JWT Config:");
console.log("- secret:", config.security?.jwt?.secret ? "[SET]" : "[NOT SET]");
console.log("- algorithm:", config.security?.jwt?.algorithm);
console.log("- issuer:", config.security?.jwt?.issuer);
console.log("- audience:", config.security?.jwt?.audience);
console.log("- accessTokenExpiry:", config.security?.jwt?.accessTokenExpiry);
console.log("- refreshTokenExpiry:", config.security?.jwt?.refreshTokenExpiry);
console.log("");

console.log("Full JWT object:");
console.log(JSON.stringify(config.security?.jwt, null, 2));
