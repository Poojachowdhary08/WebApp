// src/pages/AppSearchbar.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  TextField,
  Avatar,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  Drawer,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { Search, NotificationsOutlined, Send } from "@mui/icons-material";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";

import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";

import { useNavigate } from "react-router-dom";

import DashBoardPage from "./DashBoardPage";
import ProjectsPage from "./ProjectsPage";
import Bills from "./Bills";
import CalenderView from "../components/CalenderView";
import ClientView from "./ClientView";
import FinanceView from "./FinanceView";
import InventorySection from "./InventorySection";
import ManPower from "./ManPower";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import SupersetDashboard from "./SupersetDashboard";

import ChatBoxAi from "../components/ChatBoxAi";
import PropertyDataEntryPage from "./PropertyDataEntryPage";

// ✅ Notifications page in drawer
import NotificationsPage from "./NotificationsPage";

// ✅ Master Item Details (page mode)
import MasterItemDetailsDialog from "../components/MasterItemDetailsDialog";

import {
  canAccessSidebarItem,
  firstAccessibleSidebarItem,
  getAppRoleFlags,
} from "../access/sidebarMenuPolicy";

/* -------------------------------------------------------------------------- */
/* COLORS + ANIMATION                                                         */
/* -------------------------------------------------------------------------- */

const COLORS = {
  sidebarBgLight: "#FFFFFF",
  appBarBg: "#FFFFFF",
  pageBg: "#F6F7FF",
  primary: "#2A3663",
  textSecondary: "#6B7280",
};

