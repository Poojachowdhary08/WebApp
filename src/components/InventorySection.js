// src/components/InventoryTabs.js
// ✅ Added view toggle (list/cards) ONLY for STOCK tab (InventoryList)
// ✅ No existing functionality removed.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";

import ManageInventory from "./ManageInventory";
import MasterItemsTable from "./MasterItems";
import MasterItemDetailsDialog from "./MasterItemDetailsDialog";
import MasterItemEditPage from "./MasterItemEditPage";
import EstimateList from "./estimateList";
import Estimate from "./Estimate";
import IssueLogs from "./IssueLogs";
import RequestedInventorySection from "./RequestedInventorySection";
import InventoryList from "./InventoryList";
import LowStockView from "./LowStockView";

const COLORS = {
  textPrimary: "#111827",
  textSecondary: "#6B7280",
};

const INVENTORY_STATE_KEY = "inventory_section_state";

const InventorySection = ({ initialTab, onInitialTabApplied }) => {
  const [selectedTab, setSelectedTab] = useState("inventory_requests");

  useEffect(() => {
    if (!initialTab) return;
    setSelectedTab(initialTab);
    onInitialTabApplied?.();
    // apply only once (parent clears payload after this)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  // ✅ Stock list/cards view
  const [stockViewMode, setStockViewMode] = useState("list"); // "list" | "cards"

  // Restore persisted inventory state (tab + stock view)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INVENTORY_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const allowedTabs = new Set([
        "inventory_requests",
        "stock_requests",
        "manage_inventory",
        "stock",
        "lowStock",
        "master_items",
        "estimate_list",
      ]);
      const nextTab = parsed?.selectedTab;
      const nextView = parsed?.stockViewMode;

      if (nextTab && allowedTabs.has(nextTab)) setSelectedTab(nextTab);
      if (nextView === "list" || nextView === "cards") setStockViewMode(nextView);
    } catch (_e) {
      // ignore parse errors
    }
    // apply once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist inventory state
  useEffect(() => {
    try {
      localStorage.setItem(
        INVENTORY_STATE_KEY,
        JSON.stringify({
          selectedTab,
          stockViewMode,
        })
      );
    } catch (_e) {
      // ignore quota / serialization errors
    }
  }, [selectedTab, stockViewMode]);

  // ✅ Estimate child navigation
  const [estimateView, setEstimateView] = useState("list"); // "list" | "estimate"
  const [estimateMode, setEstimateMode] = useState("create"); // "create" | "edit"
  const [estimateData, setEstimateData] = useState(null);

  // ✅ Master Items child navigation
  const [masterView, setMasterView] = useState("list"); // "list" | "details" | "edit"
  const [selectedMasterItem, setSelectedMasterItem] = useState(null);
  const [masterRefreshKey, setMasterRefreshKey] = useState(0);

  const tabs = useMemo(
    () => [
      { key: "inventory_requests", label: "INVENTORY REQUESTS" },
      { key: "stock_requests", label: "STOCK REQUESTS" },
      { key: "manage_inventory", label: "MANAGE INVENTORY" },
      { key: "stock", label: "STOCK" },
      { key: "lowStock", label: "LOW STOCK" },
      { key: "master_items", label: "MASTER ITEMS" },
      { key: "estimate_list", label: "ESTIMATE LIST" },
    ],
    []
  );

  const childLabel =
    tabs
      .find((t) => t.key === selectedTab)
      ?.label?.toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "All";

  const headerSubtitle = (() => {
    if (selectedTab === "estimate_list") {
      if (estimateView === "estimate")
        return `Inventory / Estimate List / ${
          estimateMode === "edit" ? "Edit Estimate" : "Create Estimate"
        }`;
      return "Inventory / Estimate List";
    }

    if (selectedTab === "master_items") {
      if (masterView === "details") return "Inventory / Master Items / Item Details";
      return "Inventory / Master Items";
    }

    return `Inventory / ${childLabel}`;
  })();

  const handleTabClick = (tabKey) => {
    setSelectedTab(tabKey);

    // reset estimate child view when leaving
    if (tabKey !== "estimate_list") {
      setEstimateView("list");
      setEstimateMode("create");
      setEstimateData(null);
    }

    // reset master child view when leaving
    if (tabKey !== "master_items") {
      setMasterView("list");
      setSelectedMasterItem(null);
    }
  };

  // ✅ hide main tabs row when showing child screens
  const hideTabs =
    (selectedTab === "estimate_list" && estimateView === "estimate") ||
    (selectedTab === "master_items" && (masterView === "details" || masterView === "edit"));

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#F9FAFB",
        borderRadius: 2,
        p: 2,
      }}
    >
      {/* Breadcrumb */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: COLORS.textSecondary, fontSize: 16 }}
            >
              {headerSubtitle}
            </Typography>
          </Stack>
        </Box>
        <Box />
      </Stack>

      {/* Tabs row */}
      {!hideTabs && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid #E5E7EB",
            mb: 2,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-end" }}>
            <Box sx={{ width: 4, bgcolor: "#2563EB", height: 32, mr: 2 }} />

            <Stack direction="row" spacing={4}>
              {tabs.map((tab) => {
                const active = selectedTab === tab.key;
                return (
                  <Box
                    key={tab.key}
                    sx={{ cursor: "pointer", pb: 0.5 }}
                    onClick={() => handleTabClick(tab.key)}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        letterSpacing: 0.8,
                        color: active ? "#2563EB" : "#6B7280",
                      }}
                    >
                      {tab.label}
                    </Typography>

                    <Box
                      sx={{
                        mt: 0.5,
                        height: 2,
                        bgcolor: active ? "#2563EB" : "transparent",
                        borderRadius: 999,
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ pb: 0.5 }} />
        </Box>
      )}

      {/* Content */}
      <Box sx={{ p: 0 }}>
        {selectedTab === "inventory_requests" && (
          <RequestedInventorySection statusTab="inventory" />
        )}

        {selectedTab === "stock_requests" && (
          <RequestedInventorySection statusTab="stock" />
        )}

        {selectedTab === "manage_inventory" && <ManageInventory />}

        {/* ✅ STOCK: now supports list/cards (inside InventoryList) */}
        {selectedTab === "stock" && (
          <InventoryList viewMode={stockViewMode} onViewModeChange={setStockViewMode} />
        )}

        {selectedTab === "lowStock" && <LowStockView />}

        {/* ✅ Master items flow */}
        {selectedTab === "master_items" && (
          <>
            {masterView === "list" && (
              <MasterItemsTable
                refreshKey={masterRefreshKey}
                onOpenItemDetails={(row) => {
                  setSelectedMasterItem(row);
                  setMasterView("details");
                }}
              />
            )}

            {masterView === "details" && (
              <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 140px)" }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    p: 0,
                    bgcolor: "#fff",
                    boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                    overflow: "hidden",

                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100vh - 220px)",
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    <MasterItemDetailsDialog
                      open={true}
                      pageMode={true}
                      item={selectedMasterItem}
                      isMobile={false}
                      initialMode="view"
                      onRequestEdit={() => setMasterView("edit")}
                      onClose={() => {
                        setMasterView("list");
                        setSelectedMasterItem(null);
                      }}
                      onUpdated={(updated) => {
                        if (updated) setSelectedMasterItem(updated);
                        setMasterRefreshKey((k) => k + 1);
                      }}
                      onDeleted={() => {
                        setMasterRefreshKey((k) => k + 1);
                        setMasterView("list");
                        setSelectedMasterItem(null);
                      }}
                    />
                  </Box>
                </Paper>
              </Box>
            )}

            {masterView === "edit" && (
              <MasterItemEditPage
                item={selectedMasterItem}
                onBack={() => setMasterView("details")}
                onUpdated={() => setMasterRefreshKey((k) => k + 1)}
                onDeleted={() => {
                  setMasterRefreshKey((k) => k + 1);
                  setMasterView("list");
                  setSelectedMasterItem(null);
                }}
              />
            )}
          </>
        )}

        {/* ✅ Estimate flow */}
        {selectedTab === "estimate_list" && (
          <>
            {estimateView === "list" && (
              <EstimateList
                onOpenCreate={() => {
                  setEstimateMode("create");
                  setEstimateData(null);
                  setEstimateView("estimate");
                }}
                onOpenEdit={(fullEstimateObj) => {
                  setEstimateMode("edit");
                  setEstimateData(fullEstimateObj);
                  setEstimateView("estimate");
                }}
              />
            )}

            {estimateView === "estimate" && (
              <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 140px)" }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    p: 0,
                    bgcolor: "#fff",
                    boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                    overflow: "hidden",

                    display: "flex",
                    flexDirection: "column",
                    height: "calc(100vh - 220px)",
                  }}
                >
                  <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    <Estimate
                      mode={estimateMode}
                      initialData={estimateData}
                      onBack={() => {
                        setEstimateView("list");
                        setEstimateMode("create");
                        setEstimateData(null);
                      }}
                      onSaveSuccess={() => {
                        setEstimateView("list");
                        setEstimateMode("create");
                        setEstimateData(null);
                      }}
                    />
                  </Box>
                </Paper>
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default InventorySection;