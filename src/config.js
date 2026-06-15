/**
 * Central API base URL for the app (including `/property-approvals`).
 * Override with REACT_APP_API_BASE in .env if needed; default is prod.
 */
export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
// Local dev convenience: set REACT_APP_API_BASE=http://localhost:8080 in `.env` to override.

/**
 * CRM backend base URL only.
 * Intentionally defaults to local backend for CRM iteration.
 * Override with REACT_APP_LOCAL_API_BASE in `.env` if needed.
 */
export const LOCAL_API_BASE = process.env.REACT_APP_LOCAL_API_BASE || "http://localhost:8080";

// ---- Auth / Roles (frontend) ----
// Keep role strings centralized so UI + services stay consistent.
export const ROLES = Object.freeze({
  ADMIN: "Admin",
  SALES: "Sales",
});

export function getStoredRole() {
  try {
    return (localStorage.getItem("role") || "").trim();
  } catch {
    return "";
  }
}

export function isSalesRole(role = getStoredRole()) {
  return String(role || "").trim().toLowerCase() === ROLES.SALES.toLowerCase();
}
