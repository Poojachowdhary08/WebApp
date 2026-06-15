export const JWT_TOKEN_KEY = "auth_token";
export const JWT_TOKEN_ALIASES = ["auth_token", "token", "access_token", "jwt_token"];

const FRONTEND_JWT_SECRET = "avenue-frontend-session";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64UrlEncode(value) {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSha256(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  let binary = "";
  new Uint8Array(signature).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export function isJwtExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

export async function createFrontendJwt({
  email,
  role,
  firstName,
  lastName,
  employeeCode,
  phoneNumber,
  googleSubject,
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: email || googleSubject || "",
    email: email || "",
    role: Array.isArray(role) ? role : String(role || "").split(",").map((item) => item.trim()).filter(Boolean),
    first_name: firstName || "",
    last_name: lastName || "",
    employee_code: employeeCode || "",
    phone_number: phoneNumber || "",
    google_sub: googleSubject || "",
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    iss: "avenue-frontend",
    aud: "avenue-web",
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  const signature = await hmacSha256(unsignedToken, FRONTEND_JWT_SECRET);
  return `${unsignedToken}.${signature}`;
}

export function storeJwtToken(token) {
  if (!token) return;
  JWT_TOKEN_ALIASES.forEach((key) => localStorage.setItem(key, token));
}

export function getStoredJwtToken() {
  for (const key of JWT_TOKEN_ALIASES) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return "";
}

export function clearJwtToken() {
  JWT_TOKEN_ALIASES.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("google_id_token");
}

export function getAuthHeader() {
  const token = getStoredJwtToken();
  if (!token || isJwtExpired(token)) return {};
  return { Authorization: `Bearer ${token}` };
}

function shouldAttachAuth(url) {
  if (!url) return true;
  const value = typeof url === "string" ? url : url.url;
  if (!value) return true;

  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin || parsed.origin === "http://localhost:8080";
  } catch {
    return true;
  }
}

export function installFetchJwtInterceptor() {
  if (window.__jwtFetchInterceptorInstalled) return;
  window.__jwtFetchInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (resource, init = {}) => {
    if (!shouldAttachAuth(resource)) {
      return originalFetch(resource, init);
    }

    const token = getStoredJwtToken();
    if (!token || isJwtExpired(token)) {
      return originalFetch(resource, init);
    }

    const headers = new Headers(init.headers || (resource instanceof Request ? resource.headers : undefined));
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return originalFetch(resource, { ...init, headers });
  };
}