const sidebarSlideIn = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
`;

/* -------------------------------------------------------------------------- */
/* APP BAR WITH CHAT INPUT + PROFILE                                          */
/* -------------------------------------------------------------------------- */

function AppBarWithSearch({
  sidebarExpanded,
  setSidebarExpanded,
  onSendPrompt,
  onOpenNotifications,
  unreadCount = 0,
}) {
  const [draft, setDraft] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const [email, setEmail] = useState(null);
  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const storedIsLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedEmail = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedFirstName = localStorage.getItem("first_name");
    const storedLastName = localStorage.getItem("last_name");

    if (storedIsLoggedIn && storedEmail && storedRole) {
      setEmail(storedEmail);
      setRole(storedRole);
      setFirstName(storedFirstName);
      setLastName(storedLastName);
    }
  }, []);

  const handleAvatarClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const doSend = () => {
    const msg = (draft || "").trim();
    if (!msg) return;
    onSendPrompt(msg);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: COLORS.appBarBg,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        top: 0,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "72px !important",
          px: 3,
          gap: 2,
        }}
      >
        {/* LEFT */}
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 160 }}>
          <Box
            component="img"
            src="https://avenuerealty.in/wp-content/uploads/2022/12/cropped-Avenue-reality-logo.png"
            alt="Avenue Realty Logo"
            sx={{ height: 32, width: "auto", objectFit: "contain" }}
          />

          <IconButton
            onClick={() => setSidebarExpanded((prev) => !prev)}
            sx={{ ml: 1.5, color: COLORS.textSecondary }}
            size="small"
          >
            {sidebarExpanded ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
        </Box>

        {/* CENTER */}
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Box
            sx={{
              width: "min(720px, 100%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#F7F8FA",
              borderRadius: "999px",
              px: 1.25,
              py: 0.5,
              border: "1px solid #E5E7EB",
            }}
          >
            <Search sx={{ color: COLORS.textSecondary, ml: 0.5 }} />

            <TextField
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Avenue AI… (Enter to send)"
              variant="standard"
              multiline
              maxRows={4}
              sx={{ flex: 1, "& .MuiInputBase-root": { fontSize: 13.5 } }}
              InputProps={{ disableUnderline: true }}
            />

            <Tooltip title="Send">
              <span>
                <IconButton
                  onClick={doSend}
                  disabled={!draft.trim()}
                  sx={{
                    bgcolor: draft.trim() ? "#EEF2FF" : "transparent",
                    color: draft.trim() ? COLORS.primary : "#9CA3AF",
                    "&:hover": {
                      bgcolor: draft.trim() ? "#E0E7FF" : "transparent",
                    },
                  }}
                  size="small"
                >
                  <Send fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* RIGHT */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title="Notifications">
            <IconButton onClick={onOpenNotifications} sx={{ color: COLORS.textSecondary }}>
              <Badge
                variant={unreadCount > 0 ? "standard" : "dot"}
                badgeContent={unreadCount > 0 ? unreadCount : undefined}
                color="error"
              >
                <NotificationsOutlined />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <Box
              onClick={handleAvatarClick}
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                borderRadius: "999px",
                padding: "4px 8px",
                bgcolor: COLORS.appBarBg,
                border: `1px solid #E5E7EB`,
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "#FFD4E7",
                  color: "#D6005E",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {(firstName || "U")?.[0] || "U"}
              </Avatar>

              <Box sx={{ ml: 1, mr: 0.5, display: { xs: "none", sm: "block" } }}>
                <Box sx={{ color: "#111827", fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
                  {firstName || "USER"} {lastName || "USER"}
                </Box>
                <Box sx={{ color: COLORS.textSecondary, fontSize: "10px", lineHeight: 1.2 }}>
                  {role || "Role"}
                </Box>
              </Box>
            </Box>
          </Tooltip>
        </Box>

        {/* Avatar Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          sx={{
            "& .MuiPaper-root": {
              borderRadius: "12px",
              minWidth: "250px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              mt: 1,
            },
          }}
        >
          <MenuItem disabled>
            <strong>Name:</strong>&nbsp;{firstName} {lastName}
          </MenuItem>
          <MenuItem disabled>
            <strong>Role:</strong>&nbsp;{role}
          </MenuItem>
          <MenuItem disabled>
            <strong>Email:</strong>&nbsp;{email}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

/* -------------------------------------------------------------------------- */
/* SIDEBAR                                                                    */
/* -------------------------------------------------------------------------- */

function Sidebar({ activeItem, setActiveItem, sidebarExpanded, roleFlags }) {
  const mainItems = [
    { name: "Dashboard", icon: <DashboardOutlinedIcon /> },
    { name: "Projects", icon: <FolderOpenOutlinedIcon /> },
    { name: "Property Data Entry", icon: <EditNoteOutlinedIcon /> },
    { name: "Invoices", icon: <ReceiptLongOutlinedIcon /> },
    { name: "Inventory", icon: <Inventory2OutlinedIcon /> },
    { name: "ManPower", icon: <EngineeringOutlinedIcon /> },
    { name: "Finance", icon: <AccountBalanceWalletOutlinedIcon /> },
    { name: "Calendar", icon: <CalendarMonthOutlinedIcon /> },
    { name: "Client", icon: <PeopleOutlinedIcon /> },
    // { name: "SuperSetDashBoard", icon: <BarChartOutlinedIcon /> },
    { name: "AI Chat", icon: <Search /> },

    // ✅ hidden from sidebar clicks, but used for main panel route
    // { name: "MasterItemDetails", icon: <Inventory2OutlinedIcon /> },
  ];

  const visibleItems = useMemo(() => {
    return mainItems.filter((it) => canAccessSidebarItem(it.name, roleFlags));
  }, [roleFlags]);

  const renderIconItem = (item) => {
    const active = activeItem === item.name;
    return (
      <Box
        key={item.name}
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: sidebarExpanded ? "flex-start" : "center",
          my: 1.2,
          position: "relative",
          px: sidebarExpanded ? 1.5 : 0,
        }}
      >
        {active && (
          <Box
            sx={{
              position: "absolute",
              left: sidebarExpanded ? 4 : 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 3,
              height: 26,
              borderRadius: "0 4px 4px 0",
              bgcolor: COLORS.primary,
            }}
          />
        )}

        <Tooltip title={item.name} placement="right">
          <IconButton
            onClick={() => setActiveItem(item.name)}
            size="medium"
            sx={{
              width: sidebarExpanded ? "100%" : 44,
              height: 44,
              borderRadius: 2,
              color: active ? COLORS.primary : "#9CA3AF",
              backgroundColor: active ? "#EEF2FF" : "transparent",
              boxShadow: active ? "0 8px 18px rgba(15,23,42,0.12)" : "none",
              transition: "all 0.25s ease",
              display: "flex",
              justifyContent: sidebarExpanded ? "flex-start" : "center",
              alignItems: "center",
              gap: sidebarExpanded ? 1.5 : 0,
              pl: sidebarExpanded ? 2.5 : 0,
              "&:hover": {
                backgroundColor: active ? "#E0E7FF" : "rgba(148,163,184,0.08)",
                transform: "translateX(2px)",
              },
            }}
          >
            {item.icon}
            {sidebarExpanded && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? COLORS.primary : "#4B5563",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </Box>
            )}
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", alignItems: "stretch", mr: 0.5, ml: -3, animation: `${sidebarSlideIn} 0.45s ease-out` }}>
      <Box
        sx={{
          width: sidebarExpanded ? 210 : 76,
          ml: 1.5,
          bgcolor: COLORS.sidebarBgLight,
          borderRadius: 3,
          boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
          display: "flex",
          flexDirection: "column",
          alignItems: sidebarExpanded ? "flex-start" : "center",
          pt: 3,
          pb: 3,
          transition: "width 0.3s ease",
          height: "calc(100vh - 72px - 24px)",
          overflow: "hidden",
        }}
      >
        {visibleItems.map((item) => renderIconItem(item))}
        <Box sx={{ flexGrow: 1 }} />
      </Box>
    </Box>
  );
}

export default function AppSearchbar() {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [aiPrompt, setAiPrompt] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [role, setRole] = useState(null);
  const [dashboardNavPayload, setDashboardNavPayload] = useState(null);
  const homeItemHydratedRef = useRef(false);
  const roleFlags = getAppRoleFlags();

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) setRole(storedRole);
  }, []);

  // Persist "current section" inside /home so refresh restores it.
  useEffect(() => {
    const saved = localStorage.getItem("home_active_item");
    const allowed = new Set([
      "Dashboard",
      "Projects",
      "Property Data Entry",
      "Invoices",
      "Inventory",
      "ManPower",
      "Finance",
      "Calendar",
      "Client",
      "SuperSetDashBoard",
      "AI Chat",
    ]);
    const savedOk = saved && allowed.has(saved) && canAccessSidebarItem(saved, roleFlags);
    if (savedOk) {
      setActiveItem(saved);
    } else {
      setActiveItem(firstAccessibleSidebarItem(roleFlags));
    }
    homeItemHydratedRef.current = true;
    // apply once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If role changes (or localStorage role tokens change), never allow a hidden section to stay selected.
  useEffect(() => {
    if (!canAccessSidebarItem(activeItem, roleFlags)) {
      setActiveItem(firstAccessibleSidebarItem(roleFlags));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFlags]);

  useEffect(() => {
    if (!homeItemHydratedRef.current) return;
    const persistable = new Set([
      "Dashboard",
      "Projects",
      "Property Data Entry",
      "Invoices",
      "Inventory",
      "ManPower",
      "Finance",
      "Calendar",
      "Client",
      "SuperSetDashBoard",
      "AI Chat",
    ]);
    if (persistable.has(activeItem) && canAccessSidebarItem(activeItem, roleFlags)) {
      localStorage.setItem("home_active_item", activeItem);
    }
  }, [activeItem]);

  // ✅ Notifications drawer state
  const [notifOpen, setNotifOpen] = useState(false);

  // ✅ NEW: selected item for details page
  const [selectedMasterItem, setSelectedMasterItem] = useState(null);

  const handleSendPrompt = useCallback((msg) => {
    setAiPrompt({
      id: `${Date.now()}_${Math.random()}`,
      text: msg,
    });
    if (canAccessSidebarItem("AI Chat", roleFlags)) setActiveItem("AI Chat");
  }, [roleFlags]);
  

  const handleOpenNotifications = useCallback(() => setNotifOpen(true), []);
  const handleCloseNotifications = useCallback(() => setNotifOpen(false), []);

  // ✅ When user clicks notification, show item details in main panel
  const handleOpenItemDetailsFromNotification = useCallback(
    (payload) => {
      // IMPORTANT: MasterItemDetailsDialog needs item.id for its internal API calls
      if (!payload?.id) {
        // If your alerts API doesn't send item id, you MUST add it in backend.
        console.warn("Notification missing item id. Add item_id/master_item_id in /alerts payload.", payload);
        alert("This notification doesn't include item id. Please include item_id in alerts API response.");
        return;
      }

      setSelectedMasterItem({
        id: payload.id,
        item_name: payload.item_name || "",
        item_type: payload.item_type || "",
        base_price: payload.base_price ?? null,
      });

      setNotifOpen(false);
      setActiveItem("MasterItemDetails"); // ✅ internal route
    },
    []
  );

  const handleCloseItemDetails = useCallback(() => {
    setSelectedMasterItem(null);
    // go back to inventory (or whatever you like)
    setActiveItem("Inventory");
  }, []);

  return (
    <Box sx={{ height: "100vh", bgcolor: "#E5E7EB", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppBarWithSearch
        sidebarExpanded={sidebarExpanded}
        setSidebarExpanded={setSidebarExpanded}
        onSendPrompt={handleSendPrompt}
        onOpenNotifications={handleOpenNotifications}
        unreadCount={0}
      />

      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          p: 3,
          backgroundColor: "#E5E7EB",
          alignItems: "flex-start",
          overflow: "hidden",
        }}
      >
        <Sidebar
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          sidebarExpanded={sidebarExpanded}
          roleFlags={roleFlags}
        />

        <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}>
          <Box
            sx={{
              width: "100%",
              bgcolor: COLORS.pageBg,
              borderRadius: 3,
              p: 3,
              boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
              height: "calc(100vh - 72px - 48px)",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {activeItem === "Dashboard" && canAccessSidebarItem("Dashboard", roleFlags) && (
              <DashBoardPage
                onNavigate={(page, payload) => {
                  // Dashboard KPI cards can request navigation into main panel pages.
                  // Payload supports deep-linking: tabs/filters/etc.
                  setDashboardNavPayload(payload ?? null);
                  if (page && canAccessSidebarItem(page, roleFlags)) setActiveItem(page);
                }}
              />
            )}
            {activeItem === "Projects" && canAccessSidebarItem("Projects", roleFlags) && (
              <ProjectsPage
                role={role}
                onOpenPropertyDataEntry={() => setActiveItem("Property Data Entry")}
              />
            )}
            {activeItem === "Property Data Entry" &&
              canAccessSidebarItem("Property Data Entry", roleFlags) && <PropertyDataEntryPage />}
            {activeItem === "Invoices" && canAccessSidebarItem("Invoices", roleFlags) && <Bills />}
            {activeItem === "Calendar" && canAccessSidebarItem("Calendar", roleFlags) && <CalenderView />}
            {activeItem === "Inventory" && canAccessSidebarItem("Inventory", roleFlags) && (
              <InventorySection
                initialTab={dashboardNavPayload?.inventoryTab}
                onInitialTabApplied={() => setDashboardNavPayload(null)}
              />
            )}
            {activeItem === "ManPower" && canAccessSidebarItem("ManPower", roleFlags) && (
              <ManPower
                initialTab={dashboardNavPayload?.manpowerTab}
                onInitialTabApplied={() => setDashboardNavPayload(null)}
              />
            )}
            {activeItem === "Finance" && canAccessSidebarItem("Finance", roleFlags) && <FinanceView />}
            {activeItem === "Client" && canAccessSidebarItem("Client", roleFlags) && <ClientView />}
            {activeItem === "SuperSetDashBoard" && <SupersetDashboard />}
            {activeItem === "AI Chat" && canAccessSidebarItem("AI Chat", roleFlags) && (
              <ChatBoxAi initialQuestion={aiPrompt} />
            )}

            {/* ✅ MAIN PANEL ITEM DETAILS PAGE */}
            {activeItem === "MasterItemDetails" && (
              <MasterItemDetailsDialog
                pageMode={true}
                open={true}
                item={selectedMasterItem}
                isMobile={false}
                onClose={handleCloseItemDetails}
                onUpdated={(updated) => {
                  // keep page updated if save occurs
                  setSelectedMasterItem(updated);
                }}
                onDeleted={() => {
                  handleCloseItemDetails();
                }}
              />
            )}
          </Box>
        </Box>

        {/* ✅ RIGHT SIDE NOTIFICATIONS DRAWER */}
        <Drawer
          anchor="right"
          open={notifOpen}
          onClose={handleCloseNotifications}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              bgcolor: "#FFFFFF",
              borderLeft: "1px solid #E5E7EB",
              width:"410px",

            },
          }}
        >
          <NotificationsPage
            title="Notifications"
            fetchInside={true}
            compact={true}
            onClose={handleCloseNotifications}
            onOpenItemDetails={handleOpenItemDetailsFromNotification} // ✅ NEW
          />
        </Drawer>
      </Box>
    </Box>
  );
}