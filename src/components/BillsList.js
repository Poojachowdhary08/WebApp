// src/components/BillsList.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUiDensity } from "../ui/useUiDensity";
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
  TextField,
  Button,
  IconButton,
  Dialog,
  Tooltip,
  DialogActions,
  DialogContent,
  DialogTitle,
  TablePagination,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Grid,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Drawer,
  Collapse,
  useTheme,
  useMediaQuery,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import CloseIcon from "@mui/icons-material/Close";

import UploadInvoice from "./UploadInvoice";
import ReadyForReview from "./ReadyForReviewForm";
import ReadyForPayment from "./ReadyForPaymentForm";
import PaidBillForm from "./PaidBillForm";
import ReviewedForm from "./ReviewedForm";
import ProformaInvoice from "./ProformaInvoice";
import UploadTaxInvoice from "./UploadTaxInvoice";
import { StatusBox } from "../ui/StatusBox";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
const COLORS = { textSecondary: "#6B7280" };

// ✅ Cards rules
const CARDS_PER_PAGE = 12;
const CLIENT_SEARCH_BATCH_SIZE = 500;
const CLIENT_SEARCH_MAX_RESULTS = 5000;

// ---------------- Status styles ----------------
const statusColors = {
  READY_FOR_REVIEW: "#FFEFD9",
  REVIEWED: "#E5E7FF",
  READY_FOR_PAYMENT: "#FFFBD1",
  PROCESSED: "#DCFCE7",
  REJECTED: "#FFE4E1",
};
const statusTextColor = {
  READY_FOR_REVIEW: "#B45309",
  REVIEWED: "#1D4ED8",
  READY_FOR_PAYMENT: "#A16207",
  PROCESSED: "#15803D",
  REJECTED: "#B91C1C",
};
const statusBorderColor = {
  READY_FOR_REVIEW: "#F97316",
  REVIEWED: "#4F46E5",
  READY_FOR_PAYMENT: "#EAB308",
  PROCESSED: "#22C55E",
  REJECTED: "#EF4444",
};

// Map tab label -> backend status query param
const tabStatusMap = {
  "Review Invoice": "READY_FOR_REVIEW",
  "Manage Inventory": "REVIEWED",
  "Make Payments": "REVIEWED",
  "Processed Invoices": "PROCESSED",
  "All Invoices": null,
};

