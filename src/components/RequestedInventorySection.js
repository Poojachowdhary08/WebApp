// src/components/RequestedInventorySection.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TablePagination,
  IconButton,
  DialogTitle,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  Tooltip,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import axios from "axios";
import InventoryRequestDialog from "./InventoryRequestDialog";
// ✅ Excel deps
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

/* ---------------------------------- API base ---------------------------------- */
const API_BASE = "http://localhost:8080";

/* ---------------------------------- Theme / shared styles ---------------------------------- */
const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);

const formatDMY = (v) =>
  v
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v))
    : "N/A";

/**
 * ✅ GRID TABLE LOOK
 */
const GRID_BORDER = "1px solid #E5E7EB";
const HEADER_BG = "#F8FAFC";

const headCellLight = {
  color: "#111827",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: 0.2,
  textTransform: "none",
  backgroundColor: HEADER_BG,
  borderBottom: GRID_BORDER,
  borderRight: GRID_BORDER,
  py: 1,
  px: 1.4,
  height: 44,
  whiteSpace: "nowrap",
};

const bodyRowLight = {
  "&:hover": { backgroundColor: "#F9FAFB" },
  "& td": {
    py: 1.05,
    px: 1.4,
    fontSize: 13,
    borderBottom: GRID_BORDER,
    borderRight: GRID_BORDER,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 260,
    color: "#0F172A",
    verticalAlign: "middle",
    backgroundColor: "#fff",
  },
};

const sectionPaper = {
  p: 2,
  backgroundColor: "#fff",
  borderRadius: 2,
  border: "1px solid #eef2f7",
  marginTop: "-10px",
};

const controlSx = {
  height: 38,
  borderRadius: 2,
  bgcolor: "#fff",
};

const statusChipStyle = (status) => {
  const normalizedStatus = String(status || "").toLowerCase().trim();
  const map = {
    requested: { bg: "#FFF3E0", fg: "#E67E22", bd: "#F0B27A", label: "Requested" },
    closed: { bg: "#E8EAF6", fg: "#283593", bd: "#9FA8DA", label: "Cancel" },
    blocked: { bg: "#E8EAF6", fg: "#283593", bd: "#9FA8DA", label: "Cancel" },
    cancel: { bg: "#E8EAF6", fg: "#283593", bd: "#9FA8DA", label: "Cancel" },
    raised: { bg: "#F3E5F5", fg: "#6A1B9A", bd: "#CE93D8", label: "Raised" },
    issued: { bg: "#E8F5E9", fg: "#2E7D32", bd: "#A5D6A7", label: "Issued" },
    rejected: { bg: "#FFEBEE", fg: "#C62828", bd: "#EF9A9A", label: "Rejected" },
    partially_issued: { bg: "#FFFDE7", fg: "#8D6E00", bd: "#FFF59D", label: "Partial" },
    partial: { bg: "#FFFDE7", fg: "#8D6E00", bd: "#FFF59D", label: "Partial" },
  };

  let s = map[normalizedStatus];
  if (!s) {
    if (normalizedStatus.includes("partial")) s = map.partial;
    else if (
      normalizedStatus.includes("cancel") ||
      normalizedStatus.includes("blocked") ||
      normalizedStatus.includes("closed")
    )
      s = map.closed;
  }
  if (!s) s = { bg: "#ECEFF1", fg: "#37474F", bd: "#CFD8DC", label: String(status || "Unknown") };

  return {
    sx: {
      bgcolor: s.bg,
      color: s.fg,
      border: `1px solid ${s.bd}`,
      fontWeight: 900,
      height: 24,
      borderRadius: 999,
      "& .MuiChip-label": { px: 1 },
    },
    label: s.label,
  };
};

