/**
 * API error parsing utilities.
 * Normalizes axios/API error responses to user-friendly messages for alerts and dialogs.
 */

/** Error codes returned by phase inventory backend */
export const ErrorCodes = {
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AREAS_REQUIRED: "AREAS_REQUIRED",
  SCHEDULE_REQUIRED: "SCHEDULE_REQUIRED",
  INVALID_AREA_TYPE: "INVALID_AREA_TYPE",
  INVALID_STATUS: "INVALID_STATUS",
  INVALID_DATE: "INVALID_DATE",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  UPLOAD_ERROR: "UPLOAD_ERROR",
  DB_ERROR: "DB_ERROR",
  UNKNOWN: "UNKNOWN",
};

/** User-friendly messages for known error codes */
const CODE_MESSAGES = {
  [ErrorCodes.TEMPLATE_NOT_FOUND]: "Template not found. It may have been deleted.",
  [ErrorCodes.AREAS_REQUIRED]:
    "Property has no areas defined. Add floors with slab, brick work, and plastering areas (Edit property → Floors), then try again.",
  [ErrorCodes.VALIDATION_ERROR]: null, // use detail.error
  [ErrorCodes.INVALID_AREA_TYPE]: "Invalid area type. Use construction, slab, brick work, or plastering.",
  [ErrorCodes.INVALID_STATUS]: "Invalid status. Use draft, planned, or active.",
  [ErrorCodes.INVALID_DATE]: "Invalid date. Use YYYY-MM-DD format.",
  [ErrorCodes.MISSING_REQUIRED_FIELD]: null, // use detail.error
  [ErrorCodes.UPLOAD_ERROR]: null, // use detail.error
  [ErrorCodes.DB_ERROR]: "A server error occurred. Please try again or contact support.",
  [ErrorCodes.SCHEDULE_REQUIRED]: "No schedule found. Upload schedule first.",
};

/**
 * Normalize API error detail (string | array of {msg} | object) to a display string.
 * Handles both legacy string detail and structured { error, code, details } format.
 * @param {any} d - API response data.detail
 * @returns {string}
 */
export function apiDetailToString(d) {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e && typeof e === "object" && e.msg != null ? e.msg : String(e))).join("; ");
  if (typeof d === "object") {
    if (d.msg != null) return d.msg;
    if (d.error != null) return String(d.error);
  }
  return String(d);
}

/**
 * Parse an axios error into a user-friendly message.
 * Prefers backend structured detail; falls back to status-based messages.
 * @param {Error} err - Axios error from catch block
 * @param {string} fallbackMessage - Message when nothing else can be extracted
 * @returns {{ message: string; severity: 'error'|'warning'; code?: string }}
 */
export function parseApiError(err, fallbackMessage = "An error occurred.") {
  const detail = err?.response?.data?.detail;
  const status = err?.response?.status;

  // Structured backend response { error, code, details }
  if (detail && typeof detail === "object" && detail.error != null) {
    const code = detail.code || ErrorCodes.UNKNOWN;
    let message = CODE_MESSAGES[code] ?? detail.error;
    if (message == null) message = detail.error;

    // Append areas hint for AREAS_REQUIRED
    if (code === ErrorCodes.AREAS_REQUIRED) {
      message =
        "Property has no areas defined. Add floors with slab, brick work, and plastering areas (Edit property → Floors), then try again.";
    }

    return { message: String(message), severity: "error", code };
  }

  // Legacy string detail
  const strDetail = apiDetailToString(detail);
  if (strDetail) {
    // Some endpoints still return raw DB/SQL trace text in `detail`.
    // Never show that to the user; keep it generic.
    const dbLeakRegex =
      /(psycopg2|sqlalchemy|InFailedSqlTransaction|current transaction is aborted|commands ignored until end of transaction block|TRACEBACK|Traceback \(most recent call last\)|\bSQL:\b|DELETE FROM|UPDATE\s+\w+|INSERT INTO)/i;
    if (dbLeakRegex.test(strDetail)) {
      return { message: CODE_MESSAGES[ErrorCodes.DB_ERROR], severity: "error", code: ErrorCodes.DB_ERROR };
    }
    return { message: strDetail, severity: "error" };
  }

  // Status-based fallbacks
  if (status === 404) return { message: "Resource not found.", severity: "error" };
  if (status === 403) return { message: "Access denied.", severity: "error" };
  if (status === 500) return { message: "Server error. Please try again later.", severity: "error" };
  if (status === 502 || status === 503)
    return { message: "Service temporarily unavailable. Please try again.", severity: "error" };
  if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout"))
    return { message: "Request timed out. Please try again.", severity: "error" };
  if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error"))
    return { message: "Network error. Check your connection.", severity: "error" };

  return { message: err?.message || fallbackMessage, severity: "error" };
}

/**
 * Get the display message string from parseApiError for use with showDialog.
 * @param {Error} err - Axios error
 * @param {string} fallbackMessage - Fallback when nothing can be extracted
 * @returns {string}
 */
export function getApiErrorMessage(err, fallbackMessage = "An error occurred.") {
  return parseApiError(err, fallbackMessage).message;
}
