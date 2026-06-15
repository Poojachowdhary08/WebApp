// src/components/InventoryList.js
// ✅ LIST/CARD view toggle + premium card renderer
// ✅ Added: Excel export (full data + filter/search/sort wise)
// ✅ Did NOT delete existing functionality (filters, sorting, QR dialog, pagination, admin dialogs, loading batches)

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
  DialogTitle,
  Snackbar,
  Alert,
  Tooltip,
  DialogContent,
  DialogActions,
  TablePagination,
  IconButton,
  Stack,
  Select,
  MenuItem,
  LinearProgress,
  TableSortLabel,
  Grid,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import TuneIcon from "@mui/icons-material/Tune";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import axios from "axios";
import StockAdjustment from "./StockAdjustment";
import BulkStockTransferDialog from "./BulkStockTransferDialog";
import LocationPriceSummaryDialog from "./LocationPriceSummaryDialog";
import { StatusBox } from "../ui/StatusBox";
import { QRCodeCanvas } from "qrcode.react";
import { buildInventoryQrValue } from "../utils/inventoryQr";
import JSZip from "jszip";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

// ✅ Excel deps
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------------------------------- API base ---------------------------------- */
const API_BASE = "http://localhost:8080";

/* ---------------------------------- Styles ---------------------------------- */
const sectionPaper = { p: 2, backgroundColor: "#fff", borderRadius: 2, marginTop: "-15px" };

const GRID_BORDER = "1px solid #e5e7eb";

const headCell = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0F172A",
  backgroundColor: "#F8FAFC",
  textTransform: "uppercase",
  border: GRID_BORDER,
  whiteSpace: "nowrap",
};

const bodyCell = {
  fontSize: 13,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  border: GRID_BORDER,
  py: 1,
};

const bodyRow = {
  "&:hover": { backgroundColor: "#F9FAFB" },
};

// ✅ Card pagination fixed
const CARDS_PER_PAGE = 12;

/* ---------------------------------- Shared helpers ---------------------------------- */
const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);
const normalizeKey = (v) => String(v ?? "").trim().toLowerCase();

const toGB = (v) => {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB");
  } catch {
    return "—";
  }
};

const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const ellipsize = (s, n = 26) => {
  const t = String(s || "");
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
};

const toCamelCase = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());