/* =================================================================================
   STATUS CARDS ROW
================================================================================= */
const StatusCardsRow = ({ statusFilter, setStatusFilter, setPage, statusStatsData }) => {
  const cards = useMemo(
    () => [
      { key: "requested", label: "REQUESTED", accent: "#C8612D", bg: "#FFF4EC", bd: "#F2C8B1" },
      { key: "closed", label: "CANCEL", accent: "#1D4ED8", bg: "#EEF2FF", bd: "#C7D2FE" },
      { key: "raised", label: "RAISED", accent: "#6D28D9", bg: "#F3E8FF", bd: "#E9D5FF" },
      { key: "issued", label: "ISSUED", accent: "#2E7D32", bg: "#EAF7EE", bd: "#BFE7C8" },
      { key: "rejected", label: "REJECTED", accent: "#B91C1C", bg: "#FEECEC", bd: "#FECACA" },
      { key: "partially_issued", label: "PARTIAL", accent: "#8A5A2B", bg: "#FFF7E6", bd: "#FFE7B3" },
      { key: "", label: "TOTAL", accent: "#111827", bg: "#EEF2FF", bd: "#D1D5FF" },
    ],
    []
  );

  const getCount = (k) => {
    if (k === "") return Number(statusStatsData.total || 0);
    if (k === "closed") return Number(statusStatsData.closed || 0);
    if (k === "partially_issued") return Number(statusStatsData.partially_issued || 0);
    return Number(statusStatsData[k] || 0);
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        maxWidth: "54%",
        overflowX: "auto",
        flexWrap: "nowrap",
        pb: 0.25,
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": { background: "#E5E7EB", borderRadius: 999 },
      }}
    >
      {cards.map((c) => {
        const selected = String(statusFilter) === String(c.key);
        return (
          <Box
            key={c.label}
            onClick={() => {
              setPage(0);
              setStatusFilter(c.key);
            }}
            sx={{
              cursor: "pointer",
              userSelect: "none",
              flex: "0 0 auto",
              minWidth: 70,
              height: 34,
              borderRadius: 2,
              px: 1.25,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 0.4,
              backgroundColor: c.bg,
              border: `1.5px solid ${selected ? c.accent : c.bd}`,
              transition: "all 120ms ease",
              boxShadow: selected ? "0 6px 14px rgba(0,0,0,0.10)" : "none",
              "&:hover": {
                borderColor: c.accent,
                boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
              },
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.7,
                color: c.accent,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </Typography>

            <Typography sx={{ fontWeight: 900, fontSize: 15, color: "#111827", ml: 0.5 }}>
              {getCount(c.key)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};

/* =================================================================================
   MAIN SECTION
================================================================================= */
const RequestedInventorySection = ({ statusTab }) => {
  const [rows, setRows] = useState([]);
  const [optionsRows, setOptionsRows] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // ✅ Keep your existing "details" routing intact
  const [viewMode, setViewMode] = useState("list"); // "list" | "details"

  // ✅ NEW: UI view toggle for list/cards (does NOT affect details view)
  const [viewModeUI, setViewModeUI] = useState("list"); // "list" | "cards"

  const [loading, setLoading] = useState(true);

  // ✅ Filters (map 1:1 to API params)
  const [searchQuery, setSearchQuery] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("ALL");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [itemFilter, setItemFilter] = useState("");

  // ✅ Date filter (applied)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Date dialog (draft values)
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  // ✅ SERVER pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(200);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ Status filter (API param &status=)
  const [statusFilter, setStatusFilter] = useState(statusTab === "stock" ? "raised" : "requested");

  // ✅ Sorting
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const [statusStatsData, setStatusStatsData] = useState({
    requested: 0,
    closed: 0,
    raised: 0,
    issued: 0,
    rejected: 0,
    partially_issued: 0,
    total: 0,
  });

  const inputRef = useRef(null);

  useEffect(() => {
    setViewMode("list");
    setSelectedRequest(null);
    setStatusFilter(statusTab === "stock" ? "raised" : "requested");

    setSearchQuery("");
    setEngineerFilter("ALL");
    setPropertyFilter("ALL");
    setItemFilter("");

    setDateFrom("");
    setDateTo("");
    setDraftFrom("");
    setDraftTo("");

    setSortKey("");
    setSortDir("asc");

    setPage(0);

    // ✅ keep UI view stable or reset, your choice:
    setViewModeUI("list");
  }, [statusTab]);

  const refreshSelectedRequest = async () => {
    if (!selectedRequest) return;
    try {
      const res = await axios.get(`${API_BASE}/request/${selectedRequest.request_id}`);
      const updated = res.data?.requests?.find((r) => r.request_id === selectedRequest.request_id);
      if (updated) setSelectedRequest({ ...updated });
    } catch (err) {
      console.error("Failed to refresh selected request:", err);
    }
  };

  const buildParams = useCallback(
    ({ includePagination = true, includeStatus = true } = {}) => {
      const params = {};

      if (includeStatus && statusFilter) params.status = String(statusFilter).toLowerCase();
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (engineerFilter !== "ALL") params.engineer = engineerFilter;
      if (propertyFilter !== "ALL") params.property = propertyFilter;
      if (itemFilter.trim()) params.item = itemFilter.trim();

      if (dateFrom) params.deli_date_from = dateFrom;
      if (dateTo) params.deli_date_to = dateTo;

      if (includePagination) {
        params.limit = rowsPerPage;
        params.offset = page * rowsPerPage;
      }

      if (sortKey) {
        params.sort_by = sortKey;
        params.sort_dir = sortDir;
      }

      return params;
    },
    [statusFilter, searchQuery, engineerFilter, propertyFilter, itemFilter, dateFrom, dateTo, rowsPerPage, page, sortKey, sortDir]
  );

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);

      const params = buildParams({ includePagination: true, includeStatus: true });
      const res = await axios.get(`${API_BASE}/all-requests`, { params });

      const data = res.data || {};
      const list = Array.isArray(data.requests) ? data.requests : [];

      setRows(list);
      setTotalCount(typeof data.total === "number" ? data.total : list.length);
    } catch (e) {
      console.error("Error fetching requests:", e);
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const fetchOptions = useCallback(async () => {
    try {
      const params = buildParams({ includePagination: false, includeStatus: false });
      params.limit = 500;
      params.offset = 0;

      const res = await axios.get(`${API_BASE}/all-requests`, { params });
      const data = res.data || {};
      setOptionsRows(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {
      console.error("Error fetching option rows:", e);
      setOptionsRows([]);
    }
  }, [buildParams]);

  const fetchStatusStats = useCallback(async () => {
    const computeFromList = (list) => {
      const counts = {
        requested: 0,
        closed: 0,
        raised: 0,
        issued: 0,
        rejected: 0,
        partially_issued: 0,
        total: 0,
      };

      (list || []).forEach((r) => {
        const s = String(r.status || "").toLowerCase().trim();
        if (!s) return;

        if (s === "requested") counts.requested += 1;
        else if (s === "raised") counts.raised += 1;
        else if (s === "issued") counts.issued += 1;
        else if (s === "rejected") counts.rejected += 1;
        else if (s === "partially_issued" || s.includes("partial")) counts.partially_issued += 1;
        else if (s === "closed" || s === "blocked" || s.includes("cancel")) counts.closed += 1;
      });

      counts.total =
        counts.requested +
        counts.closed +
        counts.raised +
        counts.issued +
        counts.rejected +
        counts.partially_issued;

      return counts;
    };

    const normalizeServerStats = (data) => {
      let stats = {};
      if (Array.isArray(data)) {
        data.forEach((item) => {
          const k = String(item?.status || "").toLowerCase().trim();
          const v = Number(item?.count) || 0;
          if (k) stats[k] = v;
        });
      } else if (data?.stats && typeof data.stats === "object") stats = data.stats;
      else if (data?.counts && typeof data.counts === "object") stats = data.counts;
      else if (data && typeof data === "object") stats = data;

      const getValue = (obj, ...keys) => {
        for (const k of keys) {
          if (obj?.[k] !== undefined && obj?.[k] !== null) return Number(obj[k]) || 0;
        }
        return 0;
      };

      const normalized = {
        requested: getValue(stats, "requested", "REQUESTED"),
        closed: getValue(stats, "closed", "blocked", "cancel", "CLOSED", "BLOCKED", "CANCEL"),
        raised: getValue(stats, "raised", "RAISED"),
        issued: getValue(stats, "issued", "ISSUED"),
        rejected: getValue(stats, "rejected", "REJECTED"),
        partially_issued: getValue(stats, "partially_issued", "partial", "PARTIALLY_ISSUED", "PARTIAL"),
        total: getValue(stats, "total", "TOTAL"),
      };

      if (!normalized.total) {
        normalized.total =
          normalized.requested +
          normalized.closed +
          normalized.raised +
          normalized.issued +
          normalized.rejected +
          normalized.partially_issued;
      }

      return normalized;
    };

    try {
      const params = buildParams({ includePagination: false, includeStatus: false });
      const response = await axios.get(`${API_BASE}/all-requests/stats`, { params });

      const normalized = normalizeServerStats(response.data);

      const looksEmpty =
        !normalized.total &&
        !normalized.requested &&
        !normalized.closed &&
        !normalized.raised &&
        !normalized.issued &&
        !normalized.rejected &&
        !normalized.partially_issued;

      if (!looksEmpty) {
        setStatusStatsData(normalized);
        return;
      }

      const fallbackParams = buildParams({ includePagination: false, includeStatus: false });
      fallbackParams.limit = 10000;
      fallbackParams.offset = 0;

      const res2 = await axios.get(`${API_BASE}/all-requests`, { params: fallbackParams });
      const list2 = Array.isArray(res2.data?.requests) ? res2.data.requests : [];
      setStatusStatsData(computeFromList(list2));
    } catch (e) {
      console.error("Error fetching status stats (server). Falling back to client counts:", e);

      try {
        const fallbackParams = buildParams({ includePagination: false, includeStatus: false });
        fallbackParams.limit = 10000;
        fallbackParams.offset = 0;

        const res2 = await axios.get(`${API_BASE}/all-requests`, { params: fallbackParams });
        const list2 = Array.isArray(res2.data?.requests) ? res2.data.requests : [];
        setStatusStatsData(computeFromList(list2));
      } catch (e2) {
        console.error("Fallback stats computation also failed:", e2);
        setStatusStatsData({
          requested: 0,
          closed: 0,
          raised: 0,
          issued: 0,
          rejected: 0,
          partially_issued: 0,
          total: 0,
        });
      }
    }
  }, [buildParams]);
  // ===================== ✅ DOWNLOAD EXCEL (WHOLE TABLE, FILTER/TAB WISE) =====================
  const [exporting, setExporting] = useState(false);

  const downloadExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      // ✅ fetch ALL rows that match current filters (same as UI)
      const PAGE_SIZE = 500; // if backend caps, reduce to 100/200
      let pageNo = 0;
      let all = [];
      let total = null;

      const readErrorBody = async (resp) => {
        try {
          const txt = await resp.text();
          return txt?.slice(0, 2000) || "";
        } catch {
          return "";
        }
      };

      while (true) {
        const params = buildParams({ includePagination: false, includeStatus: true });

        // override with paging for export
        params.limit = PAGE_SIZE;
        params.offset = pageNo * PAGE_SIZE;

        const url = `${API_BASE}/all-requests`;

        const resp = await fetch(`${url}?${new URLSearchParams(params).toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ safe; helps if cookies/auth are used
        });

        if (!resp.ok) {
          const body = await readErrorBody(resp);
          console.error("Export fetch failed:", {
            url,
            status: resp.status,
            statusText: resp.statusText,
            params,
            body,
          });

          throw new Error(
            `Export failed (HTTP ${resp.status}). ${
              body ? `Server says: ${body}` : "Check console for details."
            }`
          );
        }

        const data = await resp.json();
        const chunk = Array.isArray(data?.requests) ? data.requests : [];

        if (total == null && typeof data?.total === "number") total = data.total;

        all = all.concat(chunk);

        // stop conditions
        if (chunk.length < PAGE_SIZE) break;
        if (total != null && all.length >= total) break;

        pageNo += 1;

        // safety stop
        if (pageNo > 5000) break;
      }

      // ✅ Convert to Excel rows
      const rowsForExcel = (all || []).map((r) => {
        const engineerTitle =
          r.engineer_name && r.engineer_id
            ? `${r.engineer_name} (${r.engineer_id})`
            : safe(r.engineer_name || r.engineer_id, "");

        const propertyTitle = r.canonical_property_name
          ? `${r.canonical_property_name} (${r.property_name})`
          : safe(r.property_name, "");

        const projectTitle = safe(r.canonical_project_name || r.project_name, "");

        return {
          "Request ID": safe(r.request_id, ""),
          "Item Name": safe(r.item_name, ""),
          "Engineer": engineerTitle || "—",
          "Project": projectTitle || "—",
          "Property": propertyTitle || "—",
          "Requested Qty": r.total_requested ?? 0,
          Status: safe(r.status, ""),
          Warehouse: safe(r.warehouse, ""),
          "Expected Date": r.deli_date ? formatDMY(r.deli_date) : "N/A",
          "Created At": r.created_at ? formatDMY(r.created_at) : "",
          Remarks: safe(r.initial_remark, ""),
        };
      });

      // ✅ workbook
      const ws = XLSX.utils.json_to_sheet(rowsForExcel);

      ws["!cols"] = [
        { wch: 22 }, // Request ID
        { wch: 28 }, // Item
        { wch: 24 }, // Engineer
        { wch: 24 }, // Project
        { wch: 28 }, // Property
        { wch: 14 }, // Qty
        { wch: 14 }, // Status
        { wch: 14 }, // Warehouse
        { wch: 16 }, // Expected
        { wch: 16 }, // Created
        { wch: 28 }, // Remarks
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Requests");

      const statusName = String(statusFilter || "all").toUpperCase();
      const stamp = new Date().toISOString().slice(0, 10);

      const fileName = `Inventory_Requests_${statusName}_${stamp}.xlsx`;

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, fileName);
    } catch (e) {
      console.error("Excel download failed:", e);
      alert(e?.message || "Failed to export Excel. Check console.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    fetchOptions();
    fetchStatusStats();
  }, [fetchOptions, fetchStatusStats]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, searchQuery, engineerFilter, propertyFilter, itemFilter, dateFrom, dateTo, rowsPerPage, sortKey, sortDir]);

  const engineerOptions = useMemo(() => {
    const map = new Map();
    (optionsRows || []).forEach((r) => {
      const name = String(r.engineer_name || "").trim();
      if (!name) return;
      const id = String(r.engineer_id || "").trim();
      const label = id ? `${name} (${id})` : name;
      map.set(name.toLowerCase(), { value: name, label });
    });
    const arr = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "ALL", label: "All Engineers" }, ...arr];
  }, [optionsRows]);

  const propertyOptions = useMemo(() => {
    const map = new Map();
    (optionsRows || []).forEach((r) => {
      const propId = String(r.property_name || "").trim();
      if (!propId) return;
      const nice = String(r.canonical_property_name || "").trim();
      const label = nice ? `${nice} (${propId})` : propId;
      map.set(propId.toLowerCase(), { value: propId, label });
    });
    const arr = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "ALL", label: "All Properties" }, ...arr];
  }, [optionsRows]);

  const openDetails = (request) => {
    setSelectedRequest(request);
    setViewMode("details");
  };

  const closeDetails = () => {
    setViewMode("list");
    setSelectedRequest(null);
  };

  const clearAllFilters = () => {
    setStatusFilter(statusTab === "stock" ? "raised" : "requested");
    setSearchQuery("");
    setEngineerFilter("ALL");
    setPropertyFilter("ALL");
    setItemFilter("");
    setDateFrom("");
    setDateTo("");
    setDraftFrom("");
    setDraftTo("");
    setSortKey("");
    setSortDir("asc");
    setPage(0);
  };

  const openDateDialog = () => {
    setDraftFrom(dateFrom || "");
    setDraftTo(dateTo || "");
    setDateDialogOpen(true);
  };

  const applyDateFilter = () => {
    setDateFrom(draftFrom);
    setDateTo(draftTo);
    setPage(0);
    setDateDialogOpen(false);
  };

  const clearDateFilter = () => {
    setDraftFrom("");
    setDraftTo("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
    setDateDialogOpen(false);
  };

  const sortedPageRows = useMemo(() => {
    if (!sortKey) return rows;

    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...(rows || [])];

    const getVal = (r) => {
      switch (sortKey) {
        case "total_requested":
          return Number(r.total_requested || 0);
        case "deli_date":
          return new Date(r.deli_date || 0).getTime() || 0;
        default:
          return String(r?.[sortKey] ?? "").toLowerCase();
      }
    };

    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === "number" && typeof bv === "number") return dir * (av - bv);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  };

  const SortHint = ({ col }) => {
    if (sortKey !== col) return null;
    return (
      <span style={{ marginLeft: 6, fontWeight: 900, fontSize: 11, color: "#64748B" }}>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // ✅ View toggle UI (list/cards)
  const renderViewToggle = () => (
    <Tooltip title={viewModeUI === "list" ? "List view" : "Card view"}>
      <ToggleButtonGroup
        exclusive
        value={viewModeUI}
        onChange={(_e, next) => {
          if (!next) return;
          setViewModeUI(next);
        }}
        size="small"
        sx={{
          bgcolor: "#fff",
          borderRadius: 2,
          border: "1px solid #E5E7EB",
          "& .MuiToggleButton-root": {
            border: "none",
            px: 1.2,
            py: 0.7,
            borderRadius: 2,
          },
        }}
      >
        <ToggleButton value="list">
          <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
        <ToggleButton value="cards">
          <GridViewRoundedIcon sx={{ fontSize: 18 }} />
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );

  const renderCards = () => (
    <Box>
      <Grid container spacing={2}>
        {sortedPageRows.length > 0 ? (
          sortedPageRows.map((req) => {
            const chip = statusChipStyle(req.status);
            const engineerTitle =
              req.engineer_name && req.engineer_id ? `${req.engineer_name} (${req.engineer_id})` : safe(req.engineer_name || req.engineer_id);
            const projectTitle = req.canonical_project_name || req.project_name || "";
            const propertyTitle = req.canonical_property_name ? `${req.canonical_property_name} (${req.property_name})` : req.property_name || "";

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={req.request_id}>
                <Paper
                  elevation={0}
                  onClick={() => openDetails(req)}
                  sx={{
                    cursor: "pointer",
                    borderRadius: 3,
                    bgcolor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                    overflow: "hidden",
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0px 14px 36px rgba(15,23,42,0.10)",
                    },
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                          {safe(req.request_id)}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.3,
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#111827",
                            textTransform: "capitalize",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={safe(req.item_name, "")}
                        >
                          {safe(req.item_name, "Unknown Item")}
                        </Typography>
                      </Box>

                      <Chip size="small" label={chip.label} sx={chip.sx} />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Engineer</Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 170,
                          }}
                          title={engineerTitle}
                        >
                          {safe(req.engineer_name || req.engineer_id, "—")}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Project</Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 170,
                          }}
                          title={projectTitle}
                        >
                          {safe(req.canonical_project_name || req.project_name, "—")}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Property</Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 170,
                          }}
                          title={propertyTitle}
                        >
                          {safe(req.canonical_property_name || req.property_name, "—")}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Qty</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                          {safe(req.total_requested, 0)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Expected</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>
                          {req.deli_date ? formatDMY(req.deli_date) : "N/A"}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditOutlinedIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetails(req);
                      }}
                      sx={{
                        mt: 1.5,
                        width: "100%",
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 900,
                      }}
                    >
                      Open / Edit
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                color: "#6B7280",
                bgcolor: "#FFFFFF",
                borderRadius: 3,
                border: "1px solid #E5E7EB",
              }}
            >
              <Typography variant="body2">No requests found.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* ✅ pagination still visible in cards mode */}
      <TablePagination
        rowsPerPageOptions={[50, 100, 200, 500]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ "& .MuiTablePagination-toolbar": { minHeight: 44 } }}
      />
    </Box>
  );

  if (viewMode === "details") {
    return (
      <Paper elevation={0} sx={sectionPaper}>
        <InventoryRequestDialog
          isInlineView
          selectedRequest={selectedRequest}
          refreshRequests={fetchRows}
          refreshSelectedRequest={refreshSelectedRequest}
          handleClose={closeDetails}
        />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={sectionPaper}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5} sx={{ mb: 1 }}>
        <StatusCardsRow
          statusFilter={statusFilter}
          setStatusFilter={(k) => {
            setStatusFilter(k);
            setPage(0);
          }}
          setPage={setPage}
          statusStatsData={statusStatsData}
        />

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: 1, minWidth: 520 }}>
          <TextField
            inputRef={inputRef}
            variant="outlined"
            size="small"
            placeholder="Search (REQ_202512 / text)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 220, "& .MuiOutlinedInput-root": { ...controlSx } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#556070" }} />
                </InputAdornment>
              ),
            }}
          />

          <Select
            value={engineerFilter || "ALL"}
            onChange={(e) => setEngineerFilter(e.target.value)}
            size="small"
            sx={{ width: 150, ...controlSx }}
          >
            {engineerOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={propertyFilter || "ALL"}
            onChange={(e) => setPropertyFilter(e.target.value)}
            size="small"
            sx={{ width: 160, ...controlSx }}
          >
            {propertyOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          {/* ✅ list/cards toggle */}
          {renderViewToggle()}

          <Tooltip title="Date filter">
            <IconButton
              onClick={openDateDialog}
              size="small"
              sx={{
                ...controlSx,
                width: 38,
                minWidth: 38,
                p: 0,
                border: "1px solid #E5E7EB",
                color: "#111827",
                "&:hover": { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            disabled={exporting}
            onClick={downloadExcel}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              borderRadius: 2,
              height: 38,
              borderColor: "#E5E7EB",
              color: "#111827",
              bgcolor: "#fff",
              "&:hover": { bgcolor: "#F9FAFB", borderColor: "#D1D5DB" },
              whiteSpace: "nowrap",
            }}
          >
              ⬇️ 
              </Button>

          <Tooltip title="Reset filters">
            <IconButton
              onClick={clearAllFilters}
              size="small"
              sx={{
                ...controlSx,
                width: 38,
                minWidth: 38,
                p: 0,
                border: "1px solid #E5E7EB",
                color: "#111827",
                "&:hover": { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
              }}
            >
              <FilterAltOffIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading requests...
          </Typography>
        </Box>
      ) : (
        <>
          {/* ✅ CARDS MODE */}
          {viewModeUI === "cards" ? (
            renderCards()
          ) : (
            <>
              {/* ✅ LIST MODE (YOUR EXISTING TABLE) */}
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 2,
                  overflow: "auto",
                  border: GRID_BORDER,
                  boxShadow: "none",
                  maxHeight: "70vh",
                  backgroundColor: "#fff",
                }}
              >
                <Table
                  size="small"
                  stickyHeader
                  sx={{
                    minWidth: 1350,
                    tableLayout: "fixed",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    "& th:last-child, & td:last-child": { borderRight: "none" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...headCellLight, width: 160, cursor: "pointer" }} onClick={() => toggleSort("request_id")}>
                        ID <SortHint col="request_id" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 260, cursor: "pointer" }} onClick={() => toggleSort("item_name")}>
                        Item <SortHint col="item_name" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 230, cursor: "pointer" }} onClick={() => toggleSort("engineer_name")}>
                        Engineer <SortHint col="engineer_name" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 220, cursor: "pointer" }} onClick={() => toggleSort("project_name")}>
                        Project <SortHint col="project_name" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 200, cursor: "pointer" }} onClick={() => toggleSort("property_name")}>
                        Property <SortHint col="property_name" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 90, textAlign: "center", cursor: "pointer" }} onClick={() => toggleSort("total_requested")}>
                        Qty <SortHint col="total_requested" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 140, cursor: "pointer" }} onClick={() => toggleSort("deli_date")}>
                        Expected <SortHint col="deli_date" />
                      </TableCell>

                      <TableCell sx={{ ...headCellLight, width: 120, cursor: "pointer" }} onClick={() => toggleSort("status")}>
                        Status <SortHint col="status" />
                      </TableCell>

                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {sortedPageRows.length > 0 ? (
                      sortedPageRows.map((req) => {
                        const chip = statusChipStyle(req.status);
                        const engineerTitle =
                          req.engineer_name && req.engineer_id ? `${req.engineer_name} (${req.engineer_id})` : safe(req.engineer_name || req.engineer_id);
                        const projectTitle = req.canonical_project_name || req.project_name || "";
                        const propertyTitle = req.canonical_property_name ? `${req.canonical_property_name} (${req.property_name})` : req.property_name || "";

                        return (
                          <TableRow key={req.request_id} hover sx={bodyRowLight} onClick={() => openDetails(req)}>
                            <TableCell title={req.request_id}>{req.request_id}</TableCell>
                            <TableCell title={req.item_name || ""}>{safe(req.item_name)}</TableCell>
                            <TableCell title={engineerTitle}>{safe(req.engineer_name || req.engineer_id)}</TableCell>
                            <TableCell title={projectTitle}>{safe(req.canonical_project_name || req.project_name)}</TableCell>
                            <TableCell title={propertyTitle}>{safe(req.canonical_property_name || req.property_name)}</TableCell>
                            <TableCell sx={{ textAlign: "center" }}>{safe(req.total_requested, 0)}</TableCell>

                            <TableCell>
                              {req.deli_date ? (
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatDMY(req.deli_date)}</Typography>
                              ) : (
                                <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 700 }}>N/A</Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Chip size="small" label={chip.label} sx={chip.sx} />
                            </TableCell>

                    
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          No requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[50, 100, 200, 500]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                sx={{ "& .MuiTablePagination-toolbar": { minHeight: 44 } }}
              />
            </>
          )}
        </>
      )}

      {/* Date Filter Dialog */}
      <Dialog open={dateDialogOpen} onClose={() => setDateDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle
          sx={{
            position: "relative",
            fontWeight: 900,
            p: 1.5,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              color: "#111827",
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Date Filter
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="text"
              onClick={() => setDateDialogOpen(false)}
              sx={{
                borderRadius: 2,
                border: "1px solid #FCA5A5",
                color: "#DC2626",
                backgroundColor: "rgba(220,38,38,0.06)",
                fontWeight: 900,
                px: 2,
                "&:hover": {
                  backgroundColor: "rgba(220,38,38,0.10)",
                  borderColor: "#EF4444",
                },
              }}
            >
              X&nbsp;Close
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={clearDateFilter}
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
            size="small"
          >
            Clear
          </Button>
          <Button
            onClick={applyDateFilter}
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2 }}
            size="small"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RequestedInventorySection;