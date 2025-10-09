import { body, param, query } from "express-validator";

/**
 * Professional User Validation Rules
 * Comprehensive validation for all user management operations
 * Features: Security validation, business rules, data integrity
 *
 * @author Senior Developer
 * @version 1.0.0
 */

/**
 * Validation rules for creating new user
 */
export const validateUserCreate = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-']+$/)
    .withMessage(
      "Name can only contain letters, spaces, hyphens and apostrophes"
    ),

  body("lastName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-']+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens and apostrophes"
    ),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),

  body("phoneNumber")
    .optional()
    .matches(/^(\+48)?[0-9]{9}$/)
    .withMessage("Phone must be a valid Polish phone number"),

  body("phone")
    .optional()
    .matches(/^(\+48)?[0-9]{9}$/)
    .withMessage("Phone must be a valid Polish phone number"),

  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),

  body("role")
    .optional()
    .isIn(["user", "moderator", "admin"])
    .withMessage("Role must be one of: user, moderator, admin"),

  body("status")
    .optional()
    .isIn(["active", "blocked", "pending", "deleted", "suspended", "banned"])
    .withMessage(
      "Status must be one of: active, blocked, pending, deleted, suspended, banned"
    ),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("isVerified must be a boolean"),

  body("isEmailVerified")
    .optional()
    .isBoolean()
    .withMessage("isEmailVerified must be a boolean"),

  body("emailVerified")
    .optional()
    .isBoolean()
    .withMessage("emailVerified must be a boolean"),

  body("isPhoneVerified")
    .optional()
    .isBoolean()
    .withMessage("isPhoneVerified must be a boolean"),

  body("phoneVerified")
    .optional()
    .isBoolean()
    .withMessage("phoneVerified must be a boolean"),
];

/**
 * Validation rules for updating user information
 */
export const validateUserUpdate = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-']+$/)
    .withMessage(
      "Name can only contain letters, spaces, hyphens and apostrophes"
    ),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),

  body("role")
    .optional()
    .isIn(["user", "moderator", "admin"])
    .withMessage("Role must be one of: user, moderator, admin"),

  body("status")
    .optional()
    .isIn(["active", "blocked", "pending", "deleted", "suspended", "banned"])
    .withMessage(
      "Status must be one of: active, blocked, pending, deleted, suspended, banned"
    ),

  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("isVerified must be a boolean"),

  body("phone")
    .optional()
    .matches(/^(\+48)?[0-9]{9}$/)
    .withMessage("Phone must be a valid Polish phone number"),

  body("phoneNumber")
    .optional()
    .matches(/^(\+48)?[0-9]{9}$/)
    .withMessage("Phone must be a valid Polish phone number"),

  body("lastName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-']+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens and apostrophes"
    ),

  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

  body("location")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Location must be between 2 and 100 characters"),

  body("preferences")
    .optional()
    .isObject()
    .withMessage("Preferences must be an object"),

  body("preferences.notifications")
    .optional()
    .isBoolean()
    .withMessage("Notification preference must be a boolean"),

  body("preferences.newsletter")
    .optional()
    .isBoolean()
    .withMessage("Newsletter preference must be a boolean"),

  body("preferences.language")
    .optional()
    .isIn(["pl", "en"])
    .withMessage("Language must be pl or en"),
];

/**
 * Validation rules for blocking/unblocking users
 */
export const validateUserBlock = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  body("blocked").isBoolean().withMessage("Blocked status must be a boolean"),

  body("reason")
    .if(body("blocked").equals(true))
    .notEmpty()
    .withMessage("Reason is required when blocking a user")
    .isLength({ min: 10, max: 500 })
    .withMessage("Reason must be between 10 and 500 characters")
    .matches(/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.,!?-]+$/)
    .withMessage("Reason contains invalid characters"),

  body("reason")
    .if(body("blocked").equals(false))
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters"),
];

/**
 * Validation rules for deleting users
 */
export const validateUserDelete = [
  param("id").isMongoId().withMessage("Invalid user ID format"),

  body("reason")
    .notEmpty()
    .withMessage("Deletion reason is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Deletion reason must be between 10 and 1000 characters")
    .matches(/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.,!?-]+$/)
    .withMessage("Reason contains invalid characters"),
];

/**
 * Validation rules for bulk user operations
 */
