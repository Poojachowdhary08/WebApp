/**
 * Test logger – logs everything while testing. Filter console by "[TEST]" to see only these.
 * Enable: set REACT_APP_TEST_LOGGING=true in .env (default: true for testing).
 */
const TEST_LOGGING = process.env.REACT_APP_TEST_LOGGING !== "false";

function timestamp() {
  return new Date().toISOString();
}

export function testLog(component, action, data = null) {
  if (!TEST_LOGGING) return;
  const payload = data !== null && data !== undefined ? { ...(typeof data === "object" && !Array.isArray(data) ? data : { value: data }) } : {};
  console.log("[TEST]", timestamp(), component, action, Object.keys(payload).length ? payload : "");
}

export function testLogApi(component, method, url, payload = null, responseSummary = null) {
  if (!TEST_LOGGING) return;
  const out = { method, url };
  if (payload != null) out.payload = payload;
  if (responseSummary != null) out.response = responseSummary;
  console.log("[TEST] API", timestamp(), component, out);
}

export function testLogError(component, action, error) {
  if (!TEST_LOGGING) return;
  console.warn("[TEST] ERROR", timestamp(), component, action, error?.message ?? error, error?.response?.data ?? "");
}

export default { testLog, testLogApi, testLogError };
