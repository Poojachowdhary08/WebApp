// src/components/ManageInventory.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Grid,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import BorderColorOutlinedIcon from "@mui/icons-material/BorderColorOutlined";
import AddIcon from "@mui/icons-material/Add";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";

import axios from "axios";

// ✅ Excel deps
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import UploadInvoice from "./UploadInvoice";
import ReadyForReview from "./ReadyForReviewForm";
import UploadTaxInvoice from "./UploadTaxInvoice";

// -----------------------------
// Styling helpers
// -----------------------------
const GRID_BORDER = "1px solid #E5E7EB";
const HEADER_BG = "#F8FAFC";
const CARDS_PER_PAGE = 12;

// ✅ FE-only toggle: keep OFF until backend SQL is fixed
const ENABLE_SERVER_DATE_FILTER = false;

const headCellSx = {
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

const bodyCellSx = {
  fontSize: 13,
  py: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 240,
  border: GRID_BORDER,
};

const rowSx = { "&:hover": { backgroundColor: "#f8fafc" } };

const iconHeadCellSx = { ...headCellSx, textAlign: "center" };
const iconBodyCellSx = { ...bodyCellSx, textAlign: "center" };

const statusChipSx = (status) => {
  const s = String(status || "").toUpperCase();
  const map = {
    READY_FOR_REVIEW: { bg: "#FFE7C2", fg: "#B45309", border: "#F59E0B" },
    REVIEWED: { bg: "#DDE3FF", fg: "#1D2AE8", border: "#6B78FF" },
    READY_FOR_PAYMENT: { bg: "#FFF7BF", fg: "#A16207", border: "#FACC15" },
    PROCESSED: { bg: "#D1FAE5", fg: "#047857", border: "#34D399" },
    PAID: { bg: "#D1FAE5", fg: "#047857", border: "#34D399" },
    REJECTED: { bg: "#FFD1D1", fg: "#B91C1C", border: "#F87171" },
    DRAFT: { bg: "#EEF2FF", fg: "#4338CA", border: "#A5B4FC" },
  };
  const cfg = map[s] || { bg: "#F3F4F6", fg: "#111827", border: "#E5E7EB" };

  return {
    backgroundColor: cfg.bg,
    color: cfg.fg,
    border: `1.5px solid ${cfg.border}`,
    fontWeight: 900,
    borderRadius: "999px",
    height: 30,
    "& .MuiChip-label": { px: 2, letterSpacing: 0.3 },
  };
};

const safeText = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

const formatDDMMYYYY = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return safeText(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const moneyINR = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return `₹${safeText(v)}`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// -----------------------------
// ✅ Debounce hook
// -----------------------------
const useDebouncedValue = (value, delayMs = 450) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
};

// -----------------------------
// Date helpers (FE filter)
// -----------------------------
const isValidISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

const parseISODateToStartOfDay = (iso) => {
  if (!iso || !isValidISODate(iso)) return null;
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const parseAnyDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ✅ shared date filter fn (works for UI render + Excel export)
const applyClientDateFilter = (list, invoiceDateFrom, invoiceDateTo, dateRangeError) => {
  if (dateRangeError) return list;
  const hasFrom = Boolean(invoiceDateFrom && invoiceDateFrom.trim());
  const hasTo = Boolean(invoiceDateTo && invoiceDateTo.trim());
  if (!hasFrom || !hasTo) return list;

  const df = parseISODateToStartOfDay(invoiceDateFrom);
  const dt = parseISODateToStartOfDay(invoiceDateTo);
  if (!df || !dt) return list;

  const dtEnd = new Date(dt.getTime());
  dtEnd.setHours(23, 59, 59, 999);

  return (list || []).filter((b) => {
    const d = parseAnyDate(b?.uploaded_at_ist_human);
    if (!d) return true;
    return d.getTime() >= df.getTime() && d.getTime() <= dtEnd.getTime();
  });
};

const ManageInventory = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // backend pagination
  const [totalCount, setTotalCount] = useState(0);

  // UI
  const [searchQuery, setSearchQuery] = useState("");

  // list pagination
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(0);

  // view toggle
  const [viewModeUI, setViewModeUI] = useState("list"); // "list" | "cards"

  // date filters (UI)
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");

  // dialogs/forms
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showTaxInvoiceDialog, setShowTaxInvoiceDialog] = useState(false);
  const [selectedInvoiceForTax, setSelectedInvoiceForTax] = useState(null);

  const [billDetails, setBillDetails] = useState(null);
  const [formView, setFormView] = useState("");

  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", message: "" });

  const [exporting, setExporting] = useState(false);

  const isFormMode = Boolean(formView && billDetails);

  const debouncedSearch = useDebouncedValue(searchQuery, 450);

  const pageSize = useMemo(() => {
    return viewModeUI === "cards" ? CARDS_PER_PAGE : itemsPerPage;
  }, [viewModeUI, itemsPerPage]);

  // -----------------------------
  // FE-only date filter on current page results
  // -----------------------------
  const dateRangeError = useMemo(() => {
    const hasFrom = Boolean(invoiceDateFrom && invoiceDateFrom.trim());
    const hasTo = Boolean(invoiceDateTo && invoiceDateTo.trim());
    if (!hasFrom && !hasTo) return "";

    if ((hasFrom && !hasTo) || (!hasFrom && hasTo)) return "Select both From and To dates.";
    if (!isValidISODate(invoiceDateFrom) || !isValidISODate(invoiceDateTo)) return "Invalid date format.";

    const df = parseISODateToStartOfDay(invoiceDateFrom);
    const dt = parseISODateToStartOfDay(invoiceDateTo);
    if (!df || !dt) return "Invalid date values.";
    if (df.getTime() > dt.getTime()) return "From date cannot be after To date.";

    return "";
  }, [invoiceDateFrom, invoiceDateTo]);

  const billsFilteredClientSide = useMemo(() => {
    return applyClientDateFilter(bills, invoiceDateFrom, invoiceDateTo, dateRangeError);
  }, [bills, invoiceDateFrom, invoiceDateTo, dateRangeError]);

  // ---------------------------------------
  // Fetch invoices (server-side pagination)
  // ---------------------------------------
  const fetchBills = useCallback(
    async ({ page, limit, search, dateFrom, dateTo } = {}) => {
      try {
        setLoading(true);

        const finalPage = Number.isFinite(page) ? page : currentPage;
        const finalLimit = Number.isFinite(limit) ? limit : pageSize;
        const offset = finalPage * finalLimit;

        const params = { limit: finalLimit, offset };

        if (search && String(search).trim()) params.search = String(search).trim();

        // ✅ DO NOT send date params (backend currently 500s)
        if (ENABLE_SERVER_DATE_FILTER) {
          const hasFrom = Boolean(dateFrom && String(dateFrom).trim());
          const hasTo = Boolean(dateTo && String(dateTo).trim());
          if (hasFrom && hasTo && isValidISODate(dateFrom) && isValidISODate(dateTo)) {
            params.invoice_date_from = String(dateFrom).trim();
            params.invoice_date_to = String(dateTo).trim();
          }
        }

        const res = await axios.get("http://localhost:8080/get-all-invoices", {
          params,
          timeout: 25000,
        });

        const data = res.data;
        const list = Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data) ? data : [];
        setBills(list);

        const total = Number(data?.total);
        setTotalCount(Number.isFinite(total) ? total : list.length);
      } catch (e) {
        console.error("Error fetching invoices:", e);

        const apiMsg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          (typeof e?.response?.data === "string" ? e.response.data : "") ||
          "";

        const statusCode = e?.response?.status ? ` (HTTP ${e.response.status})` : "";
        const msg = apiMsg || e?.message || "Failed to load invoices.";

        setBills([]);
        setTotalCount(0);
        setDialogContent({ title: "Failed to load invoices" + statusCode, message: msg });
        setOpenDialog(true);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, pageSize]
  );

  useEffect(() => {
    fetchBills({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch,
      dateFrom: invoiceDateFrom,
      dateTo: invoiceDateTo,
    });
  }, [fetchBills, currentPage, pageSize, debouncedSearch, invoiceDateFrom, invoiceDateTo]);

  // ---------------------------------------
  // Actions
  // ---------------------------------------
  const handleViewInvoiceDetails = async (bill) => {
    try {
      const status = String(bill?.bill_status || "").toUpperCase();
      if (status !== "READY_FOR_REVIEW") return;

      const avenueInvoiceId = bill?.avenue_created_invoice_id;
      if (!avenueInvoiceId) {
        setDialogContent({ title: "Missing Invoice ID", message: "Invoice ID is missing." });
        setOpenDialog(true);
        return;
      }

      const apiUrl = `http://localhost:8080/get-invoice/${encodeURIComponent(avenueInvoiceId)}`;
      const res = await axios.get(apiUrl, { headers: { "Content-Type": "application/json" }, timeout: 25000 });

      const payload = res?.data;
      const extracted =
        payload?.invoice ||
        payload?.data?.invoice ||
        payload?.result?.invoice ||
        payload?.invoice_data ||
        (Array.isArray(payload?.invoices) ? payload.invoices[0] : null);

      if (!extracted || typeof extracted !== "object") {
        const hint = payload?.error || payload?.message || "Invoice not found in API response.";
        throw new Error(hint);
      }

      setBillDetails(extracted);
      setFormView("ReadyForReview");
    } catch (e) {
      console.error("Error loading invoice details:", e);

      const axiosMsg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        "";

      const statusCode = e?.response?.status ? ` (HTTP ${e.response.status})` : "";
      const msg = axiosMsg || e?.message || "Failed to load invoice.";

      setDialogContent({ title: "Failed to load invoice" + statusCode, message: msg });
      setOpenDialog(true);
    }
  };

  const handleOpenPdf = (bill) => {
    const fileUrl = bill?.file_url;
    if (!fileUrl) {
      setDialogContent({ title: "No PDF", message: "No PDF available for this invoice." });
      setOpenDialog(true);
      return;
    }
    setSelectedPdfUrl(fileUrl);
    setOpenPdfDialog(true);
  };

  const handleOpenTaxInvoiceDialog = (bill) => {
    setSelectedInvoiceForTax(bill);
    setShowTaxInvoiceDialog(true);
  };

  const handleCloseTaxInvoiceDialog = () => {
    setShowTaxInvoiceDialog(false);
    setSelectedInvoiceForTax(null);
  };

  const handleCloseForm = () => {
    setFormView("");
    setBillDetails(null);
  };

  // ===================== ✅ DOWNLOAD EXCEL (FULL TABLE, SEARCH/DATE FILTER WISE) =====================
  const downloadExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const PAGE_SIZE = 500; // reduce if backend struggles
      let pageNo = 0;
      let all = [];
      let total = null;

      while (true) {
        const params = {
          limit: PAGE_SIZE,
          offset: pageNo * PAGE_SIZE,
        };

        if (debouncedSearch && String(debouncedSearch).trim()) params.search = String(debouncedSearch).trim();

        // (optional) enable when backend fixed
        if (ENABLE_SERVER_DATE_FILTER) {
          const hasFrom = Boolean(invoiceDateFrom && String(invoiceDateFrom).trim());
          const hasTo = Boolean(invoiceDateTo && String(invoiceDateTo).trim());
          if (hasFrom && hasTo && isValidISODate(invoiceDateFrom) && isValidISODate(invoiceDateTo)) {
            params.invoice_date_from = String(invoiceDateFrom).trim();
            params.invoice_date_to = String(invoiceDateTo).trim();
          }
        }

        const res = await axios.get("http://localhost:8080/get-all-invoices", {
          params,
          timeout: 30000,
        });

        const data = res.data || {};
        const chunk = Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data) ? data : [];

        if (total == null && Number.isFinite(Number(data?.total))) total = Number(data.total);

        all = all.concat(chunk);

        if (chunk.length < PAGE_SIZE) break;
        if (total != null && all.length >= total) break;

        pageNo += 1;
        if (pageNo > 5000) break; // safety
      }

      // ✅ apply FE date filter across ALL rows (since backend date filter is OFF)
      const finalList = applyClientDateFilter(all, invoiceDateFrom, invoiceDateTo, dateRangeError);

      const excelRows = (finalList || []).map((bill) => {
        const status = String(bill.bill_status || "").toUpperCase();
        return {
          "Invoice ID": safeText(bill.avenue_created_invoice_id),
          "Vendor Name": safeText(bill.supplier_name),
          "Invoice No": safeText(bill.json_invoice_number),
          "Uploaded Date": formatDDMMYYYY(bill.uploaded_at_ist_human),
          "Invoice Type": safeText(bill.invoice_type),
          "Total Amount": bill.total_bill_amount ?? "",
          "Total Amount (INR)": moneyINR(bill.total_bill_amount),
          Products: safeText(bill.products_longhand_list),
          Status: safeText(status),
          "File URL": safeText(bill.file_url),
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);

      ws["!cols"] = [
        { wch: 22 },
        { wch: 26 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 40 },
        { wch: 18 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invoices");

      const stamp = new Date().toISOString().slice(0, 10);
      const srch = debouncedSearch ? String(debouncedSearch).trim().slice(0, 20).replace(/\s+/g, "_") : "ALL";
      const range =
        invoiceDateFrom && invoiceDateTo && !dateRangeError
          ? `${invoiceDateFrom}_to_${invoiceDateTo}`
          : "ALL_DATES";

      const fileName = `Invoices_${srch}_${range}_${stamp}.xlsx`;

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, fileName);
    } catch (e) {
      console.error("Excel export failed:", e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to export Excel.";
      alert(msg);
    } finally {
      setExporting(false);
    }
  };

  if (isFormMode) {
    return (
      <Box sx={{ p: 2, marginTop: "-30px", backgroundColor: "#F9FAFB" }}>
        <ReadyForReview invoiceData={billDetails} onClose={handleCloseForm} />
      </Box>
    );
  }

  // ✅ Use filtered list for rendering (client-side date filter)
  const billsToRender = billsFilteredClientSide;

  const renderCards = () => {
    if ((billsToRender || []).length === 0) {
      return (
        <Box sx={{ py: 6, textAlign: "center", color: "#64748b" }}>
          <Typography>No invoices found.</Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {(billsToRender || []).map((bill) => {
          const status = String(bill.bill_status || "").toUpperCase();
          const canOpenReview = status === "READY_FOR_REVIEW";
          const isProforma = String(bill.invoice_type || "").toLowerCase().includes("proforma");

          const vendor = safeText(bill.supplier_name);
          const invoiceId = safeText(bill.avenue_created_invoice_id);
          const invNo = safeText(bill.json_invoice_number);
          const uploaded = formatDDMMYYYY(bill.uploaded_at_ist_human);
          const total = moneyINR(bill.total_bill_amount);
          const type = safeText(bill.invoice_type);
          const products = safeText(bill.products_longhand_list);

          return (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              xl={3}
              key={bill.avenue_created_invoice_id || `${vendor}-${invNo}-${uploaded}`}
            >
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 2.5,
                  backgroundColor: "#fff",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 14px 36px rgba(15,23,42,0.10)" },
                }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: "#E8EEFF",
                      border: "1px solid #E5E7EB",
                      flex: "0 0 auto",
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900 }} title={invoiceId}>
                      {invoiceId}
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
                      title={vendor}
                    >
                      {vendor}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#6B7280" }} title={type}>
                      {type}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="View PDF">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenPdf(bill)}
                        sx={{ border: "1px solid #E5E7EB", borderRadius: 2, bgcolor: "#fff" }}
                      >
                        <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                <Box sx={{ px: 2, pb: 1.5 }}>
                  <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mb: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, color: "#374151" }}>Invoice No.</Typography>
                      <Typography sx={{ fontSize: 15, fontWeight: 900, color: "#111827" }} title={invNo}>
                        {invNo}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, color: "#374151" }}>Total</Typography>
                      <Typography sx={{ fontSize: 15, fontWeight: 900, color: "#111827" }} title={total}>
                        {total}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: 0, textAlign: "right" }}>
                      <Typography sx={{ fontSize: 13, color: "#374151" }}>Uploaded</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{uploaded}</Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Chip label={safeText(status)} size="small" sx={statusChipSx(status)} />

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tooltip title={canOpenReview ? "Open Ready For Review" : "Only READY_FOR_REVIEW can be opened"}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => canOpenReview && handleViewInvoiceDetails(bill)}
                            disabled={!canOpenReview}
                            startIcon={<BorderColorOutlinedIcon sx={{ fontSize: 18 }} />}
                            sx={{
                              textTransform: "none",
                              fontWeight: 900,
                              borderRadius: 2,
                              borderColor: canOpenReview ? "#CBD5E1" : "#E5E7EB",
                              color: canOpenReview ? "#111827" : "#9CA3AF",
                              bgcolor: "#fff",
                            }}
                          >
                            Edit
                          </Button>
                        </span>
                      </Tooltip>

                      {String(bill.invoice_type || "").toLowerCase().includes("proforma") ? (
                        <Tooltip title={status === "READY_FOR_REVIEW" ? "Disabled for READY_FOR_REVIEW" : "Upload Tax Invoice"}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenTaxInvoiceDialog(bill)}
                              disabled={status === "READY_FOR_REVIEW"}
                              startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 18 }} />}
                              sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                borderRadius: 2,
                                borderColor: "#E5E7EB",
                                color: status === "READY_FOR_REVIEW" ? "#9CA3AF" : "#111827",
                                bgcolor: "#fff",
                              }}
                            >
                              Upload
                            </Button>
                          </span>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>Products</Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#111827",
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={products}
                  >
                    {products}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "#fff",
          marginTop: "-30px",
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f8fafc",
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: "#111827" }}></Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Search (vendor / invoice / status / uploaded by)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              sx={{
                width: 320,
                backgroundColor: "#fff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#64748b" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* ✅ Date pickers (UI) */}
            <TextField
              size="small"
              label="Invoice date from"
              type="date"
              value={invoiceDateFrom}
              onChange={(e) => {
                setInvoiceDateFrom(e.target.value);
                setCurrentPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: 190,
                height: 28,
                backgroundColor: "#fff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
              error={Boolean(dateRangeError)}
              helperText={dateRangeError ? dateRangeError : " "}
            />

            <TextField
              size="small"
              label="Invoice date to"
              type="date"
              value={invoiceDateTo}
              onChange={(e) => {
                setInvoiceDateTo(e.target.value);
                setCurrentPage(0);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: 190,
                height: 28,
                backgroundColor: "#fff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
              error={Boolean(dateRangeError)}
              helperText={dateRangeError ? dateRangeError : " "}
            />

            {/* ✅ List/Cards Toggle */}
            <ToggleButtonGroup
              exclusive
              value={viewModeUI}
              onChange={(_e, next) => {
                if (!next) return;
                setViewModeUI(next);
                setCurrentPage(0);
              }}
              size="small"
              sx={{
                bgcolor: "#fff",
                borderRadius: 2,
                border: "1px solid #e5e7eb",
                "& .MuiToggleButton-root": { border: "none", px: 1.2, py: 0.8, borderRadius: 2 },
              }}
            >
              <ToggleButton value="list">
                <Tooltip title="List view">
                  <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="cards">
                <Tooltip title="Card view">
                  <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* ✅ Download Excel */}
            <Button
              variant="outlined"
              disabled={exporting}
              onClick={downloadExcel}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                borderRadius: 2,
                borderColor: "#e5e7eb",
                bgcolor: "#fff",
                height: 38,
              }}
            >
              ⬇️
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowUploadForm(true)}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                borderRadius: 2,
                backgroundColor: "#4f7cff",
                "&:hover": { backgroundColor: "#3b66e6" },
                height: 38,
              }}
            >
              New Invoice
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setSearchQuery("");
                setInvoiceDateFrom("");
                setInvoiceDateTo("");
                setCurrentPage(0);
              }}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                borderRadius: 2,
                borderColor: "#e5e7eb",
                bgcolor: "#fff",
                height: 38,
              }}
            >
              Reset
            </Button>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 1.5 }}>
          {loading ? (
            <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {viewModeUI === "cards" ? (
                <>
                  {renderCards()}
                  <TablePagination
                    component="div"
                    count={totalCount}
                    page={currentPage}
                    onPageChange={(_, p) => setCurrentPage(p)}
                    rowsPerPage={CARDS_PER_PAGE}
                    rowsPerPageOptions={[CARDS_PER_PAGE]}
                    onRowsPerPageChange={() => { }}
                    sx={{ mt: 1 }}
                  />
                </>
              ) : (
                <>
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
                          <TableCell sx={{ ...headCellSx, width: 150 }}>Invoice ID</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 200 }}>Vendor Name</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 130 }}>Invoice No.</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 130 }}>Uploaded Date</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 140 }}>Invoice Type</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 130 }}>Total Amount</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 200 }}>Products</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 170 }}>Status</TableCell>
                          <TableCell sx={{ ...iconHeadCellSx, width: 70 }}>View</TableCell>
                          <TableCell sx={{ ...iconHeadCellSx, width: 70 }}>Edit</TableCell>
                          <TableCell sx={{ ...iconHeadCellSx, width: 80 }}>Upload</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {(billsToRender || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} sx={{ ...bodyCellSx, py: 6, textAlign: "center", color: "#64748b" }}>
                              No invoices found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (billsToRender || []).map((bill) => {
                            const isProforma = String(bill.invoice_type || "").toLowerCase().includes("proforma");
                            const status = String(bill.bill_status || "").toUpperCase();
                            const canOpenReview = status === "READY_FOR_REVIEW";

                            return (
                              <TableRow key={bill.avenue_created_invoice_id} sx={rowSx}>
                                <TableCell
                                  title={safeText(bill.avenue_created_invoice_id)}
                                  sx={{
                                    ...bodyCellSx,
                                    cursor: canOpenReview ? "pointer" : "default",
                                    color: canOpenReview ? "#111827" : "#6b7280",
                                  }}
                                  onClick={() => canOpenReview && handleViewInvoiceDetails(bill)}
                                >
                                  {safeText(bill.avenue_created_invoice_id)}
                                </TableCell>

                                <TableCell sx={bodyCellSx} title={safeText(bill.supplier_name)}>
                                  {safeText(bill.supplier_name)}
                                </TableCell>

                                <TableCell sx={bodyCellSx} title={safeText(bill.json_invoice_number)}>
                                  {safeText(bill.json_invoice_number)}
                                </TableCell>

                                <TableCell sx={bodyCellSx} title={formatDDMMYYYY(bill.uploaded_at_ist_human)}>
                                  {formatDDMMYYYY(bill.uploaded_at_ist_human)}
                                </TableCell>

                                <TableCell sx={bodyCellSx} title={safeText(bill.invoice_type)}>
                                  {safeText(bill.invoice_type)}
                                </TableCell>

                                <TableCell sx={bodyCellSx} title={safeText(bill.total_bill_amount)}>
                                  {bill.total_bill_amount ? moneyINR(bill.total_bill_amount) : "—"}
                                </TableCell>

                                <TableCell sx={{ ...bodyCellSx, width: "120px" }} title={safeText(bill.products_longhand_list)}>
                                  {safeText(bill.products_longhand_list)}
                                </TableCell>

                                <TableCell sx={bodyCellSx}>
                                  <Chip label={safeText(status)} size="small" sx={statusChipSx(status)} />
                                </TableCell>

                                <TableCell sx={iconBodyCellSx}>
                                  <Tooltip title="View PDF">
                                    <IconButton size="small" onClick={() => handleOpenPdf(bill)}>
                                      <VisibilityOutlinedIcon fontSize="small" sx={{ color: "#1976d2" }} />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>

                                <TableCell sx={iconBodyCellSx}>
                                  <Tooltip title={canOpenReview ? "Open Ready For Review" : "Only READY_FOR_REVIEW can be opened"}>
                                    <span>
                                      <IconButton size="small" onClick={() => canOpenReview && handleViewInvoiceDetails(bill)} disabled={!canOpenReview}>
                                        <BorderColorOutlinedIcon fontSize="small" sx={{ color: canOpenReview ? "#1976d2" : "#9ca3af" }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </TableCell>

                                <TableCell sx={iconBodyCellSx}>
                                  {isProforma ? (
                                    <Tooltip title={status === "READY_FOR_REVIEW" ? "Disabled for READY_FOR_REVIEW" : "Upload Tax Invoice"}>
                                      <span>
                                        <IconButton size="small" onClick={() => handleOpenTaxInvoiceDialog(bill)} disabled={status === "READY_FOR_REVIEW"}>
                                          <UploadFileOutlinedIcon fontSize="small" sx={{ color: "#9ca3af" }} />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={totalCount}
                    page={currentPage}
                    onPageChange={(_, p) => setCurrentPage(p)}
                    rowsPerPage={itemsPerPage}
                    onRowsPerPageChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      setItemsPerPage(next);
                      setCurrentPage(0);
                    }}
                    rowsPerPageOptions={[15, 50, 100, 150]}
                  />
                </>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* PDF Dialog */}
      <Dialog open={openPdfDialog} onClose={() => setOpenPdfDialog(false)} fullWidth maxWidth="lg">
        <DialogTitle>Invoice PDF</DialogTitle>
        <DialogContent>
          {selectedPdfUrl ? (
            <iframe src={selectedPdfUrl} width="100%" height="700px" style={{ border: "none" }} title="Invoice PDF" />
          ) : (
            <Typography>No PDF available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenPdfDialog(false);
              setSelectedPdfUrl("");
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Tax Invoice */}
      {showTaxInvoiceDialog && (
        <Box
          sx={{
            position: "fixed",
            top: "15%",
            left: "50%",
            transform: "translate(-50%, 0)",
            width: "100%",
            maxWidth: "800px",
            zIndex: 1300,
            backgroundColor: "transparent",
            overflowY: "auto",
          }}
        >
          <UploadTaxInvoice invoiceData={selectedInvoiceForTax} onClose={() => handleCloseTaxInvoiceDialog()} />
        </Box>
      )}

      {/* Upload Invoice Popup */}
      {showUploadForm && (
        <Box
          sx={{
            position: "fixed",
            top: "7%",
            left: "75%",
            transform: "translate(-50%, 0)",
            width: "100%",
            height: "100%",
            maxWidth: "1840px",
            maxHeight: "84vh",
            overflowY: "auto",
            backgroundColor: "transparent",
            borderRadius: "8px",
            zIndex: 1300,
            p: 2,
            mt: "26px",
          }}
        >
          <UploadInvoice onClose={() => setShowUploadForm(false)} />
        </Box>
      )}

      {/* Generic dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{dialogContent.title}</DialogTitle>
        <DialogContent>
          <Typography>{dialogContent.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageInventory;