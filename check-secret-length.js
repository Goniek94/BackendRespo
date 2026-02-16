import dotenv from "dotenv";
dotenv.config();

const secret = process.env.TPAY_SECRET;
console.log("SECRET z .env:");
console.log(secret);
console.log("\nDługość:", secret.length, "znaków");
console.log("\nOczekiwana długość: 64 znaki (hex)");

// Policz ręcznie ze screenshota
const expectedSecret =
  "3d9ee976ae62942742b9bb286068266770dcd2205e6b5a09d337647e9e36536";
console.log("\nOczekiwany SECRET:");
console.log(expectedSecret);
console.log("Długość oczekiwanego:", expectedSecret.length, "znaków");

console.log("\nCzy są identyczne?", secret === expectedSecret);

if (secret !== expectedSecret) {
  console.log("\n❌ RÓŻNICA WYKRYTA!");
  console.log("Aktualny:   ", secret);
  console.log("Oczekiwany: ", expectedSecret);

  // Znajdź różnicę
  for (let i = 0; i < Math.max(secret.length, expectedSecret.length); i++) {
    if (secret[i] !== expectedSecret[i]) {
      console.log(`\nRóżnica na pozycji ${i}:`);
      console.log(`Aktualny znak: '${secret[i] || "BRAK"}'`);
      console.log(`Oczekiwany znak: '${expectedSecret[i] || "BRAK"}'`);
      break;
    }
  }
}
