// smoke-notifications.mjs
import axios from "axios";

// === KONFIG ===
// WYMAGANE: BASE_URL i USER_TOKEN (cookie JWT "token" zalogowanego usera)
// OPCJONALNE: ADMIN_TOKEN (cookie JWT admina/mod) — wtedy sprawdzimy /send i /test
const {
  BASE_URL = "http://localhost:3000",
  USER_TOKEN,
  ADMIN_TOKEN,
  ALLOW_TEST = "0", // ustaw "1", by odpalić ścieżki /test
} = process.env;

if (!USER_TOKEN) {
  console.error("❌ Brak USER_TOKEN w env. Ustaw: USER_TOKEN=<jwt>");
  process.exit(1);
}

const http = axios.create({
  baseURL: BASE_URL.replace(/\/+$/, ""),
  validateStatus: () => true,
  timeout: 10000,
});

// helper do requestów z ciasteczkiem token
const req = (method, url, { token = USER_TOKEN, data, params } = {}) =>
  http.request({
    method,
    url,
    data,
    params,
    headers: { Cookie: `token=${token}` },
  });

const assert = (cond, msg, ctx) => {
  if (!cond) {
    console.error("❌", msg);
    if (ctx) console.error("   ↳ context:", ctx);
    throw new Error(msg);
  }
};

const logOk = (label) => console.log("✅", label);

async function testList() {
  const r = await req("get", "/api/notifications", {
    params: { limit: 5, page: 1 },
  });
  assert(r.status === 200, "GET /api/notifications HTTP != 200", r.data);
  // akceptujemy nowy format (data.notifications) i legacy (notifications)
  const list = r.data?.data?.notifications ?? r.data?.notifications ?? [];
  assert(Array.isArray(list), "Lista notyfikacji nie jest tablicą", r.data);
  logOk("GET /api/notifications");
  return list;
}

async function testUnread() {
  const r = await req("get", "/api/notifications/unread", {
    params: { limit: 5 },
  });
  assert(r.status === 200, "GET /unread HTTP != 200", r.data);
  const list = r.data?.data?.notifications ?? r.data?.notifications ?? [];
  const unreadCount =
    r.data?.data?.meta?.unreadCount ?? r.data?.unreadCount ?? 0;
  assert(Array.isArray(list), "Unread nie jest tablicą", r.data);
  assert(
    typeof unreadCount === "number",
    "unreadCount nie jest liczbą",
    r.data
  );
  logOk("GET /api/notifications/unread");
  return { list, unreadCount };
}

async function testUnreadCount() {
  const r = await req("get", "/api/notifications/unread-count");
  assert(r.status === 200, "GET /unread-count HTTP != 200", r.data);
  const total = r.data?.data?.unreadCount ?? r.data?.unreadCount;
  assert(typeof total === "number", "unreadCount nie jest liczbą", r.data);
  logOk("GET /api/notifications/unread-count");
  return total;
}

async function testAdminSendManual() {
  if (!ADMIN_TOKEN) {
    console.log("ℹ️  Pomijam /send (brak ADMIN_TOKEN).");
    return null;
  }
  const payload = {
    recipientId: process.env.TEST_RECIPIENT_ID, // <- jeśli nie podasz, użyjemy /me
    title: "Smoke manual",
    message: "Test manual notification",
    type: "system",
    relatedId: "",
    actionUrl: "",
    metadata: { smoke: true },
  };

  // Jeśli nie podano recipienta, najpierw spróbujmy „wyciągnąć” własne ID z notyfikacji
  if (!payload.recipientId) {
    const rMe = await req("get", "/api/notifications", {
      token: USER_TOKEN,
      params: { limit: 1 },
    });
    assert(
      rMe.status === 200,
      "Nie mogę pobrać listy, by wydedukować ID",
      rMe.data
    );
    const any = (rMe.data?.data?.notifications ??
      rMe.data?.notifications ??
      [])[0];
    // w metadanych/obiekcie może nie być usera – jeśli nie ma, test i tak zadziała
    payload.recipientId =
      process.env.FALLBACK_RECIPIENT_ID || process.env.TEST_RECIPIENT_ID;
    assert(
      payload.recipientId,
      "Brak TEST_RECIPIENT_ID lub FALLBACK_RECIPIENT_ID — podaj ID usera do przetestowania /send"
    );
  }

  const r = await req("post", "/api/notifications/send", {
    token: ADMIN_TOKEN,
    data: payload,
  });
  assert(r.status === 201 || r.status === 200, "/send HTTP != 2xx", r.data);
  const id =
    r.data?.data?.notification?.id ??
    r.data?.notification?.id ??
    r.data?.data?.id;
  assert(id, "Brak ID notyfikacji w /send response", r.data);
  logOk("POST /api/notifications/send (admin)");
  return id;
}

async function testMarkRead(notificationId) {
  if (!notificationId) {
    console.log("ℹ️  Pomijam PATCH /:id/read — brak ID.");
    return;
  }
  const r = await req("patch", `/api/notifications/${notificationId}/read`);
  assert(r.status === 200, "PATCH /:id/read HTTP != 200", r.data);
  const isRead =
    r.data?.data?.notification?.isRead ?? r.data?.notification?.isRead ?? false;
  assert(
    isRead === true,
    "Notyfikacja nie jest oznaczona jako przeczytana",
    r.data
  );
  logOk("PATCH /api/notifications/:id/read");
}

async function testDelete(notificationId) {
  if (!notificationId) {
    console.log("ℹ️  Pomijam DELETE /:id — brak ID.");
    return;
  }
  const r = await req("delete", `/api/notifications/${notificationId}`);
  assert(r.status === 200, "DELETE /:id HTTP != 200", r.data);
  logOk("DELETE /api/notifications/:id");
}

async function testDevEndpoints() {
  if (ALLOW_TEST !== "1") {
    console.log("ℹ️  Pomijam /test — ALLOW_TEST != 1.");
    return;
  }
  if (!ADMIN_TOKEN) {
    console.log("ℹ️  Pomijam /test — brak ADMIN_TOKEN.");
    return;
  }

  // /test (create)
  const create = await req("post", "/api/notifications/test", {
    token: ADMIN_TOKEN,
    data: {
      userId: process.env.TEST_RECIPIENT_ID,
      message: "DEV test notification",
      type: "system",
      title: "Dev Test",
      metadata: { smoke: true },
    },
  });
  assert(
    create.status === 201 || create.status === 200,
    "/test HTTP != 2xx",
    create.data
  );
  logOk("POST /api/notifications/test");

  // /test/send
  const send = await req("post", "/api/notifications/test/send", {
    token: ADMIN_TOKEN,
    data: {
      userId: process.env.TEST_RECIPIENT_ID,
      type: "account_activity",
      data: { activity: "Smoke activity" },
    },
  });
  assert(
    send.status === 201 || send.status === 200,
    "/test/send HTTP != 2xx",
    send.data
  );
  logOk("POST /api/notifications/test/send");
}

(async () => {
  try {
    console.log("➡️  Smoke test notifications @", BASE_URL);

    const list = await testList();
    await testUnread();
    await testUnreadCount();

    // Jeśli mamy ADMIN_TOKEN, wyślij powiadomienie i przetestuj mark-read/delete
    const createdId = await testAdminSendManual();
    await testMarkRead(createdId);
    await testDelete(createdId);

    // Dev-only test endpoints
    await testDevEndpoints();

    console.log("🎉 WSZYSTKO OK");
    process.exit(0);
  } catch (e) {
    console.error("💥 SMOKE TEST FAILED:", e.message);
    process.exit(2);
  }
})();