const BillsList = ({
  activeTab,
  onActiveTabChange,
  tabsToShow = null,
  viewMode = "list",
  onViewModeChange,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const ui = useUiDensity();

  const location = useLocation();
  const navigate = useNavigate();

  const defaultTabs = useMemo(() => Object.keys(tabStatusMap), []);
  const tabs = useMemo(() => {
    if (Array.isArray(tabsToShow)) return tabsToShow;
    return defaultTabs;
  }, [tabsToShow, defaultTabs]);

  const urlTab = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const t = params.get("tab");
      return t && tabs.includes(t) ? t : null;
    } catch {
      return null;
    }
  }, [location.search, tabs]);

  const [localActiveTab, setLocalActiveTab] = useState(() => urlTab || tabs[0] || "Review Invoice");
  const effectiveActiveTab = activeTab ?? localActiveTab;
  const setEffectiveActiveTab = (t) => {
    if (onActiveTabChange) return onActiveTabChange(t);
    setLocalActiveTab(t);
    // keep URL in sync when used as a page
    try {
      const params = new URLSearchParams(location.search || "");
      params.set("tab", t);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
    } catch {
      // ignore
    }
  };

  const [bills, setBills] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Search
  const [search, setSearch] = useState("");
  const isClientSearchActive = useMemo(() => !!search && !!search.trim(), [search]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | TAX | PROFORMA
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // ALL | UNPAID | PAID
  const [inventoryFilter, setInventoryFilter] = useState("ALL"); // ALL | PENDING | POSTED
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // ✅ Upload dialog state
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  // Pagination (server-side)
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(0);

  // Detail / forms
  const [billDetails, setBillDetails] = useState(null);
  const [formView, setFormView] = useState("");

  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", message: "" });

  const [sortField, setSortField] = useState("uploaded_at_ist");
  const [sortOrder, setSortOrder] = useState("desc");

  const [expandedInvoices, setExpandedInvoices] = useState({});

  // ✅ Proforma Dialog State (like UploadInvoice)
  const [openProformaDialog, setOpenProformaDialog] = useState(false);
  const [selectedInvoiceForProforma, setSelectedInvoiceForProforma] = useState(null);

  // ✅ Tax Invoice Dialog State (like UploadInvoice)
  const [openTaxInvoiceDialog, setOpenTaxInvoiceDialog] = useState(false);
  const [selectedInvoiceForTax, setSelectedInvoiceForTax] = useState(null);

  // ✅ Effective rows per page depends on view
  const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : itemsPerPage;

  // Unique vendors for current page (for dropdown)
  const uniqueVendors = useMemo(() => {
    const set = new Set();
    (bills || []).forEach((b) => {
      if (b?.master_vendor_name) set.add(String(b.master_vendor_name));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bills]);

  // ---------------- Helpers ----------------
  const getUploadedDate = (row) => {
    const raw =
      row.uploaded_at_ist ??
      row.uploaded_at_ist_human ??
      row.uploaded_at_ist_readable;
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d) ? d : null;
  };

  const formatUploadedDate = (row) => {
    const d = getUploadedDate(row);
    if (!d) return "";
    return d.toLocaleDateString("en-GB");
  };

  const toNumberStrict = (val) => {
    if (typeof val === "number") return val;
    if (val == null) return 0;
    const n = Number(String(val).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const dedupeInvoices = (rows = []) => {
    const seen = new Set();
    return rows.filter((row) => {
      // Prefer stable backend invoice id; fallback keeps rows without id from collapsing incorrectly.
      const key =
        row?.avenue_created_invoice_id ??
        `${row?.json_invoice_number ?? ""}__${row?.master_vendor_name ?? ""}__${
          row?.uploaded_at_ist ?? row?.uploaded_at_ist_human ?? ""
        }`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const renderLoadingState = () => (
    <Box
      sx={{
        py: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Loading invoices…
      </Typography>
    </Box>
  );

  // ---------------- Fetch bills ----------------
  const fetchBills = async (
    page = 0,
    pageSize = effectiveRowsPerPage,
    searchValue = search,
    tabValue = effectiveActiveTab,
    from = dateFrom,
    to = dateTo
  ) => {
    try {
      setLoading(true);
      setFetchError("");

      const params = new URLSearchParams();
      const trimmedSearch = searchValue?.trim?.() || "";
      const shouldClientSearch = !!trimmedSearch;

      // Frontend search: fetch many results once, paginate locally.
      if (shouldClientSearch) {
        const selectedStatus = tabStatusMap[tabValue];
        if (selectedStatus) params.set("status", selectedStatus);

        if (from) params.set("invoice_date_from", from);
        if (to) params.set("invoice_date_to", to);

        const collected = [];
        let offset = 0;
        while (collected.length < CLIENT_SEARCH_MAX_RESULTS) {
          const batchParams = new URLSearchParams(params);
          batchParams.set("limit", String(CLIENT_SEARCH_BATCH_SIZE));
          batchParams.set("offset", String(offset));

          const response = await fetch(
            `${API_BASE}/get-all-invoices?${batchParams.toString()}`
          );
          if (!response.ok) throw new Error("Failed to fetch bills from API.");

          const result = await response.json();
          const invoicesFromApi = Array.isArray(result?.invoices)
            ? result.invoices
            : Array.isArray(result)
            ? result
            : [];

          collected.push(...invoicesFromApi);
          if (invoicesFromApi.length < CLIENT_SEARCH_BATCH_SIZE) break;
          offset += CLIENT_SEARCH_BATCH_SIZE;
        }

        const uniqueCollected = dedupeInvoices(collected).slice(0, CLIENT_SEARCH_MAX_RESULTS);
        setBills(uniqueCollected);
        setTotalCount(uniqueCollected.length);
        setCurrentPage(0);
        return;
      }

      // Default: server-side pagination
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));

      if (trimmedSearch) params.set("search", trimmedSearch);

      const selectedStatus = tabStatusMap[tabValue];
      if (selectedStatus) params.set("status", selectedStatus);

      if (from) params.set("invoice_date_from", from);
      if (to) params.set("invoice_date_to", to);

      const response = await fetch(`${API_BASE}/get-all-invoices?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch bills from API.");

      const result = await response.json();

      const invoicesFromApi = Array.isArray(result?.invoices)
        ? result.invoices
        : Array.isArray(result)
        ? result
        : [];

      const uniqueInvoices = dedupeInvoices(invoicesFromApi);
      setBills(uniqueInvoices);
      setTotalCount(result.total != null ? Number(result.total) : uniqueInvoices.length);

      setCurrentPage(page);
      // ✅ store list page size only (cards are fixed)
      if (viewMode !== "cards") setItemsPerPage(pageSize);
    } catch (err) {
      console.error("Error fetching bills:", err);
      setBills([]);
      setTotalCount(0);
      setFetchError(err?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  // If URL tab changes (e.g. from upload redirect), apply it.
  useEffect(() => {
    if (!urlTab) return;
    if (activeTab != null) {
      // parent-controlled mode; request parent to update
      onActiveTabChange?.(urlTab);
    } else {
      setLocalActiveTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  // First load + whenever activeTab or search changes
  useEffect(() => {
    setCurrentPage(0);
    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveActiveTab, search]);

  // ✅ When viewMode changes, refetch with correct limit (cards=12)
  useEffect(() => {
    setCurrentPage(0);
    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Optional: refresh=1 param forces a reload on entry (useful after upload redirect)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const refresh = params.get("refresh");
      if (refresh === "1") {
        fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
        params.delete("refresh");
        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ---------------- Status / View Handlers ----------------
  const handleView = async (bill, activeTabParam) => {
    try {
      const avenueInvoiceId = bill.avenue_created_invoice_id;
      if (!avenueInvoiceId) {
        setDialogContent({
          title: "Missing Invoice ID",
          message: "Invoice ID is missing. Please provide a valid invoice.",
        });
        setOpenDialog(true);
        return;
      }

      const apiUrl = `${API_BASE}/get-invoice/${encodeURIComponent(avenueInvoiceId)}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (!response.ok || !result.invoice)
        throw new Error(result.error || "Failed to fetch bill details.");

      let viewType = "";
      const status = bill.bill_status;
      const tab = activeTabParam ?? effectiveActiveTab;

      if (tab === "Manage Inventory" && status === "REVIEWED") viewType = "ReviewedForm";
      else if (tab === "Make Payments") viewType = "ReadyForPayment";
      else if (status === "READY_FOR_REVIEW") viewType = "ReadyForReview";
      else if (status === "PROCESSED") viewType = "PaidBillForm";

      setBillDetails(result.invoice);
      setFormView(viewType);
    } catch (error) {
      console.error("Error in handleView:", error);
      setDialogContent({
        title: "Error Loading Bill",
        message: `Failed to load bill details: ${error.message}`,
      });
      setOpenDialog(true);
    }
  };

  const fetchbillDetails = async () => {
    if (!billDetails?.avenue_created_invoice_id) return;
    try {
      const avenueInvoiceId = billDetails.avenue_created_invoice_id;
      const apiUrl = `${API_BASE}/get-invoice/${encodeURIComponent(avenueInvoiceId)}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (!response.ok || !result.invoice)
        throw new Error(result.error || "Failed to fetch bill details.");
      setBillDetails(result.invoice);
    } catch (error) {
      console.error("Error refreshing bill details:", error);
    }
  };

  const handleToggleInvoice = (parentId) => {
    setExpandedInvoices((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // ✅ Open Proforma Dialog (fetch invoice details, then open dialog)
  const handleOpenProformaDialog = async (bill) => {
    try {
      const avenueInvoiceId = bill?.avenue_created_invoice_id;
      if (!avenueInvoiceId) return;

      const apiUrl = `${API_BASE}/get-invoice/${encodeURIComponent(avenueInvoiceId)}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (!response.ok || !result.invoice)
        throw new Error(result.error || "Failed to fetch invoice for Proforma.");

      setSelectedInvoiceForProforma(result.invoice);
      setOpenProformaDialog(true);
    } catch (e) {
      console.error("Error opening proforma dialog:", e);
      setDialogContent({
        title: "Proforma Error",
        message: e?.message || "Failed to open Proforma invoice.",
      });
      setOpenDialog(true);
    }
  };

  // ✅ Open Tax Invoice Dialog
  const handleOpenTaxInvoiceDialog = (bill) => {
    setSelectedInvoiceForTax(bill);
    setOpenTaxInvoiceDialog(true);
  };

  // ✅ Back for inline forms only
  const handleBackToList = () => {
    setFormView("");
    setBillDetails(null);
    fetchBills(currentPage, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
  };

  // ✅ Close upload dialog and refresh list
  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    // After a successful upload, default back to Review queue and refresh.
    setEffectiveActiveTab("Review Invoice");
    fetchBills(0, effectiveRowsPerPage, "", "Review Invoice", dateFrom, dateTo);
  };

  // ✅ Close proforma dialog and refresh list
  const handleCloseProformaDialog = () => {
    setOpenProformaDialog(false);
    setSelectedInvoiceForProforma(null);
    fetchBills(currentPage, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
  };

  // ✅ Close tax dialog and refresh list
  const handleCloseTaxDialog = () => {
    setOpenTaxInvoiceDialog(false);
    setSelectedInvoiceForTax(null);
    fetchBills(currentPage, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
  };

  const handleChangePage = (_event, newPage) => {
    if (isClientSearchActive) {
      setCurrentPage(newPage);
      return;
    }
    fetchBills(newPage, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
  };

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setCurrentPage(0);
    if (isClientSearchActive) {
      setItemsPerPage(newSize);
      return;
    }
    fetchBills(0, newSize, search, effectiveActiveTab, dateFrom, dateTo);
  };

  // ---------------- Filtering (client-side) ----------------
  const filteredBills = useMemo(() => {
    const selectedStatus = tabStatusMap[effectiveActiveTab];
    const rawSearch = String(search || "").trim();
    const q = rawSearch.toLowerCase();

    const parseSearchQuery = (input) => {
      const text = String(input || "").trim();
      if (!text) return { free: [], tokens: {}, amountFilters: [] };

      // Token formats supported:
      // - key:value (value may be quoted: key:"some value")
      // - amount>123, amount>=123, amount<123, amount<=123, amount=123
      const parts = text.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const tokens = {};
      const amountFilters = [];
      const free = [];

      const unquote = (v) => {
        const s = String(v || "");
        if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
        return s;
      };

      for (const p of parts) {
        const part = p.trim();
        if (!part) continue;

        const amt = part.match(/^amount\s*(<=|>=|=|<|>)\s*([0-9]+(?:\.[0-9]+)?)$/i);
        if (amt) {
          amountFilters.push({ op: amt[1], value: Number(amt[2]) });
          continue;
        }

        const m = part.match(/^([a-z_]+):(.*)$/i);
        if (m) {
          const key = m[1].toLowerCase();
          const value = unquote(m[2]).trim();
          if (!value) continue;
          // allow multiple tokens per key
          if (!tokens[key]) tokens[key] = [];
          tokens[key].push(value.toLowerCase());
          continue;
        }

        free.push(unquote(part).toLowerCase());
      }

      return { free, tokens, amountFilters };
    };

    const searchQuery = parseSearchQuery(rawSearch);

    const includesAny = (hay, needles = []) => {
      const h = String(hay ?? "").toLowerCase();
      return needles.every((n) => h.includes(String(n)));
    };

    const amountPasses = (amount, filters) => {
      if (!filters?.length) return true;
      const a = toNumberStrict(amount);
      return filters.every((f) => {
        const v = Number(f.value);
        if (!Number.isFinite(v)) return true;
        switch (f.op) {
          case ">":
            return a > v;
          case ">=":
            return a >= v;
          case "<":
            return a < v;
          case "<=":
            return a <= v;
          case "=":
            return a === v;
          default:
            return true;
        }
      });
    };

    const matchesIntelligentSearch = (row) => {
      // If user didn't type anything, match.
      if (!rawSearch) return true;

      // Token constraints (ANDed)
      const t = searchQuery.tokens;
      const free = searchQuery.free;

      const rowVendor = row?.master_vendor_name;
      const rowInvNo = row?.json_invoice_number;
      const rowUploadedBy = row?.uploaded_by_name;
      const rowType = row?.invoice_type;
      const rowId = row?.avenue_created_invoice_id;
      const rowStatus = row?.bill_status;
      const rowTotal = row?.total_bill_amount;

      // Supported keys: vendor, inv, invoice, id, uploaded, by, type, status
      if (t.vendor && !includesAny(rowVendor, t.vendor)) return false;
      if ((t.inv || t.invoice) && !includesAny(rowInvNo, [...(t.inv || []), ...(t.invoice || [])])) return false;
      if (t.id && !includesAny(rowId, t.id)) return false;
      if ((t.uploaded || t.by) && !includesAny(rowUploadedBy, [...(t.uploaded || []), ...(t.by || [])]))
        return false;
      if (t.type && !includesAny(rowType, t.type)) return false;
      if (t.status && !includesAny(rowStatus, t.status)) return false;

      if (!amountPasses(rowTotal, searchQuery.amountFilters)) return false;

      // Free-text terms (ANDed across any of the common fields)
      if (!free.length) return true;
      const corpus = [
        rowId,
        rowVendor,
        rowInvNo,
        rowUploadedBy,
        rowType,
        rowStatus,
        rowTotal,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" | ");
      return free.every((term) => corpus.includes(term));
    };

    const getPaidAmount = (bill) => {
      const raw =
        bill?.paid_amount ??
        bill?.paidAmount ??
        bill?.payment_paid_amount ??
        bill?.paymentPaidAmount ??
        0;
      return toNumberStrict(raw);
    };

    const getTotalAmount = (bill) =>
      toNumberStrict(bill?.total_bill_amount ?? bill?.totalBillAmount ?? 0);

    const isFullyPaid = (bill) => {
      const total = getTotalAmount(bill);
      const paid = getPaidAmount(bill);
      if (!Number.isFinite(total) || total <= 0) return false;
      return paid >= total;
    };

    const isInventoryPosted = (bill) => {
      const v =
        bill?.inventory_posted ??
        bill?.inventoryPosted ??
        bill?.inventory_done ??
        bill?.inventoryDone ??
        bill?.is_inventory_done ??
        bill?.isInventoryDone ??
        bill?.inventory_status ??
        bill?.inventoryStatus ??
        null;

      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1;
      if (typeof v === "string")
        return ["done", "posted", "completed", "complete"].includes(v.toLowerCase());
      return false;
    };

    const matchesTypeFilter = (bill) => {
      if (typeFilter === "ALL") return true;
      const t = String(bill?.invoice_type ?? "").toLowerCase();
      if (typeFilter === "TAX") return t.includes("tax");
      if (typeFilter === "PROFORMA") return t.includes("proforma");
      return true;
    };

    const matchesPaymentFilter = (bill) => {
      if (paymentFilter === "ALL") return true;
      const paid = isFullyPaid(bill);
      if (paymentFilter === "PAID") return paid;
      if (paymentFilter === "UNPAID") return !paid;
      return true;
    };

    const matchesInventoryFilter = (bill) => {
      if (inventoryFilter === "ALL") return true;
      const posted = isInventoryPosted(bill);
      if (inventoryFilter === "POSTED") return posted;
      if (inventoryFilter === "PENDING") return !posted;
      return true;
    };

    const matchesAmountRange = (bill) => {
      const total = toNumberStrict(bill?.total_bill_amount ?? 0);
      const min = amountMin === "" ? null : Number(amountMin);
      const max = amountMax === "" ? null : Number(amountMax);
      if (min != null && Number.isFinite(min) && total < min) return false;
      if (max != null && Number.isFinite(max) && total > max) return false;
      return true;
    };

    return (bills || [])
      .filter((bill) => {
        const matchesTab = selectedStatus === null || bill.bill_status === selectedStatus;
        const matchesVendor = vendorFilter
          ? String(bill.master_vendor_name || "") === vendorFilter
          : true;
        const matchesWorkstream = (() => {
          if (selectedStatus !== "REVIEWED") return true;
          if (effectiveActiveTab === "Manage Inventory") return !isInventoryPosted(bill);
          if (effectiveActiveTab === "Make Payments") return !isFullyPaid(bill);
          return true;
        })();
        const matchesSearch = (() => {
          if (!rawSearch) return true;
          if (matchesIntelligentSearch(bill)) return true;
          const children = Array.isArray(bill.children) ? bill.children : [];
          return children.some((c) => matchesIntelligentSearch(c));
        })();
        return (
          matchesTab &&
          matchesVendor &&
          matchesWorkstream &&
          matchesTypeFilter(bill) &&
          matchesPaymentFilter(bill) &&
          matchesInventoryFilter(bill) &&
          matchesAmountRange(bill) &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        const dateA = getUploadedDate(a);
        const dateB = getUploadedDate(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      })
      .sort((a, b) => {
        if (!sortField) return 0;

        const getSortableValue = (row, field) => {
          if (field === "total_bill_amount") return toNumberStrict(row.total_bill_amount);
          if (
            field === "uploaded_at_ist_human" ||
            field === "uploaded_at_ist_readable" ||
            field === "uploaded_at_ist"
          ) {
            const t = getUploadedDate(row)?.getTime();
            return Number.isFinite(t) ? t : 0;
          }
          const v = row[field];
          return typeof v === "string" ? v.toLowerCase() : v ?? "";
        };

        const av = getSortableValue(a, sortField);
        const bv = getSortableValue(b, sortField);

        if (av < bv) return sortOrder === "asc" ? -1 : 1;
        if (av > bv) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [bills, effectiveActiveTab, sortField, sortOrder, vendorFilter, search]);

  const paginatedBills = useMemo(() => {
    const pageSize = effectiveRowsPerPage;
    if (!isClientSearchActive) return filteredBills;
    const start = currentPage * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage, effectiveRowsPerPage, isClientSearchActive]);

  // ✅ DETAIL MODE only when inline forms are open
  const isInlineViewOpen = !!formView;

  // ---------------- Tabs + Filters + Search + New Invoice ----------------
  const renderTopToolbar = () => (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
          gap: ui.toolbarGap,
        flexWrap: "wrap",
      }}
    >
      {/* LEFT: Tabs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          borderBottom: "1px solid #E5E7EB",
          gap: ui.tabsGap,
          flexShrink: 0,
        }}
      >
        <Box sx={{ width: 4, bgcolor: "#2563EB", height: 28, mr: 2 }} />

        {tabs.map((tab) => {
          const active = effectiveActiveTab === tab;
          return (
            <Box
              key={tab}
              onClick={() => {
                setEffectiveActiveTab(tab);
                setCurrentPage(0);
              }}
              sx={{ cursor: "pointer", pb: 0.5 }}
            >
              <Typography
                sx={{
                  fontSize: ui.tabFontSize,
                  fontWeight: active ? 700 : 600,
                  color: active ? "#2563EB" : COLORS.textSecondary,
                  whiteSpace: "nowrap",
                }}
              >
                {tab.toUpperCase()}
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
      </Box>

      {/* RIGHT: Filters + Search + View toggle + New Invoice */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          gap: 1,
          flexWrap: { xs: "nowrap", md: "wrap" },
          justifyContent: { xs: "flex-start", md: "flex-end" },
          flex: 1,
          maxWidth: "100%",
        }}
      >
        {/* Desktop (md+): show everything inline */}
        {!isSmallScreen && (
          <>
            <Tooltip title="Refresh invoices">
              <span>
                <IconButton
                  size="small"
                  disabled={loading}
                  onClick={() => {
                    setCurrentPage(0);
                    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
                  }}
                  sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 2,
                    backgroundColor: "#fff",
                    "&:hover": { backgroundColor: "#F9FAFB" },
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              variant="outlined"
              startIcon={<FilterAltOutlinedIcon />}
              onClick={() => setMobileFiltersOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                backgroundColor: "#fff",
                fontSize: ui.buttonFontSize,
                py: ui.controlPy,
              }}
            >
              Filters
            </Button>

            <TextField
              placeholder='Search (e.g. vendor:jk inv:810 amount>50000)'
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                flexGrow: 1,
                minWidth: 180,
                maxWidth: 260,
                bgcolor: "#fff",
                "& .MuiOutlinedInput-root": { borderRadius: "999px" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: COLORS.textSecondary, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
              <ToggleButtonGroup
                exclusive
                value={viewMode}
                onChange={(_e, next) => {
                  if (!next) return;
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

            <Button
              variant="contained"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 2.5,
                py: ui.controlPy,
                fontSize: ui.buttonFontSize,
                bgcolor: "#3B82F6",
                "&:hover": { bgcolor: "#2563EB" },
                whiteSpace: "nowrap",
              }}
              onClick={() => setOpenUploadDialog(true)}
            >
              + New Invoice
            </Button>
          </>
        )}

        {/* Small screens: compact actions; search expands; filters open as a drawer */}
        {isSmallScreen && (
          <>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                width: "100%",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => setMobileSearchOpen((v) => !v)}
                sx={{ textTransform: "none", borderRadius: 2, backgroundColor: "#fff" }}
              >
                Search
              </Button>

              <Button
                variant="outlined"
                startIcon={<FilterAltOutlinedIcon />}
                onClick={() => setMobileFiltersOpen(true)}
                sx={{ textTransform: "none", borderRadius: 2, backgroundColor: "#fff" }}
              >
                Filters
              </Button>

              <Tooltip title="Refresh invoices">
                <span>
                  <IconButton
                    size="small"
                    disabled={loading}
                    onClick={() => {
                      setCurrentPage(0);
                      fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
                    }}
                    sx={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 2,
                      backgroundColor: "#fff",
                      "&:hover": { backgroundColor: "#F9FAFB" },
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
                <ToggleButtonGroup
                  exclusive
                  value={viewMode}
                  onChange={(_e, next) => {
                    if (!next) return;
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

              <Button
                variant="contained"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.5,
                  fontSize: 13,
                  bgcolor: "#3B82F6",
                  "&:hover": { bgcolor: "#2563EB" },
                  whiteSpace: "nowrap",
                }}
                onClick={() => setOpenUploadDialog(true)}
              >
                + New
              </Button>
            </Box>

            <Collapse in={mobileSearchOpen} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 1, width: "100%" }}>
                <TextField
                  autoFocus
                  placeholder='Search (e.g. vendor:jk inv:810 amount>50000)'
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{
                    width: "100%",
                    bgcolor: "#fff",
                    "& .MuiOutlinedInput-root": { borderRadius: "999px" },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: COLORS.textSecondary, fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Collapse>

            <Drawer
              anchor="right"
              open={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen(false)}
              PaperProps={{ sx: { width: "min(420px, 92vw)", p: 2 } }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography sx={{ fontWeight: 900 }}>Filters</Typography>
                <IconButton onClick={() => setMobileFiltersOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280", mt: 0.5 }}>
                  DOCUMENT
                </Typography>
                <Select
                  size="small"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  sx={{ backgroundColor: "#fff" }}
                >
                  <MenuItem value="ALL">All types</MenuItem>
                  <MenuItem value="TAX">Tax Invoice</MenuItem>
                  <MenuItem value="PROFORMA">Proforma Invoice</MenuItem>
                </Select>

                <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280", mt: 1 }}>
                  WORKSTREAMS
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Select
                      fullWidth
                      size="small"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      sx={{ backgroundColor: "#fff" }}
                    >
                      <MenuItem value="ALL">Payment: All</MenuItem>
                      <MenuItem value="UNPAID">Payment: Unpaid</MenuItem>
                      <MenuItem value="PAID">Payment: Paid</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Select
                      fullWidth
                      size="small"
                      value={inventoryFilter}
                      onChange={(e) => setInventoryFilter(e.target.value)}
                      sx={{ backgroundColor: "#fff" }}
                    >
                      <MenuItem value="ALL">Inventory: All</MenuItem>
                      <MenuItem value="PENDING">Inventory: Pending</MenuItem>
                      <MenuItem value="POSTED">Inventory: Posted</MenuItem>
                    </Select>
                  </Grid>
                </Grid>

                <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280", mt: 1 }}>
                  AMOUNT
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Min"
                      size="small"
                      type="number"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      sx={{ backgroundColor: "#fff" }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Max"
                      size="small"
                      type="number"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      sx={{ backgroundColor: "#fff" }}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />

                <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                  DATE + VENDOR
                </Typography>
                <TextField
                  label="Invoice Date From"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateFrom(value);
                    setCurrentPage(0);
                    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, value, dateTo);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ backgroundColor: "#fff" }}
                />

                <TextField
                  label="Invoice Date To"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateTo(value);
                    setCurrentPage(0);
                    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, value);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ backgroundColor: "#fff" }}
                />

                <Select
                  size="small"
                  value={vendorFilter}
                  onChange={(e) => {
                    setVendorFilter(e.target.value);
                    setCurrentPage(0);
                  }}
                  displayEmpty
                  sx={{ backgroundColor: "#fff" }}
                >
                  <MenuItem value="">
                    <em>All Vendors</em>
                  </MenuItem>
                  {uniqueVendors.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>

                <Button
                  variant="outlined"
                  onClick={() => {
                    setVendorFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setTypeFilter("ALL");
                    setPaymentFilter("ALL");
                    setInventoryFilter("ALL");
                    setAmountMin("");
                    setAmountMax("");
                    setCurrentPage(0);
                    fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, "", "");
                    setMobileFiltersOpen(false);
                  }}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Reset all filters
                </Button>
              </Stack>
            </Drawer>
          </>
        )}
      </Box>
    </Box>
  );

  // ---------------- LIST TABLE ----------------
  const renderTable = () => (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 2,
        border: "1px solid #E5E7EB",
        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
        // On small screens, avoid nested scrollbars (page scroll only).
        overflow: isSmallScreen ? "visible" : "auto",
        maxHeight: isSmallScreen ? "none" : "85vh",
      }}
    >
      {loading && bills.length === 0 ? (
        renderLoadingState()
      ) : !loading && fetchError && bills.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <StatusBox
            variant="error"
            title="Failed to load invoices"
            actions={
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setCurrentPage(0);
                  fetchBills(0, effectiveRowsPerPage, search, effectiveActiveTab, dateFrom, dateTo);
                }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800 }}
              >
                Retry
              </Button>
            }
          >
            {fetchError}
          </StatusBox>
        </Box>
      ) : (
        <>
          <Table
            stickyHeader
            size="small"
            sx={{
              minWidth: 1200,
              borderCollapse: "separate",
              borderSpacing: 0,
              "& th, & td": { border: "1px solid #E5E7EB" },
              "& thead th": {
                fontWeight: 600,
                fontSize: ui.tableFontSize,
                color: "#4B5563",
                backgroundColor: "#F9FAFB",
              },
              "& tbody td": { fontSize: ui.tableFontSize, whiteSpace: "nowrap" },
              "& .MuiTableRow-root:hover td": { backgroundColor: "#F3F4FF" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56, textAlign: "center" }} />
                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("avenue_created_invoice_id");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Avenue ID{" "}
                  {sortField === "avenue_created_invoice_id"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("master_vendor_name");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Vendor Name{" "}
                  {sortField === "master_vendor_name"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("json_invoice_number");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Invoice No.{" "}
                  {sortField === "json_invoice_number"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("uploaded_at_ist_readable");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Uploaded Date{" "}
                  {sortField === "uploaded_at_ist_readable"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell>Invoice Type</TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("total_bill_amount");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Total Amount{" "}
                  {sortField === "total_bill_amount"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("uploaded_by_name");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Uploaded By{" "}
                  {sortField === "uploaded_by_name"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setSortField("bill_status");
                    setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
                  }}
                >
                  Status{" "}
                  {sortField === "bill_status"
                    ? sortOrder === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </TableCell>

                <TableCell sx={{ textAlign: "center", width: 150 }}>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedBills.map((bill) => {
                const openRow = () => handleView(bill, effectiveActiveTab);

                return (
                  <React.Fragment key={bill.avenue_created_invoice_id}>
                    <TableRow
                      hover
                      role="button"
                      tabIndex={0}
                      onClick={openRow}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell sx={{ textAlign: "center" }}>
                        {bill.children?.length > 0 && (
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleInvoice(bill.avenue_created_invoice_id);
                            }}
                            size="small"
                          >
                            {expandedInvoices[bill.avenue_created_invoice_id] ? (
                              <ArrowBackIcon fontSize="small" />
                            ) : (
                              <AddIcon fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </TableCell>

                      <Tooltip title={bill.avenue_created_invoice_id} placement="top">
                        <TableCell
                          sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {bill.avenue_created_invoice_id}
                        </TableCell>
                      </Tooltip>

                      <Tooltip title={bill.master_vendor_name} placement="top">
                        <TableCell
                          sx={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {bill.master_vendor_name}
                        </TableCell>
                      </Tooltip>

                      {(() => {
                        const s = String(bill?.json_invoice_number ?? "").trim();
                        const bad = ["not extractable", "not-extractable", "n/a", "na"];
                        const isValid = !!s && !bad.includes(s.toLowerCase());
                        return (
                          <Tooltip
                            title={isValid ? s : ""}
                            disableHoverListener={!isValid}
                            placement="top"
                          >
                            <TableCell
                              sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}
                            >
                              {isValid ? s : "Null"}
                            </TableCell>
                          </Tooltip>
                        );
                      })()}

                      <Tooltip title={bill.uploaded_at_ist_human} placement="top">
                        <TableCell
                          sx={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {formatUploadedDate(bill)}
                        </TableCell>
                      </Tooltip>

                      <TableCell>{bill.invoice_type}</TableCell>

                      <TableCell>
                        {bill.total_bill_amount ? `₹${bill.total_bill_amount}` : "N/A"}
                      </TableCell>

                      <Tooltip title={bill.uploaded_by_name} placement="top">
                        <TableCell
                          sx={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {bill.uploaded_by_name}
                        </TableCell>
                      </Tooltip>

                      <TableCell sx={{ maxWidth: 180, width: 180, textAlign: "center" }}>
                        <Tooltip title={bill.bill_status} placement="top">
                          <Box
                            sx={{
                              display: "inline-block",
                              maxWidth: "100%",
                              textAlign: "center",
                              px: 2,
                              py: 0.5,
                              borderRadius: "20px",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              backgroundColor: statusColors[bill.bill_status] || "#F3F4F6",
                              color: statusTextColor[bill.bill_status] || "#111827",
                              border: `1px solid ${
                                statusBorderColor[bill.bill_status] || "#E5E7EB"
                              }`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {bill.bill_status}
                          </Box>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ textAlign: "center" }}>
                        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          <Tooltip title="View Invoice">
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                const fileUrl = bill.file_url;
                                if (fileUrl) {
                                  setSelectedPdfUrl(fileUrl);
                                  setOpenPdfDialog(true);
                                } else {
                                  setDialogContent({
                                    title: "Error",
                                    message: "No file available for this invoice.",
                                  });
                                  setOpenDialog(true);
                                }
                              }}
                              size="small"
                              color="primary"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Upload Tax Invoice">
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (bill.invoice_type === "Proforma Invoice") {
                                    handleOpenTaxInvoiceDialog(bill);
                                  }
                                }}
                                disabled={
                                  bill.invoice_type !== "Proforma Invoice" ||
                                  bill.bill_status === "READY_FOR_REVIEW"
                                }
                                sx={{
                                  visibility:
                                    bill.invoice_type === "Proforma Invoice"
                                      ? "visible"
                                      : "hidden",
                                }}
                              >
                                <UploadFileIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>

                    {expandedInvoices[bill.avenue_created_invoice_id] &&
                      Array.isArray(bill.children) &&
                      bill.children.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ p: 0, bgcolor: "#F9FAFB" }}>
                            <Box sx={{ p: 2 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1, color: "#6B7280" }}>
                                Child Invoices
                              </Typography>

                              <Box sx={{ overflowX: "auto" }}>
                                <Table size="small" sx={{ minWidth: 900 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Avenue ID</TableCell>
                                      <TableCell>Vendor</TableCell>
                                      <TableCell>Invoice No</TableCell>
                                      <TableCell>Uploaded</TableCell>
                                      <TableCell>Total</TableCell>
                                      <TableCell>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {bill.children.map((c) => (
                                      <TableRow
                                        key={c.avenue_created_invoice_id}
                                        hover
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleView(c, effectiveActiveTab);
                                        }}
                                        sx={{ cursor: "pointer" }}
                                      >
                                        <TableCell>{c.avenue_created_invoice_id}</TableCell>
                                        <TableCell>{c.master_vendor_name}</TableCell>
                                        <TableCell>{c.json_invoice_number || "Null"}</TableCell>
                                        <TableCell>{formatUploadedDate(c)}</TableCell>
                                        <TableCell>
                                          {c.total_bill_amount ? `₹${c.total_bill_amount}` : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                          <Box
                                            sx={{
                                              display: "inline-block",
                                              px: 1.5,
                                              py: 0.4,
                                              borderRadius: 999,
                                              fontSize: 11,
                                              fontWeight: 800,
                                              backgroundColor: statusColors[c.bill_status] || "#F3F4F6",
                                              color: statusTextColor[c.bill_status] || "#111827",
                                              border: `1px solid ${statusBorderColor[c.bill_status] || "#E5E7EB"}`,
                                            }}
                                          >
                                            {c.bill_status}
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                  </React.Fragment>
                );
              })}

              {paginatedBills.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No invoices found for the selected filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Dialog
            open={openPdfDialog}
            onClose={() => setOpenPdfDialog(false)}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>Invoice PDF</DialogTitle>
            <DialogContent>
              {selectedPdfUrl ? (
                <iframe
                  src={selectedPdfUrl}
                  width="100%"
                  height="700px"
                  style={{ border: "none" }}
                  title="Invoice PDF"
                />
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
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <TablePagination
              component="div"
              count={isClientSearchActive ? filteredBills.length : totalCount}
              page={currentPage}
              onPageChange={handleChangePage}
              rowsPerPage={itemsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 30, 50, 100]}
            />
          </Box>
        </>
      )}
    </TableContainer>
  );

  // ---------------- CARD VIEW (12 per page + 4 in a row) ----------------
  const renderCards = () => (
    <Box>
      {loading && bills.length === 0 ? (
        renderLoadingState()
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedBills.map((bill) => {
              const id = bill.avenue_created_invoice_id;
              const vendor = bill.master_vendor_name || "-";
              const invoiceNo = (() => {
                const s = String(bill?.json_invoice_number ?? "").trim();
                const bad = ["not extractable", "not-extractable", "n/a", "na"];
                const ok = !!s && !bad.includes(s.toLowerCase());
                return ok ? s : "Null";
              })();

              const uploaded = formatUploadedDate(bill) || "-";
              const total = bill.total_bill_amount ? `₹${bill.total_bill_amount}` : "N/A";
              const status = bill.bill_status || "-";
              const invoiceType = bill.invoice_type || "-";
              const uploadedBy = bill.uploaded_by_name || "-";
              const hasChildren = Array.isArray(bill.children) && bill.children.length > 0;
              const isExpanded = !!expandedInvoices[id];

              return (
                // ✅ 4 cards in a row on lg
                <Grid item xs={12} sm={6} md={4} lg={3} key={id}>
                  <Paper
                    elevation={0}
                    onClick={() => handleView(bill, effectiveActiveTab)}
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
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 2,
                              bgcolor: "#EEF2FF",
                              border: "1px solid #E5E7EB",
                            }}
                          />
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: "#6B7280",
                                fontWeight: 800,
                                letterSpacing: 0.6,
                              }}
                            >
                              {id}
                            </Typography>
                            <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                              {vendor}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }}>
                              Invoice No: <b>{invoiceNo}</b>
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
                            {uploaded}
                          </Typography>

                          {hasChildren && (
                            <Tooltip title={isExpanded ? "Hide children" : "Show children"}>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleInvoice(id);
                                }}
                                sx={{
                                  border: "1px solid #E5E7EB",
                                  bgcolor: "#fff",
                                  "&:hover": { bgcolor: "#F9FAFB" },
                                }}
                                size="small"
                              >
                                {isExpanded ? (
                                  <ArrowBackIcon sx={{ fontSize: 18, color: "#111827" }} />
                                ) : (
                                  <AddIcon sx={{ fontSize: 18, color: "#111827" }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>

                      <Box sx={{ mt: 1.5 }}>
                    
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 2,
                            py: 0.5,
                            borderRadius: 999,
                            fontWeight: 800,
                            fontSize: 11,
                            backgroundColor: statusColors[status] || "#F3F4F6",
                            color: statusTextColor[status] || "#111827",
                            border: `1px solid ${statusBorderColor[status] || "#E5E7EB"}`,
                          }}
                        >
                          {status}
                        </Box>
                        <Tooltip title="View Invoice">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              const fileUrl = bill.file_url;
                              if (fileUrl) {
                                setSelectedPdfUrl(fileUrl);
                                setOpenPdfDialog(true);
                              } else {
                                setDialogContent({
                                  title: "Error",
                                  message: "No file available for this invoice.",
                                });
                                setOpenDialog(true);
                              }
                            }}
                            sx={{
                              border: "1px solid #E5E7EB",
                              bgcolor: "#fff",
                              "&:hover": { bgcolor: "#F9FAFB" },
                            }}
                            size="small"
                          >
                            <VisibilityIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Upload Tax Invoice">
                          <span>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                if (bill.invoice_type === "Proforma Invoice") {
                                  handleOpenTaxInvoiceDialog(bill);
                                }
                              }}
                              disabled={
                                bill.invoice_type !== "Proforma Invoice" ||
                                bill.bill_status === "READY_FOR_REVIEW"
                              }
                              sx={{
                                border: "1px solid #E5E7EB",
                                bgcolor: "#fff",
                                "&:hover": { bgcolor: "#F9FAFB" },
                                visibility:
                                  bill.invoice_type === "Proforma Invoice" ? "visible" : "hidden",
                              }}
                              size="small"
                            >
                              <UploadFileIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <Box sx={{ minWidth: 140 }}>
                          <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>
                            Invoice Type
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                            {invoiceType}
                          </Typography>
                        </Box>

                        <Box sx={{ minWidth: 120 }}>
                          <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>
                            Total
                          </Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                            {total}
                          </Typography>
                        </Box>

                        {/* <Box sx={{ flex: 1, minWidth: 180 }}>
                          <Typography sx={{ fontSize: 12, color: "#6B7280", mb: 0.3 }}>
                            Products
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#111827",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={products}
                          >
                            {products}
                          </Typography>
                        </Box> */}

                  
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />
                      {hasChildren && isExpanded && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: "#F9FAFB",
                            border: "1px dashed #E5E7EB",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280", mb: 1 }}>
                            Child Invoices
                          </Typography>

                          <Stack spacing={1}>
                            {bill.children.map((c) => (
                              <Paper
                                key={c.avenue_created_invoice_id}
                                elevation={0}
                                onClick={() => handleView(c, effectiveActiveTab)}
                                sx={{
                                  p: 1.2,
                                  borderRadius: 2,
                                  border: "1px solid #E5E7EB",
                                  bgcolor: "#fff",
                                  cursor: "pointer",
                                  "&:hover": { bgcolor: "#F9FAFB" },
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" spacing={1}>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>
                                      {c.avenue_created_invoice_id}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
                                      {c.master_vendor_name || "-"} • {c.json_invoice_number || "Null"}
                                    </Typography>
                                  </Box>
                                  <Box
                                    sx={{
                                      px: 1.2,
                                      py: 0.35,
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 900,
                                      backgroundColor: statusColors[c.bill_status] || "#F3F4F6",
                                      color: statusTextColor[c.bill_status] || "#111827",
                                      border: `1px solid ${statusBorderColor[c.bill_status] || "#E5E7EB"}`,
                                      whiteSpace: "nowrap",
                                      height: "fit-content",
                                    }}
                                  >
                                    {c.bill_status || "-"}
                                  </Box>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}

            {paginatedBills.length === 0 && !loading && (
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
                  <Typography variant="body2">
                    No invoices found for the selected filters.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* ✅ Pagination: cards fixed to 12, list keeps options */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <TablePagination
              component="div"
              count={isClientSearchActive ? filteredBills.length : totalCount}
              page={currentPage}
              onPageChange={handleChangePage}
              rowsPerPage={viewMode === "cards" ? CARDS_PER_PAGE : itemsPerPage}
              onRowsPerPageChange={viewMode === "cards" ? undefined : handleChangeRowsPerPage}
              rowsPerPageOptions={viewMode === "cards" ? [] : [10, 30, 50, 100]}
              sx={{
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
                  display: viewMode === "cards" ? "none" : "inline-flex",
                },
              }}
            />
          </Box>

          <Dialog
            open={openPdfDialog}
            onClose={() => setOpenPdfDialog(false)}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>Invoice PDF</DialogTitle>
            <DialogContent>
              {selectedPdfUrl ? (
                <iframe
                  src={selectedPdfUrl}
                  width="100%"
                  height="700px"
                  style={{ border: "none" }}
                  title="Invoice PDF"
                />
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
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );

  // ---------------- UI ----------------
  return (
    <Box
      sx={{
        p: ui.pagePadding,
        backgroundColor: "#F4F6F9",
        minHeight: { xs: "100vh", md: "96vh" },
      }}
    >
      {Array.isArray(tabsToShow) && tabs.length === 0 && (
        <Box sx={{ p: 2 }}>
          <StatusBox
            variant="warning"
            title="No access"
          >
            You don’t have access to any invoice tabs.
          </StatusBox>
        </Box>
      )}

      {!isInlineViewOpen && (
        <>
          {(!Array.isArray(tabsToShow) || tabs.length > 0) && (
            <>
              {renderTopToolbar()}
              {viewMode === "cards" ? renderCards() : renderTable()}
            </>
          )}
        </>
      )}

      {isInlineViewOpen && (
        <Box>
          {formView === "ReadyForReview" && billDetails && (
            <ReadyForReview invoiceData={billDetails} onClose={handleBackToList} />
          )}
          {formView === "ReadyForPayment" && billDetails && (
            <ReadyForPayment invoiceData={billDetails} onClose={handleBackToList} />
          )}
          {formView === "PaidBillForm" && billDetails && (
            <PaidBillForm invoiceData={billDetails} onClose={handleBackToList} />
          )}
          {formView === "ReviewedForm" && billDetails && (
            <ReviewedForm
              invoiceData={billDetails}
              onClose={handleBackToList}
              refreshData={fetchbillDetails}
            />
          )}
        </Box>
      )}

      <Dialog
        open={openUploadDialog}
        onClose={() => setOpenUploadDialog(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <UploadInvoice onClose={handleCloseUploadDialog} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openProformaDialog}
        onClose={handleCloseProformaDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {selectedInvoiceForProforma ? (
            <ProformaInvoice
              invoiceData={selectedInvoiceForProforma}
              onClose={handleCloseProformaDialog}
            />
          ) : (
            <Box sx={{ p: 3, bgcolor: "#fff", borderRadius: 2 }}>
              <Typography>Loading Proforma…</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openTaxInvoiceDialog}
        onClose={handleCloseTaxDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {selectedInvoiceForTax ? (
            <UploadTaxInvoice
              invoiceData={selectedInvoiceForTax}
              onClose={handleCloseTaxDialog}
            />
          ) : (
            <Box sx={{ p: 3, bgcolor: "#fff", borderRadius: 2 }}>
              <Typography>Loading…</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{dialogContent.title}</DialogTitle>
        <DialogContent>
          <Typography>{dialogContent.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillsList;