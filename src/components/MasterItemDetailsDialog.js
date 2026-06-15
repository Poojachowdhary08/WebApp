// src/components/MasterItemDetailsDialog.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tabs,
  Tab,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";

import axios from "axios";
import ItemTypeDropDown from "./ItemTypeDropDown";
import BatchIssues from "./BatchIssues";
import { QRCodeCanvas } from "qrcode.react";
import MasterItemStockTransferDialog from "./MasterItemStockTransferDialog";
import { buildInventoryQrValue } from "../utils/inventoryQr";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Legend);

/* ---------- Helpers ---------- */
const asINR = (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "-");
const asINR2 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
const asINRNum = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const ddmmyyyy = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Back-compat helper name used by some UI sections
const formatDDMMYYYY = ddmmyyyy;

const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeText = (s) => String(s || "").trim().replace(/\s+/g, " ");

function ReadOnlyField({ label, value }) {
  return (
    <Box
      sx={{
        border: "1px solid #E5E7EB",
        borderRadius: 2,
        bgcolor: "#F9FAFB",
        px: 1.5,
        py: 1.25,
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, color: "#111827", fontWeight: 900, wordBreak: "break-word" }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function KpiCard({ title, value, sub }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        bgcolor: "#fff",
        p: 2,
        boxShadow: "0px 10px 30px rgba(15,23,42,0.04)",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800 }}>{title}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#111827", mt: 0.6 }}>{value}</Typography>
      {sub ? <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.4 }}>{sub}</Typography> : null}
    </Paper>
  );
}

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

/** Batch table: supports multiple backend key names safely */
const pick = (obj, keys, fallback = "-") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtNum = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  return Number.isFinite(n) ? n.toString() : String(v);
};

/**
 * ✅ Normalize Item Type:
 * Backend expects item_type: string
 * Dropdown may return: string OR { id, name } etc.
 */
const normalizeItemType = (v) => {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object") return (v.id || v.name || v.value || "").trim();
  return "";
};

const comparablePrice = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Same shape as conversion_rows in PUT /update-item (non-locked, active). */
function conversionRowsSignature(rows, baseUomId) {
  if (!baseUomId) return "null";
  const part = (rows || [])
    .filter((row) => row.active && !row.locked)
    .map((row) => ({
      request_uom: row.request_uom,
      converts_to: baseUomId,
      factor: Number(row.factor) || 0,
      base_to_alt_value: Number(row.base_to_alt_value) || 0,
      active: row.active !== false,
    }))
    .sort((a, b) => String(a.request_uom).localeCompare(String(b.request_uom)));
  return JSON.stringify(part);
}

function buildSaveBaselineFromLoadedItem(itemData, mappedConversionRows) {
  const baseUomId = itemData?.basic_uom_id || "";
  const hasBase = !!baseUomId;
  return {
    item_name: (itemData?.item_name || "").trim(),
    item_type: normalizeItemType(itemData?.item_type),
    base_price: itemData?.base_price,
    basic_uom_id: baseUomId || null,
    allow_fractional_issue: hasBase
      ? itemData?.allow_fractional_issue !== undefined
        ? itemData.allow_fractional_issue
        : true
      : null,
    base_precision: hasBase ? itemData?.base_precision ?? 6 : null,
    engineer_default_uom_id: itemData?.engineer_default_uom_id || null,
    invoice_default_uom_id: itemData?.invoice_default_uom_id || null,
    conversion_signature: conversionRowsSignature(mappedConversionRows || [], baseUomId),
  };
}

function nonNameFieldsEqual(a, b) {
  if (!a || !b) return false;
  if (normalizeItemType(a.item_type) !== normalizeItemType(b.item_type)) return false;
  const ap = comparablePrice(a.base_price);
  const bp = comparablePrice(b.base_price);
  if (ap !== bp) return false;
  if ((a.basic_uom_id || "") !== (b.basic_uom_id || "")) return false;
  if ((a.engineer_default_uom_id || "") !== (b.engineer_default_uom_id || "")) return false;
  if ((a.invoice_default_uom_id || "") !== (b.invoice_default_uom_id || "")) return false;
  if (a.basic_uom_id) {
    if (Boolean(a.allow_fractional_issue) !== Boolean(b.allow_fractional_issue)) return false;
    if (Number(a.base_precision ?? 6) !== Number(b.base_precision ?? 6)) return false;
  } else {
    if (a.allow_fractional_issue !== b.allow_fractional_issue) return false;
    if (a.base_precision !== b.base_precision) return false;
  }
  if ((a.conversion_signature || "") !== (b.conversion_signature || "")) return false;
  return true;
}

/**
 * What to send as `item_name` on PUT /update-item:
 * - rename + other edits: keep baseline name on master until PATCH migrates stock.
 * - other edits only, or no rename: current (trimmed) name.
 */
function resolvePutItemName({ nameChanged, otherDirty, baselineName, nextName }) {
  const next = (nextName || "").trim();
  const base = (baselineName || "").trim();
  if (otherDirty && nameChanged) return base || next;
  return next;
}

/**
 * PATCH /master-item/rename-and-migrate body — three fields set sensibly for the backend:
 * - new_item_name: required trimmed target name.
 * - old_item_name: null if unknown/empty (skip mismatch check); else expected current name.
 * - updated_by_email: null if not logged in.
 * Backend applies: master → inventory → batches → requests (and test) in one transaction.
 */
function buildRenameMigratePayload(baselineName, nextName) {
  const new_item_name = (nextName || "").trim();
  const rawOld = (baselineName || "").trim();
  return {
    new_item_name,
    old_item_name: rawOld || null,
    updated_by_email: typeof localStorage !== "undefined" ? localStorage.getItem("email") || null : null,
  };
}

