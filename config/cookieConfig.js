// config/cookieConfig.js
// CENTRALNA KONFIGURACJA COOKIES DLA AUTOSELL.PL

const isProd = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";
const cookieDomain = isProd ? ".autosell.pl" : undefined;

const TOKEN_EXPIRY = {
  production: {
    access: 15 * 60 * 1000,
    refresh: 7 * 24 * 60 * 60 * 1000,
    admin_access: 15 * 60 * 1000,
    admin_refresh: 7 * 24 * 60 * 60 * 1000,
  },
  staging: {
    access: 60 * 60 * 1000,
    refresh: 7 * 24 * 60 * 60 * 1000,
    admin_access: 60 * 60 * 1000,
    admin_refresh: 7 * 24 * 60 * 60 * 1000,
  },
  development: {
    access: 60 * 60 * 1000,
    refresh: 60 * 60 * 1000,
    admin_access: 60 * 60 * 1000,
    admin_refresh: 60 * 60 * 1000,
  },
};

const getCurrentExpiry = () => {
  if (isProd) return TOKEN_EXPIRY.production;
  if (isStaging) return TOKEN_EXPIRY.staging;
  return TOKEN_EXPIRY.development;
};

export const getSecureCookieConfig = (tokenType = "access") => {
  const expiry = getCurrentExpiry();
  return {
    httpOnly: true,
    secure: isProd || isStaging,
    // Use 'lax' for same-site scenarios (www.autosell.pl ↔ api.autosell.pl)
    // Both frontend and API are under the same site (.autosell.pl)
    sameSite: "lax",
    domain: cookieDomain,
    path: "/",
    maxAge: expiry[tokenType] || expiry.access,
    // Removed partitioned: true - not using CHIPS (requires SameSite=None + no domain)
    ...(isProd && { priority: "high" }),
  };
};

export const getClearCookieConfig = () => ({
  httpOnly: true,
  secure: isProd || isStaging,
  sameSite: "lax",
  domain: cookieDomain,
  path: "/",
});

export const setSecureCookie = (res, name, value, tokenType = "access") => {
  res.cookie(name, value, getSecureCookieConfig(tokenType));
};

export const clearSecureCookie = (res, name) => {
  res.clearCookie(name, getClearCookieConfig());
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  setSecureCookie(res, "token", accessToken, "access");
  setSecureCookie(res, "refreshToken", refreshToken, "refresh");
};

export const clearAuthCookies = (res) => {
  clearSecureCookie(res, "token");
  clearSecureCookie(res, "refreshToken");
  // backward-compat
  clearSecureCookie(res, "at");
  clearSecureCookie(res, "rt");
};

// REMOVED: Admin-specific cookie helpers (setAdminCookies, clearAdminCookies, etc.)
// Admin uses the same 'token' and 'refreshToken' cookies as regular users
// The middleware already checks user.role to determine admin privileges

export const getCookieInfo = () => {
  const expiry = getCurrentExpiry();
  return {
    environment: process.env.NODE_ENV || "development",
    domain: cookieDomain || "localhost",
    secure: isProd || isStaging,
    sameSite: "lax",
    expiry: {
      access: `${expiry.access / 1000 / 60} min`,
      refresh: `${expiry.refresh / 1000 / 60 / 60 / 24} dni`,
    },
  };
};

export default {
  getSecureCookieConfig,
  getClearCookieConfig,
  setSecureCookie,
  clearSecureCookie,
  setAuthCookies,
  clearAuthCookies,
  getCookieInfo,
};
