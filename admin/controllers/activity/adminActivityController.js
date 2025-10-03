// admin/controllers/activity/adminActivityController.js
import AdminActivityLog from "../../../models/activity/AdminActivityLog.js";

/**
 * GET /activity?type=all|listings|users|reports|system|messages|promotions
 *      &limit=50
 */
export const getRecentActivities = async (req, res) => {
  try {
    const type = (req.query.type || "all").toLowerCase();
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "50", 10), 1),
      200
    );

    const resourceTypeFilter =
      type === "all"
        ? {}
        : {
            listings: { "target.resourceType": "listing" },
            users: { "target.resourceType": "user" },
            reports: { "target.resourceType": "report" },
            messages: { "target.resourceType": "message" },
            promotions: { "target.resourceType": "promotion" },
            system: { "target.resourceType": "system" },
          }[type] || {};

    const rows = await AdminActivityLog.find(resourceTypeFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Normalizacja + linki do klikania:
    const items = rows.map((r) => ({
      id: String(r._id),
      action: r.action,
      createdAt: r.createdAt,
      actor: r.actor || null,
      target: r.target,
      meta: r.meta || {},
      // Link do zasobu (głównie ogłoszenia):
      link:
        r.target?.resourceType === "listing" && r.target?.resourceId
          ? { url: `/admin/listings/${r.target.resourceId}`, kind: "internal" }
          : null,
      // Tekst do listy:
      title: buildTitle(r),
      subtitle: buildSubtitle(r),
      icon: pickIcon(r),
    }));

    return res.json({ success: true, data: { items } });
  } catch (err) {
    console.error("getRecentActivities error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

const buildTitle = (r) => {
  const t = r.target || {};
  switch (r.action) {
    case "listing.created":
      return `Nowe ogłoszenie: ${t.title || "bez tytułu"}`;
    case "listing.approved":
      return `Zatwierdzono ogłoszenie: ${t.title || "bez tytułu"}`;
    case "listing.rejected":
      return `Odrzucono ogłoszenie: ${t.title || "bez tytułu"}`;
    case "listing.updated":
      return `Edytowano ogłoszenie: ${t.title || "bez tytułu"}`;
    case "listing.deleted":
      return `Usunięto ogłoszenie: ${t.title || "bez tytułu"}`;
    case "user.registered":
      return `Nowy użytkownik: ${r.actor?.email || "nieznany"}`;
    case "user.login":
      return `Użytkownik zalogował się: ${
        r.actor?.name || r.actor?.email || "nieznany"
      }`;
    case "user.logout":
      return `Użytkownik wylogował się`;
    case "message.sent":
      return `Nowa wiadomość (użytkownik: ${r.actor?.email || "unknown"})`;
    case "report.created":
      return `Nowe zgłoszenie`;
    default:
      return `${r.action}`;
  }
};

const buildSubtitle = (r) => {
  const who =
    r.actor?.name || r.actor?.email || (r.actor?.id ? "Użytkownik" : "System");
  const when = new Date(r.createdAt).toLocaleString("pl-PL");
  return `${who} • ${when}`;
};

const pickIcon = (r) => {
  if (r.target?.resourceType === "listing") return "car";
  if (r.target?.resourceType === "user") return "user";
  if (r.target?.resourceType === "report") return "flag";
  if (r.target?.resourceType === "message") return "mail";
  if (r.target?.resourceType === "promotion") return "badge";
  return "activity";
};

/** DELETE /activity/:id */
export const deleteActivity = async (req, res) => {
  try {
    const id = req.params.id;
    await AdminActivityLog.deleteOne({ _id: id });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteActivity error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

/** DELETE /activity (bulk): body { ids?:[], olderThanDays?:number } */
export const bulkDeleteActivity = async (req, res) => {
  try {
    const { ids, olderThanDays } = req.body || {};
    if (Array.isArray(ids) && ids.length) {
      await AdminActivityLog.deleteMany({ _id: { $in: ids } });
      return res.json({ success: true, deleted: ids.length });
    }
    if (olderThanDays != null) {
      const d = new Date();
      d.setDate(d.getDate() - Math.max(0, Number(olderThanDays) || 0));
      const r = await AdminActivityLog.deleteMany({ createdAt: { $lt: d } });
      return res.json({ success: true, deleted: r.deletedCount || 0 });
    }
    return res.status(400).json({ success: false, error: "NO_CRITERIA" });
  } catch (err) {
    console.error("bulkDeleteActivity error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};
