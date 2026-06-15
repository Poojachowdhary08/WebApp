import React, { useState, useEffect, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  TextField,
  Autocomplete,
  IconButton,
  Avatar,
  InputAdornment,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Stack,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HomeIcon from "@mui/icons-material/Home";
import ChatIcon from "@mui/icons-material/Chat";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Dialog from "@mui/material/Dialog";
import { useNavigate } from "react-router-dom";
import ChatBoxAi from "./ChatBoxAi";
import NotificationsPage from "./NotificationsPage";
import SupersetDashboard from "./SupersetDashboard";

import { canAccessSidebarItem, getAppRoleFlags } from "../access/sidebarMenuPolicy";

export default function AppBarWithSearch({ formType, setFormType }) {
  const [searchValue, setSearchValue] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState(null);
  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [role, setRole] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // Chat modal – open from search bar or chat icon
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialQuestion, setChatInitialQuestion] = useState("");

  // Report dashboard modal
  const [reportOpen, setReportOpen] = useState(false);

  // Alerts sidebar
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const roleFlags = useMemo(() => getAppRoleFlags(), [role]);

  const toPascalCase = (text) =>
    text
      ?.replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join("");

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedEmail = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedFirstName = localStorage.getItem("first_name");
    const storedLastName = localStorage.getItem("last_name");

    if (storedIsLoggedIn && storedEmail && storedRole) {
      setIsLoggedIn(true);
      setEmail(storedEmail);
      setRole(storedRole);
      setFirstName(storedFirstName);
      setLastName(storedLastName);
    }
  }, []);

  // Search options – selecting one opens ChatBoxAi with that as context (except Dashboard)
  const searchOptions = [
    "Dashboard",
    "View DashBoard",
    "Create New Land Deal",
    "View Properties",
    "View ManPower",
    "View Inventory",
    "Inventory Management",
    "View Bills",
    "View Vendors",
    "View OnBoarding",
    "View Work-Type",
    "Finance View",
    "Clients",
    "ChatBoxAi",
    "Low Stock",
    "Reset Password",
  ];

  const handleSearchChange = (event, newValue) => {
    setSearchValue(newValue || "");
    setIsActive(!!newValue);
    if (!newValue) return;
    if (newValue === "Dashboard" || newValue === "View DashBoard") {
      setFormType("");
      setSearchValue("");
      setIsActive(false);
      return;
    }
    // Opening from search bar: open ChatBoxAi with selected option as initial question
    setChatInitialQuestion(newValue);
    setChatOpen(true);
    setSearchValue("");
    setIsActive(false);
  };

  // No dropdown suggestions – only free text; submit on Enter
  const filterOptions = () => [];

  const handleBackClick = () => {
    setFormType("");
    setSearchValue("");
    setIsActive(false);
  };

  const handleAvatarClick = (event) => setAnchorEl(event.currentTarget);
  const handlePIPClose = () => setAnchorEl(null);

  const handleSignOut = () => {
    localStorage.clear();
    if (window.caches) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => caches.delete(cacheName));
      });
    }
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  // ---------- Alerts helpers ----------
  const formatWhen = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleString();
  };

  // Map API fields (your sample shape) to UI-safe shape
  const normalizeAlert = (a) => {
    const title = a.item_name || "Alert";
    const whenIso = a.generated_at || a.created_at || a.createdAt || a.timestamp;
    const message = a.notes || "";
    const type = a.alert_type || "ALERT";
    const statusActive = a.is_active === true;

    return {
      id: a.id || `${title}-${whenIso}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      message,
      when: formatWhen(whenIso),
      rawTime: whenIso,
      type,
      isActive: statusActive,
      location: a.location,
      warehouse: a.warehouse,
      available: a.available_quantity,
      minimum: a.minimum_quantity,
      threshold: a.threshold_quantity,
      resolvedAt: a.resolved_at,
      original: a,
    };
  };

  const typeColor = (type) => {
    switch (String(type).toUpperCase()) {
      case "BELOW_MIN":
        return "error";
      case "BELOW_THRESHOLD":
        return "warning";
      case "AT_15_PERCENT":
        return "info";
      default:
        return "default";
    }
  };

  const alertsCount = useMemo(() => {
    // Count ACTIVE alerts first; fallback to total
    const active = alerts.filter((a) => a.is_active === true).length;
    return active > 0 ? active : alerts.length;
  }, [alerts]);

  const openAlerts = () => setAlertsOpen(true);
  const closeAlerts = () => setAlertsOpen(false);

  useEffect(() => {
    if (!alertsOpen) return;

    const controller = new AbortController();
    const fetchAlerts = async () => {
      setAlertsLoading(true);
      setAlertsError("");
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("auth_token");

        const res = await fetch("http://localhost:8080/alerts", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.alerts) ? data.alerts : [];
        setAlerts(list);
      } catch (e) {
        setAlertsError(`Failed to load alerts: ${e?.message || e}`);
      } finally {
        setAlertsLoading(false);
      }
    };

    fetchAlerts();
    return () => controller.abort();
  }, [alertsOpen]);

  return (
    <>
      <AppBar
        position="static"
        sx={{
          background: "linear-gradient(270deg, #2A3663 0%, #B4D6FF 100%)",
          boxShadow: "none",
          px: 2,
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: isMobile ? 2 : 0,
            width: "100%",
          }}
        >
          {/* Left: Logo + Search */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexDirection: isMobile ? "column" : "row",
              gap: 1,
              width: "100%",
            }}
          >
            {/* Logo */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img
                onClick={handleBackClick}
                src="https://avenuerealty.in/wp-content/uploads/2022/12/cropped-Avenue-reality-logo.png"
                alt="Avenue Realty Logo"
                style={{
                  height: "40px",
                  cursor: "pointer",
                  marginRight: isMobile ? 0 : "8px",
                }}
              />
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#FFFFFF", fontSize: "1.5rem" }}
              >
                <Box component="span" sx={{ fontSize: "1rem", ml: "-12px", display: "flex" }}>
                  <sup
                    style={{
                      fontSize: "0.9rem",
                      top: "-0.5em",
                      color: "#1e6adc",
                      position: "relative",
                    }}
                  >
                    NxT
                  </sup>
                </Box>
              </Typography>
            </Box>

            {/* Search Bar - navigate to Properties, ManPower, Bills, Inventory, etc. */}
            <Autocomplete
              freeSolo
              options={searchOptions}
              filterOptions={filterOptions}
              value={searchValue}
              onInputChange={(e, value) => setSearchValue(value || "")}
              onChange={(e, newValue) => handleSearchChange(e, newValue)}
              sx={{
                mt: isMobile ? 1 : 0,
                width: isMobile ? "100%" : "40vw",
                maxWidth: isMobile ? "100%" : "500px",
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="What do you want to do... (press Enter)"
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = (searchValue || "").trim();
                      if (!v) return;
                      if (/^dashboard$/i.test(v) || /^view\s*dashboard$/i.test(v)) {
                        setFormType("");
                        setSearchValue("");
                        setIsActive(false);
                      } else {
                        setChatInitialQuestion(v);
                        setChatOpen(true);
                        setSearchValue("");
                        setIsActive(false);
                      }
                    }
                  }}
                  sx={{
                    bgcolor: "#FFFFFF",
                    borderRadius: "999px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "999px",
                      paddingLeft: 1,
                      height: "40px",
                      "& fieldset": { borderColor: "#1976d2" },
                      "&:hover fieldset": { borderColor: "#1565c0" },
                      "&.Mui-focused fieldset": { borderColor: "#1565c0" },
                    },
                  }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <AutoAwesomeIcon
                          sx={{
                            color: "#757575",
                            transition: "0.3s",
                            "&:hover": { color: "#FFD700", filter: "drop-shadow(0 0 5px #FFD700)" },
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <Box sx={{ display: "flex", alignItems: "center", pr: 1 }}>
                        {formType && (
                          <IconButton
                            onClick={handleBackClick}
                            sx={{ padding: "6px", height: "32px", width: "32px" }}
                          >
                            <HomeIcon sx={{ fontSize: 20, marginLeft: 20, color: "#FFFFFF" }} />
                          </IconButton>
                        )}
                        {params.InputProps.endAdornment}
                      </Box>
                    ),
                  }}
                />
              )}
            />
          </Box>

          {/* Right: Actions (Chat, Notifications, Profile) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              width: isMobile ? "100%" : "auto",
              justifyContent: isMobile ? "space-between" : "flex-end",
            }}
          >
            {/* Chat (role-gated) */}
            {canAccessSidebarItem("AI Chat", roleFlags) && (
              <Tooltip title="Open ChatBoxAi">
                <IconButton
                  onClick={() => setChatOpen(true)}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  <ChatIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Report - Only for Admin (commented out) */}
            {/* {role && role.toLowerCase() === "admin" && (
              <Tooltip title="View Reports Dashboard">
                <IconButton
                  onClick={() => setReportOpen(true)}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  <AssessmentIcon />
                </IconButton>
              </Tooltip>
            )} */}

            {/* Notifications */}
            <Tooltip title="Alerts">
              <IconButton
                onClick={openAlerts}
                sx={{
                  bgcolor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <NotificationsNoneIcon />
                  {alertsCount > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        bgcolor: "error.main",
                        color: "#fff",
                        borderRadius: "9px",
                        fontSize: "0.7rem",
                        lineHeight: "18px",
                        textAlign: "center",
                        px: 0.5,
                      }}
                    >
                      {alertsCount > 99 ? "99+" : alertsCount}
                    </Box>
                  )}
                </Box>
              </IconButton>
            </Tooltip>

            {/* Profile */}
            <Tooltip title="Profile">
              <Box
                onClick={handleAvatarClick}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: "8px",
                  px: 1,
                  py: 0.5,
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <Avatar sx={{ bgcolor: "#2A3663", color: "#FFF", width: 36, height: 36 }}>
                  {firstName ? firstName[0] : "U"}
                </Avatar>
                <Typography
                  sx={{
                    color: "#FFF",
                    fontWeight: "bold",
                    ml: 1,
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.9rem",
                  }}
                >
                  {toPascalCase(firstName || "USER")} {toPascalCase(lastName || "")}
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handlePIPClose}
            sx={{
              "& .MuiPaper-root": {
                borderRadius: "12px",
                minWidth: "250px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              },
            }}
          >
            <MenuItem>
              <Typography variant="body1">
                <strong>Name:</strong> {toPascalCase(firstName)} {toPascalCase(lastName)}
              </Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="body1">
                <strong>Role:</strong> {toPascalCase(role)}
              </Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="body1">
                <strong>Email:</strong> {email}
              </Typography>
            </MenuItem>
            <MenuItem>
              <Button
                variant="contained"
                color="error"
                onClick={handleSignOut}
                sx={{ textTransform: "none", mt: 1 }}
              >
                Sign Out
              </Button>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Chat Modal – opened from search bar (with initial question) or chat icon */}
      <Dialog
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatInitialQuestion("");
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <ChatBoxAi
          role={role}
          initialQuestion={
            chatInitialQuestion
              ? { id: `search-${Date.now()}`, text: chatInitialQuestion }
              : undefined
          }
        />
      </Dialog>

      {/* Alerts Sidebar (Drawer) */}
      <Drawer
  anchor="right"
  open={alertsOpen}
  onClose={closeAlerts}
  PaperProps={{
    sx: {
      width: { xs: "100%", sm: 420 },
      borderTopLeftRadius: { xs: 0, sm: 12 },
      borderBottomLeftRadius: { xs: 0, sm: 12 },
      overflow: "hidden",
    },
  }}
>
  <NotificationsPage onClose={closeAlerts} />
</Drawer>

      {/* Report Dashboard Dialog (commented out) */}
      {/* <SupersetDashboard open={reportOpen} onClose={() => setReportOpen(false)} /> */}

    </>
  );
}