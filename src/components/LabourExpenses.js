import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  Grid,
  InputLabel,
  FormControl,
  FormControlLabel,
  Switch,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  Alert,
  Snackbar,
  Stack,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DownloadIcon from "@mui/icons-material/Download";
import IconButton from "@mui/material/IconButton";
import axios from "axios";
import * as XLSX from "xlsx";
import { API_BASE } from "../config";

const LabourExpense = ({ propertyId, onClose, onTotalsChange }) => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // ✅ NEW: property/project info from API
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);

  // ✅ summary from API
  const [summary, setSummary] = useState(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWorkerType, setFilterWorkerType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEntryType, setFilterEntryType] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // Table pagination (for grouped view: pages are groups)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Expanded group keys (worker_id|worker_name) for "Show details"
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  const [amountMode, setAmountMode] = useState("auto"); // "auto" | "manual"
  // Confirmation dialog before Delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmExpense, setConfirmExpense] = useState(null);
  const [formData, setFormData] = useState({
    property_id: "",
    worker_id: "",
    worker_name: "",
    worker_type: "",
    entry_type: "Regular",
    date: "",
    hours: "",
    days: "",
    rate: "",
    amount: "",
    status: "paid",
    remarks: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch expenses from API
  const fetchExpenses = async () => {
    if (!propertyId) {
      console.log("No property ID provided");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/properties/${propertyId}/labour-payments`
      );

      const payload = response.data || {};

      // ✅ pull property/project display names
      setPropertyInfo(payload.property || null);
      setProjectInfo(payload.project || null);

      // ✅ summary
      setSummary(payload.summary || null);

      // ✅ payments array
      const paymentsArray = Array.isArray(payload.payments)
        ? payload.payments
        : Array.isArray(payload)
        ? payload
        : payload?.data || payload?.expenses || [];

      setExpenses(paymentsArray);
      setFilteredExpenses(paymentsArray);
      setPage(0);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
      setSnackbar({
        open: true,
        message: "Failed to load labour expenses",
        severity: "error",
      });
      setExpenses([]);
      setFilteredExpenses([]);
      setSummary(null);
      setPropertyInfo(null);
      setProjectInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Fetch workers assigned to this property (for Add expense dropdown)
  const fetchAssignedWorkers = async () => {
    if (!propertyId) {
      setAssignedWorkers([]);
      return;
    }
    try {
      setLoadingWorkers(true);
      const labourResponse = await axios.get(
        `${API_BASE}/properties-labor/${propertyId}`
      );
      const labours = Array.isArray(labourResponse.data) ? labourResponse.data : [];
      const workers = labours.map((labour) => ({
        worker_id: labour.employee_code,
        worker_name: labour.name,
        worker_type: labour.employee_type || "labour",
        work_type: labour.work_type,
        assign_amount: labour.assign_amount || 0,
      }));
      try {
        const assignedResponse = await axios.get(
          `${API_BASE}/property/${propertyId}/assigned-workers`
        );
        const labourLogs = assignedResponse.data?.labour_logs || [];
        const contractorLogs = assignedResponse.data?.contractor_logs || [];
        const workerMap = new Map();
        labourLogs.forEach((log) => {
          if (log.labour_id && log.labour_name) {
            const key = `labour_${log.labour_id}`;
            if (!workerMap.has(key)) {
              workerMap.set(key, {
                worker_id: log.labour_id,
                worker_name: log.labour_name,
                worker_type: log.worker_type || "labour",
                assign_amount: 0,
              });
            }
          }
        });
        contractorLogs.forEach((log) => {
          if (log.contractor_id && log.contractor_name) {
            const key = `contractor_${log.contractor_id}`;
            if (!workerMap.has(key)) {
              workerMap.set(key, {
                worker_id: log.contractor_id,
                worker_name: log.contractor_name,
                worker_type: log.worker_type || "contractor",
                assign_amount: 0,
              });
            }
          }
        });
        workers.forEach((worker) => {
          const key = `${worker.worker_type || "labour"}_${worker.worker_id}`;
          if (!workerMap.has(key)) {
            workerMap.set(key, worker);
          } else {
            const existing = workerMap.get(key);
            if (!existing.assign_amount && worker.assign_amount) {
              existing.assign_amount = worker.assign_amount;
            }
          }
        });
        setAssignedWorkers(Array.from(workerMap.values()));
      } catch {
        setAssignedWorkers(workers);
      }
    } catch (err) {
      console.error("Error fetching assigned workers:", err);
      setAssignedWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  useEffect(() => {
    fetchAssignedWorkers();
  }, [propertyId]);

  // Apply filters
  useEffect(() => {
    if (!Array.isArray(expenses)) {
      setFilteredExpenses([]);
      return;
    }

    let filtered = [...expenses];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.worker_name?.toLowerCase().includes(q) ||
          item.worker_id?.toLowerCase().includes(q) ||
          item.property_id?.toLowerCase().includes(q) ||
          item.payment_id?.toLowerCase().includes(q)
      );
    }

    if (filterWorkerType) {
      const wt = (filterWorkerType || "").toLowerCase();
      filtered = filtered.filter(
        (item) => (item.worker_type || "").toLowerCase() === wt
      );
    }

    if (filterStatus) {
      const st = (filterStatus || "").toLowerCase();
      filtered = filtered.filter(
        (item) => normalizeStatus(item.status) === st
      );
    }

    if (filterEntryType) {
      filtered = filtered.filter(
        (item) => normalizeEntryType(item.entry_type) === normalizeEntryType(filterEntryType)
      );
    }

    if (filterFromDate || filterToDate) {
      filtered = filtered.filter((item) => {
        const raw = item.created_at || item.date;
        const itemDate = raw ? new Date(raw).toISOString().slice(0, 10) : "";
        if (!itemDate) return false;
        if (filterFromDate && itemDate < filterFromDate) return false;
        if (filterToDate && itemDate > filterToDate) return false;
        return true;
      });
    }

    setFilteredExpenses(filtered);
    setPage(0);
    setExpandedGroups(new Set());
  }, [searchQuery, filterWorkerType, filterStatus, filterEntryType, filterFromDate, filterToDate, expenses]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterWorkerType("");
    setFilterStatus("");
    setFilterEntryType("");
    setFilterFromDate("");
    setFilterToDate("");
  };

  // Get unique values for filters
  const getUniqueValues = (key) => {
    if (!Array.isArray(expenses)) return [];
    return [...new Set(expenses.map((item) => item[key]).filter(Boolean))];
  };

  // Handle dialog open/close
  const handleDialogOpen = (mode, expense = null) => {
    setDialogMode(mode);
    setFormErrors({});

    if (mode === "edit" && expense) {
      setSelectedExpense(expense);
      const rawDate = expense.created_at || expense.date;
      const dateStr = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : "";
      const amountVal = expense.net_amount ?? expense.amount ?? "";
      const hoursVal = expense.total_hours_worked ?? expense.hours ?? "";
      const daysVal = expense.total_days ?? expense.days ?? "";
      const workerIdVal =
        expense.worker_id ??
        expense.labour_id ??
        expense.labor_id ??
        expense.contractor_id ??
        expense.employee_id ??
        expense.employee_code ??
        expense.worker_code ??
        "";
      const workerNameVal =
        expense.worker_name ??
        expense.labour_name ??
        expense.labor_name ??
        expense.contractor_name ??
        expense.employee_name ??
        expense.name ??
        "";
      const inferWorkerType = () => {
        const explicit = (expense.worker_type || "").toString().toLowerCase().trim();
        if (["labour", "labor", "contractor", "employee"].includes(explicit)) {
          return explicit === "labor" ? "labour" : explicit;
        }
        if (expense.contractor_id != null || expense.contractor_name) return "contractor";
        if (expense.employee_id != null || expense.employee_code != null || expense.employee_name) return "employee";
        return "labour";
      };
      const next = {
        property_id: expense.property_id || "",
        worker_id: workerIdVal != null ? String(workerIdVal) : "",
        worker_name: workerNameVal != null ? String(workerNameVal) : "",
        worker_type: inferWorkerType(),
        entry_type: normalizeEntryType(expense.entry_type),
        date: dateStr,
        hours: hoursVal !== "" ? String(hoursVal) : "",
        days: daysVal !== "" ? String(daysVal) : "",
        rate: expense.rate != null && expense.rate !== "" ? String(expense.rate) : "",
        amount: amountVal !== "" && amountVal != null ? String(amountVal) : "",
        status: normalizeStatus(expense.status) || "paid",
        remarks: expense.remarks || expense.comments || "",
      };
      setFormData(next);
      setInitialFormData(next);

      const hrs = Number(next.hours) || 0;
      const dys = Number(next.days) || 0;
      const r = Number(next.rate) || 0;
      const qty = dys || hrs || 0;
      const computed = r > 0 && qty > 0 ? Math.round(r * qty * 100) / 100 : 0;
      const amt = Number(next.amount) || 0;
      setAmountMode(computed > 0 && Math.abs(amt - computed) < 0.01 ? "auto" : "manual");
    } else {
      setSelectedExpense(null);
      const today = new Date().toISOString().slice(0, 10);
      const next = {
        property_id: propertyId || "",
        worker_id: "",
        worker_name: "",
        worker_type: "",
        entry_type: "Regular",
        date: today,
        hours: "",
        days: "",
        rate: "",
        amount: "",
        status: "paid",
        remarks: "",
      };
      setFormData(next);
      setInitialFormData(next);
      setAmountMode("auto");
    }

    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedExpense(null);
    setInitialFormData(null);
    setFormErrors({});
  };

  // Open confirmation dialog before Delete
  const handleOpenConfirm = (expense) => {
    if (!expense) return;
    setConfirmExpense(expense);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmExpense(null);
  };

  const handleConfirmProceed = async () => {
    if (!confirmExpense) return;
    const id = confirmExpense.payment_id || confirmExpense.id;
    handleCloseConfirm();
    if (id) await handleDelete(id);
  };

  // Handle delete expense (called after confirmation)
  const handleDelete = async (expenseId) => {
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE}/labour/expenses/${expenseId}`
      );
      setSnackbar({
        open: true,
        message: "Labour expense deleted successfully",
        severity: "success",
      });
      fetchExpenses();
    } catch (err) {
      console.error("Failed to delete expense", err);
      setSnackbar({
        open: true,
        message: "Failed to delete expense",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate add/edit expense form
  const validateForm = () => {
    const err = {};
    const propId = (formData.property_id || "").toString().trim();
    if (!propId) err.property_id = "Property ID is required";

    const workerId = (formData.worker_id || "").toString().trim();
    const workerName = (formData.worker_name || "").toString().trim();
    const useLabourDropdown = propertyId && assignedWorkers.length > 0;
    if (useLabourDropdown && !workerId) err.worker_id = "Please select a labour";
    else if (!workerId) err.worker_id = "Worker ID is required";
    if (!useLabourDropdown && workerId && !workerName) err.worker_name = "Worker name is required";

    const dateStr = (formData.date || "").toString().trim();
    if (!dateStr) err.date = "Date is required";

    const hours = Number(formData.hours) || 0;
    const days = Number(formData.days) || 0;
    const rate = Number(formData.rate) || 0;
    const amount = Number(formData.amount) || 0;
    if (formData.hours !== "" && (Number(formData.hours) < 0 || isNaN(Number(formData.hours)))) err.hours = "Hours must be 0 or more";
    if (formData.days !== "" && (Number(formData.days) < 0 || isNaN(Number(formData.days)))) err.days = "Days must be 0 or more";
    if (formData.rate !== "" && (isNaN(rate) || rate < 0)) err.rate = "Rate must be 0 or more";
    if (formData.amount !== "" && (isNaN(amount) || amount < 0)) err.amount = "Amount must be greater than zero";

    const hasQty = hours > 0 || days > 0;
    const hasAmount = amount > 0;
    const hasRate = rate > 0;

    // When rate is given, hours or days is required for calculation
    if (hasRate && !hasQty) {
      err.rate = "When Rate is entered, Hours or Days is required for calculation";
    }
    if (!hasQty && !hasAmount) {
      err.amount = "Enter either Hours/Days with Rate, or Amount";
    }
    if (hasQty && !hasAmount && (formData.rate === "" || rate <= 0)) {
      err.rate = "Rate is required when Hours or Days are entered";
    }
    // Amount sent must never be zero (respect auto/manual mode)
    const qty = days || hours || 0;
    const computedAmount = hasQty && rate > 0 ? rate * qty : 0;
    const effectiveAmount = amountMode === "auto" ? computedAmount : amount;
    if (effectiveAmount <= 0) err.amount = "Amount must be greater than zero";

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  // Handle form submission — payload aligned with backend POST /labour/expenses
  const handleSubmit = async () => {
    if (!validateForm()) {
      setSnackbar({ open: true, message: "Please fix the form errors", severity: "error" });
      return;
    }
    try {
      setLoading(true);
      const url = `${API_BASE}/labour/expenses`;

      const hoursNum = Number(formData.hours) || 0;
      const daysNum = Number(formData.days) || 0;
      const rateNum = Number(formData.rate) || 0;
      const amountNum = Number(formData.amount) || 0;
      const qty = daysNum || hoursNum;
      const computedAmount = rateNum > 0 && qty > 0 ? rateNum * qty : 0;
      const amountToSend = amountMode === "auto" ? computedAmount : amountNum;

      const payload = {
        property_id: formData.property_id,
        worker_id: formData.worker_id,
        worker_name: formData.worker_name,
        worker_type: formData.worker_type || "labour",
        entry_type: formData.entry_type || "Regular",
        date: formData.date || null,
        hours: hoursNum,
        days: daysNum,
        rate: rateNum,
        amount: amountToSend,
        status: formData.status || "pending",
        remarks: formData.remarks || "",
      };

      if (dialogMode === "add") {
        await axios.post(url, payload);
        setSnackbar({
          open: true,
          message: "Labour expense added successfully",
          severity: "success",
        });
      } else {
        await axios.put(`${url}/${selectedExpense.payment_id || selectedExpense.id}`, payload);
        setSnackbar({
          open: true,
          message: "Labour expense updated successfully",
          severity: "success",
        });
      }

      handleDialogClose();
      fetchExpenses();
    } catch (err) {
      console.error("Failed to save expense", err);
      setSnackbar({
        open: true,
        message: `Failed to ${dialogMode} expense`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const isDialogDirty = useMemo(() => {
    if (!dialogOpen) return false;
    if (!initialFormData) return true;
    const keys = Object.keys(formData || {});
    return keys.some((k) => String(formData?.[k] ?? "") !== String(initialFormData?.[k] ?? ""));
  }, [dialogOpen, formData, initialFormData]);

  const workerAssignCapMap = useMemo(() => {
    const m = new Map();
    (assignedWorkers || []).forEach((w) => {
      const id = String(w.worker_id ?? "").trim();
      if (!id) return;
      const amt = Number(w.assign_amount) || 0;
      if (amt > 0) m.set(id, Math.max(m.get(id) ?? 0, amt));
    });
    return m;
  }, [assignedWorkers]);

  const dialogPreview = useMemo(() => {
    const hoursNum = Number(formData.hours) || 0;
    const daysNum = Number(formData.days) || 0;
    const rateNum = Number(formData.rate) || 0;
    const qty = daysNum || hoursNum || 0;
    const computed = rateNum > 0 && qty > 0 ? Math.round(rateNum * qty * 100) / 100 : 0;
    const manual = Math.round((Number(formData.amount) || 0) * 100) / 100;
    const effective = amountMode === "auto" ? computed : manual;
    const cap = workerAssignCapMap.get(String(formData.worker_id ?? "").trim()) ?? 0;
    const extraAboveCap = cap > 0 ? Math.max(0, Math.round((effective - cap) * 100) / 100) : 0;
    return { qty, computed, manual, effective, cap, extraAboveCap };
  }, [formData.amount, formData.days, formData.hours, formData.rate, formData.worker_id, amountMode, workerAssignCapMap]);

  // Format currency
  const formatCurrency = (amount) =>
    `₹${new Intl.NumberFormat("en-IN").format(Number(amount || 0))}`;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Normalize status/type for case-insensitive comparison (Paid, paid, PAID → same)
  const normalizeStatus = (s) => (s || "").toLowerCase().trim();

  // Normalize entry type labels so the UI doesn't show duplicates
  // (e.g. "Avenue Add on" vs "Avenue Add On").
  const normalizeEntryType = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "Regular";
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (key === "regular") return "Regular";
    if (key === "avenue add on") return "Avenue Add On";
    if (key === "customer add on") return "Customer Add On";
    return raw;
  };

  // How much of this row is actually paid (supports partial payments).
  // Backend returns `paid_amount` for partial/paid cases; when status is "paid" we treat the full net as paid.
  const getRowPaidAmount = (item) => {
    const netAmount = Number(item?.net_amount ?? item?.amount ?? 0) || 0;
    const s = normalizeStatus(item?.status);

    if (s === "paid") return netAmount;

    const paidAmount = Number(item?.paid_amount ?? 0) || 0;
    // Clamp so we never exceed net amount and never go negative.
    return Math.min(netAmount, Math.max(0, paidAmount));
  };

  const getRowPaymentSplit = (item) => {
    const netAmount = Number(item?.net_amount ?? item?.amount ?? 0) || 0;
    const paidAmount = getRowPaidAmount(item);
    const unpaidAmount = Math.max(0, netAmount - paidAmount);
    const isPartial = netAmount > 0 && paidAmount > 0 && paidAmount < netAmount;
    return { netAmount, paidAmount, unpaidAmount, isPartial };
  };

  const getDisplayStatus = (item) => {
    const s = normalizeStatus(item?.status);
    const { netAmount, paidAmount, isPartial } = getRowPaymentSplit(item);

    if (isPartial) return "Partially Paid";
    if (netAmount > 0 && paidAmount >= netAmount) return "Paid";
    if (s) return s.replace(/_/g, " ");
    return "n/a";
  };

  // Status chip styling (handles "Partially Paid" too)
  const getStatusChipSx = (status) => {
    const s = normalizeStatus(status);

    if (s === "approved")
      return { bgcolor: "#E9F7EF", color: "#1E7E34", border: "1px solid #CBEBD6" };

    if (s === "pending")
      return { bgcolor: "#FFF3E0", color: "#E67E22", border: "1px solid #FFE0B2" };

    if (s === "rejected")
      return { bgcolor: "#FDECEA", color: "#C62828", border: "1px solid #F5C6CB" };

    if (s === "paid")
      return { bgcolor: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" };

    if (s === "partially paid")
      return { bgcolor: "#FFF8E1", color: "#A66B00", border: "1px solid #FFE8A3" };

    return { bgcolor: "#F4F6F8", color: "#546E7A", border: "1px solid #E0E6ED" };
  };

  // Totals: paid = sum where status is "paid" (case-insensitive), unpaid = rest
  const totals = useMemo(() => {
    const list = Array.isArray(filteredExpenses) ? filteredExpenses : [];
    // If for some reason we have no rows, fall back to backend summary (if present).
    if (list.length === 0 && summary?.total_amount != null) {
      return {
        total: Number(summary.total_amount || 0),
        paid: Number(summary.total_paid || 0),
        unpaid: Number(summary.total_unpaid || 0),
      };
    }
    let total = 0;
    let paid = 0;
    list.forEach((item) => {
      const netAmount = Number(item.net_amount || item.amount || 0);
      total += netAmount;
      paid += getRowPaidAmount(item);
    });
    return {
      total,
      paid,
      unpaid: Math.max(0, total - paid),
    };
  }, [
    filteredExpenses,
    summary,
  ]);

  useEffect(() => {
    if (typeof onTotalsChange !== "function") return;
    const summaryTotal = summary?.total_amount != null ? Number(summary.total_amount || 0) : null;
    const summaryPaid = summary?.total_paid != null ? Number(summary.total_paid || 0) : null;
    const summaryUnpaid = summary?.total_unpaid != null ? Number(summary.total_unpaid || 0) : null;

    onTotalsChange({
      total: summaryTotal != null ? summaryTotal : Number(totals.total || 0),
      paid: summaryPaid != null ? summaryPaid : Number(totals.paid || 0),
      unpaid: summaryUnpaid != null ? summaryUnpaid : Number(totals.unpaid || 0),
    });
  }, [onTotalsChange, summary, totals]);

  // Totals by entry_type (for filtered list)
  const totalsByEntryType = useMemo(() => {
    const list = Array.isArray(filteredExpenses) ? filteredExpenses : [];
    const byType = {};
    list.forEach((item) => {
      const type = normalizeEntryType(item.entry_type);
      if (!byType[type]) {
        byType[type] = { total: 0, paid: 0, unpaid: 0 };
      }
      const netAmount = Number(item.net_amount || item.amount || 0);
      const paidAmount = getRowPaidAmount(item);
      byType[type].total += netAmount;
      byType[type].paid += paidAmount;
      byType[type].unpaid += Math.max(0, netAmount - paidAmount);
    });
    return byType;
  }, [filteredExpenses]);

  // Group expenses by worker (name + id) for expandable summary rows
  const groupedByWorker = useMemo(() => {
    const list = Array.isArray(filteredExpenses) ? filteredExpenses : [];
    const map = new Map();
    list.forEach((expense) => {
      const wid = expense.worker_id ?? "";
      const wname = expense.worker_name ?? "";
      const key = `${wid}|${wname}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          worker_id: wid,
          worker_name: wname,
          worker_type: expense.worker_type ?? "",
          entries: [],
          totalAmount: 0,
        });
      }
      const g = map.get(key);
      g.entries.push(expense);
      g.totalAmount += Number(expense.net_amount ?? expense.amount ?? 0);
    });
    return Array.from(map.values());
  }, [filteredExpenses]);

  /** Extra gross (or net if gross missing) above this worker's assigned property amount. */
  const getGrossExtraAboveAssign = (expense) => {
    const id = String(expense.worker_id ?? "").trim();
    const cap = workerAssignCapMap.get(id) ?? 0;
    if (!(cap > 0)) return { cap: 0, extra: 0 };
    const grossFilled = expense.gross_amount != null && expense.gross_amount !== "";
    const pay = grossFilled
      ? Number(expense.gross_amount) || 0
      : Number(expense.net_amount ?? expense.amount ?? 0) || 0;
    const extra = Math.max(0, Math.round((pay - cap) * 100) / 100);
    return { cap, extra };
  };

  const toggleGroupExpanded = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // ✅ Display name helper
  const canonicalPropertyName =
    propertyInfo?.canonical_property_name || propertyInfo?.property_name || null;

  const canonicalProjectName =
    projectInfo?.canonical_project_name || projectInfo?.project_name || null;

  // ✅ For each row: prefer row-level canonical name (future-proof), else header canonical, else ID
  const getRowPropertyDisplay = (expense) =>
    expense?.canonical_property_name ||
    canonicalPropertyName ||
    expense?.property_name ||
    expense?.property_id ||
    "—";

  // Build export rows from current filtered list
  const getExportRows = () => {
    const list = Array.isArray(filteredExpenses) ? filteredExpenses : [];
    return list.map((expense) => {
      const hoursDays = expense.total_hours_worked
        ? `${expense.total_hours_worked} hrs`
        : `${expense.total_days || expense.days || 0} days`;
      return {
        "Worker ID": expense.worker_id || "",
        "Worker Name": expense.worker_name || "",
        "Worker Type": expense.worker_type || "",
        "Entry Type": normalizeEntryType(expense.entry_type),
        Date: formatDate(expense.created_at || expense.date),
        "Hours/Days": hoursDays,
        "Gross Amount": expense.gross_amount != null ? Number(expense.gross_amount) : "",
        "Net Amount": expense.net_amount != null ? Number(expense.net_amount) : Number(expense.amount) || "",
        Status: expense.status || "",
        Notes: expense.remarks || expense.comments || "",
      };
    });
  };

  const handleExportExcel = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      setSnackbar({ open: true, message: "No data to export", severity: "info" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Labour Payments");
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `Labour_Payments_${propertyId || "all"}_${stamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setSnackbar({ open: true, message: "Excel downloaded", severity: "success" });
  };

  return (
    <Box sx={{ p: 0 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          background: "#F6F7FB",
          p: { xs: 1.5, md: 2.5 },
        }}
      >
        {/* Toolbar */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "#fff",
            border: "1px solid #E5EAF2",
            borderRadius: 2,
            mb: 2,
            overflow: "hidden",
          }}
        >
          {/* Row 1: Title + primary action */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              borderBottom: "1px solid #EEF2F7",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", color: "#24324A" }}>
                Labour Payments
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7A90", mt: 0.25 }}>
                Property: <b>{canonicalPropertyName || propertyId || "—"}</b>
                {canonicalProjectName ? (
                  <> · Project: <b>{canonicalProjectName}</b></>
                ) : null}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => handleDialogOpen("add")}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 700,
                bgcolor: "#3B82F6",
                "&:hover": { bgcolor: "#2563EB" },
              }}
            >
              + Add Expense
            </Button>
          </Box>

          {/* Row 2: Filters */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "#F8FAFC",
              borderBottom: "1px solid #EEF2F7",
            }}
          >
            <Typography variant="caption" sx={{ color: "#607086", fontWeight: 700, letterSpacing: 0.5, display: "block", mb: 1 }}>
              FILTERS
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-end">
              <TextField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                placeholder="Search worker, ID..."
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "#6B7A90" }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: "#fff", borderRadius: 1 },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }} variant="outlined">
                <InputLabel>Worker Type</InputLabel>
                <Select
                  value={filterWorkerType}
                  label="Worker Type"
                  onChange={(e) => setFilterWorkerType(e.target.value)}
                  sx={{ bgcolor: "#fff", borderRadius: 1 }}
                >
                  <MenuItem value="">All</MenuItem>
                  {getUniqueValues("worker_type").map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }} variant="outlined">
                <InputLabel>Status</InputLabel>
                <Select
                  value={normalizeStatus(filterStatus) || filterStatus || ""}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ bgcolor: "#fff", borderRadius: 1 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="partially paid">Partially Paid</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }} variant="outlined">
                <InputLabel>Entry Type</InputLabel>
                <Select
                  value={filterEntryType}
                  label="Entry Type"
                  onChange={(e) => setFilterEntryType(e.target.value)}
                  sx={{ bgcolor: "#fff", borderRadius: 1 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Avenue Add On">Avenue Add On</MenuItem>
                  <MenuItem value="Customer Add On">Customer Add On</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="From date"
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
              />
              <TextField
                size="small"
                label="To date"
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
              />
            </Stack>
          </Box>

          {/* Row 3: Actions + Chips */}
          <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearAllIcon />}
                onClick={clearFilters}
                sx={{ textTransform: "none", borderRadius: 1.5 }}
              >
                Clear filters
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={fetchExpenses}
                sx={{ textTransform: "none", borderRadius: 1.5 }}
              >
                Refresh
              </Button>
              <Divider orientation="vertical" flexItem sx={{ borderColor: "#E5EAF2" }} />
              <Tooltip title="Export Excel">
                <IconButton
                  size="small"
                  onClick={handleExportExcel}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
                  aria-label="Export Excel"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ alignItems: "center" }}>
              <Chip
                size="small"
                label={`Entries: ${Array.isArray(filteredExpenses) ? filteredExpenses.length : 0}`}
                sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: "#F1F5F9", border: "1px solid #E2E8F0" }}
              />
              <Chip
                size="small"
                label={`Total: ${formatCurrency(totals.total)}`}
                sx={{ borderRadius: 1.5, fontWeight: 800, bgcolor: "#fff", border: "1px solid #E5EAF2" }}
              />
              <Chip
                size="small"
                label={`Paid: ${formatCurrency(totals.paid)}`}
                sx={{ borderRadius: 1.5, fontWeight: 800, bgcolor: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0" }}
              />
              <Chip
                size="small"
                label={`Unpaid: ${formatCurrency(totals.unpaid)}`}
                sx={{ borderRadius: 1.5, fontWeight: 800, bgcolor: "#FFEDD5", color: "#9A3412", border: "1px solid #FED7AA" }}
              />
              {Object.keys(totalsByEntryType).length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: "center", ml: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "#607086", fontWeight: 700 }}>By entry type:</Typography>
                  {Object.entries(totalsByEntryType).map(([entryType, t]) => (
                    <Chip
                      key={entryType}
                      size="small"
                      label={`${entryType}: ${formatCurrency(t.total)}`}
                      sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: "#EEF2FF", color: "#3730A3", border: "1px solid #C7D2FE" }}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>
        </Paper>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: "#fff",
            borderRadius: 2,
            border: "1px solid #E5EAF2",
            overflow: "hidden",
          }}
        >
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow
                  sx={{
                    "& .MuiTableCell-head": {
                      bgcolor: "#F5F7FB",
                      color: "#607086",
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: 0.3,
                      borderBottom: "1px solid #E5EAF2",
                      py: 1.2,
                    },
                  }}
                >
                  <TableCell>Worker ID</TableCell>
                  <TableCell>Worker Name</TableCell>
                  <TableCell>Worker Type</TableCell>
                  <TableCell>Entry Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Hours / Days</TableCell>
                  <TableCell>Gross Amount</TableCell>
                  <TableCell>Net Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ maxWidth: 140 }}>Notes</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody
                sx={{
                  "& .MuiTableCell-body": {
                    borderBottom: "1px solid #EEF2F7",
                    fontSize: 13,
                    color: "#223049",
                    py: 1.2,
                  },
                }}
              >
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ color: "#6B7A90" }}>Loading...</Typography>
                    </TableCell>
                  </TableRow>
                ) : groupedByWorker.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ color: "#6B7A90" }}>No expenses found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedByWorker
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .flatMap((group) => {
                      const isExpanded = expandedGroups.has(group.key);
                      const groupExtraSum = group.entries.reduce(
                        (sum, e) => sum + getGrossExtraAboveAssign(e).extra,
                        0
                      );
                      const summaryRow = (
                        <TableRow
                          key={group.key}
                          hover
                          sx={{
                            bgcolor: isExpanded ? "#F0F4FF" : "#FAFBFF",
                            "&:hover": { bgcolor: isExpanded ? "#E8EEFF" : "#F5F7FF" },
                            cursor: "pointer",
                          }}
                          onClick={() => toggleGroupExpanded(group.key)}
                        >
                          <TableCell sx={{ color: "#4C5D73", fontWeight: 700 }}>
                            {group.worker_id || "—"}
                          </TableCell>
                          <TableCell sx={{ color: "#4C5D73", fontWeight: 700 }}>
                            {group.worker_name || "—"}
                          </TableCell>
                          <TableCell sx={{ color: "#4C5D73" }}>
                            {group.worker_type || "—"}
                          </TableCell>
                          <TableCell sx={{ color: "#6B7A90", fontSize: 12 }}>
                            —
                          </TableCell>
                          <TableCell sx={{ color: "#6B7A90", fontSize: 12 }}>
                            {group.entries.length} entries · {isExpanded ? "Hide details" : "Show details"}
                          </TableCell>
                          <TableCell sx={{ color: "#4C5D73" }}>
                            {groupExtraSum > 0 ? (
                              <Typography variant="caption" sx={{ color: "#C2410C", fontWeight: 800 }}>
                                Extra Σ: {formatCurrency(groupExtraSum)}
                              </Typography>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell sx={{ color: "#4C5D73" }}>—</TableCell>
                          <TableCell sx={{ color: "#223049", fontWeight: 700 }}>
                            {formatCurrency(group.totalAmount)}
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell sx={{ maxWidth: 140 }}>—</TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <IconButton size="small" aria-label={isExpanded ? "Collapse" : "Expand"}>
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                      const detailRows = isExpanded
                        ? group.entries.map((expense) => {
                            const id = expense.payment_id || expense.id;
                            const hoursDays = expense.total_hours_worked
                              ? `${expense.total_hours_worked} hrs`
                              : `${expense.total_days || expense.days || 0} days`;
                            return (
                              <TableRow
                                key={id}
                                hover
                                sx={{
                                  "& .MuiTableCell-body": { borderBottom: "1px solid #EEF2F7" },
                                  bgcolor: "#FAFCFF",
                                  "&:hover": { bgcolor: "#F5F7FF" },
                                }}
                              >
                                <TableCell sx={{ color: "#4C5D73", pl: 4 }}>{expense.worker_id || "—"}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{expense.worker_name || "—"}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{expense.worker_type || "—"}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{normalizeEntryType(expense.entry_type)}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{formatDate(expense.created_at || expense.date)}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{hoursDays}</TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>
                                  <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                                    <Typography variant="body2" component="span">
                                      {expense.gross_amount != null ? formatCurrency(expense.gross_amount) : "—"}
                                    </Typography>
                                    {(() => {
                                      const { extra, cap } = getGrossExtraAboveAssign(expense);
                                      if (!(extra > 0)) return null;
                                      return (
                                        <Typography variant="caption" sx={{ color: "#C2410C", fontWeight: 700 }}>
                                          Extra (above assign {formatCurrency(cap)}): {formatCurrency(extra)}
                                        </Typography>
                                      );
                                    })()}
                                  </Stack>
                                </TableCell>
                                <TableCell sx={{ color: "#4C5D73" }}>{formatCurrency(expense.net_amount || expense.amount)}</TableCell>
                                <TableCell>
                                  {(() => {
                                    const split = getRowPaymentSplit(expense);
                                    const displayStatus = getDisplayStatus(expense);
                                    return (
                                      <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                                        <Chip
                                          label={displayStatus}
                                          size="small"
                                          sx={{
                                            borderRadius: 2,
                                            fontWeight: 900,
                                            textTransform: "capitalize",
                                            ...getStatusChipSx(displayStatus),
                                          }}
                                        />
                                        {split.isPartial ? (
                                          <Typography variant="caption" sx={{ color: "#6B7A90", fontWeight: 700 }}>
                                            Paid {formatCurrency(split.paidAmount)} · Unpaid {formatCurrency(split.unpaidAmount)}
                                          </Typography>
                                        ) : null}
                                      </Stack>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 140, fontSize: 12, color: "#6B7A90" }} title={expense.remarks || expense.comments || ""}>
                                  {(expense.remarks || expense.comments || "").slice(0, 30)}
                                  {((expense.remarks || expense.comments) || "").length > 30 ? "…" : ""}
                                </TableCell>
                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleDialogOpen("edit", expense)} aria-label="Edit expense" sx={{ mr: 0.25 }}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => handleOpenConfirm(expense)} color="error" aria-label="Delete expense">
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        : [];
                      return [summaryRow, ...detailRows];
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={groupedByWorker.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
          />
        </Paper>

        {/* Add/Edit Dialog (unchanged) */}
        <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
          <DialogTitle>
            {dialogMode === "add" ? "Add Labour Expense" : "Edit Labour Expense"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: "#FBFDFF",
                  borderColor: "#E6EEF7",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    alignItems: { sm: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`Payable: ${formatCurrency(dialogPreview.effective)}`}
                      sx={{ fontWeight: 900, bgcolor: "#E8F3FF", color: "#0B3B6F" }}
                    />
                    {dialogPreview.qty > 0 && amountMode === "auto" ? (
                      <Chip
                        size="small"
                        label={`Auto: ${formatCurrency(dialogPreview.computed)} (rate × qty)`}
                        sx={{ fontWeight: 800, bgcolor: "#F1F5F9", color: "#334155" }}
                      />
                    ) : null}
                    {dialogPreview.cap > 0 ? (
                      <Chip
                        size="small"
                        label={`Assigned cap: ${formatCurrency(dialogPreview.cap)}`}
                        sx={{ fontWeight: 800, bgcolor: "#F8FAFC", color: "#475569" }}
                      />
                    ) : null}
                    {dialogPreview.extraAboveCap > 0 ? (
                      <Chip
                        size="small"
                        label={`Extra above cap: ${formatCurrency(dialogPreview.extraAboveCap)}`}
                        sx={{ fontWeight: 900, bgcolor: "#FFF7ED", color: "#9A3412" }}
                      />
                    ) : null}
                  </Stack>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={amountMode === "manual"}
                        onChange={(e) => {
                          const manualOn = e.target.checked;
                          setAmountMode(manualOn ? "manual" : "auto");
                          if (!manualOn) {
                            const hoursNum = Number(formData.hours) || 0;
                            const daysNum = Number(formData.days) || 0;
                            const rateNum = Number(formData.rate) || 0;
                            const qty = daysNum || hoursNum || 0;
                            const computed =
                              rateNum > 0 && qty > 0 ? Math.round(rateNum * qty * 100) / 100 : 0;
                            if (computed > 0) setFormData((prev) => ({ ...prev, amount: String(computed) }));
                          }
                        }}
                        size="small"
                      />
                    }
                    label="Edit amount manually"
                    sx={{
                      m: 0,
                      ".MuiFormControlLabel-label": { fontSize: 13, color: "#475569", fontWeight: 700 },
                    }}
                  />
                </Stack>

                {dialogPreview.extraAboveCap > 0 ? (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Amount is above assigned cap for this worker. If this is expected (overtime/extra work), continue;
                    otherwise adjust rate/qty/amount.
                  </Alert>
                ) : null}
              </Paper>
            </Stack>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Property ID"
                  value={formData.property_id}
                  onChange={(e) => {
                    setFormData({ ...formData, property_id: e.target.value });
                    if (formErrors.property_id) setFormErrors((prev) => ({ ...prev, property_id: "" }));
                  }}
                  disabled={dialogMode === "add" && !!propertyId}
                  error={!!formErrors.property_id}
                  helperText={formErrors.property_id || (dialogMode === "add" && propertyId ? "Pre-filled from property" : "")}
                />
              </Grid>
              {propertyId && assignedWorkers.length > 0 ? (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!formErrors.worker_id}>
                    <InputLabel>Labour (assigned to property)</InputLabel>
                    <Select
                      label="Labour (assigned to property)"
                      value={
                        formData.worker_id
                          ? `${String(formData.worker_id)}|${String(formData.worker_name || "")}|${["labour", "contractor", "employee"].includes(String(formData.worker_type || "labour").toLowerCase()) ? String(formData.worker_type || "labour").toLowerCase() : "labour"}`
                          : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setFormData({
                            ...formData,
                            worker_id: "",
                            worker_name: "",
                            worker_type: "",
                          });
                          return;
                        }
                        const [wid, wname, wtype] = String(v).split("|");
                        const normalizedType = (wtype || "labour").toLowerCase();
                        const workerType = ["labour", "contractor", "employee"].includes(normalizedType)
                          ? normalizedType
                          : "labour";
                        setFormData({
                          ...formData,
                          worker_id: wid || "",
                          worker_name: wname || "",
                          worker_type: workerType,
                        });
                        if (formErrors.worker_id) setFormErrors((prev) => ({ ...prev, worker_id: "" }));
                      }}
                      disabled={loadingWorkers}
                    >
                      <MenuItem value="">
                        <em>Select labour</em>
                      </MenuItem>
                      {(() => {
                        const normalizeWType = (t) => {
                          const s = (t || "labour").toLowerCase();
                          return ["labour", "contractor", "employee"].includes(s) ? s : "labour";
                        };
                        const list = [...assignedWorkers];
                        if (dialogMode === "edit" && formData.worker_id && formData.worker_name && !list.some((w) => String(w.worker_id) === String(formData.worker_id))) {
                          list.unshift({
                            worker_id: formData.worker_id,
                            worker_name: formData.worker_name,
                            worker_type: formData.worker_type || "labour",
                          });
                        }
                        return list;
                      })().map((w) => {
                        const wtype = (() => {
                          const t = (w.worker_type || "labour").toLowerCase();
                          return ["labour", "contractor", "employee"].includes(t) ? t : "labour";
                        })();
                        return (
                          <MenuItem
                            key={`${wtype}_${w.worker_id}`}
                            value={`${String(w.worker_id)}|${String(w.worker_name || "")}|${wtype}`}
                          >
                            {w.worker_name} ({w.worker_id})
                            {w.worker_type ? ` — ${w.worker_type}` : ""}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    {formErrors.worker_id && (
                      <Typography variant="caption" sx={{ color: "error.main", mt: 0.5, display: "block" }}>
                        {formErrors.worker_id}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Worker ID"
                      value={formData.worker_id}
                      onChange={(e) => {
                        setFormData({ ...formData, worker_id: e.target.value });
                        if (formErrors.worker_id) setFormErrors((prev) => ({ ...prev, worker_id: "" }));
                      }}
                      error={!!formErrors.worker_id}
                      helperText={formErrors.worker_id}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Worker Name"
                      value={formData.worker_name}
                      onChange={(e) => {
                        setFormData({ ...formData, worker_name: e.target.value });
                        if (formErrors.worker_name) setFormErrors((prev) => ({ ...prev, worker_name: "" }));
                      }}
                      error={!!formErrors.worker_name}
                      helperText={formErrors.worker_name}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Worker Type</InputLabel>
                  <Select
                    value={formData.worker_type || "labour"}
                    label="Worker Type"
                    onChange={(e) =>
                      setFormData({ ...formData, worker_type: e.target.value })
                    }
                  >
                    <MenuItem value="labour">Labour</MenuItem>
                    <MenuItem value="contractor">Contractor</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Entry Type</InputLabel>
                  <Select
                    value={formData.entry_type || "Regular"}
                    label="Entry Type"
                    onChange={(e) =>
                      setFormData({ ...formData, entry_type: e.target.value })
                    }
                  >
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Avenue Add On">Avenue Add On</MenuItem>
                    <MenuItem value="Customer Add On">Customer Add On</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={!!formErrors.date}
                  helperText={formErrors.date}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Hours"
                  type="number"
                  inputProps={{ min: 0, step: 0.5 }}
                  value={formData.hours}
                  onChange={(e) => {
                    const hours = e.target.value;
                    const rate = Number(formData.rate) || 0;
                    const days = Number(formData.days) || 0;
                    const qty = days || Number(hours) || 0;
                    setFormData({
                      ...formData,
                      hours,
                      amount: amountMode === "auto" && rate && qty ? String(rate * qty) : formData.amount,
                    });
                    if (formErrors.hours || formErrors.rate) setFormErrors((prev) => ({ ...prev, hours: "", rate: "" }));
                  }}
                  error={!!formErrors.hours}
                  helperText={formErrors.hours}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Days"
                  type="number"
                  inputProps={{ min: 0, step: 0.5 }}
                  value={formData.days}
                  onChange={(e) => {
                    const days = e.target.value;
                    const rate = Number(formData.rate) || 0;
                    const hours = Number(formData.hours) || 0;
                    const qty = Number(days) || hours || 0;
                    setFormData({
                      ...formData,
                      days,
                      amount: amountMode === "auto" && rate && qty ? String(rate * qty) : formData.amount,
                    });
                    if (formErrors.days || formErrors.rate) setFormErrors((prev) => ({ ...prev, days: "", rate: "" }));
                  }}
                  error={!!formErrors.days}
                  helperText={formErrors.days}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Rate (₹)"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={formData.rate}
                  onChange={(e) => {
                    const rate = e.target.value;
                    const r = Number(rate) || 0;
                    const days = Number(formData.days) || 0;
                    const hours = Number(formData.hours) || 0;
                    const qty = days || hours || 0;
                    setFormData({
                      ...formData,
                      rate,
                      amount: amountMode === "auto" && r && qty ? String(r * qty) : formData.amount,
                    });
                    if (formErrors.rate) setFormErrors((prev) => ({ ...prev, rate: "" }));
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                  error={!!formErrors.rate}
                  helperText={formErrors.rate || "Enter with Hours or Days to calculate amount"}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={formData.amount}
                  onChange={(e) => {
                    setAmountMode("manual");
                    setFormData({ ...formData, amount: e.target.value });
                    if (formErrors.amount) setFormErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  disabled={amountMode === "auto"}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                  }}
                  error={!!formErrors.amount}
                  helperText={formErrors.amount || (amountMode === "auto" ? "Auto from Rate × Days/Hours (toggle to edit)" : "Manual amount")}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={["pending", "approved", "rejected", "paid"].includes(normalizeStatus(formData.status)) ? normalizeStatus(formData.status) : "paid"}
                    label="Status"
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes / Remarks"
                  placeholder="e.g. Advance for March, UPI ref, cash payment"
                  value={formData.remarks || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || (dialogMode === "edit" && !isDialogDirty)}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation dialog: show expense summary before Delete */}
        <Dialog
          open={confirmOpen}
          onClose={handleCloseConfirm}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: "0 24px 48px rgba(42, 54, 99, 0.15)",
              border: "1px solid rgba(42, 54, 99, 0.08)",
            },
          }}
        >
          <DialogTitle sx={{ pb: 0, color: "#1a2236", fontWeight: 700, fontSize: "1.15rem", pt: 2.5, px: 3 }}>
            Confirm delete expense
          </DialogTitle>
          <DialogContent sx={{ px: 3 }}>
            {confirmExpense && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Review the expense below. This action cannot be undone.
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                    borderColor: "divider",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Worker</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {confirmExpense.worker_name || "—"} ({confirmExpense.worker_id || "—"})
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Chip label={confirmExpense.worker_type || "—"} size="small" sx={{ textTransform: "capitalize" }} />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Date</Typography>
                      <Typography variant="body2">
                        {formatDate(confirmExpense.created_at || confirmExpense.date)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Hours / Days</Typography>
                      <Typography variant="body2">
                        {confirmExpense.work_duration_type === "hourly" && confirmExpense.total_hours_worked
                          ? `${confirmExpense.total_hours_worked} hrs`
                          : confirmExpense.work_duration_type === "per_sqft" && confirmExpense.total_sqft_completed
                          ? `${confirmExpense.total_sqft_completed} sqft`
                          : (confirmExpense.total_days || confirmExpense.days)
                          ? `${confirmExpense.total_days || confirmExpense.days} days`
                          : confirmExpense.total_hours_worked
                          ? `${confirmExpense.total_hours_worked} hrs`
                          : "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Gross</Typography>
                      <Typography variant="body2">
                        {confirmExpense.gross_amount != null ? formatCurrency(confirmExpense.gross_amount) : "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Net amount</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(confirmExpense.net_amount || confirmExpense.amount)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Chip
                        label={(confirmExpense.status || "—").replace(/_/g, " ")}
                        size="small"
                        sx={{
                          borderRadius: 2,
                          fontWeight: 900,
                          textTransform: "capitalize",
                          ...getStatusChipSx(confirmExpense.status),
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Entry type</Typography>
                      <Typography variant="body2">{normalizeEntryType(confirmExpense.entry_type)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Remarks</Typography>
                      <Typography variant="body2" sx={{ textAlign: "right", wordBreak: "break-word" }}>
                        {confirmExpense.remarks || confirmExpense.comments || "—"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.secondary">Payment ID</Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {confirmExpense.payment_id || confirmExpense.id || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1 }}>
            <Button onClick={handleCloseConfirm} variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmProceed}
              startIcon={<DeleteIcon />}
            >
              Delete expense
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
};

export default LabourExpense;