/** Success dialog body: one row per backend step (master → inventory → batches → requests). */
function RenameMigrateSuccessSummary({ intro, apiData }) {
  const perStep = apiData?.per_step;
  const rowsUpdated = apiData?.rows_updated;
  return (
    <Stack spacing={1.25} sx={{ pt: 0.5 }}>
      <Typography variant="body1">{intro}</Typography>
      {Array.isArray(perStep) && perStep.length > 0 ? (
        <>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, display: "block" }}>
            Name change applied for each destination (same order as the API)
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360, boxShadow: "none" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 40 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Where</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, width: 72 }}>
                    Rows
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {perStep.map((s) => (
                  <TableRow key={s.step}>
                    <TableCell sx={{ fontSize: 12, verticalAlign: "top" }}>{s.step}</TableCell>
                    <TableCell sx={{ fontSize: 12, verticalAlign: "top" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {s.label}
                      </Typography>
                      {s.what_changes ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                          {s.what_changes}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, verticalAlign: "top" }}>
                      {s.rows_updated ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : rowsUpdated && typeof rowsUpdated === "object" ? (
        <Typography variant="body2" color="text.secondary" component="pre" sx={{ fontSize: 11, m: 0, p: 1, bgcolor: "#F9FAFB", borderRadius: 1 }}>
          {JSON.stringify(rowsUpdated, null, 2)}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function MasterItemDetailsDialog({
  open,
  item,
  isMobile,
  onClose,
  onUpdated,
  onDeleted,
  pageMode = true,
  initialMode = "view", // "view" | "edit"
  onRequestEdit,
}) {
  const apiBase = "http://localhost:8080";

  // ✅ In pageMode, always render (open not required)
  const effectiveOpen = pageMode ? true : !!open;

  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  // ✅ NEW: draft string for Item Type (bulletproof, used for payload)
  const [itemTypeDraft, setItemTypeDraft] = useState("");

  // ✅ Force refetch after save/transfer without depending on typing state
  const [reloadNonce, setReloadNonce] = useState(0);

  /** Last loaded / saved snapshot for PUT fields (excludes name for dirty check). */
  const saveBaselineRef = useRef(null);

  // Tabs: 0 Price History, 1 UOM & Conversion, 2 Defaults, 3 Batch Issues
  const [tabValue, setTabValue] = useState(1);

  // Price history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceTrendMode, setPriceTrendMode] = useState("monthly"); // "monthly" | "all"

  // Stock summary (by warehouse/location)
  const [stockRows, setStockRows] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  // Full locations list (for TO dropdown)
  const [allLocations, setAllLocations] = useState([]);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [qrTitle, setQrTitle] = useState("");

  const roleString = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = roleString.includes("admin");

  // Transfer (from Stock Summary top button)
  const [transferOpen, setTransferOpen] = useState(false);

  // Batch price drill-down (from Stock Summary rows)
  const [batchDetailsOpen, setBatchDetailsOpen] = useState(false);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [batchDetailsError, setBatchDetailsError] = useState("");
  const [batchDetailsCtx, setBatchDetailsCtx] = useState(null); // { item_name, location, warehouse }
  const [batchDetailsRows, setBatchDetailsRows] = useState([]);

  // Issue logs for a specific batch (from Batch Details rows)
  const [issueLogsOpen, setIssueLogsOpen] = useState(false);
  const [issueLogsLoading, setIssueLogsLoading] = useState(false);
  const [issueLogsError, setIssueLogsError] = useState("");
  const [issueLogsCtx, setIssueLogsCtx] = useState(null); // { batch_id, item_name, location, warehouse }
  const [issueLogsRows, setIssueLogsRows] = useState([]);

  // Batch issues
  const [batchIssues, setBatchIssues] = useState([]);
  const [batchIssuesLoading, setBatchIssuesLoading] = useState(false);

  // UOM list
  const [uomList, setUomList] = useState([]);
  const [uomLoading, setUomLoading] = useState(false);

  // UOM base + conversions
  const [baseUom, setBaseUom] = useState("");
  const [allowFractionalIssue, setAllowFractionalIssue] = useState(true);
  const [basePrecision, setBasePrecision] = useState(6);
  const [conversionRows, setConversionRows] = useState([]);

  // Defaults
  const [engineerDefaultUom, setEngineerDefaultUom] = useState("");
  const [invoiceDefaultUom, setInvoiceDefaultUom] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Message dialog
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageDialogContent, setMessageDialogContent] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const showMessage = (title, message, type = "info") => {
    setMessageDialogContent({ title, message, type });
    setMessageDialogOpen(true);
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      background: "#F3F4F6",
      "& fieldset": { borderColor: "#EEF2F7" },
      "&:hover fieldset": { borderColor: "#E5E7EB" },
      "&.Mui-focused fieldset": { borderColor: "#93C5FD" },
    },
  };

  const sectionTitleSx = { fontWeight: 800, fontSize: 14, color: "#111827", mb: 1 };

  useEffect(() => {
    if (effectiveOpen && item) {
      const normalized = normalizeItemType(item?.item_type);
      const next = {
        ...item,
        item_type: normalized,
      };
      setSelected(next);
      setInitialSnapshot(next);
      saveBaselineRef.current = buildSaveBaselineFromLoadedItem(next, []);
      setIsEditing(initialMode === "edit");
      // ✅ keep draft in sync on open
      setItemTypeDraft(normalized);
      setTabValue(1);
      setReloadNonce((n) => n + 1);
    }
    if (!effectiveOpen) {
      setSelected(null);
      setInitialSnapshot(null);
      saveBaselineRef.current = null;
      setIsEditing(false);
      setItemTypeDraft("");
      setHistory([]);
      setBatchIssues([]);
      setConversionRows([]);
      setBaseUom("");
      setEngineerDefaultUom("");
      setInvoiceDefaultUom("");
      setStockRows([]);
      setStockLoading(false);
      setStockError("");
      setQrOpen(false);
      setQrValue("");
      setQrTitle("");
      setTransferOpen(false);
      setDeleteDialogOpen(false);
      setDeletionReason("");
      setDeleting(false);
      setReloadNonce(0);
    }
  }, [effectiveOpen, item]);

  const transferLocationOptions = useMemo(() => {
    // Prefer the full global location list so TO can select any location,
    // not only locations that already have stock for this item.
    const fromAll = (allLocations || []).filter((x) => x && x !== "ALL").map((x) => String(x).trim()).filter(Boolean);
    if (fromAll.length) {
      const uniq = Array.from(new Map(fromAll.map((l) => [l.toLowerCase(), l])).values());
      return uniq.sort((a, b) => a.localeCompare(b));
    }
    // Fallback: derive from stockRows if no locationOptions were provided.
    const seen = new Map();
    (stockRows || []).forEach((r) => {
      const loc = String(r.location || "").trim();
      if (!loc) return;
      const key = loc.toLowerCase();
      if (!seen.has(key)) seen.set(key, loc);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [allLocations, stockRows]);

  useEffect(() => {
    if (!effectiveOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${apiBase}/projects_ids`, { validateStatus: (s) => s < 500 });
        const projects = Array.isArray(res?.data?.projects) ? res.data.projects : [];
        const seen = new Map();
        projects.forEach((p) => {
          const name = String(p?.project_name || "").trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!seen.has(key)) seen.set(key, name);
        });
        if (!cancelled) setAllLocations(Array.from(seen.values()).sort((a, b) => a.localeCompare(b)));
      } catch (_e) {
        // Best effort; fallback to stockRows-derived list.
        if (!cancelled) setAllLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, effectiveOpen]);

  const transferWarehouseOptions = useMemo(() => {
    const seen = new Map();
    (stockRows || []).forEach((r) => {
      const wh = String(r.warehouse || "").trim();
      if (!wh) return;
      const key = wh.toLowerCase();
      if (!seen.has(key)) seen.set(key, wh);
    });
    // common warehouses
    ["Serene Grande", "Serene Homes"].forEach((w) => {
      const key = w.toLowerCase();
      if (!seen.has(key)) seen.set(key, w);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [stockRows]);

  const priceKpis = useMemo(() => {
    const rows = Array.isArray(history) ? [...history] : [];
    rows.sort((a, b) => {
      const da = new Date(a?.effective_from || a?.created_at || 0).getTime() || 0;
      const db = new Date(b?.effective_from || b?.created_at || 0).getTime() || 0;
      return db - da;
    });
    const latest = rows[0];
    const prev = rows[1];
    const latestPrice = asINRNum(latest?.price);
    const prevPrice = asINRNum(prev?.price);
    const delta = latestPrice !== null && prevPrice !== null ? latestPrice - prevPrice : null;
    const deltaPct =
      delta !== null && prevPrice && Number.isFinite(prevPrice) ? (delta / prevPrice) * 100 : null;

    const numericPrices = rows.map((r) => asINRNum(r?.price)).filter((x) => x !== null);
    const avg = numericPrices.length
      ? numericPrices.reduce((s, x) => s + x, 0) / numericPrices.length
      : null;

    const monthLabel = (d) =>
      d instanceof Date && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        : "-";

    let trendRows = [];
    if (priceTrendMode === "monthly") {
      // group by YYYY-MM and pick last effective_from within month
      const map = new Map(); // key -> row (latest within month)
      for (const r of rows) {
        const dt = new Date(r?.effective_from || r?.created_at || 0);
        const key =
          dt instanceof Date && !Number.isNaN(dt.getTime())
            ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
            : "unknown";
        const existing = map.get(key);
        if (!existing) {
          map.set(key, r);
        } else {
          const eDt = new Date(existing?.effective_from || existing?.created_at || 0);
          if ((dt.getTime() || 0) > (eDt.getTime() || 0)) map.set(key, r);
        }
      }
      // chronological by month key
      const monthKeys = Array.from(map.keys())
        .filter((k) => k !== "unknown")
        .sort((a, b) => a.localeCompare(b));
      trendRows = monthKeys.map((k) => map.get(k)).filter(Boolean).slice(-12);
    } else {
      // all entries (last 12 points chronological)
      trendRows = rows.slice().reverse().slice(-12);
    }

    const labels =
      priceTrendMode === "monthly"
        ? trendRows.map((r) => monthLabel(new Date(r?.effective_from || r?.created_at || 0)))
        : trendRows.map((r) => ddmmyyyy(r?.effective_from) || "-");
    const data = trendRows.map((r) => asINRNum(r?.price) ?? null);

    return {
      latestPrice,
      prevPrice,
      delta,
      deltaPct,
      avg,
      latestMeta: latest,
      chart: { labels, data },
    };
  }, [history, priceTrendMode]);

  /* ------- Fetch UOM List ------- */
  const fetchUOMList = useCallback(async () => {
    try {
      setUomLoading(true);
      const response = await axios.get(`${apiBase}/get-all-uom`);
      if (response.data && response.data.success && response.data.uom_list) {
        const activeUoms = response.data.uom_list
          .filter((uom) => uom.is_active)
          .map((uom) => ({
            id: uom.basic_uom_id,
            code: uom.uom_code,
            name: uom.uom_name,
            category: uom.uom_category,
          }));
        setUomList(activeUoms);
      } else {
        setUomList([]);
      }
    } catch (error) {
      console.error("Error fetching UOM list:", error);
      setUomList([]);
    } finally {
      setUomLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (effectiveOpen) fetchUOMList();
  }, [effectiveOpen, fetchUOMList]);

  /** Stock summary for `/single/inventory/{name}` — use the canonical name after rename so rows match migrated stock. */
  const fetchStockSummaryByName = useCallback(
    async (itemName, stillMounted = true) => {
      const raw = normalizeText(itemName);
      if (!raw) {
        if (stillMounted) {
          setStockRows([]);
          setStockError("");
        }
        return;
      }
      if (stillMounted) {
        setStockLoading(true);
        setStockError("");
      }
      try {
        const candidates = Array.from(
          new Set([raw, capWords(raw)].filter(Boolean))
        );

        let inv = [];
        let lastRes = null;
        for (const candidate of candidates) {
          const res = await axios.get(`${apiBase}/single/inventory/${encodeURIComponent(candidate)}`, {
            validateStatus: (s) => s < 500,
          });
          lastRes = res;
          const rows = Array.isArray(res.data?.inventory) ? res.data.inventory : [];
          if (rows.length > 0) {
            inv = rows;
            break;
          }
        }
        const mapped = inv.map((r) => {
          const location = capWords(String(r.location || "").trim()) || "—";
          const warehouse = capWords(String(r.warehouse || "").trim()) || "—";
          const available_quantity = Number(r.available_quantity ?? r.quantity ?? 0) || 0;
          const total_available_value = Number(r.total_available_value ?? 0) || 0;
          const weighted_average_unit_price =
            r.weighted_average_unit_price == null ? null : Number(r.weighted_average_unit_price);
          return {
            location,
            warehouse,
            available_quantity,
            total_available_value,
            weighted_average_unit_price,
            inventory_id: r.inventory_id ?? r.inv_id ?? null,
            master_item_id: r.master_item_id ?? r.masterItemId ?? null,
          };
        });

        if (inv.length === 0) {
          const msg =
            lastRes?.data?.detail ||
            lastRes?.data?.message ||
            `No inventory found for item '${raw}'.`;
          if (stillMounted) {
            setStockRows([]);
            setStockError(String(msg));
          }
          return;
        }

        // De-dupe rows by (location, warehouse). Some backends return duplicates for the same
        // bucket; summing would double-count. Prefer a single "best" row instead.
        const byKey = new Map();
        mapped.forEach((row) => {
          const key = `${String(row.location).trim().toLowerCase()}||${String(row.warehouse).trim().toLowerCase()}`;
          const prev = byKey.get(key);
          if (!prev) {
            byKey.set(key, { ...row });
            return;
          }

          const prevQty = Number(prev.available_quantity) || 0;
          const rowQty = Number(row.available_quantity) || 0;
          const prevVal = Number(prev.total_available_value) || 0;
          const rowVal = Number(row.total_available_value) || 0;

          // Pick the row that looks most complete: higher qty wins; if tied, higher value wins.
          const pickRow = rowQty > prevQty || (rowQty === prevQty && rowVal > prevVal) ? row : prev;
          const pickedQty = Number(pickRow.available_quantity) || 0;
          const pickedVal = Number(pickRow.total_available_value) || 0;
          const pickedWAvg =
            pickRow.weighted_average_unit_price != null
              ? Number(pickRow.weighted_average_unit_price)
              : pickedQty > 0
                ? pickedVal / pickedQty
                : null;

          byKey.set(key, {
            ...pickRow,
            available_quantity: pickedQty,
            total_available_value: pickedVal,
            weighted_average_unit_price: pickedWAvg,
            // keep the newest non-null inventory_id if present
            inventory_id: row.inventory_id ?? prev.inventory_id ?? pickRow.inventory_id ?? null,
          });
        });

        const rows = Array.from(byKey.values()).sort((a, b) => {
          const al = a.location.localeCompare(b.location);
          if (al !== 0) return al;
          return a.warehouse.localeCompare(b.warehouse);
        });
        if (stillMounted) setStockRows(rows);
      } catch (e) {
        if (stillMounted) {
          setStockRows([]);
          setStockError(
            e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Failed to load stock."
          );
        }
      } finally {
        if (stillMounted) setStockLoading(false);
      }
    },
    [apiBase]
  );

  const fetchBatchDetails = useCallback(
    async ({ item_name, location, warehouse }) => {
      const name = (item_name || "").trim();
      const loc = (location || "").trim();
      const wh = (warehouse || "").trim();
      if (!name || !loc || !wh) return;

      setBatchDetailsLoading(true);
      setBatchDetailsError("");
      setBatchDetailsRows([]);
      setBatchDetailsCtx({ item_name: name, location: loc, warehouse: wh });
      setBatchDetailsOpen(true);

      try {
        // Backend provides location-level batch rows; filter down to this item + warehouse in UI.
        const res = await axios.get(`${apiBase}/inventory/location-details`, {
          params: { location: loc },
          validateStatus: (s) => s < 500,
        });
        if (res.status >= 400) {
          throw new Error(res.data?.detail || res.data?.message || `Failed (status ${res.status})`);
        }
        const details = Array.isArray(res.data?.details) ? res.data.details : [];
        const norm = (v) => String(v ?? "").trim().toLowerCase();
        const filtered = details
          .filter((b) => norm(b?.warehouse) === norm(wh))
          .filter((b) => norm(b?.item_name) === norm(name))
          .filter((b) => Number(b?.available_quantity ?? b?.quantity ?? 0) > 0);
        setBatchDetailsRows(filtered);
      } catch (e) {
        setBatchDetailsError(String(e?.message || "Failed to load batch details."));
      } finally {
        setBatchDetailsLoading(false);
      }
    },
    [apiBase]
  );

  const fetchIssueLogsForBatch = useCallback(
    async ({ batch_id, item_name, location, warehouse }) => {
      const bid = String(batch_id ?? "").trim();
      const name = String(item_name ?? "").trim();
      const loc = String(location ?? "").trim();
      const wh = String(warehouse ?? "").trim();
      if (!bid || !loc || !wh) return;

      setIssueLogsOpen(true);
      setIssueLogsLoading(true);
      setIssueLogsError("");
      setIssueLogsRows([]);
      setIssueLogsCtx({ batch_id: bid, item_name: name, location: loc, warehouse: wh });

      try {
        // Backend supports filtering by batch_id + location/warehouse.
        const res = await axios.get(`${apiBase}/issue-stock-logs`, {
          params: { batch_id: bid, location: loc, warehouse: wh, limit: 5000, offset: 0 },
          validateStatus: (s) => s < 500,
        });
        if (res.status >= 400) throw new Error(res.data?.detail || res.data?.message || `Failed (status ${res.status})`);

        const logs = Array.isArray(res.data?.logs) ? res.data.logs : [];
        // Extra safety: some environments might ignore batch_id filter.
        const norm = (v) => String(v ?? "").trim().toLowerCase();
        setIssueLogsRows(
          logs
            .filter((l) => String(l?.batch_id ?? "").trim() === bid)
            .filter((l) => (name ? norm(l?.item_name) === norm(name) : true))
        );
      } catch (e) {
        setIssueLogsError(String(e?.message || "Failed to load issue logs."));
      } finally {
        setIssueLogsLoading(false);
      }
    },
    [apiBase]
  );

  const uomById = useMemo(() => {
    const map = new Map();
    uomList.forEach((u) => map.set(u.id, u));
    return map;
  }, [uomList]);

  const getUomCode = (uomId) => {
    if (!uomId) return "";
    const u = uomById.get(uomId);
    return u ? u.code : String(uomId);
  };

  /* ------- Load item details (UOM + history + batch issues) ------- */
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      const activeItemId = selected?.id ?? item?.id ?? null;
      if (!effectiveOpen || !activeItemId) return;

      // UOM conversion data
      try {
        const uomResponse = await axios.get(`${apiBase}/get-item-with-uom/${activeItemId}`);
        if (!mounted) return;

        if (uomResponse.data && uomResponse.data.success) {
          const itemData = uomResponse.data.item;
          const convRows = uomResponse.data.conversion_rows || [];

          setBaseUom(itemData.basic_uom_id || "");
          setAllowFractionalIssue(
            itemData.allow_fractional_issue !== undefined ? itemData.allow_fractional_issue : true
          );
          setBasePrecision(itemData.base_precision || 6);
          setEngineerDefaultUom(itemData.engineer_default_uom_id || "");
          setInvoiceDefaultUom(itemData.invoice_default_uom_id || "");

          const mappedRows = convRows.map((row) => ({
            id: row.locked ? `locked-${row.request_uom}` : `row-${row.conversion_id}`,
            conversion_id: row.conversion_id,
            request_uom: row.request_uom,
            converts_to: row.converts_to,
            factor: row.factor,
            base_to_alt_value: row.base_to_alt_value || (row.factor > 0 ? 1 / row.factor : 1),
            active: row.active,
            locked: row.locked,
          }));

          mappedRows.sort((a, b) => (a.locked === b.locked ? 0 : a.locked ? -1 : 1));
          setConversionRows(mappedRows);
          saveBaselineRef.current = buildSaveBaselineFromLoadedItem(
            {
              ...itemData,
              item_name: itemData.item_name ?? item?.item_name ?? "",
            },
            mappedRows
          );
        } else {
          setBaseUom("");
          setAllowFractionalIssue(true);
          setBasePrecision(6);
          setConversionRows([]);
          setEngineerDefaultUom("");
          setInvoiceDefaultUom("");
          saveBaselineRef.current = buildSaveBaselineFromLoadedItem(
            {
              item_name: item?.item_name,
              item_type: item?.item_type,
              base_price: item?.base_price,
            },
            []
          );
        }
      } catch (error) {
        console.error("Error loading UOM data:", error);
        if (!mounted) return;
        setBaseUom("");
        setAllowFractionalIssue(true);
        setBasePrecision(6);
        setConversionRows([]);
        setEngineerDefaultUom("");
        setInvoiceDefaultUom("");
        saveBaselineRef.current = buildSaveBaselineFromLoadedItem(
          {
            item_name: item?.item_name,
            item_type: item?.item_type,
            base_price: item?.base_price,
          },
          []
        );
      }

      // Price history
      try {
        setHistoryLoading(true);
        const res = await axios.get(`${apiBase}/get-item-history/${activeItemId}`);
        if (!mounted) return;
        setHistory(res.data.history || []);
      } catch (e) {
        console.error("❌ Failed to fetch price history:", e);
        if (!mounted) return;
        setHistory([]);
      } finally {
        if (mounted) setHistoryLoading(false);
      }

      // Batch issues (support item_name or name from API)
      const itemNameForBatch = normalizeText(selected?.item_name || item?.item_name || item?.name || "");
      if (itemNameForBatch) {
        try {
          setBatchIssuesLoading(true);
          const candidates = Array.from(new Set([itemNameForBatch, capWords(itemNameForBatch)].filter(Boolean)));

          let batchRes = null;
          for (const candidate of candidates) {
            const res = await axios.get(`${apiBase}/batch-issues-by-item`, {
              params: { item_name: candidate },
              validateStatus: (status) => status < 500,
            });
            batchRes = res;
            const batches = res?.data?.batches;
            if (res.status === 200 && res.data?.success && Array.isArray(batches) && batches.length > 0) break;
          }

          if (!mounted) return;

          if (batchRes && batchRes.status === 200 && batchRes.data?.success) {
            setBatchIssues(batchRes.data?.batches || []);
          } else {
            setBatchIssues([]);
          }
        } catch (e) {
          console.error("❌ Failed to fetch batch issues:", e.response?.data || e.message);
          if (!mounted) return;
          setBatchIssues([]);
        } finally {
          if (mounted) setBatchIssuesLoading(false);
        }
      }

      // Stock summary by warehouse/location (name must match migrated stock after rename)
      const itemNameForStock = (selected?.item_name || item?.item_name || item?.name || "").trim();
      if (itemNameForStock) {
        await fetchStockSummaryByName(itemNameForStock, mounted);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [effectiveOpen, item?.id, apiBase, reloadNonce, selected?.id, fetchStockSummaryByName]);

  /* ------- Keep locked row + base UOM sync ------- */
  useEffect(() => {
    if (!baseUom) {
      setConversionRows([]);
      return;
    }

    setConversionRows((prev) => {
      const lockedRow = {
        id: `locked-${baseUom}`,
        request_uom: baseUom,
        converts_to: baseUom,
        factor: 1,
        base_to_alt_value: 1,
        active: true,
        locked: true,
      };

      const rest = (prev || []).filter((r) => !r.locked).map((r) => ({ ...r, converts_to: baseUom }));
      return [lockedRow, ...rest];
    });

    if (!invoiceDefaultUom) setInvoiceDefaultUom(baseUom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUom]);

  const addConversionRow = () => {
    if (!baseUom) return;
    setConversionRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        request_uom: "",
        converts_to: baseUom,
        factor: 0,
        base_to_alt_value: 0,
        active: true,
        locked: false,
      },
    ]);
  };

  const updateConversionRow = (id, field, value) => {
    setConversionRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "base_to_alt_value") {
          const num = Number(value) || 0;
          updated.base_to_alt_value = num;
          updated.factor = num > 0 ? 1 / num : 0;
        }
        return updated;
      })
    );
  };

  const deleteConversionRow = (id) => {
    setConversionRows((prev) => prev.filter((row) => row.id !== id && !row.locked));
  };

  const getAvailableUoms = (currentRowId) => {
    const used = new Set(
      conversionRows.filter((r) => r.id !== currentRowId && r.request_uom).map((r) => r.request_uom)
    );
    return uomList.filter((u) => !used.has(u.id));
  };

  /* ------- Save updates ------- */
  const saveItem = async () => {
    if (!selected) return;
    if (!isEditing) return;

    if (baseUom) {
      const invalidRows = conversionRows.filter(
        (row) => !row.locked && (!row.request_uom || !row.base_to_alt_value || Number(row.base_to_alt_value) <= 0)
      );
      if (invalidRows.length > 0) {
        showMessage("Error", "Please complete all conversion rows before saving.", "error");
        setTabValue(1);
        return;
      }
    }

    try {
      const baseline = saveBaselineRef.current;
      const baselineName = ((baseline?.item_name ?? initialSnapshot?.item_name) || "").trim();
      const prevName = baselineName;
      // ✅ Bulletproof: prefer draft, fallback to selected
      const itemTypeStr = normalizeItemType(itemTypeDraft || selected.item_type);
      const nextName = (selected.item_name || "").trim();
      const hasBase = !!baseUom;

      const snapshotForCompare = {
        item_type: itemTypeStr,
        base_price: selected.base_price,
        basic_uom_id: baseUom || null,
        allow_fractional_issue: hasBase ? allowFractionalIssue : null,
        base_precision: hasBase ? basePrecision : null,
        engineer_default_uom_id: engineerDefaultUom || null,
        invoice_default_uom_id: invoiceDefaultUom || baseUom || null,
        conversion_signature: conversionRowsSignature(conversionRows, baseUom),
      };

      const nameChanged = baselineName !== nextName;
      const otherDirty = !nonNameFieldsEqual(baseline, snapshotForCompare);

      if (!nameChanged && !otherDirty) {
        showMessage("Info", "No changes to save.", "info");
        return;
      }

      const conversionPayload =
        baseUom && conversionRows.length > 0
          ? conversionRows
              .filter((row) => row.active && !row.locked)
              .map((row) => ({
                request_uom: row.request_uom,
                converts_to: baseUom,
                factor: row.factor,
                base_to_alt_value: row.base_to_alt_value,
                active: row.active,
              }))
          : null;

      const putItemName = resolvePutItemName({ nameChanged, otherDirty, baselineName, nextName });
      const payload = {
        item_name: putItemName,
        item_type: itemTypeStr,
        base_price: selected.base_price,
        basic_uom_id: baseUom || null,
        allow_fractional_issue: baseUom ? allowFractionalIssue : null,
        base_precision: baseUom ? basePrecision : null,
        engineer_default_uom_id: engineerDefaultUom || null,
        invoice_default_uom_id: invoiceDefaultUom || baseUom || null,
        conversion_rows: conversionPayload,
      };

      // Name-only → PATCH only. UOM/other-only → PUT only. Both → PUT then PATCH (putItemName keeps old name until migrate).
      if (otherDirty) {
        await axios.put(`${apiBase}/update-item/${selected.id}`, payload);
      }

      let renameMigrateResponse = null;
      if (nameChanged) {
        try {
          const renameRes = await axios.patch(
            `${apiBase}/master-item/rename-and-migrate/${selected.id}`,
            buildRenameMigratePayload(prevName, nextName)
          );
          renameMigrateResponse = renameRes?.data ?? null;
        } catch (e) {
          console.error("Rename migration failed:", e?.response?.data || e?.message);
          showMessage(
            "Error",
            `Rename failed: ${e.response?.data?.detail || e.message || "Unknown error"}.`,
            "error"
          );
          return;
        }
      }

      onUpdated?.({ ...selected, item_type: itemTypeStr, basic_uom_id: baseUom || null });

      let successMsg = "Item updated successfully.";
      if (nameChanged && otherDirty) {
        successMsg = "Item updated. Name, stock labels, and master fields saved.";
      } else if (nameChanged) {
        successMsg = "Master name and stock rows updated to the new item name.";
      }
      if (nameChanged && renameMigrateResponse) {
        showMessage(
          "Success",
          <RenameMigrateSuccessSummary intro={successMsg} apiData={renameMigrateResponse} />,
          "success"
        );
      } else {
        showMessage("Success", successMsg, "success");
      }

      saveBaselineRef.current = {
        item_name: nextName,
        item_type: itemTypeStr,
        base_price: selected.base_price,
        basic_uom_id: baseUom || null,
        allow_fractional_issue: hasBase ? allowFractionalIssue : null,
        base_precision: hasBase ? basePrecision : null,
        engineer_default_uom_id: engineerDefaultUom || null,
        invoice_default_uom_id: invoiceDefaultUom || baseUom || null,
        conversion_signature: conversionRowsSignature(conversionRows, baseUom),
      };
      setInitialSnapshot({ ...selected, item_type: itemTypeStr, basic_uom_id: baseUom || null });
      setIsEditing(false);

      if (nameChanged) {
        await fetchStockSummaryByName(nextName);
      }
      setReloadNonce((n) => n + 1);
    } catch (e) {
      console.error("❌ Update failed:", e);
      showMessage(
        "Error",
        `Failed to update item: ${e.response?.data?.detail || e.message || "Unknown error"}`,
        "error"
      );
    }
  };

  /* ------- Delete item ------- */
  const handleDeleteClick = () => {
    setDeletionReason("");
    setDeleteDialogOpen(true);
  };

  const deleteItem = async () => {
    if (!selected) return;
    if (!deletionReason.trim()) return;

    try {
      setDeleting(true);
      const userEmail = localStorage.getItem("email") || "unknown@example.com";

      await axios.delete(`${apiBase}/hard-delete-master-item/${selected.id}`, {
        data: { deleted_by: userEmail, deletion_reason: deletionReason.trim() },
      });

      onDeleted?.(selected.id);
      setDeleteDialogOpen(false);
      setSelected(null);
      showMessage("Success", "Item deleted successfully.", "success");
      onClose?.();
    } catch (e) {
      console.error("❌ Delete failed:", e);
      showMessage(
        "Error",
        `Failed to delete item: ${e.response?.data?.detail || e.message || "Unknown error"}`,
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    if (!deleting) {
      setDeleteDialogOpen(false);
      setDeletionReason("");
    }
  };

  if (!effectiveOpen) return null;

  return (
    <>
      <Paper
        sx={
          pageMode
            ? {
                borderRadius: 2,
                border: "1px solid #E5E7EB",
                background: "#fff",
                overflow: "hidden",
                width: "100%",
                boxShadow: "none",
              }
            : {
                borderRadius: 2,
                border: "1px solid #E5E7EB",
                background: "#fff",
                overflow: "hidden",
                position: "fixed",
                top: 160,
                zIndex: 1300,
                width: "91vw",
                boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
                marginLeft: "-45px",
              }
        }
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #EEF2F7",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#111827" }}>
            Item Details  
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            {!isEditing ? (
              <Button
                variant="outlined"
                onClick={() => {
                  if (typeof onRequestEdit === "function") {
                    onRequestEdit(selected);
                    return;
                  }
                  setIsEditing(true);
                }}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Edit
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => {
                  if (initialSnapshot) {
                    const normalized = normalizeItemType(initialSnapshot?.item_type);
                    const reverted = { ...initialSnapshot, item_type: normalized };
                    setSelected(reverted);
                    setItemTypeDraft(normalized);
                  }
                  setIsEditing(false);
                }}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Cancel Edit
              </Button>
            )}

            <Button
              variant="contained"
              onClick={saveItem}
              disabled={!isEditing}
              sx={{ borderRadius: 2, px: 3, bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" } }}
            >
              SAVE
            </Button>

            <Button
              onClick={handleDeleteClick}
              startIcon={<DeleteIcon fontSize="small" />}
              disabled={isEditing}
              sx={{ borderRadius: 2, color: "#EF4444" }}
            >
              Delete
            </Button>

            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                borderRadius: 2,
                px: 3,
                borderColor: "#DC2626",
                color: "#DC2626",
                backgroundColor: "rgba(220, 38, 38, 0.06)",
                "&:hover": {
                  borderColor: "#B91C1C",
                  color: "#B91C1C",
                  backgroundColor: "rgba(220, 38, 38, 0.10)",
                },
              }}
            >
              X Close
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            pb: 0,
            height: pageMode ? "auto" : "78vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selected ? (
            <>
              {/* Top form row */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 2,
                }}
              >
                {!isEditing ? (
                  <ReadOnlyField label="Item Name" value={(selected.item_name || "").trim() || "—"} />
                ) : (
                  <TextField
                    label="Item Name"
                    value={selected.item_name || ""}
                    onChange={(e) => setSelected({ ...selected, item_name: e.target.value })}
                    disabled={!isEditing}
                    fullWidth
                    sx={inputSx}
                  />
                )}

                {!isEditing ? (
                  <ReadOnlyField label="Item Type" value={(itemTypeDraft || selected.item_type || "").trim() || "—"} />
                ) : (
                  <Box sx={{ width: "100%" }}>
                    <Box sx={{ ...inputSx }}>
                      {/* ✅ IMPORTANT: dropdown controlled by itemTypeDraft */}
                      <ItemTypeDropDown
                        value={itemTypeDraft || ""}
                        onSelect={(v) => {
                          const normalized = normalizeItemType(v);
                          setItemTypeDraft(normalized);
                          setSelected((prev) => ({ ...prev, item_type: normalized }));
                        }}
                        disabled={!isEditing}
                      />
                    </Box>
                  </Box>
                )}

                {!isEditing ? (
                  <ReadOnlyField label="Base Price" value={asINR(selected.base_price)} />
                ) : (
                  <TextField
                    label="Base Price"
                    type="number"
                    value={selected.base_price ?? ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        base_price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    disabled={!isEditing}
                    fullWidth
                    sx={inputSx}
                  />
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Stock summary */}
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 900, color: "#111827" }}>Stock Summary</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {stockLoading ? (
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Loading…</Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                        Total:{" "}
                        <b>
                          {(stockRows || []).reduce((sum, r) => sum + (Number(r.available_quantity) || 0), 0)}
                        </b>
                      </Typography>
                    )}

                    {/*
                      Transfer action hidden as requested.
                      (Leaving transfer logic intact for potential re-enable later.)
                    */}
                  </Stack>
                </Stack>

                {stockError ? (
                  <Typography sx={{ color: "#DC2626", fontSize: 13 }}>{stockError}</Typography>
                ) : stockRows.length === 0 ? (
                  <Typography sx={{ color: "#6B7280", fontSize: 13 }}>
                    No stock rows found for this item.
                  </Typography>
                ) : (
                  <TableContainer
                    component={Paper}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #EEF2F7",
                      boxShadow: "none",
                      overflow: "hidden",
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ background: "#F8FAFC" }}>
                          {[
                            "Location",
                            "Warehouse",
                            "Quantity",
                            ...(isAdmin ? ["Value"] : []),
                            "QR",
                            ...(isAdmin ? ["Batches"] : []),
                          ].map((hdr) => (
                            <TableCell key={hdr} sx={{ fontWeight: 900, color: "#334155" }}>
                              {hdr}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stockRows.map((r, idx) => (
                          <TableRow key={`${r.warehouse}-${r.location}-${idx}`} hover>
                            <TableCell>{r.location}</TableCell>
                            <TableCell>{r.warehouse}</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>{r.available_quantity}</TableCell>
                            {isAdmin ? (
                              <TableCell sx={{ fontWeight: 900 }}>{asINR2(r.total_available_value || 0)}</TableCell>
                            ) : null}
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  const itemName = selected?.item_name || item?.item_name || item?.name || "";
                                  const payload = buildInventoryQrValue({
                                    parsed_item_name: String(itemName || ""),
                                    parsed_location: String(r.location ?? ""),
                                    parsed_warehouse: String(r.warehouse ?? ""),
                                  });
                                  setQrTitle(`${capWords(itemName)} • ${r.location} • ${r.warehouse}`);
                                  setQrValue(payload);
                                  setQrOpen(true);
                                }}
                                sx={{ borderRadius: 999, px: 1.5, fontWeight: 900, textTransform: "none" }}
                              >
                                QR
                              </Button>
                            </TableCell>
                            {isAdmin ? (
                              <TableCell>
                                <Tooltip title="View batches">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const itemName = selected?.item_name || item?.item_name || item?.name || "";
                                      fetchBatchDetails({
                                        item_name: itemName,
                                        location: r.location,
                                        warehouse: r.warehouse,
                                      });
                                    }}
                                  >
                                    <VisibilityOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Batch drill-down dialog (admin only) */}
              <Dialog
                open={batchDetailsOpen}
                onClose={() => setBatchDetailsOpen(false)}
                fullWidth
                maxWidth="md"
              >
                <DialogTitle sx={{ fontWeight: 900 }}>
                  Batch Details
                  {batchDetailsCtx ? (
                    <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.5 }}>
                      {capWords(batchDetailsCtx.item_name)} • {batchDetailsCtx.location} • {batchDetailsCtx.warehouse}
                    </Typography>
                  ) : null}
                </DialogTitle>
                <DialogContent dividers>
                  {batchDetailsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : batchDetailsError ? (
                    <Typography sx={{ color: "#DC2626", fontSize: 13 }}>{batchDetailsError}</Typography>
                  ) : batchDetailsRows.length === 0 ? (
                    <Typography sx={{ color: "#6B7280", fontSize: 13 }}>No batches found.</Typography>
                  ) : (
                    <>
                      {(() => {
                        const totals = (batchDetailsRows || []).reduce(
                          (acc, b) => {
                            const qty = Number(b?.available_quantity ?? b?.quantity ?? 0) || 0;
                            const up =
                              Number(
                                b?.unit_price ??
                                  b?.weighted_average_unit_price ??
                                  b?.unitRate ??
                                  b?.rate ??
                                  0
                              ) || 0;
                            acc.batches += 1;
                            acc.qty += qty;
                            acc.value += qty * up;
                            return acc;
                          },
                          { batches: 0, qty: 0, value: 0 }
                        );
                        const wavg = totals.qty > 0 ? totals.value / totals.qty : 0;
                        return (
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                            <Chip label={`Batches: ${totals.batches}`} variant="outlined" />
                            <Chip label={`Qty: ${totals.qty.toLocaleString("en-IN")}`} variant="outlined" />
                            <Chip label={`Value: ${asINR2(totals.value)}`} color="secondary" variant="filled" />
                            <Chip label={`Avg Rate: ${asINR2(wavg)}`} variant="outlined" />
                          </Stack>
                        );
                      })()}

                      <TableContainer
                        component={Paper}
                        sx={{ borderRadius: 2, border: "1px solid #EEF2F7", boxShadow: "none", overflow: "hidden" }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ background: "#F8FAFC" }}>
                              {["Batch ID", "Invoice", "Available Qty", "Unit Price", "Value", "Status", "Created", "Issued"].map((hdr) => (
                                <TableCell key={hdr} sx={{ fontWeight: 900, color: "#334155" }}>
                                  {hdr}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {batchDetailsRows.map((b) => {
                              const qty = Number(b?.available_quantity ?? b?.quantity ?? 0) || 0;
                              const up =
                                Number(
                                  b?.unit_price ??
                                    b?.weighted_average_unit_price ??
                                    b?.unitRate ??
                                    b?.rate ??
                                    0
                                ) || 0;
                              const val = qty * up;
                              return (
                                <TableRow key={String(b.batch_id)} hover>
                                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                                    {String(b.batch_id || "—")}
                                  </TableCell>
                                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                                    {String(b.invoice_id || "—")}
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 900 }}>{qty}</TableCell>
                                  <TableCell>{asINR2(up)}</TableCell>
                                  <TableCell sx={{ fontWeight: 900 }}>{asINR2(val)}</TableCell>
                                  <TableCell>{String(b.status || "—")}</TableCell>
                                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDDMMYYYY(b.created_date)}</TableCell>
                                  <TableCell>
                                    <Tooltip title="View issued history">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          if (!batchDetailsCtx) return;
                                          fetchIssueLogsForBatch({
                                            batch_id: b.batch_id,
                                            item_name: batchDetailsCtx.item_name,
                                            location: batchDetailsCtx.location,
                                            warehouse: batchDetailsCtx.warehouse,
                                          });
                                        }}
                                      >
                                        <HistoryOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setBatchDetailsOpen(false)} variant="outlined">
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Issue logs dialog (from Batch Details) */}
              <Dialog open={issueLogsOpen} onClose={() => setIssueLogsOpen(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 900 }}>
                  Issued History
                  {issueLogsCtx ? (
                    <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.5 }}>
                      Batch: {String(issueLogsCtx.batch_id)} • {capWords(issueLogsCtx.item_name)} • {issueLogsCtx.location} •{" "}
                      {issueLogsCtx.warehouse}
                    </Typography>
                  ) : null}
                </DialogTitle>
                <DialogContent dividers>
                  {issueLogsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : issueLogsError ? (
                    <Typography sx={{ color: "#DC2626", fontSize: 13 }}>{issueLogsError}</Typography>
                  ) : issueLogsRows.length === 0 ? (
                    <Typography sx={{ color: "#6B7280", fontSize: 13 }}>No issue logs found for this batch.</Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid #EEF2F7", boxShadow: "none" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ background: "#F8FAFC" }}>
                            {["Issued Qty", "Issued To", "Issued By", "Issued On", "Request ID"].map((hdr) => (
                              <TableCell key={hdr} sx={{ fontWeight: 900, color: "#334155" }}>
                                {hdr}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {issueLogsRows.map((l, idx) => (
                            <TableRow key={`${String(l.batch_id)}__${idx}`} hover>
                              <TableCell sx={{ fontWeight: 900 }}>{Number(l?.issued_quantity ?? 0) || 0}</TableCell>
                              <TableCell>{String(l?.issued_to || "—")}</TableCell>
                              <TableCell>{String(l?.issued_by || "—")}</TableCell>
                              <TableCell sx={{ whiteSpace: "nowrap" }}>
                                {l?.issued_on ? new Date(l.issued_on).toLocaleString("en-GB") : "—"}
                              </TableCell>
                              <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{String(l?.request_id || "—")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setIssueLogsOpen(false)} variant="outlined">
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Tabs */}
              <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                sx={{
                  borderBottom: "1px solid #EEF2F7",
                  "& .MuiTab-root": { textTransform: "none", fontWeight: 700, color: "#6B7280" },
                  "& .Mui-selected": { color: "#1D4ED8" },
                  "& .MuiTabs-indicator": { backgroundColor: "#2563EB", height: 3, borderRadius: 2 },
                }}
              >
                <Tab label="Price History" />
                <Tab label="UOM & Conversion" />
                <Tab label="Defaults" />
                <Tab label="Batch Issues" />
              </Tabs>

              {/* Scroll container only needed in dialog mode; page mode uses parent */}
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: pageMode ? "visible" : "auto",
                  pt: 1,
                  pb: 2,
                }}
              >
                {/* Price History */}
                <TabPanel value={tabValue} index={0}>
                  {historyLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                      <CircularProgress />
                    </Box>
                  ) : history.length === 0 ? (
                    <Typography sx={{ color: "#6B7280" }}>No price history found.</Typography>
                  ) : (
                    <Box>
                      {/* KPI row */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <KpiCard
                          title="Current Price"
                          value={priceKpis.latestPrice !== null ? asINR(priceKpis.latestPrice) : "—"}
                          sub={
                            priceKpis.latestMeta?.effective_from
                              ? `Effective: ${ddmmyyyy(priceKpis.latestMeta.effective_from)}`
                              : undefined
                          }
                        />
                        <KpiCard
                          title="Previous Price"
                          value={priceKpis.prevPrice !== null ? asINR(priceKpis.prevPrice) : "—"}
                          sub="Previous effective entry"
                        />
                        <KpiCard
                          title="Change"
                          value={
                            priceKpis.delta === null
                              ? "—"
                              : `${priceKpis.delta >= 0 ? "+" : ""}${asINR(priceKpis.delta)}`
                          }
                          sub={
                            priceKpis.deltaPct === null
                              ? undefined
                              : `${priceKpis.deltaPct >= 0 ? "+" : ""}${priceKpis.deltaPct.toFixed(1)}%`
                          }
                        />
                      </Box>

                      {/* Trend chart */}
                      <Paper
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          border: "1px solid #E5E7EB",
                          bgcolor: "#fff",
                          p: 2,
                          mb: 2,
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: "#111827" }}>Price Trend</Typography>
                          <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={priceTrendMode}
                            onChange={(_e, next) => {
                              if (!next) return;
                              setPriceTrendMode(next);
                            }}
                            sx={{
                              bgcolor: "#fff",
                              borderRadius: 999,
                              border: "1px solid #E5E7EB",
                              "& .MuiToggleButton-root": {
                                border: "none",
                                px: 1.2,
                                py: 0.4,
                                textTransform: "none",
                                fontWeight: 900,
                              },
                            }}
                          >
                            <ToggleButton value="monthly">Monthly</ToggleButton>
                            <ToggleButton value="all">All entries</ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                        <Box sx={{ height: 220 }}>
                          <Line
                            data={{
                              labels: priceKpis.chart.labels,
                              datasets: [
                                {
                                  label: "Price",
                                  data: priceKpis.chart.data,
                                  borderColor: "#2563EB",
                                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                                  tension: 0.25,
                                  pointRadius: 3,
                                  pointHoverRadius: 5,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: { enabled: true },
                              },
                              scales: {
                                y: {
                                  ticks: {
                                    callback: (v) => `₹${v}`,
                                  },
                                  grid: { color: "rgba(148,163,184,0.25)" },
                                },
                                x: {
                                  grid: { display: false },
                                },
                              },
                            }}
                          />
                        </Box>
                        {priceKpis.avg !== null ? (
                          <Typography sx={{ mt: 1.25, fontSize: 12, color: "#6B7280" }}>
                            Average price (shown history): <b>{asINR(priceKpis.avg)}</b>
                          </Typography>
                        ) : null}
                      </Paper>

                      {/* Table */}
                      <TableContainer
                        component={Paper}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid #EEF2F7",
                          boxShadow: "none",
                          overflow: "hidden",
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ background: "#F3F4F6" }}>
                              {["Invoice/Vendor ID", "Price(₹)", "Effective From", "Updated By"].map((hdr) => (
                                <TableCell key={hdr} sx={{ fontWeight: 800, color: "#6B7280" }}>
                                  {hdr}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {history.map((h, i) => (
                              <TableRow key={i} hover>
                                <TableCell>{h.venue_vendor_id ?? h.avenue_vendor_id ?? "-"}</TableCell>
                                <TableCell>{asINR(h.price)}</TableCell>
                                <TableCell>{ddmmyyyy(h.effective_from)}</TableCell>
                                <TableCell>{h.emp_id ? h.emp_id.split("@")[0] : "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </TabPanel>

                {/* UOM & Conversion */}
                <TabPanel value={tabValue} index={1}>
                  {!isEditing ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
                      <ReadOnlyField label="Base UOM" value={getUomCode(baseUom) || "—"} />
                      <ReadOnlyField label="Allow Fractional Issue" value={allowFractionalIssue ? "YES" : "NO"} />
                      <ReadOnlyField label="Base Precision" value={String(basePrecision ?? "—")} />
                    </Box>
                  ) : (
                    <>
                      <Typography sx={sectionTitleSx}>Base UOM</Typography>

                      <Box sx={{ display: "grid", gap: 2, mb: 2 }}>
                        <FormControl fullWidth sx={inputSx}>
                          <InputLabel>Base UOM</InputLabel>
                          <Select
                            value={baseUom}
                            onChange={(e) => setBaseUom(e.target.value)}
                            label="Base UOM"
                            disabled={uomLoading || !isEditing}
                            sx={{ background: "#F3F4F6", borderRadius: 1.5 }}
                          >
                            {uomList.map((uom) => (
                              <MenuItem key={uom.id} value={uom.id}>
                                {uom.code} - {uom.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControlLabel
                          control={
                            <Switch
                              checked={allowFractionalIssue}
                              onChange={(e) => setAllowFractionalIssue(e.target.checked)}
                              disabled={!isEditing}
                            />
                          }
                          label={
                            <Typography sx={{ fontWeight: 700, color: "#111827" }}>
                              Allow Fractional Issue
                            </Typography>
                          }
                        />

                        <TextField
                          label="Base Precision"
                          type="number"
                          value={String(basePrecision).padStart(2, "0")}
                          onChange={(e) => setBasePrecision(parseInt(e.target.value, 10) || 6)}
                          inputProps={{ min: 0, max: 10 }}
                          disabled={!isEditing}
                          sx={inputSx}
                          fullWidth
                        />
                      </Box>
                    </>
                  )}

                  <Typography sx={{ ...sectionTitleSx, mt: 2 }}>Allowed Request UOMs</Typography>

                  {isEditing ? (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addConversionRow}
                        disabled={!baseUom || !isEditing}
                        sx={{ borderRadius: 2 }}
                      >
                        Add Conversion
                      </Button>
                    </Box>
                  ) : null}

                  {conversionRows.length === 0 ? (
                    <Typography sx={{ color: "#6B7280", textAlign: "center", py: 3 }}>
                      {baseUom ? "No conversion rows added." : "Please select a Base UOM first."}
                    </Typography>
                  ) : (
                    <TableContainer
                      component={Paper}
                      sx={{ borderRadius: 2, border: "1px solid #EEF2F7", boxShadow: "none", overflow: "hidden" }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ background: "#F3F4F6" }}>
                            {["Request UOM", "Converts To", "Conversion", "Active"].concat(isEditing ? ["Actions"] : []).map((t) => (
                              <TableCell key={t} sx={{ fontWeight: 800, color: "#6B7280" }}>
                                {t}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {conversionRows.map((row) => (
                            <TableRow key={row.id} hover>
                              <TableCell sx={{ width: 240 }}>
                                {row.locked ? (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <LockIcon sx={{ fontSize: 16, color: "#9CA3AF" }} />
                                    <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                                      {getUomCode(row.request_uom)} (Locked)
                                    </Typography>
                                  </Box>
                                ) : !isEditing ? (
                                  <Typography sx={{ fontWeight: 800, color: "#111827" }}>
                                    {getUomCode(row.request_uom) || "—"}
                                  </Typography>
                                ) : (
                                  <FormControl fullWidth size="small" sx={inputSx}>
                                    <Select
                                      value={row.request_uom}
                                      onChange={(e) => updateConversionRow(row.id, "request_uom", e.target.value)}
                                      sx={{ background: "#F3F4F6", borderRadius: 1.5 }}
                                      disabled={!isEditing}
                                    >
                                      {getAvailableUoms(row.id).map((uom) => (
                                        <MenuItem key={uom.id} value={uom.id}>
                                          {uom.code} - {uom.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}
                              </TableCell>

                              <TableCell sx={{ color: "#6B7280" }}>
                                {getUomCode(row.converts_to || baseUom) || "-"}
                              </TableCell>

                              <TableCell sx={{ width: 260 }}>
                                {row.locked ? (
                                  <Typography sx={{ color: "#6B7280" }}>Factor: 1 (Base)</Typography>
                                ) : !isEditing ? (
                                  <Typography sx={{ color: "#111827", fontWeight: 800 }}>
                                    1 {getUomCode(baseUom)} = {fmtNum(row.base_to_alt_value)} {getUomCode(row.request_uom)}
                                  </Typography>
                                ) : (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ color: "#111827", fontWeight: 700 }}>
                                      1 {getUomCode(baseUom)} =
                                    </Typography>

                                    <TextField
                                      type="number"
                                      size="small"
                                      value={row.base_to_alt_value || ""}
                                      onChange={(e) => updateConversionRow(row.id, "base_to_alt_value", e.target.value)}
                                      inputProps={{ min: 0.0001, step: 0.0001 }}
                                      sx={{ width: 120, ...inputSx }}
                                      disabled={!row.request_uom || !isEditing}
                                    />

                                    <Typography sx={{ color: "#111827", fontWeight: 700 }}>
                                      {getUomCode(row.request_uom) || "UOM"}
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>

                              <TableCell>
                                {isEditing ? (
                                  <Switch
                                    checked={!!row.active}
                                    onChange={(e) => updateConversionRow(row.id, "active", e.target.checked)}
                                    disabled={row.locked || !isEditing}
                                    size="small"
                                  />
                                ) : (
                                  <Typography sx={{ fontWeight: 800, color: row.active ? "#047857" : "#B91C1C" }}>
                                    {row.active ? "YES" : "NO"}
                                  </Typography>
                                )}
                              </TableCell>

                              {isEditing ? (
                                <TableCell>
                                  {!row.locked && (
                                    <IconButton
                                      size="small"
                                      onClick={() => deleteConversionRow(row.id)}
                                      sx={{ color: "#EF4444" }}
                                      disabled={!isEditing}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </TabPanel>

                {/* Defaults */}
                <TabPanel value={tabValue} index={2}>
                  {!isEditing ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 2 }}>
                      <ReadOnlyField label="Engineer Default UOM" value={getUomCode(engineerDefaultUom) || "—"} />
                      <ReadOnlyField label="Invoice Default UOM" value={getUomCode(invoiceDefaultUom || baseUom) || "—"} />
                    </Box>
                  ) : (
                    <>
                      <Typography sx={sectionTitleSx}>Base UOM</Typography>
                      <Box sx={{ display: "grid", gap: 2, maxWidth: 520 }}>
                        <FormControl fullWidth sx={inputSx}>
                          <InputLabel>Engineer Default UOM</InputLabel>
                          <Select
                            value={engineerDefaultUom}
                            onChange={(e) => setEngineerDefaultUom(e.target.value)}
                            label="Engineer Default UOM"
                            disabled={uomLoading || !isEditing}
                            sx={{ background: "#F3F4F6", borderRadius: 1.5 }}
                          >
                            <MenuItem value="">None</MenuItem>
                            {uomList.map((uom) => (
                              <MenuItem key={uom.id} value={uom.id}>
                                {uom.code} - {uom.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth sx={inputSx}>
                          <InputLabel>Invoice Default UOM</InputLabel>
                          <Select
                            value={invoiceDefaultUom || baseUom}
                            onChange={(e) => setInvoiceDefaultUom(e.target.value)}
                            label="Invoice Default UOM"
                            disabled={uomLoading || !isEditing}
                            sx={{ background: "#F3F4F6", borderRadius: 1.5 }}
                          >
                            <MenuItem value="">None</MenuItem>
                            {uomList.map((uom) => (
                              <MenuItem key={uom.id} value={uom.id}>
                                {uom.code} - {uom.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </>
                  )}
                </TabPanel>

                {/* Batch Issues - shared component for sorting, expandable issue details */}
                <TabPanel value={tabValue} index={3}>
                  <BatchIssues batches={batchIssues} loading={batchIssuesLoading} />
                </TabPanel>
              </Box>
            </>
          ) : (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && handleDeleteDialogClose()} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              mx: "auto",
              mb: 1.25,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DeleteIcon sx={{ color: "#EF4444" }} />
          </Box>

          <Typography sx={{ fontWeight: 900, color: "#111827" }}>
            Delete Item{" "}
            <span style={{ color: "#2563EB" }}>{selected?.item_name ? `"${selected.item_name}"` : ""}</span>?
          </Typography>

          <Typography sx={{ mt: 0.5, color: "#6B7280", fontSize: 13 }}>This action cannot be undone.</Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.75 }}>Reason for Delete</Typography>

          <TextField
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            placeholder="Demo Name"
            fullWidth
            sx={{
              ...inputSx,
              "& .MuiOutlinedInput-root": { background: "#F3F4F6" },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, justifyContent: "space-between" }}>
          <Button
            onClick={handleDeleteDialogClose}
            disabled={deleting}
            sx={{
              borderRadius: 2,
              px: 3,
              background: "#E5E7EB",
              color: "#6B7280",
              "&:hover": { background: "#E5E7EB" },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={deleteItem}
            disabled={!deletionReason.trim() || deleting}
            sx={{
              borderRadius: 2,
              px: 3,
              bgcolor: "#EF4444",
              "&:hover": { bgcolor: "#DC2626" },
            }}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color:
              messageDialogContent.type === "error"
                ? "error.main"
                : messageDialogContent.type === "warning"
                ? "warning.main"
                : "success.main",
          }}
        >
          {messageDialogContent.type === "error" ? (
            <ErrorIcon color="error" />
          ) : messageDialogContent.type === "warning" ? (
            <ErrorIcon color="warning" />
          ) : (
            <CheckCircleIcon color="success" />
          )}
          <Typography variant="h6" fontWeight="bold">
            {messageDialogContent.title}
          </Typography>
        </DialogTitle>

        <DialogContent>
          {typeof messageDialogContent.message === "string" ? (
            <Typography variant="body1" sx={{ pt: 1 }}>
              {messageDialogContent.message}
            </Typography>
          ) : (
            <Box sx={{ pt: 1 }}>{messageDialogContent.message}</Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setMessageDialogOpen(false)}
            sx={{
              bgcolor:
                messageDialogContent.type === "error"
                  ? "error.main"
                  : messageDialogContent.type === "warning"
                  ? "warning.main"
                  : "success.main",
              "&:hover": {
                bgcolor:
                  messageDialogContent.type === "error"
                    ? "error.dark"
                    : messageDialogContent.type === "warning"
                    ? "warning.dark"
                    : "success.dark",
              },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Preview Dialog (frontend-generated) */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>QR Code</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "#6B7280", textAlign: "center" }}>{qrTitle}</Typography>
          {qrValue ? (
            <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E5E7EB" }}>
              <QRCodeCanvas id="masterItemStockQrCanvas" value={qrValue} size={220} includeMargin />
            </Box>
          ) : null}
          <Typography sx={{ fontSize: 11, color: "#6B7280", wordBreak: "break-all", textAlign: "center" }}>
            {qrValue}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setQrOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const canvas = document.getElementById("masterItemStockQrCanvas");
              if (!canvas || typeof canvas.toDataURL !== "function") return;
              const dataUrl = canvas.toDataURL("image/png");
              const a = document.createElement("a");
              a.href = dataUrl;
              a.download = `${(qrTitle || "inventory-qr").replace(/[\\/:*?"<>|]+/g, "_")}.png`.slice(0, 120);
              a.click();
            }}
            sx={{ borderRadius: 2 }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer dialog (intelligent: choose From/To, qty defaults to available) */}
      <MasterItemStockTransferDialog
        open={transferOpen}
        masterItemId={selected?.id ?? item?.id ?? null}
        itemName={selected?.item_name || item?.item_name || item?.name || ""}
        stockRows={stockRows}
        onClose={() => {
          setTransferOpen(false);
        }}
        onSuccess={() => {
          const itemNameForStock = (selected?.item_name || item?.item_name || item?.name || "").trim();
          if (itemNameForStock) {
            fetchStockSummaryByName(itemNameForStock);
          }
          setReloadNonce((n) => n + 1);
        }}
        apiBase="http://localhost:8080"
        transferApiBase="http://localhost:8080"
        warehouseOptions={transferWarehouseOptions}
        locationOptions={transferLocationOptions}
      />
    </>
  );
}
