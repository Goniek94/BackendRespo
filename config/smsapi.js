/**
 * services/smsapi.js
 * Integracja z SMSAPI (Bearer + POST form-urlencoded)
 * Node 18+: używa global fetch; dla starszych wersji fallback na node-fetch.
 */

// ---- Fallback dla Node < 18 (opcjonalnie) ----
let _fetch = globalThis.fetch;
if (typeof _fetch !== "function") {
  try {
    _fetch = (await import("node-fetch")).default;
  } catch {
    throw new Error(
      "Brak fetch w środowisku. Zaktualizuj Node do 18+ lub zainstaluj node-fetch."
    );
  }
}

// ---- Konfiguracja z ENV ----
const SMSAPI_TOKEN = process.env.SMSAPI_TOKEN?.trim();
const SMSAPI_SENDER = (process.env.SMSAPI_SENDER || "AutoSell").slice(0, 11); // max 11, bez kropki
const SMSAPI_URL = "https://api.smsapi.pl/sms.do";
const MOCK_SMS = String(process.env.MOCK_SMS).toLowerCase() === "true"; // jawny toggle

// ---- Utils ----
/**
 * Usuwa spacje, myślniki, nawiasy; obcina wiodący '+' (SMSAPI lubi 48... bez '+')
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneNumber = (phone) => {
  let p = String(phone || "")
    .trim()
    .replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  return p;
};

/**
 * Wysyła POST do SMSAPI z nagłówkiem Bearer i body x-www-form-urlencoded.
 * Rzuca błąd przy niepowodzeniu.
 * @param {Record<string,string>} paramsObj
 */
async function smsapiPost(paramsObj) {
  if (!SMSAPI_TOKEN) {
    throw new Error(
      "SMSAPI_TOKEN nie jest ustawiony w zmiennych środowiskowych."
    );
  }

  const body = new URLSearchParams(paramsObj);
  const res = await _fetch(SMSAPI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SMSAPI_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  // SMSAPI zawsze zwraca JSON przy format=json
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.error) {
    const code = data?.error || res.status;
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(`SMSAPI ${code}: ${msg}`);
  }

  return data;
}

// ---- Publiczne funkcje ----

/**
 * SMS z kodem weryfikacyjnym (rejestracja / pre-register)
 * TTL w SMS dopasuj do TTL w DB (tu: 10 min).
 */
export async function sendVerificationSMS(phoneNumber, code, userName = "") {
  if (MOCK_SMS) {
    console.log("[MOCK SMS] VERIFICATION →", {
      to: phoneNumber,
      code,
      userName,
    });
    return { success: true, mock: true };
  }

  const to = formatPhoneNumber(phoneNumber);
  const text = `Twoj kod weryfikacyjny AutoSell: ${code}. Wazny 10 min.`;

  const data = await smsapiPost({
    to,
    message: text,
    from: SMSAPI_SENDER,
    format: "json",
    encoding: "utf-8",
  });

  return {
    success: true,
    mock: false,
    smsapi_response: data,
    message_id: data?.list?.[0]?.id ?? data?.id ?? null,
    status: data?.list?.[0]?.status ?? data?.status ?? null,
  };
}

/**
 * SMS z kodem zmiany numeru telefonu
 */
export async function sendPhoneChangeSMS(phoneNumber, code, userName = "") {
  if (MOCK_SMS) {
    console.log("[MOCK SMS] PHONE-CHANGE →", {
      to: phoneNumber,
      code,
      userName,
    });
    return { success: true, mock: true };
  }

  const to = formatPhoneNumber(phoneNumber);
  const text = `AutoSell: kod zmiany telefonu ${code}. Wazny 10 min.`;

  const data = await smsapiPost({
    to,
    message: text,
    from: SMSAPI_SENDER,
    format: "json",
    encoding: "utf-8",
  });

  return {
    success: true,
    mock: false,
    smsapi_response: data,
    message_id: data?.list?.[0]?.id ?? data?.id ?? null,
    status: data?.list?.[0]?.status ?? data?.status ?? null,
  };
}

/**
 * SMS powitalny (niekrytyczny — błędy nie wysadzają procesu)
 */
export async function sendWelcomeSMS(phoneNumber, userName) {
  if (MOCK_SMS) {
    console.log("[MOCK SMS] WELCOME →", { to: phoneNumber, userName });
    return { success: true, mock: true };
  }

  const to = formatPhoneNumber(phoneNumber);
  const text = `Witaj ${userName}! Dziekujemy za rejestracje w AutoSell.`;

  try {
    const data = await smsapiPost({
      to,
      message: text,
      from: SMSAPI_SENDER,
      format: "json",
      encoding: "utf-8",
    });
    return {
      success: true,
      mock: false,
      smsapi_response: data,
    };
  } catch (e) {
    console.warn("[WELCOME SMS] Nieudane (niekrytyczne):", e?.message);
    return { success: false, mock: false };
  }
}

// ---- Domyślny eksport ----
export default {
  sendVerificationSMS,
  sendPhoneChangeSMS,
  sendWelcomeSMS,
  formatPhoneNumber,
};
