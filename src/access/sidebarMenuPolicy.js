/**
 * Sidebar / main menu visibility by app role (localStorage role + roles from /roles).
 * Admin sees everything. Other roles see a subset aligned with business areas.
 */

/** @returns {Set<string>} normalized lowercase tokens */
function readRoleTokens() {
  const tokens = new Set();
  const raw = localStorage.getItem("role");
  if (raw) {
    raw.split(",").forEach((p) => {
      const t = p.trim().toLowerCase();
      if (t) tokens.add(t);
    });
  }
  try {
    const arr = JSON.parse(localStorage.getItem("roles") || "[]");
    if (Array.isArray(arr)) {
      arr.forEach((x) => {
        const t = String(x ?? "")
          .trim()
          .toLowerCase();
        if (t) tokens.add(t);
      });
    }
  } catch {
    /* ignore */
  }
  return tokens;
}

export function getAppRoleFlags() {
  const tokens = readRoleTokens();
  const has = (exact) => tokens.has(String(exact).toLowerCase());
  const isAdmin = [...tokens].some((t) => t === "admin" || t.includes("admin"));
  return {
    isAdmin,
    isBackend: has("backend_team"),
    isStock: has("stock_management_team"),
    isFinance: has("finance_team") || has("finance"),
    rawTokens: tokens,
  };
}

/** Any of the known operational / finance roles (excluding pure admin check). */
function hasAnyKnownBizRole(f) {
  return f.isBackend || f.isStock || f.isFinance;
}

/**
 * @param {string} itemName - Sidebar `name` (e.g. "Property Data Entry")
 * @param {ReturnType<typeof getAppRoleFlags>} f
 */
export function canAccessSidebarItem(itemName, f) {
  if (f.isAdmin) return true;

  switch (itemName) {
    case "Dashboard":
      return true;
    case "Projects":
    case "Property Data Entry":
      return f.isBackend;
    case "Invoices":
    case "Inventory":
      return f.isBackend || f.isStock || f.isFinance;
    case "ManPower":
      return f.isBackend || f.isFinance;
    case "Finance":
      return f.isFinance;
    case "Calendar":
    case "AI Chat":
      return hasAnyKnownBizRole(f);
    case "Client":
      return f.isBackend || f.isFinance;
    case "SuperSetDashBoard":
      return f.isAdmin || f.isFinance;
    case "MasterItemDetails":
      return f.isBackend || f.isStock || f.isFinance;
    default:
      return f.isBackend || f.isStock || f.isFinance;
  }
}

const DEFAULT_ORDER = [
  "Dashboard",
  "Projects",
  "Property Data Entry",
  "Invoices",
  "Inventory",
  "ManPower",
  "Finance",
  "Calendar",
  "Client",
  "AI Chat",
];

export function firstAccessibleSidebarItem(f) {
  for (const name of DEFAULT_ORDER) {
    if (canAccessSidebarItem(name, f)) return name;
  }
  return "Dashboard";
}
