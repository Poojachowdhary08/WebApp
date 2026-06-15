/**
 * Maps axios/HTTP errors to short, end-user–safe messages.
 * Avoids exposing raw URLs, stack traces, or internal paths in the UI.
 */

function extractDetail(data) {
  if (!data || typeof data !== "object") return "";
  const d = data.detail;
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === "object" && x != null && "msg" in x ? x.msg : String(x)))
      .filter(Boolean)
      .join(" · ");
  }
  if (typeof d === "string") return d.trim();
  if (d && typeof d === "object" && d.message) return String(d.message).trim();
  if (d && typeof d === "object") {
    try {
      return JSON.stringify(d);
    } catch {
      return String(d);
    }
  }
  if (data.message && typeof data.message === "string") return data.message.trim();
  return "";
}

function looksLikeInternalDetail(s) {
  if (!s || s.length > 500) return true;
  const t = s.toLowerCase();
  if (t.includes("traceback") || t.includes("sql") || t.includes("exception") || t.includes("internal server")) {
    return true;
  }
  if (/^\{[\s\S]*"detail"/.test(s) && t.includes("http")) return true;
  return false;
}

/**
 * @param {unknown} err - Typically an Axios error
 * @param {object} [options]
 * @param {string} [options.fallback] - When no specific mapping applies
 * @param {string} [options.notFound] - Override for 404
 */
export function getUserFacingApiError(err, options = {}) {
  const { fallback = "Something went wrong. Please try again.", notFound } = options;

  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = err?.code;
  const msg = String(err?.message || "").toLowerCase();

  if (!err?.response) {
    if (code === "ECONNABORTED" || msg.includes("timeout")) {
      return "This is taking too long. Check your connection and try again.";
    }
    if (code === "ERR_NETWORK" || msg === "network error" || msg.includes("network error")) {
      return "We could not reach the server. Check your internet or VPN, then try again.";
    }
    if (msg.includes("canceled") || code === "ERR_CANCELED") {
      return "Request was cancelled.";
    }
    if (err?.message && err.message.length < 120 && !err.message.includes("Request failed with status code")) {
      return "We could not complete that. Check your connection and try again.";
    }
    return "We could not reach the server. Check your connection and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again, then try.";
  }
  if (status === 403) {
    return "You do not have permission to do that. If you need access, ask your admin.";
  }
  if (status === 404) {
    return notFound || "We could not find what you need. It may have been removed or the link is out of date.";
  }
  if (status === 408 || status === 504) {
    return "The server took too long to respond. Please try again in a moment.";
  }
  if (status === 409) {
    return "This could not be saved because it conflicts with existing data. Refresh the page and try again.";
  }
  if (status === 422) {
    const detail = extractDetail(data);
    if (detail && !looksLikeInternalDetail(detail)) {
      return `Please check your information: ${detail}`;
    }
    return "Some information is not valid. Review the form and try again.";
  }
  if (status === 429) {
    return "Too many attempts. Please wait a little and try again.";
  }
  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again in a few minutes.";
  }

  if (status === 400) {
    const detail = extractDetail(data);
    if (detail && !looksLikeInternalDetail(detail) && detail.length < 300) {
      return detail;
    }
    return "We could not process that request. Check your input and try again.";
  }

  const detail = extractDetail(data);
  if (detail && !looksLikeInternalDetail(detail) && detail.length < 300) {
    return detail;
  }

  return fallback;
}

/**
 * @param {unknown} err
 * @param {string} [subject] - e.g. "create this lead" for fallback wording
 */
export function getUserFacingApiErrorForAction(err, subject = "that") {
  return getUserFacingApiError(err, {
    fallback: `We could not complete ${subject}. Please try again.`,
  });
}
