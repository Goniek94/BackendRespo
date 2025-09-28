// admin/controllers/settings/settingsController.js
import SystemSettings from "../../models/SystemSettings.js";

/**
 * Jedyny źródłowy spis kluczy dla UI (General / Notifications / Security)
 * – prosto i bez bajerów, żeby działało od ręki.
 */
const KEYS = {
  // GENERAL
  "general.site_name": { type: "string", def: "AutoSell.pl" },
  "general.maintenance_enabled": { type: "boolean", def: false },
  "general.maintenance_message": {
    type: "string",
    def: "Przepraszamy, trwają prace serwisowe.",
  },

  // NOTIFICATIONS
  "notifications.email_notifications": { type: "boolean", def: true },
  "notifications.sms_notifications": { type: "boolean", def: false },
  "notifications.push_notifications": { type: "boolean", def: true },
  "notifications.email_template": { type: "string", def: "default" }, // default | modern | minimal
  "notifications.notification_frequency": { type: "string", def: "immediate" }, // immediate|hourly|daily|weekly
  "notifications.admin_emails": { type: "string", def: "admin@autosell.pl" },

  // SECURITY
  "security.password_min_length": { type: "number", def: 8 },
  "security.session_timeout": { type: "number", def: 24 }, // godziny
  "security.max_login_attempts": { type: "number", def: 5 },
  "security.two_factor_auth": { type: "boolean", def: false },
  "security.ip_whitelist": { type: "string", def: "" },
  "security.auto_logout": { type: "boolean", def: true },
};

/* ===== helpers ===== */
const ensureOne = async (key, defValue, userId) => {
  let doc = await SystemSettings.findOne({ key });
  if (!doc) {
    const cat = key.split(".")[0]; // general / notifications / security
    const def = KEYS[key]?.def ?? defValue;
    const valueType = KEYS[key]?.type ?? inferType(def);

    doc = await SystemSettings.create({
      key,
      displayName: key,
      description: "",
      category: cat,
      valueType,
      value: def,
      defaultValue: def,
      createdBy: userId || null,
    });
  }
  return doc;
};

const inferType = (v) =>
  Array.isArray(v)
    ? "array"
    : v === null
    ? "string"
    : typeof v === "boolean"
    ? "boolean"
    : typeof v === "number"
    ? "number"
    : typeof v === "object"
    ? "object"
    : "string";

const toUiPayload = (items) => {
  const byKey = new Map(items.map((d) => [d.key, d]));
  return {
    general: {
      siteName:
        byKey.get("general.site_name")?.effectiveValue ??
        KEYS["general.site_name"].def,
      maintenance: {
        enabled:
          byKey.get("general.maintenance_enabled")?.effectiveValue ??
          KEYS["general.maintenance_enabled"].def,
        message:
          byKey.get("general.maintenance_message")?.effectiveValue ??
          KEYS["general.maintenance_message"].def,
      },
    },
    notifications: {
      emailNotifications:
        byKey.get("notifications.email_notifications")?.effectiveValue ??
        KEYS["notifications.email_notifications"].def,
      smsNotifications:
        byKey.get("notifications.sms_notifications")?.effectiveValue ??
        KEYS["notifications.sms_notifications"].def,
      pushNotifications:
        byKey.get("notifications.push_notifications")?.effectiveValue ??
        KEYS["notifications.push_notifications"].def,
      emailTemplate:
        byKey.get("notifications.email_template")?.effectiveValue ??
        KEYS["notifications.email_template"].def,
      notificationFrequency:
        byKey.get("notifications.notification_frequency")?.effectiveValue ??
        KEYS["notifications.notification_frequency"].def,
      adminEmails:
        byKey.get("notifications.admin_emails")?.effectiveValue ??
        KEYS["notifications.admin_emails"].def,
    },
    security: {
      passwordMinLength:
        byKey.get("security.password_min_length")?.effectiveValue ??
        KEYS["security.password_min_length"].def,
      sessionTimeout:
        byKey.get("security.session_timeout")?.effectiveValue ??
        KEYS["security.session_timeout"].def,
      maxLoginAttempts:
        byKey.get("security.max_login_attempts")?.effectiveValue ??
        KEYS["security.max_login_attempts"].def,
      twoFactorAuth:
        byKey.get("security.two_factor_auth")?.effectiveValue ??
        KEYS["security.two_factor_auth"].def,
      ipWhitelist:
        byKey.get("security.ip_whitelist")?.effectiveValue ??
        KEYS["security.ip_whitelist"].def,
      autoLogout:
        byKey.get("security.auto_logout")?.effectiveValue ??
        KEYS["security.auto_logout"].def,
    },
  };
};

