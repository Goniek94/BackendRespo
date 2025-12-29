import rateLimit from "express-rate-limit";

/**
 * Rate limiter for payment initiation endpoints
 * Prevents abuse and protects against payment spam
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 payment initiations per 15 minutes per IP
  message: {
    success: false,
    message:
      "Zbyt wiele prób inicjacji płatności. Spróbuj ponownie za 15 minut.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: false,
  // Custom key generator (by user ID if authenticated, otherwise by IP)
  keyGenerator: (req) => {
    return req.user?.userId || req.ip;
  },
  handler: (req, res) => {
    console.log(
      `⚠️ [RATE_LIMIT] Przekroczono limit płatności dla: ${
        req.user?.userId || req.ip
      }`
    );
    res.status(429).json({
      success: false,
      message:
        "Zbyt wiele prób inicjacji płatności. Spróbuj ponownie za 15 minut.",
      retryAfter: 15 * 60, // seconds
    });
  },
});

/**
 * Stricter rate limiter for webhook endpoint
 * Protects against webhook spam/DDoS
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 webhook calls per minute (generous for legitimate traffic)
  message: {
    success: false,
    message: "Too many webhook requests",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP for webhooks
    return req.ip;
  },
  handler: (req, res) => {
    console.log(`⚠️ [RATE_LIMIT] Webhook spam detected from: ${req.ip}`);
    res.status(429).send("TRUE"); // Still return TRUE to prevent Tpay retries
  },
});
