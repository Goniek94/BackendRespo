// utils/activityLogger.js
import AdminActivityLog from "../models/activity/AdminActivityLog.js";

const safeUserShape = (u) =>
  !u
    ? null
    : {
        id: u._id || u.id || null,
        email: u.email || "",
        name: u.name || u.fullName || u.username || "",
        role: u.role || "",
      };

/**
 * Zapisz aktywność (lekko i bezpiecznie).
 * @param {Object} p
 * @param {String} p.action - np. 'listing.created'
 * @param {Object} p.target - { resourceType, resourceId, title }
 * @param {Object} [p.actor] - obiekt User (req.user) lub shape {id,email,name,role}
 * @param {Object} [p.meta] - lekkie metadane
 * @param {Object} [p.req] - opcjonalnie req (ip)
 */
export async function recordActivity({
  action,
  target,
  actor,
  meta = {},
  req,
}) {
  try {
    const doc = {
      action,
      target: {
        resourceType: target.resourceType,
        resourceId: String(target.resourceId || ""),
        title: target.title || "",
      },
      actor: safeUserShape(actor),
      meta: {
        ...meta,
        ip:
          meta.ip ||
          (req?.headers?.["x-forwarded-for"]?.split(",")[0] ?? req?.ip ?? ""),
      },
    };
    await AdminActivityLog.create(doc);
  } catch {
    // Nie blokuj requestu jeśli logowanie padnie
  }
}

// Wygodne skróty pod ogłoszenia:
export const logListing = async (action, ad, actor, req) =>
  recordActivity({
    action: `listing.${action}`, // 'created', 'approved', …
    target: {
      resourceType: "listing",
      resourceId: ad?._id,
      title: ad?.title || ad?.headline || "",
    },
    actor,
    req,
    meta: { price: ad?.price ?? null },
  });

// Export też jako logActivity dla kompatybilności
export const logActivity = recordActivity;