export const validateBulkUserUpdate = [
  body("userIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("User IDs must be an array with 1-100 items"),

  body("userIds.*")
    .isMongoId()
    .withMessage("All user IDs must be valid MongoDB ObjectIds"),

  body("updateData")
    .isObject()
    .withMessage("Update data must be an object")
    .custom((value) => {
      const allowedFields = ["role", "status", "isVerified"];
      const providedFields = Object.keys(value);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid fields in bulk update: ${invalidFields.join(", ")}`
        );
      }

      if (providedFields.length === 0) {
        throw new Error("At least one field must be provided for update");
      }

      return true;
    }),

  body("updateData.role")
    .optional()
    .isIn(["user", "moderator", "admin"])
    .withMessage("Role must be one of: user, moderator, admin"),

  body("updateData.status")
    .optional()
    .isIn(["active", "blocked", "pending"])
    .withMessage("Status must be one of: active, blocked, pending"),

  body("updateData.isVerified")
    .optional()
    .isBoolean()
    .withMessage("isVerified must be a boolean"),
];

/**
 * Validation rules for user listing queries
 */
export const validateUserQuery = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Page must be a positive integer (max 10000)"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s@._-]+$/)
    .withMessage("Search term contains invalid characters"),

  query("role")
    .optional()
    .isIn(["user", "moderator", "admin"])
    .withMessage("Role filter must be one of: user, moderator, admin"),

  query("status")
    .optional()
    .isIn(["active", "blocked", "pending", "deleted"])
    .withMessage(
      "Status filter must be one of: active, blocked, pending, deleted"
    ),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "name", "email", "role", "status"])
    .withMessage(
      "Sort field must be one of: createdAt, updatedAt, name, email, role, status"
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),

  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid ISO 8601 date"),

  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (
        req.query.dateFrom &&
        new Date(value) <= new Date(req.query.dateFrom)
      ) {
        throw new Error("dateTo must be after dateFrom");
      }
      return true;
    }),
];

/**
 * Validation rules for analytics queries
 */
export const validateAnalyticsQuery = [
  query("timeframe")
    .optional()
    .isIn(["7d", "30d", "90d"])
    .withMessage("Timeframe must be one of: 7d, 30d, 90d"),
];

/**
 * Validation rules for export queries
 */
export const validateExportQuery = [
  query("format")
    .optional()
    .isIn(["json", "csv"])
    .withMessage("Export format must be json or csv"),

  query("filters")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        try {
          JSON.parse(value);
          return true;
        } catch (error) {
          throw new Error("Filters must be valid JSON");
        }
      }
      return true;
    }),
];

/**
 * Validation rules for user ID parameter
 */
export const validateUserId = [
  param("id").isMongoId().withMessage("Invalid user ID format"),
];

/**
 * Custom validation middleware for business rules
 */
export const validateBusinessRules = (req, res, next) => {
  // Prevent operations on system admin account
  if (req.params.id === process.env.SYSTEM_ADMIN_ID) {
    return res.status(403).json({
      success: false,
      error: "Cannot perform operations on system admin account",
      code: "SYSTEM_ADMIN_PROTECTED",
    });
  }

  // Validate role hierarchy for role changes
  if (req.body.role && req.user.role !== "admin") {
    if (req.body.role === "admin" || req.body.role === "moderator") {
      return res.status(403).json({
        success: false,
        error: "Only admins can assign admin or moderator roles",
        code: "INSUFFICIENT_ROLE_PERMISSIONS",
      });
    }
  }

  // Validate bulk operation limits based on user role
  if (req.body.userIds && req.user.role === "moderator") {
    if (req.body.userIds.length > 50) {
      return res.status(403).json({
        success: false,
        error: "Moderators can only perform bulk operations on up to 50 users",
        code: "MODERATOR_BULK_LIMIT",
      });
    }
  }

  next();
};

/**
 * Sanitization middleware for user input
 */
export const sanitizeUserInput = (req, res, next) => {
  // Sanitize string fields
  const stringFields = ["name", "email", "phone", "location"];

  stringFields.forEach((field) => {
    if (req.body[field] && typeof req.body[field] === "string") {
      req.body[field] = req.body[field].trim();
    }
  });

  // Sanitize reason field
  if (req.body.reason && typeof req.body.reason === "string") {
    req.body.reason = req.body.reason.trim();
  }

  // Ensure preferences object structure
  if (req.body.preferences && typeof req.body.preferences === "object") {
    const allowedPreferences = ["notifications", "newsletter", "language"];
    const sanitizedPreferences = {};

    allowedPreferences.forEach((pref) => {
      if (req.body.preferences[pref] !== undefined) {
        sanitizedPreferences[pref] = req.body.preferences[pref];
      }
    });

    req.body.preferences = sanitizedPreferences;
  }

  next();
};
