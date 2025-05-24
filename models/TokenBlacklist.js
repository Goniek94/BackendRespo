/**
 * Simple in-memory token blacklist for JWT rotation.
 * In production, use Redis or persistent store!
 */
const blacklist = new Set();

export const addToBlacklist = (token) => {
  blacklist.add(token);
};

export const isBlacklisted = (token) => {
  return blacklist.has(token);
};

export const clearBlacklist = () => {
  blacklist.clear();
};

export default {
  addToBlacklist,
  isBlacklisted,
  clearBlacklist,
};
