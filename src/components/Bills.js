// src/pages/Bills.jsx
import React, { useState, useEffect } from "react";
import { Box, Stack, Typography } from "@mui/material";

import BillsList from "../components/BillsList";

const COLORS = {
  textSecondary: "#6B7280",
};

// ---------------- Permissions ----------------
// IMPORTANT: roles coming from API / localStorage are not reliably cased.
// Normalize to lowercase tokens so "ADMIN", "Admin", "admin" all behave the same.
const tabPermissionsByRoleToken = {
  admin: ["Review Invoice", "Manage Inventory", "Make Payments", "All Invoices"],
  stock_management_team: ["Manage Inventory"],
  finance_team: ["Make Payments"],
  backend_team: ["Review Invoice", "All Invoices"],
};

function normalizeRoleToken(role) {
  const t = String(role ?? "")
    .trim()
    .toLowerCase();
  if (!t) return "";
  // Treat any admin-like role as admin
  if (t === "admin" || t.includes("admin")) return "admin";
  // Common server role tokens (case-insensitive)
  if (t.includes("stock") && t.includes("team")) return "stock_management_team";
  if (t.includes("finance")) return "finance_team";
  if (t.includes("backend")) return "backend_team";
  return t;
}

export default function Bills() {
  const readRolesFromStorage = () => {
    const roles = new Set();
    const rawRole = localStorage.getItem("role");
    if (rawRole) {
      String(rawRole)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x) => {
          const tok = normalizeRoleToken(x);
          if (tok) roles.add(tok);
        });
    }
    try {
      const arr = JSON.parse(localStorage.getItem("roles") || "[]");
      if (Array.isArray(arr)) {
        arr.forEach((x) => {
          const tok = normalizeRoleToken(x);
          if (tok) roles.add(tok);
        });
      }
    } catch {
      // ignore
    }
    return Array.from(roles);
  };

  const computeTabsForRoles = (roleList) => {
    const availableTabs = new Set();
    (roleList || []).forEach((r) => {
      (tabPermissionsByRoleToken[normalizeRoleToken(r)] || []).forEach((t) => availableTabs.add(t));
    });
    return Array.from(availableTabs);
  };

  const initialRoles = readRolesFromStorage();
  const initialTabs = computeTabsForRoles(initialRoles);

  const [tabsToShow, setTabsToShow] = useState(() => initialTabs);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("bills_active_tab");
    if (saved && initialTabs.includes(saved)) return saved;
    // default by role (matches existing logic)
    if (initialRoles.includes("admin")) return "All Invoices";
    if (initialRoles.includes("stock_management_team")) return "Manage Inventory";
    if (initialRoles.includes("finance_team")) return "Make Payments";
    if (initialRoles.includes("backend_team")) return "Review Invoice";
    return initialTabs[0] || "";
  });
  const [roles, setRoles] = useState([]);

  // ✅ view mode (list/cards)
  const [viewMode, setViewMode] = useState("list"); // "list" | "cards"

  // ------------ fetch roles & allowed tabs ------------
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const email = localStorage.getItem("email");
        const response = await fetch(`http://localhost:8080/roles?email=${email}`);
        const data = await response.json();

        localStorage.setItem("roles", JSON.stringify(data.role));
        const normalized = (data.role || []).map(normalizeRoleToken).filter(Boolean);
        setRoles(normalized);

        const tabsArray = computeTabsForRoles(normalized);

        setTabsToShow(tabsArray);

        const defaultTab = normalized.includes("admin")
          ? "All Invoices"
          : normalized.includes("stock_management_team")
          ? "Manage Inventory"
          : normalized.includes("finance_team")
          ? "Make Payments"
          : "Review Invoice";

        const savedTab = localStorage.getItem("bills_active_tab");
        const nextTab =
          savedTab && tabsArray.includes(savedTab)
            ? savedTab
            : tabsArray.includes(defaultTab)
            ? defaultTab
            : tabsArray[0] || "";
        setActiveTab(nextTab);
      } catch (err) {
        console.error("Error fetching roles for bills:", err);
        // fallback – keep storage-derived tabs (don’t briefly show unauthorized tabs)
        const storedRoles = readRolesFromStorage();
        const tabsArray = computeTabsForRoles(storedRoles);
        setTabsToShow(tabsArray);
        const savedTab = localStorage.getItem("bills_active_tab");
        setActiveTab(savedTab && tabsArray.includes(savedTab) ? savedTab : tabsArray[0] || "");
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    if (activeTab) localStorage.setItem("bills_active_tab", activeTab);
  }, [activeTab]);

  // ---------- header text ----------
  const headerSubtitle = `Invoices / ${activeTab}`;

  return (
    <Box sx={{ p: 2 }}>
      {/* HEADER (breadcrumb only) */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="subtitle2"
              sx={{ fontSize: 16, color: COLORS.textSecondary }}
            >
              {headerSubtitle}
            </Typography>
          </Stack>
        </Box>

        <Box />
      </Stack>

      {/* BillsList handles: Tabs + Filters + Search + New Invoice + List/Cards */}
      <BillsList
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        tabsToShow={tabsToShow}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </Box>
  );
}
