import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import BillsList from "./components/BillsList";
import UploadInvoice from "./components/UploadInvoice";
import MainPage from "./components/MainApp";
import ComingSoonPage from "./components/ComingSoonPage";
import LoginPage from "./components/LoginPage";
import DashBoardPage from "./components/DashBoardPage";
import InventoryPropertyPage from "./components/InventoryPropertyPage";
import InventoryLookupInfoPage from "./components/InventoryLookupInfoPage";
import { testLog } from "./utils/testLogger";
import { UiPolishProvider } from "./plugins/uiPolish";
import { API_BASE } from "./config";
import {
  clearJwtToken,
  createFrontendJwt,
  getStoredJwtToken,
  isJwtExpired,
  storeJwtToken,
} from "./utils/jwtAuth";

const LAST_ROUTE_KEY = "last_route";
const SESSION_STARTED_AT_KEY = "session_started_at";
const LAST_ACTIVITY_AT_KEY = "last_activity_at";

const IDLE_LOGOUT_MS = 60 * 60 * 1000; // 1 hour
const HARD_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function RouteChangeTracker({ enabled }) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    const path = location.pathname || "/";
    const search = location.search || "";

    // Don't persist auth / landing pages
    const excluded = new Set(["/", "/comingsoon"]);
    if (excluded.has(path)) return;

    const full = `${path}${search}`;
    sessionStorage.setItem(LAST_ROUTE_KEY, full);
  }, [enabled, location.pathname, location.search]);

  return null;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [email, setEmail] = useState(null);
  const [role, setRole] = useState(null);
  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);

  // Load stored session data from localStorage
  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedEmail = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedFirstName = localStorage.getItem("first_name");
    const storedLastName = localStorage.getItem("last_name");

    const storedToken = getStoredJwtToken();
    if (storedToken && isJwtExpired(storedToken)) {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("email");
      localStorage.removeItem("role");
      localStorage.removeItem("roles");
      localStorage.removeItem("first_name");
      localStorage.removeItem("last_name");
      localStorage.removeItem("employee_code");
      localStorage.removeItem("phone_number");
      localStorage.removeItem(SESSION_STARTED_AT_KEY);
      localStorage.removeItem(LAST_ACTIVITY_AT_KEY);
      clearJwtToken();
      sessionStorage.removeItem(LAST_ROUTE_KEY);
      setAuthHydrated(true);
      return;
    }

    if (storedIsLoggedIn && storedEmail && storedRole && storedFirstName && storedLastName) {
      setIsLoggedIn(true);
      setEmail(storedEmail);
      setRole(storedRole);
      setFirstName(storedFirstName);
      setLastName(storedLastName);
    }
    setAuthHydrated(true);
  }, []);

  // Handle successful login
  const handleLoginSuccess = async (email, navigate, authContext = {}) => {
    try {
      const data =
        authContext.roleData ||
        (await (async () => {
          const response = await fetch(`${API_BASE}/roles?email=${encodeURIComponent(email)}`);

          if (!response.ok) throw new Error(`Error: ${response.statusText}`);

          return response.json();
        })());

      if (data && data.role && data.first_name && data.last_name) {
        testLog("App", "loginSuccess", { email, role: data.role });
        const roleValue = Array.isArray(data.role) ? data.role.join(", ") : data.role;
        const jwtToken = await createFrontendJwt({
          email,
          role: data.role,
          firstName: data.first_name,
          lastName: data.last_name,
          employeeCode: data.employee_code,
          phoneNumber: data.phone_number,
          googleSubject: authContext.googleProfile?.sub,
        });

        setIsLoggedIn(true);
        setEmail(email);
        setRole(roleValue);
        setFirstName(data.first_name);
        setLastName(data.last_name);

        // Store data in localStorage
        localStorage.setItem("isLoggedIn", true);
        localStorage.setItem("email", email);
        localStorage.setItem("role", roleValue);
        localStorage.setItem("roles", JSON.stringify(Array.isArray(data.role) ? data.role : [data.role]));
        localStorage.setItem("first_name", data.first_name);
        localStorage.setItem("last_name", data.last_name);
        localStorage.setItem("employee_code", data.employee_code || "");
        localStorage.setItem("phone_number", data.phone_number || "");
        localStorage.setItem("google_id_token", authContext.googleCredential || "");
        storeJwtToken(jwtToken);

        // session timers (frontend-only UX)
        const now = Date.now();
        localStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
        localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(now));

        navigate?.("/home");
      } else {
        navigate?.("/comingsoon");
      }
    } catch (error) {
      console.error("Login failed: ", error);
    }
  };

  // Handle manual logout
  const handleLogout = (navigate) => {
    testLog("App", "logout", { email });
    clearSession();
    navigate("/");
  };

  // Clear session and localStorage data
  const clearSession = () => {
    setIsLoggedIn(false);
    setAuthHydrated(true);
    setEmail(null);
    setRole(null);
    setFirstName(null);
    setLastName(null);
    clearTimeout(timeoutId);

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("roles");
    localStorage.removeItem("first_name");
    localStorage.removeItem("last_name");
    localStorage.removeItem(SESSION_STARTED_AT_KEY);
    localStorage.removeItem(LAST_ACTIVITY_AT_KEY);
    localStorage.removeItem("employee_code");
    localStorage.removeItem("phone_number");
    clearJwtToken();
    sessionStorage.removeItem(LAST_ROUTE_KEY);
  };

  const getLastRoute = () => {
    const v = sessionStorage.getItem(LAST_ROUTE_KEY);
    return v && typeof v === "string" ? v : null;
  };

  const guard = (element) => {
    if (!authHydrated) return null;
    return isLoggedIn ? element : <Navigate to="/" replace />;
  };

  // Auto logout: idle + hard expiry (frontend-only UX)
  useEffect(() => {
    if (!authHydrated || !isLoggedIn) return;

    const now = Date.now();
    const startedRaw = localStorage.getItem(SESSION_STARTED_AT_KEY);
    const lastRaw = localStorage.getItem(LAST_ACTIVITY_AT_KEY);

    if (!startedRaw) localStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
    if (!lastRaw) localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(now));

    let lastWrite = 0;
    const bumpActivity = () => {
      const t = Date.now();
      // throttle writes (avoid spamming localStorage)
      if (t - lastWrite < 10_000) return;
      lastWrite = t;
      localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(t));
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, bumpActivity, { passive: true }));

    const check = () => {
      const t = Date.now();
      const startedAt = Number(localStorage.getItem(SESSION_STARTED_AT_KEY) || NaN);
      const lastAt = Number(localStorage.getItem(LAST_ACTIVITY_AT_KEY) || NaN);

      const hardExpired = Number.isFinite(startedAt) ? t - startedAt > HARD_EXPIRY_MS : false;
      const idleExpired = Number.isFinite(lastAt) ? t - lastAt > IDLE_LOGOUT_MS : false;

      if (hardExpired || idleExpired) {
        clearSession();
        window.location.assign("/");
      }
    };

    check();
    const intervalId = window.setInterval(check, 30_000);

    return () => {
      window.clearInterval(intervalId);
      events.forEach((e) => window.removeEventListener(e, bumpActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated, isLoggedIn]);

  return (
    <UiPolishProvider
      config={{
        locale: "en-IN",
        currency: "INR",
        notifier: { kind: "toastify", position: "bottom-center", autoCloseMs: 3500 },
        messages: { empty: "No data found.", error: "Something went wrong. Please try again." },
      }}
    >
      <GoogleOAuthProvider clientId="956925433530-3rkehhq6gir119e5735tfci7tlouh6un.apps.googleusercontent.com">
        <BrowserRouter>
          <RouteChangeTracker enabled={isLoggedIn} />
          <Routes>
            <Route
              path="/"
              element={
                !authHydrated ? null : isLoggedIn ? (
                  <Navigate to={getLastRoute() || "/home"} replace />
                ) : (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/home"
              element={
                guard(
                  <MainPage
                    role={role}
                    userEmail={email}
                    userFirstName={firstName}
                    userLastName={lastName}
                    onLogout={(navigate) => handleLogout(navigate)}
                  />
                )
              }
            />
            <Route path="/bills" element={guard(<BillsList role={role} userEmail={email} />)} />
            <Route path="/upload" element={guard(<UploadInvoice role={role} userEmail={email} />)} />
            <Route path="/property/:propertyId/inventory" element={guard(<InventoryPropertyPage />)} />
            <Route path="/inventory" element={<InventoryLookupInfoPage />} />
            <Route path="/comingsoon" element={<ComingSoonPage />} />
            {/* <Route path="/:itemName" element={<ItemDetails />} /> */}
          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </UiPolishProvider>
  );
}

export default App;
