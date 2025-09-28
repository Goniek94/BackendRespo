/**
 * RATE LIMITING TESTS
 * Testy sprawdzające poprawność działania middleware rate limiting
 * Szczególnie weryfikacja naprawy obejścia limitów dla adminów
 */

import request from "supertest";
import express from "express";
import {
  authLimiter,
  adminLoginLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiting.js";

// Mock logger
jest.mock("../utils/logger.js", () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe("Rate Limiting Security Tests", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Test endpoints z różnymi limiterami
    app.post("/test/auth", authLimiter, (req, res) => {
      res.json({ success: true, message: "Auth endpoint reached" });
    });

    app.post("/test/admin-login", adminLoginLimiter, (req, res) => {
      res.json({ success: true, message: "Admin login endpoint reached" });
    });

    app.post("/test/password-reset", passwordResetLimiter, (req, res) => {
      res.json({ success: true, message: "Password reset endpoint reached" });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("🔒 SECURITY FIX: Admin Rate Limiting", () => {
    test("Admini podlegają tym samym limitom co zwykli użytkownicy", async () => {
      const adminEmail = "admin@test.com";
      const regularEmail = "user@test.com";

      // Symulacja żądań od admina
      const adminRequests = [];
      for (let i = 0; i < 12; i++) {
        // Przekroczenie limitu (10 żądań)
        adminRequests.push(
          request(app)
            .post("/test/auth")
            .send({
              email: adminEmail,
              password: "test123",
              userRole: "admin", // Próba oznaczenia jako admin
            })
            .set("X-Forwarded-For", "192.168.1.100")
        );
      }

      const adminResponses = await Promise.all(adminRequests);

      // Sprawdź, że admin został zablokowany po przekroczeniu limitu
      const blockedAdminRequests = adminResponses.filter(
        (res) => res.status === 429
      );
      expect(blockedAdminRequests.length).toBeGreaterThan(0);

      // Symulacja żądań od zwykłego użytkownika z tym samym IP
      const userRequests = [];
      for (let i = 0; i < 12; i++) {
        userRequests.push(
          request(app)
            .post("/test/auth")
            .send({
              email: regularEmail,
              password: "test123",
              userRole: "user",
            })
            .set("X-Forwarded-For", "192.168.1.101") // Inne IP
        );
      }

      const userResponses = await Promise.all(userRequests);
      const blockedUserRequests = userResponses.filter(
        (res) => res.status === 429
      );

      // Sprawdź, że zwykły użytkownik też został zablokowany
      expect(blockedUserRequests.length).toBeGreaterThan(0);

      console.log(
        "✅ SECURITY FIX VERIFIED: Admini nie mogą omijać rate limiting"
      );
    });

    test("Rate limiting działa na podstawie IP + email, nie roli użytkownika", async () => {
      const testEmail = "test@example.com";
      const testIP = "192.168.1.200";

      // Pierwsze żądanie - powinno przejść
      const firstResponse = await request(app)
        .post("/test/auth")
        .send({
          email: testEmail,
          password: "test123",
          userRole: "admin", // Próba oznaczenia jako admin
        })
        .set("X-Forwarded-For", testIP);

      expect(firstResponse.status).toBe(200);

      // Wysyłanie wielu żądań z tym samym IP + email
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post("/test/auth")
            .send({
              email: testEmail,
              password: "test123",
              userRole: Math.random() > 0.5 ? "admin" : "user", // Losowa rola
            })
            .set("X-Forwarded-For", testIP)
        );
      }

      const responses = await Promise.all(requests);
      const blockedRequests = responses.filter((res) => res.status === 429);

      // Sprawdź, że żądania zostały zablokowane niezależnie od roli
      expect(blockedRequests.length).toBeGreaterThan(0);

      // Sprawdź komunikat błędu
      const blockedResponse = blockedRequests[0];
      expect(blockedResponse.body).toHaveProperty("error");
      expect(blockedResponse.body).toHaveProperty(
        "code",
        "RATE_LIMIT_EXCEEDED"
      );
    });
  });

  describe("🛡️ Admin Login Rate Limiting", () => {
    test("Admin login ma ostrzejsze limity niż zwykłe logowanie", async () => {
      const adminEmail = "admin@test.com";
      const testIP = "192.168.1.300";

      // Wysyłanie żądań do admin login endpoint
      const adminRequests = [];
      for (let i = 0; i < 8; i++) {
        // Limit dla admin login to 5
        adminRequests.push(
          request(app)
            .post("/test/admin-login")
            .send({
              email: adminEmail,
              password: "wrongpassword",
            })
            .set("X-Forwarded-For", testIP)
        );
      }

      const responses = await Promise.all(adminRequests);
      const blockedRequests = responses.filter((res) => res.status === 429);

      // Admin login powinien być zablokowany wcześniej niż zwykłe logowanie
      expect(blockedRequests.length).toBeGreaterThan(0);

      // Sprawdź specyficzny komunikat dla admin login
      const blockedResponse = blockedRequests[0];
      expect(blockedResponse.body.code).toBe("ADMIN_RATE_LIMIT_EXCEEDED");
      expect(blockedResponse.body.error).toContain("panelu administracyjnym");
    });
  });

  describe("🔐 Password Reset Rate Limiting", () => {
    test("Reset hasła ma najostrzejsze limity", async () => {
      const testEmail = "user@test.com";
      const testIP = "192.168.1.400";

      // Wysyłanie żądań reset hasła
      const resetRequests = [];
      for (let i = 0; i < 6; i++) {
        // Limit dla reset hasła to 3
        resetRequests.push(
          request(app)
            .post("/test/password-reset")
            .send({
              email: testEmail,
            })
            .set("X-Forwarded-For", testIP)
        );
      }

      const responses = await Promise.all(resetRequests);
      const blockedRequests = responses.filter((res) => res.status === 429);

      // Reset hasła powinien być zablokowany najwcześniej
      expect(blockedRequests.length).toBeGreaterThan(0);

      // Sprawdź specyficzny komunikat dla reset hasła
      const blockedResponse = blockedRequests[0];
      expect(blockedResponse.body.code).toBe("PASSWORD_RESET_LIMIT_EXCEEDED");
      expect(blockedResponse.body.error).toContain("resetowania hasła");
    });
  });

  describe("🌐 IP Detection Tests", () => {
    test("Rate limiting poprawnie wykrywa IP z X-Forwarded-For", async () => {
      const testEmail = "iptest@test.com";

      // Żądania z różnych IP powinny być traktowane osobno
      const ip1Requests = [];
      const ip2Requests = [];

      for (let i = 0; i < 12; i++) {
        ip1Requests.push(
          request(app)
            .post("/test/auth")
            .send({ email: testEmail, password: "test" })
            .set("X-Forwarded-For", "192.168.1.500")
        );

        ip2Requests.push(
          request(app)
            .post("/test/auth")
            .send({ email: testEmail, password: "test" })
            .set("X-Forwarded-For", "192.168.1.501")
        );
      }

      const ip1Responses = await Promise.all(ip1Requests);
      const ip2Responses = await Promise.all(ip2Requests);

      // Oba IP powinny być zablokowane niezależnie
      const ip1Blocked = ip1Responses.filter((res) => res.status === 429);
      const ip2Blocked = ip2Responses.filter((res) => res.status === 429);

      expect(ip1Blocked.length).toBeGreaterThan(0);
      expect(ip2Blocked.length).toBeGreaterThan(0);
    });
  });

  describe("⚙️ Environment Tests", () => {
    test("Rate limiting jest wyłączony w trybie testowym", async () => {
      // Ten test sprawdza, czy NODE_ENV=test wyłącza rate limiting
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      const requests = [];
      for (let i = 0; i < 20; i++) {
        // Znacznie powyżej limitu
        requests.push(
          request(app)
            .post("/test/auth")
            .send({ email: "test@test.com", password: "test" })
            .set("X-Forwarded-For", "192.168.1.600")
        );
      }

      const responses = await Promise.all(requests);
      const blockedRequests = responses.filter((res) => res.status === 429);

      // W trybie testowym nie powinno być blokad
      expect(blockedRequests.length).toBe(0);

      // Przywróć oryginalne środowisko
      process.env.NODE_ENV = originalEnv;
    });

    test("Rate limiting można wyłączyć przez zmienną środowiskową", async () => {
      const originalDisabled = process.env.RATE_LIMIT_DISABLED;
      process.env.RATE_LIMIT_DISABLED = "1";

      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post("/test/auth")
            .send({ email: "disabled@test.com", password: "test" })
            .set("X-Forwarded-For", "192.168.1.700")
        );
      }

      const responses = await Promise.all(requests);
      const blockedRequests = responses.filter((res) => res.status === 429);

      // Z wyłączonym rate limiting nie powinno być blokad
      expect(blockedRequests.length).toBe(0);

      // Przywróć oryginalne ustawienie
      process.env.RATE_LIMIT_DISABLED = originalDisabled;
    });
  });

  describe("📊 Rate Limiting Headers", () => {
    test("Zwraca poprawne nagłówki RateLimit-*", async () => {
      const response = await request(app)
        .post("/test/auth")
        .send({ email: "headers@test.com", password: "test" })
        .set("X-Forwarded-For", "192.168.1.800");

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty("ratelimit-limit");
      expect(response.headers).toHaveProperty("ratelimit-remaining");
      expect(response.headers).toHaveProperty("ratelimit-reset");
    });

    test("Nagłówki są poprawne przy przekroczeniu limitu", async () => {
      const testEmail = "limit-headers@test.com";
      const testIP = "192.168.1.900";

      // Wysyłaj żądania aż do przekroczenia limitu
      let lastResponse;
      for (let i = 0; i < 15; i++) {
        lastResponse = await request(app)
          .post("/test/auth")
          .send({ email: testEmail, password: "test" })
          .set("X-Forwarded-For", testIP);

        if (lastResponse.status === 429) break;
      }

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body).toHaveProperty("retryAfter");
      expect(lastResponse.body.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
});
