/**
 * Unified status & type color palette.
 * Rules: non-violent, light tones only (soft pastels, muted colors).
 * Use this file as the single source of truth across all components.
 */

/* ============== TASK / PHASE / PROJECT STATUS ============== */
export const TASK_STATUS = {
  "In Progress": { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  "in progress": { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  Completed: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  completed: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  Pending: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  pending: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  Hold: { bg: "#F3F4F6", fg: "#6B7280", bd: "#E5E7EB" },
  "On Hold": { bg: "#F3F4F6", fg: "#6B7280", bd: "#E5E7EB" },
  Delayed: { bg: "#FFF1F2", fg: "#BE123C", bd: "#FECDD3" },
  Planning: { bg: "#F5F3FF", fg: "#6D28D9", bd: "#DDD6FE" },
  Blocked: { bg: "#FFF1F2", fg: "#BE123C", bd: "#FECDD3" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== INVENTORY REQUEST STATUS ============== */
export const INVENTORY_STATUS = {
  requested: { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  raised: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  issued: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  rejected: { bg: "#FFF1F2", fg: "#BE123C", bd: "#FECDD3" },
  closed: { bg: "#F3F4F6", fg: "#6B7280", bd: "#E5E7EB" },
  partially_issued: { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
  blocked: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== LABOUR / EXPENSE STATUS ============== */
export const EXPENSE_STATUS = {
  pending: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  approved: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  paid: { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  "partially paid": { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  rejected: { bg: "#FFF1F2", fg: "#BE123C", bd: "#FECDD3" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== ENTRY TYPE (General, Avenue Add on, Customer Add on) ============== */
export const ENTRY_TYPE = {
  Regular: { bg: "#F8FAFC", fg: "#475569", bd: "#E2E8F0" },
  "Avenue Add On": { bg: "#F5F3FF", fg: "#6D28D9", bd: "#DDD6FE" },
  "Avenue Add on": { bg: "#F5F3FF", fg: "#6D28D9", bd: "#DDD6FE" },
  "Customer Add On": { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
  "Customer Add on": { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== BILL / INVOICE STATUS ============== */
export const BILL_STATUS = {
  READY_FOR_REVIEW: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  REVIEWED: { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  PROCESSED: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  REJECTED: { bg: "#FFF1F2", fg: "#BE123C", bd: "#FECDD3" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== MANPOWER / EMPLOYEE STATUS ============== */
export const MANPOWER_STATUS = {
  ACTIVE: { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  OPEN: { bg: "#EFF6FF", fg: "#2563EB", bd: "#BFDBFE" },
  PENDING: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  INACTIVE: { bg: "#F3F4F6", fg: "#6B7280", bd: "#E5E7EB" },
  COMPLETED: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
  default: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
};

/* ============== HELPER: get status style (handles case insensitivity) ============== */
export function getTaskStatusStyle(status) {
  const key = String(status || "").trim();
  const exact = TASK_STATUS[key];
  if (exact) return exact;
  const lower = key.toLowerCase();
  const match = Object.entries(TASK_STATUS).find(
    ([k]) => k.toLowerCase() === lower && k !== "default"
  );
  return match ? match[1] : TASK_STATUS.default;
}

export function getInventoryStatusStyle(status) {
  const key = String(status || "").toLowerCase().trim();
  return INVENTORY_STATUS[key] || INVENTORY_STATUS.default;
}

export function getExpenseStatusStyle(status) {
  const key = String(status || "").toLowerCase().trim();
  return EXPENSE_STATUS[key] || EXPENSE_STATUS.default;
}

export function getEntryTypeStyle(entryType) {
  const key = String(entryType || "Regular").trim();
  return ENTRY_TYPE[key] || ENTRY_TYPE.Regular || ENTRY_TYPE.default;
}

export function getManpowerStatusStyle(status) {
  const key = String(status || "").toUpperCase().trim();
  return MANPOWER_STATUS[key] || MANPOWER_STATUS.default;
}

/* ============== SHARED HEX (for simple bg-only usage) ============== */
export const HEX = {
  inProgress: "#EFF6FF",
  completed: "#ECFDF5",
  pending: "#FFFBEB",
  hold: "#F3F4F6",
  delayed: "#FFF1F2",
  regular: "#F8FAFC",
  customerAddOn: "#F0FDF4",
  avenueAddOn: "#F5F3FF",
};
