/**
 * Konfiguracja administratorów systemu
 * System administrators configuration
 *
 * Ten plik zawiera stałe adresy e-mail administratorów, które będą automatycznie
 * rozpoznawane przez system podczas logowania.
 * This file contains constant administrator email addresses that will be automatically
 * recognized by the system during login.
 */

const adminConfig = {
  // Lista adresów e-mail administratorów z zmiennych środowiskowych
  // List of administrator email addresses from environment variables
  adminEmails: process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
    : [
        // Fallback dla development - NIE używaj na produkcji!
        "admin@marketplace.pl",
        "administrator@autosell.pl",
        "support@autosell.pl",
      ],

  // Domyślna rola dla administratorów
  // Default role for administrators
  defaultAdminRole: "admin",

  // Uprawnienia administratorów
  // Administrator permissions
  adminPermissions: {
    users: {
      create: true,
      read: true,
      update: true,
      delete: true,
      assignRoles: true,
    },
    listings: {
      create: true,
      read: true,
      update: true,
      delete: true,
      moderate: true,
    },
    comments: {
      create: true,
      read: true,
      update: true,
      delete: true,
      moderate: true,
    },
    discounts: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
    reports: {
      read: true,
      update: true,
      delete: true,
      assign: true,
    },
  },

  // Uprawnienia moderatorów
  // Moderator permissions
  moderatorPermissions: {
    users: {
      create: false,
      read: true,
      update: false,
      delete: false,
      assignRoles: false,
    },
    listings: {
      create: false,
      read: true,
      update: true,
      delete: false,
      moderate: true,
    },
    comments: {
      create: true,
      read: true,
      update: true,
      delete: true,
      moderate: true,
    },
    discounts: {
      create: false,
      read: true,
      update: false,
      delete: false,
    },
    reports: {
      read: true,
      update: true,
      delete: false,
      assign: false,
    },
  },
};

export default adminConfig;
