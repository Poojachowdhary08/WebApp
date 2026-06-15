// FinanceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import axios from "axios";

import UnpaidWorkSummary from "./Work-Summary";
import PaymentWorkerTab from "./PaymentWorkerTab";

import InvoiceViewDialog from "./InvoiceViewDialog";
import PaySlipDialog from "./PaySlipDialog";

import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

const COLORS = {
  textSecondary: "#6B7280",
  blue: "#2563EB",
};

const filterSelectSx = {
  minWidth: 140,
  bgcolor: "#fff",
  borderRadius: 2,
  "& .MuiOutlinedInput-root": { borderRadius: 2 },
};

const viewToggleSx = {
  bgcolor: "#fff",
  borderRadius: 2,
  border: "1px solid #E5E7EB",
  "& .MuiToggleButton-root": {
    border: "none",
    px: 1.2,
    py: 0.7,
    borderRadius: 2,
  },
};

export default function FinanceView() {
  const [tab, setTab] = useState("payments");

  /* ---------------- PAYMENTS filters ---------------- */
  const [paySearch, setPaySearch] = useState("");
  const [status, setStatus] = useState("All");
  const [mode, setMode] = useState("All");
  const [type, setType] = useState("All");

  // ✅ Payments view mode (list/cards)
  const [payViewMode, setPayViewMode] = useState("list");

  /* ---------------- WORK SUMMARY filters ---------------- */
  const [wsSearch, setWsSearch] = useState("");
  const [wsStart, setWsStart] = useState("");
  const [wsEnd, setWsEnd] = useState("");
  const [wsPropertyId, setWsPropertyId] = useState("");
  const [wsDuration, setWsDuration] = useState("");
  const [wsTrigger, setWsTrigger] = useState(0);

  // ✅ Work summary view mode (list/cards)
  const [wsViewMode, setWsViewMode] = useState("list");

  const [propertyOptions, setPropertyOptions] = useState([]);

  const [activeVoucher, setActiveVoucher] = useState(null);
  const [activePaySlip, setActivePaySlip] = useState(null);

  const inDetailMode = Boolean(activeVoucher || activePaySlip);

  const tabs = [
    { key: "payments", label: "PAYMENTS" },
    { key: "work_summary", label: "WORK SUMMARY" },
  ];

  const headerSubtitle = useMemo(() => {
    if (activeVoucher) return "Finance / Payments";
    if (activePaySlip) return "Finance / Work Summary";
    if (tab === "payments") return "Finance / Payments";
    if (tab === "work_summary") return "Finance / Work Summary";
    return "Finance";
  }, [tab, activeVoucher, activePaySlip]);

  const handleTabClick = (tabKey) => {
    if (inDetailMode) return;

    setTab(tabKey);

    // reset both sets when switching tabs
    setPaySearch("");
    setStatus("All");
    setMode("All");
    setType("All");
    setPayViewMode("list");

    setWsSearch("");
    setWsStart("");
    setWsEnd("");
    setWsPropertyId("");
    setWsDuration("");
    setWsViewMode("list");
  };

  const fetchProperties = async () => {
    try {
      const res = await axios.get("http://localhost:8080/properties_m");
      const arr = Array.isArray(res.data) ? res.data : res.data?.properties || [];
      const opts = arr
        .map((p) => ({
          id: p.propertyid || p.property_id || p.id,
          name: p.propertyname || p.property_name || p.name || "",
        }))
        .filter((x) => x.id && x.name);
      setPropertyOptions(opts);
    } catch (e) {
      console.warn("⚠️ properties_m fetch failed:", e);
      setPropertyOptions([]);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const renderTabsRow = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #E5E7EB",
        mb: 2,
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      {/* LEFT: Tabs */}
      <Box sx={{ display: "flex", alignItems: "flex-end", minWidth: 320 }}>
        <Box sx={{ width: 4, bgcolor: COLORS.blue, height: 32, mr: 2 }} />

        <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <Box key={t.key} sx={{ cursor: "pointer", pb: 0.5 }} onClick={() => handleTabClick(t.key)}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: active ? 800 : 700,
                    letterSpacing: 0.8,
                    color: active ? COLORS.blue : COLORS.textSecondary,
                  }}
                >
                  {t.label}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 2,
                    bgcolor: active ? COLORS.blue : "transparent",
                    borderRadius: 999,
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* RIGHT: Controls */}
      {tab === "payments" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1.2,
            flex: 1,
            minWidth: 320,
            flexWrap: "wrap",
          }}
        >
          {/* ✅ Search + view toggle together */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: "100%", sm: "auto" } }}>
            <TextField
              value={paySearch}
              onChange={(e) => setPaySearch(e.target.value)}
              placeholder="Search Payments (ID / Worker / Mode)"
              size="small"
              sx={{
                width: { xs: "100%", sm: 320, md: 360 },
                bgcolor: "#fff",
                borderRadius: 999,
                "& .MuiOutlinedInput-root": { borderRadius: 999 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20, color: "#6B7280" }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={payViewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={payViewMode}
                onChange={(_e, next) => next && setPayViewMode(next)}
                size="small"
                sx={viewToggleSx}
              >
                <ToggleButton value="list">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          </Box>

          <FormControl size="small" sx={filterSelectSx}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Reviewed">Reviewed</MenuItem>
              <MenuItem value="Ready for Review">Ready for Review</MenuItem>
              <MenuItem value="Recheck">Recheck</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={filterSelectSx}>
            <InputLabel>Mode</InputLabel>
            <Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={filterSelectSx}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="contractor">contractor</MenuItem>
              <MenuItem value="labour">labour</MenuItem>
              <MenuItem value="employee">employee</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {tab === "work_summary" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1.2,
            flex: 1,
            minWidth: 320,
            flexWrap: "wrap",
          }}
        >
          {/* ✅ Search + view toggle together */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: "100%", sm: "auto" } }}>
            <TextField
              value={wsSearch}
              onChange={(e) => setWsSearch(e.target.value)}
              placeholder="Search (property / project / worker / id)"
              size="small"
              sx={{
                width: { xs: "80%", sm: 280, md: 340 },
                bgcolor: "#fff",
                borderRadius: 999,
                "& .MuiOutlinedInput-root": { borderRadius: 999 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20, color: "#6B7280" }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={wsViewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={wsViewMode}
                onChange={(_e, next) => next && setWsViewMode(next)}
                size="small"
                sx={viewToggleSx}
              >
                <ToggleButton value="list">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
                <ToggleButton value="cards">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
          </Box>

          <TextField
            label="Start"
            type="date"
            size="small"
            value={wsStart}
            onChange={(e) => setWsStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 145, bgcolor: "#fff", borderRadius: 2 }}
          />

          <TextField
            label="End"
            type="date"
            size="small"
            value={wsEnd}
            onChange={(e) => setWsEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 145, bgcolor: "#fff", borderRadius: 2 }}
          />

          <Autocomplete
            size="small"
            options={propertyOptions}
            getOptionLabel={(o) => o?.name || ""}
            value={propertyOptions.find((p) => p.id === wsPropertyId) || null}
            onChange={(_, v) => setWsPropertyId(v ? v.id : "")}
            sx={{ minWidth: 220, bgcolor: "#fff", borderRadius: 2 }}
            renderInput={(params) => <TextField {...params} label="Property" placeholder="Select..." />}
            isOptionEqualToValue={(o, v) => o.id === v?.id}
            noOptionsText="No properties found"
            clearOnEscape
          />

          <FormControl size="small" sx={{ ...filterSelectSx, minWidth: 160 }}>
            <InputLabel>Duration</InputLabel>
            <Select label="Duration" value={wsDuration} onChange={(e) => setWsDuration(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="daily">daily</MenuItem>
              <MenuItem value="hourly">hourly</MenuItem>
              <MenuItem value="per_sqft">per_sqft</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Search">
            <IconButton
              onClick={() => setWsTrigger((x) => x + 1)}
              sx={{
                bgcolor: "#2563EB",
                color: "#fff",
                borderRadius: 2,
                width: 42,
                height: 36,
                boxShadow: "0 8px 22px rgba(37, 99, 235, 0.20)",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              <SearchIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 2, bgcolor: "#ECEEF4", minHeight: "calc(100vh - 64px)" }}>
      {/* Breadcrumb */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: COLORS.textSecondary, fontSize: 16 }}>
          {headerSubtitle}
        </Typography>
      </Stack>

      {!inDetailMode && renderTabsRow()}

      {/* DETAIL MODE */}
      {activeVoucher && (
        <InvoiceViewDialog
          open={true}
          data={activeVoucher}
          onClose={() => setActiveVoucher(null)}
          onSuccess={() => setActiveVoucher(null)}
        />
      )}

      {activePaySlip && <PaySlipDialog workerData={activePaySlip} onBack={() => setActivePaySlip(null)} />}

      {/* NORMAL MODE */}
      {!inDetailMode && tab === "payments" && (
        <PaymentWorkerTab
          search={paySearch}
          status={status}
          mode={mode}
          type={type}
          viewMode={payViewMode}
          onOpenVoucher={(row) => setActiveVoucher(row)}
        />
      )}

      {!inDetailMode && tab === "work_summary" && (
        <UnpaidWorkSummary
          headerSearch={wsSearch}
          startDate={wsStart}
          endDate={wsEnd}
          propertyId={wsPropertyId}
          durationType={wsDuration}
          trigger={wsTrigger}
          viewMode={wsViewMode}
          onOpenPaySlip={(worker) => setActivePaySlip(worker)}
        />
      )}
    </Box>
  );
}