const fromUiPayload = (payload) => {
  // mapujemy UI -> płaskie klucze:
  const flat = [];

  if (payload?.general) {
    flat.push(["general.site_name", payload.general.siteName]);
    if (payload.general.maintenance) {
      flat.push([
        "general.maintenance_enabled",
        payload.general.maintenance.enabled,
      ]);
      flat.push([
        "general.maintenance_message",
        payload.general.maintenance.message,
      ]);
    }
  }

  if (payload?.notifications) {
    const n = payload.notifications;
    flat.push(["notifications.email_notifications", n.emailNotifications]);
    flat.push(["notifications.sms_notifications", n.smsNotifications]);
    flat.push(["notifications.push_notifications", n.pushNotifications]);
    flat.push(["notifications.email_template", n.emailTemplate]);
    flat.push([
      "notifications.notification_frequency",
      n.notificationFrequency,
    ]);
    flat.push(["notifications.admin_emails", n.adminEmails]);
  }

  if (payload?.security) {
    const s = payload.security;
    flat.push([
      "security.password_min_length",
      Number(s.passwordMinLength) || 0,
    ]);
    flat.push(["security.session_timeout", Number(s.sessionTimeout) || 0]);
    flat.push(["security.max_login_attempts", Number(s.maxLoginAttempts) || 0]);
    flat.push(["security.two_factor_auth", !!s.twoFactorAuth]);
    flat.push(["security.ip_whitelist", s.ipWhitelist ?? ""]);
    flat.push(["security.auto_logout", !!s.autoLogout]);
  }

  return flat;
};

/* ===== controllers ===== */
export const getSettings = async (req, res) => {
  try {
    // Upewnij się, że każdy klucz istnieje w DB (z defaultami)
    await Promise.all(
      Object.entries(KEYS).map(([key, meta]) =>
        ensureOne(key, meta.def, req.user?._id)
      )
    );

    const docs = await SystemSettings.find({
      key: { $in: Object.keys(KEYS) },
    }).lean();
    const data = toUiPayload(docs);

    res.json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err.message || "Settings fetch failed" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const incoming = req.body?.settings || req.body; // obsłuż oba formaty
    const pairs = fromUiPayload(incoming);

    // walidacja typów na podstawie KEYS
    for (const [key, val] of pairs) {
      const cfg = KEYS[key];
      if (!cfg) continue;
      const t = cfg.type;
      if (t === "number" && typeof val !== "number") {
        return res
          .status(400)
          .json({ success: false, error: `Setting ${key} must be a number` });
      }
      if (t === "boolean" && typeof val !== "boolean") {
        return res
          .status(400)
          .json({ success: false, error: `Setting ${key} must be a boolean` });
      }
      if (t === "string" && typeof val !== "string") {
        return res
          .status(400)
          .json({ success: false, error: `Setting ${key} must be a string` });
      }
    }

    // zapis
    const ops = pairs.map(async ([key, value]) => {
      const cfg = KEYS[key];
      if (!cfg) return;

      const doc = await ensureOne(key, cfg.def, req.user?._id);
      doc.value = value;
      doc.valueType = cfg.type;
      doc.lastModifiedBy = req.user?._id || doc.lastModifiedBy;
      await doc.save();
    });

    await Promise.all(ops);

    // zwrot zaktualizowanego payloadu
    const docs = await SystemSettings.find({
      key: { $in: Object.keys(KEYS) },
    }).lean();
    const data = toUiPayload(docs);
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err.message || "Settings update failed" });
  }
};