/* =================================================================================
   Component
================================================================================= */
const InventoryList = ({ viewMode = "list", onViewModeChange }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const [itemNameFilter, setItemNameFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("IN_STOCK"); // ALL | IN_STOCK | OUT_OF_STOCK
  const [searchQuery, setSearchQuery] = useState("");

  const [sortConfig, setSortConfig] = useState({ key: "item_name", direction: "asc" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  const [stockAdjustmentOpen, setStockAdjustmentOpen] = useState(false);
  const [priceSummaryOpen, setPriceSummaryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // ✅ Excel downloading state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingQrZip, setDownloadingQrZip] = useState(false);
  const [qrZipProgress, setQrZipProgress] = useState({ done: 0, total: 0 });
  const [qrZipPhase, setQrZipPhase] = useState("idle"); // idle | generating | zipping
  const [printingQrPdf, setPrintingQrPdf] = useState(false);
  const [printingQrProgress, setPrintingQrProgress] = useState({ done: 0, total: 0 });
  const [printingZipPct, setPrintingZipPct] = useState(0);
  const [printingPhase, setPrintingPhase] = useState("idle"); // idle | generating | zipping
  const printCancelRef = useRef(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewItems, setPrintPreviewItems] = useState([]);
  const [largePdfWarnOpen, setLargePdfWarnOpen] = useState(false);
  const [largePdfWarnCount, setLargePdfWarnCount] = useState(0);
  const [pdfLayout, setPdfLayout] = useState("2x2"); // 1x1 | 2x2 | 3x3 | 4x4
  const qrWorkerRef = useRef(null);

  const roleString = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = roleString.includes("admin");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // QR sizing: keep it large for payment-app scanners
  const QR_PREVIEW_SIZE = 320;

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress({ current: 0, total: 0 });

      const firstResponse = await axios.get(`${API_BASE}/all-inventory`, {
        params: { limit: 100, offset: 0 },
      });

      const firstData = firstResponse.data || {};
      let allInventory = firstData.inventory || [];
      const total = firstData.total || 0;
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      setInventory(allInventory);
      setLoading(false);
      setLoadingProgress({ current: 1, total: totalPages });

      if (firstData.has_more && totalPages > 1) {
        const batchSize = 10;
        const remainingPages = totalPages - 1;
        const pageResults = new Map();

        const allBatchPromises = [];
        for (let batchStart = 1; batchStart <= remainingPages; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, remainingPages);
          const batchPromises = [];

          for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
            const offset = pageNum * limit;
            batchPromises.push(
              axios
                .get(`${API_BASE}/all-inventory`, { params: { limit, offset } })
                .then((response) => ({ page: pageNum, inventory: response.data?.inventory || [] }))
            );
          }

          allBatchPromises.push(
            Promise.all(batchPromises).then((batchResults) => {
              batchResults.forEach(({ page, inventory }) => pageResults.set(page, inventory));

              const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
              const mergedInventory = [];
              sortedPages.forEach((p) => {
                const chunk = pageResults.get(p);
                if (Array.isArray(chunk)) mergedInventory.push(...chunk);
              });

              const allMerged = [...(firstData.inventory || []), ...mergedInventory];
              setInventory(allMerged);

              const completedCount = pageResults.size + 1;
              setLoadingProgress({ current: completedCount, total: totalPages });
            })
          );
        }

        await Promise.all(allBatchPromises);

        const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
        sortedPages.forEach((p) => {
          const chunk = pageResults.get(p);
          if (Array.isArray(chunk)) allInventory = [...allInventory, ...chunk];
        });
      }

      setInventory(allInventory);
      setLoadingProgress({ current: 0, total: 0 });
      setError(null);
    } catch (err) {
      setError(err?.message || "Unable to fetch inventory. Please try again later.");
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const itemNameOptions = useMemo(() => {
    // ✅ case-insensitive dedupe (so 'nano' and 'NANO' show as one option)
    const seen = new Map(); // lower -> label
    inventory.forEach((x) => {
      const name = String(x.item_name || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    });
    return ["ALL", ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [inventory]);

  const warehouseOptions = useMemo(() => {
    const seen = new Map();
    inventory.forEach((x) => {
      const w = String(x.warehouse || "").trim();
      if (!w) return;
      const key = w.toLowerCase();
      if (!seen.has(key)) seen.set(key, w);
    });
    ["Serene Grande", "Serene Homes"].forEach((w) => {
      const key = w.toLowerCase();
      if (!seen.has(key)) seen.set(key, w);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [inventory]);

  const locationOptions = useMemo(() => {
    const seen = new Map();
    inventory.forEach((x) => {
      const loc = String(x.location || "").trim();
      if (!loc) return;
      const key = loc.toLowerCase();
      if (!seen.has(key)) seen.set(key, loc);
    });
    return ["ALL", ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedItemKey =
      !itemNameFilter || itemNameFilter === "ALL" ? "" : normalizeKey(itemNameFilter);

    return inventory.filter((item) => {
      const nameOk =
        !selectedItemKey || normalizeKey(item.item_name) === selectedItemKey;

      const locOk =
        !locationFilter ||
        locationFilter === "ALL" ||
        String(item.location || "").trim().toLowerCase() === String(locationFilter || "").toLowerCase();

      const qty = Number(item.quantity ?? 0);
      const quantityOk =
        quantityFilter === "ALL" ||
        (quantityFilter === "IN_STOCK" && qty > 0) ||
        (quantityFilter === "OUT_OF_STOCK" && qty === 0);

      const searchOk =
        !query ||
        [item.item_name, item.location, item.warehouse, item.inv_id, item.item_id, item.id]
          .map((field) => String(field ?? "").toLowerCase())
          .some((text) => text.includes(query));

      return nameOk && locOk && quantityOk && searchOk;
    });
  }, [inventory, itemNameFilter, locationFilter, quantityFilter, searchQuery]);

  const sortedInventory = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return [...filteredInventory].sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];

      if (key === "updated_date_ist") {
        const da = new Date(av).getTime() || 0;
        const db = new Date(bv).getTime() || 0;
        return dir * (da - db);
      }

      if (typeof av === "number" && typeof bv === "number") return dir * (av - bv);

      av = String(av ?? "").toLowerCase();
      bv = String(bv ?? "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredInventory, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const handleQrCodeClick = (invRow) => {
    const itemNameRaw = String(invRow?.item_name ?? invRow?.itemName ?? invRow?.name ?? "");
    const locationRaw = String(invRow?.location ?? invRow?.parsed_location ?? "");
    const warehouseRaw = String(invRow?.warehouse ?? invRow?.parsed_warehouse ?? "");

    const qrValue =
      itemNameRaw && locationRaw && warehouseRaw
        ? buildInventoryQrValue({
            parsed_item_name: itemNameRaw,
            parsed_location: locationRaw,
            parsed_warehouse: warehouseRaw,
          })
        : "";

    setQrCodeData({
      itemName: itemNameRaw.trim() || "Unknown Item",
      location: locationRaw.trim(),
      warehouse: warehouseRaw.trim(),
      qrValue,
      mode: "generated",
    });
    setDialogOpen(true);
  };

  // ✅ page size depends on view mode
  const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;

  const paginated = useMemo(
    () =>
      sortedInventory.slice(
        page * effectiveRowsPerPage,
        page * effectiveRowsPerPage + effectiveRowsPerPage
      ),
    [sortedInventory, page, effectiveRowsPerPage]
  );

  const handleClearFilters = () => {
    setItemNameFilter("");
    setLocationFilter("");
    setQuantityFilter("ALL");
    setSearchQuery("");
    setPage(0);
  };

  const filtersActive = useMemo(() => {
    const itemActive = itemNameFilter && itemNameFilter !== "ALL";
    const locationActive = locationFilter && locationFilter !== "ALL";
    const quantityActive = quantityFilter && quantityFilter !== "ALL";
    return Boolean(searchQuery.trim() || itemActive || locationActive || quantityActive);
  }, [itemNameFilter, locationFilter, quantityFilter, searchQuery]);

  const renderViewToggle = () => (
    <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
      <ToggleButtonGroup
        exclusive
        value={viewMode}
        onChange={(_e, next) => {
          if (!next) return;
          setPage(0);
          onViewModeChange?.(next);
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

  // ✅ Excel export: full filtered + sorted rows
  const exportExcel = async () => {
    try {
      setDownloadingExcel(true);

      const rows = (sortedInventory || []).map((item) => ({
        "Inventory ID": safe(item.inv_id),
        "Item Name": capWords(item.item_name),
        Location: capWords(item.location),
        Warehouse: capWords(item.warehouse),
        Quantity: Number(item.quantity ?? 0),
        "Updated Date": toGB(item.updated_date_ist),
        "QR Available": item.qr_code_path ? "YES" : "NO",
      }));

      const sheet = XLSX.utils.json_to_sheet(rows);

      // ✅ Nice column widths
      sheet["!cols"] = [
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Inventory");

      const itemTag =
        itemNameFilter && itemNameFilter !== "ALL" ? `Item-${itemNameFilter}` : "AllItems";
      const locTag =
        locationFilter && locationFilter !== "ALL" ? `Loc-${locationFilter}` : "AllLocations";
      const qtyTag =
        quantityFilter === "IN_STOCK" ? "InStock" : quantityFilter === "OUT_OF_STOCK" ? "OutOfStock" : "AllStock";
      const searchTag = searchQuery.trim() ? `Search-${searchQuery.trim()}` : "NoSearch";

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");

      const fileName = `Inventory_${itemTag}_${locTag}_${qtyTag}_${searchTag}_${yyyy}-${mm}-${dd}.xlsx`
        .replace(/[\\/:*?"<>|]+/g, "_")
        .slice(0, 180);

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, fileName);
    } catch (e) {
      console.error("Excel export failed:", e);
      alert("Excel export failed. Please try again.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const buildLabeledQrPngDataUrl = async ({ qrDataUrl, title, subtitle }) => {
    const img = new Image();
    img.decoding = "async";
    img.src = String(qrDataUrl || "");

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const pad = 16;
    const titleFont = "bold 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const subtitleFont = "600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return qrDataUrl;

    const safeTitle = String(title || "").trim();
    const safeSubtitle = String(subtitle || "").trim();

    // Measure text heights
    let textHeight = 0;
    if (safeTitle) textHeight += 26;
    if (safeSubtitle) textHeight += 18;
    if (textHeight) textHeight += 10; // gap between text and QR

    const qrW = img.width || 512;
    const qrH = img.height || 512;

    canvas.width = qrW + pad * 2;
    canvas.height = qrH + pad * 2 + textHeight;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    let y = pad + 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#111827";
    if (safeTitle) {
      ctx.font = titleFont;
      ctx.fillText(safeTitle.slice(0, 60), canvas.width / 2, y + 20);
      y += 26;
    }
    if (safeSubtitle) {
      ctx.font = subtitleFont;
      ctx.fillStyle = "#6B7280";
      ctx.fillText(safeSubtitle.slice(0, 80), canvas.width / 2, y + 14);
      y += 18;
    }

    const qrY = pad + textHeight;
    ctx.drawImage(img, pad, qrY, qrW, qrH);

    return canvas.toDataURL("image/png");
  };

  const getPrintableRows = () => {
    const rows = sortedInventory;
    return (rows || [])
      .map((r) => {
        const itemName = String(r?.item_name ?? r?.itemName ?? r?.name ?? "");
        const location = String(r?.location ?? r?.parsed_location ?? "");
        const warehouse = String(r?.warehouse ?? r?.parsed_warehouse ?? "");
        return { itemName, location, warehouse };
      })
      .filter((x) => x.itemName.trim() && x.location.trim() && x.warehouse.trim());
  };

  const getPdfLayoutConfig = () => {
    const layout = String(pdfLayout || "2x2");
    if (layout === "1x1") return { cols: 1, rows: 1 };
    if (layout === "3x3") return { cols: 3, rows: 3 };
    if (layout === "4x4") return { cols: 4, rows: 4 };
    return { cols: 2, rows: 2 };
  };

  const terminateQrWorker = () => {
    try {
      qrWorkerRef.current?.terminate?.();
    } catch {
      // ignore
    } finally {
      qrWorkerRef.current = null;
    }
  };

  const generateQrDataUrlsInWorker = async (values, { baseDone = 0, grandTotal = 0 } = {}) => {
    if (typeof Worker === "undefined") return null;

    terminateQrWorker();
    const worker = new Worker(new URL("../workers/qrPdf.worker.js", import.meta.url), { type: "module" });
    qrWorkerRef.current = worker;

    return await new Promise((resolve, reject) => {
      const cleanup = () => {
        try {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
        } catch {
          // ignore
        }
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const onMessage = (ev) => {
        const msg = ev?.data;
        if (!msg) return;
        if (msg.type === "PROGRESS") {
          const done = Number(msg?.payload?.done ?? 0);
          const total = Number(msg?.payload?.total ?? 0);
          if (total) {
            const overallTotal = grandTotal || total;
            setPrintingQrProgress({ done: baseDone + done, total: overallTotal });
          }
          return;
        }
        if (msg.type === "DONE") {
          cleanup();
          resolve(Array.isArray(msg?.payload?.dataUrls) ? msg.payload.dataUrls : null);
          return;
        }
        if (msg.type === "ERROR") {
          cleanup();
          reject(new Error(String(msg?.payload?.message || "Worker error")));
        }
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage({ type: "GENERATE", payload: { values, options: { width: 384, margin: 1 } } });
    });
  };

  const printA4Qrs4Up = async () => {
    try {
      if (printingQrPdf) return;

      const printable = getPrintableRows();
      if (!printable.length) {
        alert("No items to print.");
        return;
      }

      setPrintingQrPdf(true);
      setPrintingQrProgress({ done: 0, total: 0 });
      setPrintingZipPct(0);
      setPrintingPhase("generating");
      printCancelRef.current = false;
      terminateQrWorker();

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const { cols, rows: rowsPerPage } = getPdfLayoutConfig();
      const perPage = cols * rowsPerPage;
      const margin = cols >= 4 ? 7 : cols === 3 ? 8 : 10;
      const gap = cols >= 4 ? 3 : cols === 3 ? 4 : 6;

      const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
      const cellH = (pageH - margin * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;
      const headerH = cols === 1 ? 26 : cols === 2 ? 18 : cols === 3 ? 14 : 12; // title+meta area
      const qrSize = Math.max(cols === 1 ? 110 : cols === 2 ? 60 : cols === 3 ? 42 : 28, Math.min(cellW, cellH - headerH) - 8);

      const titleFontSize = cols === 1 ? 16 : cols === 2 ? 11 : cols === 3 ? 8.5 : 7.5;
      const metaFontSize = cols === 1 ? 12 : cols === 2 ? 9 : cols === 3 ? 7 : 6.5;

      setPrintingQrProgress({ done: 0, total: printable.length });
      let failed = 0;

      // Auto-split: 100 items per PDF (Part-1, Part-2, ...)
      const CHUNK_SIZE = 100;
      const totalParts = Math.ceil(printable.length / CHUNK_SIZE);

      let overallDone = 0;
      const zip = new JSZip();
      const zipFolder = zip.folder("a4-pdfs");
      for (let part = 0; part < totalParts; part += 1) {
        if (printCancelRef.current) throw new Error("PRINT_CANCELLED");

        const start = part * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, printable.length);
        const chunk = printable.slice(start, end);

        const partPdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

        // Precompute QR values for this chunk, generate dataURLs in a worker.
        const values = chunk.map((it) =>
          buildInventoryQrValue({
            parsed_item_name: it.itemName,
            parsed_location: it.location,
            parsed_warehouse: it.warehouse,
          })
        );
        const workerDataUrls = await generateQrDataUrlsInWorker(values, {
          baseDone: overallDone,
          grandTotal: printable.length,
        });
        if (printCancelRef.current) throw new Error("PRINT_CANCELLED");

        for (let i = 0; i < chunk.length; i += perPage) {
          if (printCancelRef.current) throw new Error("PRINT_CANCELLED");
          if (i > 0) partPdf.addPage();
          const pageItems = chunk.slice(i, i + perPage);

          // If the page isn't full (e.g. only 1 item), center the used block.
          const count = pageItems.length;
          const usedCols = Math.min(cols, Math.max(1, count));
          const usedRows = Math.max(1, Math.ceil(count / cols));
          const usedW = usedCols * cellW + (usedCols - 1) * gap;
          const usedH = usedRows * cellH + (usedRows - 1) * gap;
          const xStart = margin + (pageW - margin * 2 - usedW) / 2;
          const yStart = margin + (pageH - margin * 2 - usedH) / 2;

          for (let j = 0; j < pageItems.length; j++) {
            if (printCancelRef.current) throw new Error("PRINT_CANCELLED");
            const it = pageItems[j];
            const col = j % cols;
            const row = Math.floor(j / cols);
            const index = i + j; // index within this chunk

            const x0 = xStart + col * (cellW + gap);
            const y0 = yStart + row * (cellH + gap);

            // Light border + cut marks for easy trimming
            partPdf.setDrawColor(229, 231, 235);
            partPdf.setLineWidth(0.2);
            partPdf.rect(x0, y0, cellW, cellH);

            // Cut marks (small corner ticks)
            partPdf.setDrawColor(209, 213, 219);
            partPdf.setLineWidth(0.3);
            const tick = 3; // mm
            // top-left
            partPdf.line(x0, y0, x0 + tick, y0);
            partPdf.line(x0, y0, x0, y0 + tick);
            // top-right
            partPdf.line(x0 + cellW - tick, y0, x0 + cellW, y0);
            partPdf.line(x0 + cellW, y0, x0 + cellW, y0 + tick);
            // bottom-left
            partPdf.line(x0, y0 + cellH - tick, x0, y0 + cellH);
            partPdf.line(x0, y0 + cellH, x0 + tick, y0 + cellH);
            // bottom-right
            partPdf.line(x0 + cellW, y0 + cellH - tick, x0 + cellW, y0 + cellH);
            partPdf.line(x0 + cellW - tick, y0 + cellH, x0 + cellW, y0 + cellH);

            // Title: wrap up to 2 lines
            partPdf.setFont("helvetica", "bold");
            partPdf.setFontSize(titleFontSize);
            const titleLines = partPdf.splitTextToSize(String(it.itemName || ""), cellW - 6).slice(0, 2);
            const titleY = y0 + (cols === 1 ? 10 : cols === 2 ? 7.5 : cols === 3 ? 6.2 : 5.6);
            if (titleLines.length === 1) {
              partPdf.text(titleLines[0], x0 + cellW / 2, titleY, { align: "center" });
            } else if (titleLines.length >= 2) {
              partPdf.text(titleLines[0], x0 + cellW / 2, titleY - 1.2, { align: "center" });
              partPdf.text(titleLines[1], x0 + cellW / 2, titleY + 3.4, { align: "center" });
            }

            partPdf.setFont("helvetica", "normal");
            partPdf.setFontSize(metaFontSize);
            const meta = `${it.location} • ${it.warehouse}`;
            const metaLine = (partPdf.splitTextToSize(meta, cellW - 6)[0] || "").trim();
            partPdf.text(
              metaLine,
              x0 + cellW / 2,
              y0 + (cols === 1 ? 18 : cols === 2 ? 16 : cols === 3 ? 11.2 : 10.2),
              { align: "center" }
            );

            // Prefer worker-generated dataURLs; fallback to main thread if worker unavailable.
            let qrDataUrl = workerDataUrls?.[index] || "";
            if (!qrDataUrl) {
              try {
                // eslint-disable-next-line no-await-in-loop
                qrDataUrl = await QRCode.toDataURL(values[index], { margin: 1, width: 384, errorCorrectionLevel: "M" });
              } catch {
                // Retry with smaller QR (helps when memory/CPU is tight)
                try {
                  // eslint-disable-next-line no-await-in-loop
                  qrDataUrl = await QRCode.toDataURL(values[index], { margin: 1, width: 256, errorCorrectionLevel: "M" });
                } catch {
                  failed += 1;
                  qrDataUrl = "";
                }
              }
            }

            const qrX = x0 + (cellW - qrSize) / 2;
            const qrY = y0 + headerH;
            if (qrDataUrl) {
              // "FAST" reduces CPU/memory pressure a bit for big PDFs.
              try {
                partPdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
              } catch {
                failed += 1;
              }
            }

            // Yield so the tab doesn't freeze/"Not responding".
            if ((index + 1) % 6 === 0) {
              // eslint-disable-next-line no-await-in-loop
              await new Promise((res) => setTimeout(res, 0));
            }
          }
        }

        // Update overall progress after finishing this part
        overallDone += chunk.length;
        setPrintingQrProgress({ done: overallDone, total: printable.length });

        const partName = `Stock-QRs-A4-${cols}x${rowsPerPage}-Part-${part + 1}-of-${totalParts}-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`;
        const partBlob = partPdf.output("blob");
        zipFolder.file(partName, partBlob);

        // Yield between parts to keep UI responsive.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 0));
      }

      if (printCancelRef.current) throw new Error("PRINT_CANCELLED");
      if (failed >= printable.length) {
        alert("QR print failed for all items. Please try again with fewer items (use filters/search).");
        return;
      }

      setPrintingPhase("zipping");
      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          const pct = Math.max(0, Math.min(100, Math.round(Number(metadata?.percent ?? 0))));
          setPrintingZipPct(pct);
        }
      );
      saveAs(
        zipBlob,
        `Stock-QRs-A4-${cols}x${rowsPerPage}-${new Date().toISOString().slice(0, 10)}.zip`
      );
      if (failed > 0) {
        alert(`PDF downloaded, but ${failed} item(s) were skipped due to QR generation errors. Try again with filters/search for those items.`);
      }
    } catch (e) {
      if (String(e?.message || e) === "PRINT_CANCELLED") return;
      console.error("Print QR PDF failed:", e);
      alert("Print QR PDF failed. Please try again.");
    } finally {
      terminateQrWorker();
      setPrintingQrPdf(false);
      setPrintingQrProgress({ done: 0, total: 0 });
      setPrintingZipPct(0);
      setPrintingPhase("idle");
      printCancelRef.current = false;
    }
  };

  const massDownloadQrs = async () => {
    try {
      if (downloadingQrZip) return;

      // Use the same set user is looking at (filtered + sorted).
      const rows = sortedInventory;
      if (!rows?.length) {
        alert("No items to download.");
        return;
      }

      setDownloadingQrZip(true);
      setQrZipPhase("generating");
      setQrZipProgress({ done: 0, total: rows.length });

      const zip = new JSZip();
      const folder = zip.folder("stock-qrs");

      let done = 0;
      for (const r of rows) {
        const itemName = String(r?.item_name ?? r?.itemName ?? r?.name ?? "");
        const location = String(r?.location ?? r?.parsed_location ?? "");
        const warehouse = String(r?.warehouse ?? r?.parsed_warehouse ?? "");

        // Only generate if we have all parts (same requirement as single QR dialog).
        if (itemName && location && warehouse) {
          const value = buildInventoryQrValue({
            parsed_item_name: itemName,
            parsed_location: location,
            parsed_warehouse: warehouse,
          });

          // Higher resolution helps scanning (especially from printed sheets / pay-app scanners)
          const dataUrl = await QRCode.toDataURL(value, { margin: 2, width: 1024 });
          const labeledUrl = await buildLabeledQrPngDataUrl({
            qrDataUrl: dataUrl,
            title: itemName,
            subtitle: `${location}${location && warehouse ? " • " : ""}${warehouse}`,
          });
          const base64 = String(labeledUrl).split(",")[1] || "";

          const safeBase = `${itemName}__${location}__${warehouse}`
            .replace(/[\\/:*?"<>|]+/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 140);

          if (base64) {
            folder.file(`${safeBase}-QRCode.png`, base64, { base64: true });
          }
        }

        done += 1;
        if (done % 5 === 0 || done === rows.length) {
          setQrZipProgress({ done, total: rows.length });
          // Yield to UI to avoid long main-thread stalls on huge lists.
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 0));
        }
      }

      setQrZipPhase("zipping");
      // JSZip zipping can take time for large exports; surface progress.
      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          // metadata.percent is 0..100
          const pct = Math.max(0, Math.min(100, Math.round(Number(metadata?.percent ?? 0))));
          // Reuse the same progress state; keep total=100 during zipping.
          setQrZipProgress({ done: pct, total: 100 });
        }
      );
      const fileName = `Stock-QRs-${new Date().toISOString().slice(0, 10)}.zip`;
      saveAs(zipBlob, fileName);
    } catch (e) {
      console.error("Mass QR download failed:", e);
      alert("Mass QR download failed. Please try again.");
    } finally {
      setDownloadingQrZip(false);
      setQrZipPhase("idle");
      setQrZipProgress({ done: 0, total: 0 });
    }
  };

  const renderCards = () => (
    <Box>
      <Grid container spacing={2}>
        {paginated.map((item) => {
          const itemName = safe(item.item_name, "Unknown");
          const invId = safe(item.inv_id, "—");
          const location = safe(item.location, "Unknown");
          const warehouse = safe(item.warehouse, "Unknown");
          const qty = Number(item.quantity ?? 0);
          const updated = toGB(item.updated_date_ist);

          const isOutOfStockCard = qty === 0;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.inv_id}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  bgcolor: isOutOfStockCard ? "#FEF2F2" : "#FFFFFF",
                  border: isOutOfStockCard ? "1px solid #FECACA" : "1px solid #E5E7EB",
                  boxShadow: "0px 10px 30px rgba(15,23,42,0.06)",
                  overflow: "hidden",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0px 14px 36px rgba(15,23,42,0.10)",
                  },
                }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 2,
                      bgcolor: "#E8EEFF",
                      border: "1px solid #E5E7EB",
                      flex: "0 0 auto",
                    }}
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }} title={invId}>
                      {invId}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#111827",
                        lineHeight: 1.1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={capWords(itemName)}
                    >
                      {capWords(itemName)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#6B7280",
                        mt: 0.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={`${location} • ${warehouse}`}
                    >
                      {capWords(location)} • {ellipsize(capWords(warehouse), 22)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Tooltip title="View QR">
                      <IconButton
                        aria-label="View QR code"
                        size="small"
                        onClick={() => handleQrCodeClick(item)}
                        sx={{
                          border: "1px solid #E5E7EB",
                          bgcolor: "#fff",
                          borderRadius: 2,
                          "&:hover": { bgcolor: "#F9FAFB" },
                        }}
                      >
                        <QrCode2Icon sx={{ fontSize: 18, color: "#2563EB" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                <Divider />

                <Box sx={{ p: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Qty</Typography>
                      <Typography
                        sx={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: isOutOfStockCard ? "#B91C1C" : "#111827",
                        }}
                      >
                        {Number.isFinite(qty) ? qty : safe(item.quantity, 0)}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Location</Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "#111827",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={capWords(location)}
                      >
                        {capWords(location)}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Warehouse</Typography>
                      <Stack direction="row" spacing={0.6} alignItems="center">
                        <WarehouseIcon sx={{ fontSize: 16, color: "#64748B" }} />
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={capWords(warehouse)}
                        >
                          {ellipsize(capWords(warehouse), 18)}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Last Updated</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {updated}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<QrCode2Icon />}
                      onClick={() => handleQrCodeClick(item)}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 900,
                        height: 32,
                        px: 1.5,
                      }}
                    >
                      View QR
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {paginated.length === 0 && (
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
              <Typography variant="body2">No items found.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <TablePagination
        component="div"
        count={sortedInventory.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={effectiveRowsPerPage}
        rowsPerPageOptions={viewMode === "cards" ? [CARDS_PER_PAGE] : [50, 100, 150]}
        onRowsPerPageChange={(e) => {
          if (viewMode === "cards") return;
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ "& .MuiTablePagination-toolbar": { minHeight: 40 }, mt: 1 }}
      />
    </Box>
  );

  const renderTable = () => (
    <>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          border: GRID_BORDER,
          maxHeight: 560,
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: "fixed",
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ ...headCell, width: 220 }}
                sortDirection={sortConfig.key === "item_name" ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig.key === "item_name"}
                  direction={sortConfig.key === "item_name" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("item_name")}
                >
                  Item
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{ ...headCell, width: 160 }}
                sortDirection={sortConfig.key === "location" ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig.key === "location"}
                  direction={sortConfig.key === "location" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("location")}
                >
                  Location
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{ ...headCell, width: 160 }}
                sortDirection={sortConfig.key === "warehouse" ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig.key === "warehouse"}
                  direction={sortConfig.key === "warehouse" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("warehouse")}
                >
                  Warehouse
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{ ...headCell, width: 90, textAlign: "center" }}
                sortDirection={sortConfig.key === "quantity" ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig.key === "quantity"}
                  direction={sortConfig.key === "quantity" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("quantity")}
                >
                  Qty
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{ ...headCell, width: 180 }}
                sortDirection={sortConfig.key === "updated_date_ist" ? sortConfig.direction : false}
              >
                <TableSortLabel
                  active={sortConfig.key === "updated_date_ist"}
                  direction={sortConfig.key === "updated_date_ist" ? sortConfig.direction : "asc"}
                  onClick={() => handleSort("updated_date_ist")}
                >
                  Updated
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ ...headCell, width: 120, textAlign: "center" }}>QR</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((item) => {
                const qty = Number(item.quantity ?? 0);
                const isOutOfStock = qty === 0;
                return (
                <TableRow
                  key={item.inv_id}
                  hover
                  sx={{
                    ...bodyRow,
                    ...(isOutOfStock && {
                      backgroundColor: "rgba(254, 226, 226, 0.4)",
                      "&:hover": { backgroundColor: "rgba(254, 226, 226, 0.6)" },
                    }),
                  }}
                >
                  <TableCell sx={{ ...bodyCell, width: 220 }}>
                    <Tooltip title={item.item_name || ""} arrow>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                        {safe(item.item_name, "Unknown")}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  <TableCell sx={{ ...bodyCell, width: 160 }}>
                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                      {safe(item.location, "Unknown")}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ ...bodyCell, width: 160 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <WarehouseIcon sx={{ fontSize: 16, color: "#64748B" }} />
                      <Typography variant="body2">{safe(item.warehouse, "Unknown")}</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell
                    sx={{
                      ...bodyCell,
                      width: 90,
                      textAlign: "center",
                      fontWeight: 900,
                      ...(isOutOfStock && { color: "#B91C1C" }),
                    }}
                  >
                    {safe(item.quantity, 0)}
                  </TableCell>

                  <TableCell sx={{ ...bodyCell, width: 180 }}>
                    <Typography variant="body2">{toGB(item.updated_date_ist)}</Typography>
                  </TableCell>

                  <TableCell sx={{ ...bodyCell, width: 120, textAlign: "center" }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<QrCode2Icon />}
                      onClick={() => handleQrCodeClick(item)}
                      sx={{ borderRadius: 999, height: 26, px: 1 }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} sx={{ ...bodyCell, textAlign: "center", py: 4 }}>
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[50, 100, 150]}
        component="div"
        count={sortedInventory.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ "& .MuiTablePagination-toolbar": { minHeight: 40 } }}
      />
    </>
  );

  return (
    <Paper elevation={0} sx={sectionPaper}>
      {/* Top controls */}
      <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="h6" fontWeight={900} color="#111827" />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* PDF layout */}
          <Tooltip title="PDF layout (QRs per page) — recommended: 2×2">
            <Select
              value={pdfLayout}
              onChange={(e) => setPdfLayout(e.target.value)}
              size="small"
              sx={{ width: 110, backgroundColor: "#fff", borderRadius: 2, height: 36 }}
            >
              <MenuItem value="1x1">1×1</MenuItem>
              <MenuItem value="2x2">2×2</MenuItem>
              <MenuItem value="3x3">3×3</MenuItem>
              <MenuItem value="4x4">4×4</MenuItem>
            </Select>
          </Tooltip>
          <TextField
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            size="small"
            placeholder="Search by item, location, warehouse, ID"
            sx={{ width: 260, backgroundColor: "#fff", borderRadius: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Select
            value={itemNameFilter || "ALL"}
            onChange={(e) => {
              setItemNameFilter(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ width: 200, backgroundColor: "#fff", borderRadius: 2, height: 36 }}
          >
            {itemNameOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === "ALL" ? toCamelCase("All Items") : toCamelCase(opt)}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={locationFilter || "ALL"}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ width: 200, backgroundColor: "#fff", borderRadius: 2, height: 36 }}
          >
            {locationOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt === "ALL" ? toCamelCase("All Locations") : toCamelCase(opt)}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={quantityFilter || "ALL"}
            onChange={(e) => {
              setQuantityFilter(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ width: 180, backgroundColor: "#fff", borderRadius: 2, height: 36 }}
            displayEmpty
          >
            <MenuItem value="ALL">{toCamelCase("All stock")}</MenuItem>
            <MenuItem value="IN_STOCK">{toCamelCase("In stock")}</MenuItem>
            <MenuItem value="OUT_OF_STOCK">{toCamelCase("Out of stock (qty = 0)")}</MenuItem>
          </Select>

          <Tooltip title="Clear filters">
            <span>
              <Button
                onClick={handleClearFilters}
                size="small"
                variant="outlined"
                startIcon={<FilterAltOffIcon />}
                disabled={!filtersActive}
              >
                Clear
              </Button>
            </span>
          </Tooltip>

          {/* ✅ Download Excel */}
          <Tooltip title="Download Excel (Filtered + Sorted)">
            <span>
              <Button
                onClick={exportExcel}
                size="small"
                disabled={downloadingExcel || loading}
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  borderRadius: 2,
                }}
              >
              ⬇️  
              </Button>
            </span>
          </Tooltip>

          {/* ✅ Download A4 PDF (QR icon) */}
          <Tooltip title="Preview → Download A4 PDF (4 QRs/page, 2x2). Click again to cancel while generating. Recommended: filter/search first">
            <span>
              <IconButton
                aria-label="Download A4 PDF"
                onClick={() => {
                  if (printingQrPdf) {
                    printCancelRef.current = true;
                    terminateQrWorker();
                    return;
                  }
                  const printable = getPrintableRows();
                  if (printable.length > 500) {
                    setLargePdfWarnCount(printable.length);
                    setLargePdfWarnOpen(true);
                    return;
                  }
                  const { cols, rows } = getPdfLayoutConfig();
                  setPrintPreviewItems(printable.slice(0, cols * rows));
                  setPrintPreviewOpen(true);
                }}
                disabled={printingQrPdf || loading || sortedInventory.length === 0}
                size="small"
                sx={{
                  border: "1px solid #E5E7EB",
                  bgcolor: "#fff",
                  borderRadius: 2,
                  height: 36,
                  width: 36,
                  "&:hover": { bgcolor: "#F9FAFB" },
                }}
              >
                {printingQrPdf ? (
                  <Typography sx={{ fontSize: 10, fontWeight: 900, color: "#2563EB" }}>
                    {printingPhase === "zipping"
                      ? `${printingZipPct}%`
                      : printingQrProgress.total
                      ? `${printingQrProgress.done}/${printingQrProgress.total}`
                      : "…"}
                  </Typography>
                ) : (
                  <QrCode2Icon sx={{ fontSize: 18, color: "#2563EB" }} />
                )}
              </IconButton>
            </span>
          </Tooltip>

          {/* ✅ View toggle */}
          {renderViewToggle()}

          {/*
            Transfer icon hidden as requested.
            (Keeping transfer dialog logic intact for potential re-enable later.)
          */}

          {isAdmin && (
            <Tooltip title="Adjust Stock">
              <IconButton
                aria-label="Adjust stock"
                color="primary"
                size="small"
                onClick={() => setStockAdjustmentOpen(true)}
              >
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {isAdmin && (
            <Tooltip title="Location value summary">
              <IconButton
                aria-label="View location value summary"
                color="primary"
                size="small"
                onClick={() => setPriceSummaryOpen(true)}
              >
                <MonetizationOnOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Loading state */}
      {loading && inventory.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
          <CircularProgress size={24} />
          {loadingProgress.total > 0 && (
            <Box sx={{ width: "100%", maxWidth: 420 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                Loading inventory... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Box>
      ) : (
        <>
          {loadingProgress.total > 0 && loadingProgress.current < loadingProgress.total && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                Loading more... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
            </Box>
          )}

          {error ? (
            <Box sx={{ py: 2, textAlign: "center" }}>
              <Box sx={{ maxWidth: 520, mx: "auto" }}>
                <StatusBox
                  variant="error"
                  title="Failed to load inventory"
                  actions={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={fetchInventory}
                      disabled={loading}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
                    >
                      Retry
                    </Button>
                  }
                >
                  {String(error).includes("500") ? "No Inventory Found" : error}
                </StatusBox>
              </Box>
            </Box>
          ) : (
            <>
              {viewMode === "cards" ? renderCards() : renderTable()}
            </>
          )}
        </>
      )}

      {/* QR Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: "center", maxHeight: "75vh", overflowY: "auto" }}>
          {qrCodeData ? (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 900 }}>
                {String(qrCodeData.itemName || "Unknown Item")}
              </Typography>
              {qrCodeData.location || qrCodeData.warehouse ? (
                <Typography sx={{ mt: -1.5, mb: 1.5, fontSize: 12, color: "#6B7280", fontWeight: 800 }}>
                  {String(qrCodeData.location || "").trim()}
                  {qrCodeData.location && qrCodeData.warehouse ? " • " : ""}
                  {String(qrCodeData.warehouse || "").trim()}
                </Typography>
              ) : null}
              {qrCodeData.qrValue ? (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E5E7EB" }}>
                    <QRCodeCanvas
                      id="inventoryQrCanvas"
                      value={qrCodeData.qrValue}
                      size={QR_PREVIEW_SIZE}
                      includeMargin
                    />
                  </Box>
                </Box>
              ) : (
                <Typography>No QR Code Available</Typography>
              )}
            </>
          ) : (
            <Typography>No QR Code Available</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          {qrCodeData?.qrValue ? (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              size="small"
              onClick={() => {
                const canvas = document.getElementById("inventoryQrCanvas");
                if (!canvas || typeof canvas.toDataURL !== "function") return;
                const dataUrl = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `${String(qrCodeData.itemName || "inventory-qr")
                  .replace(/[\\/:*?"<>|]+/g, "_")
                  .slice(0, 110)}-QRCode.png`;
                a.click();
              }}
            >
              Download QR
            </Button>
          ) : null}
          <Button onClick={() => setDialogOpen(false)} variant="outlined" color="secondary" size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Preview Dialog (A4 first page) */}
      <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>A4 Preview (First page)</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {printPreviewItems?.length ? (
            <Box
              sx={{
                border: "1px solid #E5E7EB",
                borderRadius: 2,
                p: 2,
                bgcolor: "#fff",
              }}
            >
              <Grid container spacing={2}>
                {printPreviewItems.map((it, idx) => {
                  const value = buildInventoryQrValue({
                    parsed_item_name: it.itemName,
                    parsed_location: it.location,
                    parsed_warehouse: it.warehouse,
                  });
                  const { cols } = getPdfLayoutConfig();
                  const xs = cols === 1 ? 12 : cols === 2 ? 6 : cols === 3 ? 4 : 3;
                  return (
                    <Grid item xs={xs} key={`${it.itemName}-${idx}`}>
                      <Box
                        sx={{
                          border: "1px solid #E5E7EB",
                          borderRadius: 2,
                          p: 1.5,
                          height: cols === 1 ? 420 : cols === 2 ? 260 : cols === 3 ? 210 : 180,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: 0.75,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: 12,
                            textAlign: "center",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={it.itemName}
                        >
                          {it.itemName}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            color: "#6B7280",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                          }}
                          title={`${it.location} • ${it.warehouse}`}
                        >
                          {it.location} • {it.warehouse}
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: "#fff", borderRadius: 2, border: "1px solid #E5E7EB" }}>
                          <QRCodeCanvas value={value} size={cols === 1 ? 220 : cols === 2 ? 150 : cols === 3 ? 120 : 95} includeMargin />
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ) : (
            <Typography color="text.secondary">No printable items (missing item/location/warehouse).</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setPrintPreviewOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setPrintPreviewOpen(false);
              printA4Qrs4Up();
            }}
            sx={{ borderRadius: 2, fontWeight: 900 }}
            disabled={!printPreviewItems?.length}
          >
            Start download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Large PDF warning (optional proceed) */}
      <Dialog open={largePdfWarnOpen} onClose={() => setLargePdfWarnOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Large PDF download</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>
            You are about to generate a PDF for <b>{largePdfWarnCount}</b> items.
          </Typography>
          <Typography sx={{ mt: 1, color: "#6B7280" }}>
            This may take some time. Recommended: use filters/search to reduce the count for faster download.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="outlined" onClick={() => setLargePdfWarnOpen(false)} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const printable = getPrintableRows();
              setLargePdfWarnOpen(false);
              const { cols, rows } = getPdfLayoutConfig();
              setPrintPreviewItems(printable.slice(0, cols * rows));
              setPrintPreviewOpen(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 900 }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating PDF progress (works even if preview closed) */}
      <Snackbar
        open={printingQrPdf}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: 2, mr: 2 }}
      >
        <Alert
          severity="info"
          variant="standard"
          sx={{
            width: 360,
            maxWidth: "calc(100vw - 24px)",
            alignItems: "center",
            py: 1,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(17, 24, 39, 0.55)",
            color: "#fff",
            boxShadow: "0px 18px 40px rgba(0,0,0,0.22)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            "& .MuiAlert-icon": { color: "rgba(255,255,255,0.85)" },
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                printCancelRef.current = true;
                terminateQrWorker();
              }}
              sx={{ fontWeight: 900 }}
            >
              Cancel
            </Button>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              {printingPhase === "zipping"
                ? `Zipping… ${printingZipPct}%`
                : `Generating PDF${printingQrProgress.total ? `: ${printingQrProgress.done}/${printingQrProgress.total}` : "…"}`
              }
            </Typography>
            {printingPhase === "zipping" ? (
              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  variant="determinate"
                  value={printingZipPct}
                  sx={{
                    height: 6,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.18)",
                    "& .MuiLinearProgress-bar": { backgroundColor: "rgba(255,255,255,0.9)" },
                  }}
                />
              </Box>
            ) : printingQrProgress.total ? (
              <Box sx={{ width: "100%" }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.round((printingQrProgress.done / printingQrProgress.total) * 100)}
                  sx={{
                    height: 6,
                    borderRadius: 999,
                    bgcolor: "rgba(255,255,255,0.18)",
                    "& .MuiLinearProgress-bar": { backgroundColor: "rgba(255,255,255,0.9)" },
                  }}
                />
              </Box>
            ) : null}
          </Box>
        </Alert>
      </Snackbar>

      {/* Admin dialogs */}
      {isAdmin && (
        <StockAdjustment
          open={stockAdjustmentOpen}
          onClose={() => setStockAdjustmentOpen(false)}
          inventory={inventory}
          onSuccess={fetchInventory}
        />
      )}

      <BulkStockTransferDialog
        open={transferOpen}
        apiBase={API_BASE}
        inventory={inventory}
        warehouseOptions={warehouseOptions}
        locationOptions={locationOptions}
        onClose={() => setTransferOpen(false)}
        onSuccess={fetchInventory}
      />

      {isAdmin && (
        <LocationPriceSummaryDialog
          open={priceSummaryOpen}
          onClose={() => setPriceSummaryOpen(false)}
        />
      )}
    </Paper>
  );
};

export default InventoryList;