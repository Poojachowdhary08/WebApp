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
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  Stack,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import axios from "axios";
import { API_BASE } from "../config";

const LabourExpense = ({ propertyId, onClose }) => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterWorkerType, setFilterWorkerType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEntryType, setFilterEntryType] = useState("");

  // Table pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("add"); // "add" or "edit"
  const [selectedExpense, setSelectedExpense] = useState(null);
  // Confirmation dialog before Edit or Delete: shows expense summary
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // "edit" | "delete"
  const [confirmExpense, setConfirmExpense] = useState(null);
  // Summary dialog: view daily labour entry when payment_id is clicked
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryDialogExpense, setSummaryDialogExpense] = useState(null);
  const [formData, setFormData] = useState({
    property_id: "",
    worker_id: "",
    worker_name: "",
    worker_type: "",
    date: "",
    hours: "",
    days: "",
    rate: "",
    amount: "",
    status: "pending",
    work_duration_type: "daily", // daily, hourly, per_sqft
    entry_type: "Regular", // Regular, Avenue Add on, Customer Add on
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Summary expansion state
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Fetch expenses from API
  const fetchExpenses = async () => {
    if (!propertyId) {
      console.log("No property ID provided");
      return;
    }
    
    try {
      setLoading(true);
      const url = `${API_BASE}/properties/${propertyId}/labour-payments`;
      console.log("🔍 Fetching from URL:", url);
      const response = await axios.get(url);
      
      console.log("📥 Full API response:", response);
      console.log("📥 Fetched expenses response.data:", response.data);
      console.log("📥 Response data type:", typeof response.data);
      console.log("📥 Is array?", Array.isArray(response.data));
      
      // Handle different response structures
      let data = response.data;
      
      // The backend returns: { "success": true, "payments": [...], "summary": {...} }
      // Extract summary if available
      if (data?.summary) {
        console.log("📊 Found summary:", data.summary);
        setSummary(data.summary);
      } else {
        setSummary(null);
      }
      
      // Extract payments array - backend returns it in "payments" key
      let expensesArray = [];
      if (Array.isArray(data)) {
        // If response.data is directly an array (unlikely but handle it)
        expensesArray = data;
        console.log("📊 Response is directly an array");
      } else if (data?.payments && Array.isArray(data.payments)) {
        // Backend returns { "payments": [...] }
        expensesArray = data.payments;
        console.log("📊 Found payments array with", expensesArray.length, "items");
      } else if (data?.data && Array.isArray(data.data)) {
        // Alternative structure
        expensesArray = data.data;
        console.log("📊 Found data array with", expensesArray.length, "items");
      } else if (data?.expenses && Array.isArray(data.expenses)) {
        // Another alternative
        expensesArray = data.expenses;
        console.log("📊 Found expenses array with", expensesArray.length, "items");
      } else {
        console.warn("⚠️ Could not find payments array in response. Response structure:", Object.keys(data || {}));
        expensesArray = [];
      }
      
      console.log("📊 Final processed expenses array:", expensesArray.length, "items");
      if (expensesArray.length > 0) {
        console.log("📊 First expense sample:", expensesArray[0]);
      }
      
      setExpenses(expensesArray);
      setFilteredExpenses(expensesArray);
      setPage(0);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
      setSnackbar({
        open: true,
        message: "Failed to load labour expenses",
        severity: "error",
      });
      // Set empty arrays on error
      setExpenses([]);
      setFilteredExpenses([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchAssignedWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Fetch workers assigned to this property
  const fetchAssignedWorkers = async () => {
    if (!propertyId) {
      setAssignedWorkers([]);
      return;
    }

    try {
      setLoadingWorkers(true);
      // Fetch labours assigned to property
      const labourResponse = await axios.get(
        `${API_BASE}/properties-labor/${propertyId}`
      );
      
      const labours = Array.isArray(labourResponse.data) ? labourResponse.data : [];
      
      // Transform to unified format
      const workers = labours.map((labour) => ({
        worker_id: labour.employee_code,
        worker_name: labour.name,
        worker_type: "labour", // or determine from employee_type
        work_type: labour.work_type,
        assign_amount: labour.assign_amount || 0,
      }));

      // Also fetch from assigned-workers endpoint to get contractors and more labours
      try {
        const assignedResponse = await axios.get(
          `${API_BASE}/property/${propertyId}/assigned-workers`
        );
        
        // Extract unique workers from labour_logs
        const labourLogs = assignedResponse.data?.labour_logs || [];
        const contractorLogs = assignedResponse.data?.contractor_logs || [];
        
        // Create a map to avoid duplicates
        const workerMap = new Map();
        
        // Add labours from logs
        labourLogs.forEach((log) => {
          if (log.labour_id && log.labour_name) {
            const key = `labour_${log.labour_id}`;
            if (!workerMap.has(key)) {
              workerMap.set(key, {
                worker_id: log.labour_id,
                worker_name: log.labour_name,
                worker_type: log.worker_type || "labour",
                assign_amount: 0, // assign_amount not available from this endpoint
              });
            }
          }
        });
        
        // Add contractors from logs
        contractorLogs.forEach((log) => {
          if (log.contractor_id && log.contractor_name) {
            const key = `contractor_${log.contractor_id}`;
            if (!workerMap.has(key)) {
              workerMap.set(key, {
                worker_id: log.contractor_id,
                worker_name: log.contractor_name,
                worker_type: log.worker_type || "contractor",
                assign_amount: 0, // assign_amount not available from this endpoint
              });
            }
          }
        });
        
        // Merge with existing workers (avoid duplicates, prefer workers with assign_amount)
        workers.forEach((worker) => {
          const key = `${worker.worker_type || "labour"}_${worker.worker_id}`;
          if (!workerMap.has(key)) {
            workerMap.set(key, worker);
          } else {
            // If worker exists but doesn't have assign_amount, update it
            const existing = workerMap.get(key);
            if (!existing.assign_amount && worker.assign_amount) {
              existing.assign_amount = worker.assign_amount;
            }
          }
        });
        
        setAssignedWorkers(Array.from(workerMap.values()));
      } catch (err) {
        console.error("Error fetching assigned workers:", err);
        // Fallback to just labours if assigned-workers fails
        setAssignedWorkers(workers);
      }
    } catch (err) {
      console.error("Error fetching workers:", err);
      setAssignedWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Normalize entry type values coming from API / user input so UI doesn't show duplicates
  // (e.g. "Avenue Add on" vs "Avenue Add On")
  const normalizeEntryType = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "Regular";
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (key === "regular") return "Regular";
    if (key === "avenue add on") return "Avenue Add On";
    if (key === "customer add on") return "Customer Add On";
    return raw;
  };

  // Apply filters
  useEffect(() => {
    if (!Array.isArray(expenses)) {
      setFilteredExpenses([]);
      return;
    }
    
    let filtered = [...expenses];

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.worker_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.worker_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.property_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterProperty) {
      filtered = filtered.filter((item) => item.property_id === filterProperty);
    }

    if (filterWorkerType) {
      filtered = filtered.filter((item) => item.worker_type === filterWorkerType);
    }

    if (filterStatus) {
      filtered = filtered.filter((item) => 
        (item.status?.toLowerCase() || "") === filterStatus.toLowerCase()
      );
    }

    if (filterEntryType) {
      filtered = filtered.filter((item) => {
        const itemEntryType = normalizeEntryType(item.entry_type);
        return itemEntryType === filterEntryType;
      });
    }

    setFilteredExpenses(filtered);
    setPage(0);
  }, [searchQuery, filterProperty, filterWorkerType, filterStatus, filterEntryType, expenses]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterProperty("");
    setFilterWorkerType("");
    setFilterStatus("");
    setFilterEntryType("");
  };

  // Get unique values for filters
  const getUniqueValues = (key) => {
    if (!Array.isArray(expenses)) return [];
    return [...new Set(expenses.map((item) => item[key]).filter(Boolean))];
  };

  // Handle dialog open/close
  const handleDialogOpen = (mode, expense = null) => {
    setDialogMode(mode);
    if (mode === "edit" && expense) {
      setSelectedExpense(expense);
      setFormData({
        property_id: expense.property_id || "",
        worker_id: expense.worker_id || "",
        worker_name: expense.worker_name || "",
        worker_type: expense.worker_type || "",
        date: expense.date || expense.start_date || "",
        hours: expense.hours || expense.total_hours_worked || "",
        days: expense.days || expense.total_days || "",
        rate: expense.rate || "",
        amount: expense.amount || expense.net_amount || "",
        status: expense.status || "pending",
        work_duration_type: expense.work_duration_type || "daily",
        entry_type: normalizeEntryType(expense.entry_type),
      });
    } else {
      // For add mode, set default property_id from prop and refresh workers
      setSelectedExpense(null);
      setFormData({
        property_id: propertyId || "",
        worker_id: "",
        worker_name: "",
        worker_type: "",
        date: getTodayDate(), // Set today's date as default
        hours: "",
        days: "",
        rate: "",
        amount: "",
        status: "pending",
        work_duration_type: "daily",
        entry_type: "Regular",
      });
      // Refresh workers list when opening add dialog
      if (propertyId) {
        fetchAssignedWorkers();
      }
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedExpense(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.property_id) {
      setSnackbar({
        open: true,
        message: "Property ID is required",
        severity: "error",
      });
      return;
    }
    if (!formData.worker_id) {
      setSnackbar({
        open: true,
        message: "Worker ID is required",
        severity: "error",
      });
      return;
    }
    if (!formData.worker_name) {
      setSnackbar({
        open: true,
        message: "Worker Name is required",
        severity: "error",
      });
      return;
    }
    if (!formData.worker_type) {
      setSnackbar({
        open: true,
        message: "Worker Type is required",
        severity: "error",
      });
      return;
    }
    if (!formData.amount && !formData.rate) {
      setSnackbar({
        open: true,
        message: "Amount or Rate is required",
        severity: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const url = `${API_BASE}/labour/expenses`;
      
      if (dialogMode === "add") {
        // Prepare payload for manual expense creation
        const payload = {
          property_id: formData.property_id,
          worker_id: formData.worker_id,
          worker_name: formData.worker_name,
          worker_type: formData.worker_type,
          date: formData.date || null,
          hours: formData.hours || null,
          days: formData.days || null,
          rate: formData.rate || null,
          gross_amount: parseFloat(formData.amount) || 0,
          amount: parseFloat(formData.amount) || 0,
          tds_percent: 0,
          tds_amount: 0,
          net_amount: parseFloat(formData.amount) || 0,
          status: formData.status || "pending",
          payment_mode: "",
          payment_reference_no: "",
          remarks: "Manual labour expense entry",
          work_duration_type: formData.work_duration_type || "daily",
          entry_type: formData.entry_type || "Regular",
        };
        
        console.log("📤 Submitting expense payload:", payload);
        const response = await axios.post(url, payload);
        console.log("✅ Expense created successfully:", response.data);
        setSnackbar({
          open: true,
          message: "Labour expense added successfully",
          severity: "success",
        });
      } else {
        // For edit, use PUT endpoint (if available)
        await axios.put(`${url}/${selectedExpense.payment_id || selectedExpense.id}`, formData);
        setSnackbar({
          open: true,
          message: "Labour expense updated successfully",
          severity: "success",
        });
      }

      handleDialogClose();
      // Add a small delay to ensure backend has processed the insert before fetching
      setTimeout(() => {
        console.log("🔄 Refreshing expenses list...");
        fetchExpenses();
      }, 500);
    } catch (err) {
      console.error("Failed to save expense", err);
      const errorMessage = err.response?.data?.detail || err.message || `Failed to ${dialogMode} expense`;
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation dialog before Edit or Delete
  const handleOpenConfirm = (mode, expense) => {
    if (!expense) return;
    setConfirmExpense(expense);
    setConfirmMode(mode);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmMode(null);
    setConfirmExpense(null);
  };

  // Proceed from confirmation: open edit dialog or perform delete
  const handleConfirmProceed = async () => {
    if (!confirmExpense) return;
    const id = confirmExpense.payment_id || confirmExpense.id;
    if (confirmMode === "edit") {
      handleCloseConfirm();
      handleDialogOpen("edit", confirmExpense);
    } else if (confirmMode === "delete" && id) {
      handleCloseConfirm();
      await handleDelete(id);
    }
  };

  // Handle delete (called after confirmation dialog; no browser confirm)
  const handleDelete = async (expenseId) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/labour/expenses/${expenseId}`);
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

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${new Intl.NumberFormat("en-IN").format(amount || 0)}`;
  };

  // Get today's date in YYYY-MM-DD format for date input
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: "warning",
      approved: "success",
      rejected: "error",
      paid: "info",
    };
    return colors[status?.toLowerCase()] || "default";
  };

  // Get colors for entry types - using single color scheme
  const getEntryTypeColors = (entryType) => {
    return { background: "#2A3663", text: "#fff" };
  };

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

  // Calculate totals from filtered expenses (so filters affect the totals)
  const totals = (Array.isArray(filteredExpenses) ? filteredExpenses : []).reduce(
    (acc, item) => {
      const netAmount = Number(item.net_amount || item.amount || 0);
      const status = (item.status || "").toLowerCase();
      
      // If status is "paid", the entire amount is considered paid
      // Otherwise, use the paid_amount field if available
      let paidAmount = 0;
      if (status === "paid") {
        paidAmount = netAmount; // When status is paid, full amount is paid
      } else {
        paidAmount = Number(item.paid_amount || 0);
      }
      
      const unpaid = netAmount - paidAmount;
      
      acc.total += netAmount;
      acc.paid += paidAmount;
      // Unpaid should never be negative - if payment exceeds net amount, show 0 (payment is part of expense)
      acc.unpaid += Math.max(0, unpaid);
      return acc;
    },
    { total: 0, paid: 0, unpaid: 0 }
  );

  // Calculate totals by entry_type from filtered expenses
  // Behavior:
  // - On page load (no filters): Shows ALL entry types with their individual sums
  // - When Entry Type filter is selected: Shows ONLY that specific entry type's sum
  // This works because totalsByEntryType is calculated from filteredExpenses,
  // which contains all expenses when no filter is applied, or only filtered expenses when a filter is active
  const totalsByEntryType = (Array.isArray(filteredExpenses) ? filteredExpenses : []).reduce(
    (acc, item) => {
      const entryType = normalizeEntryType(item.entry_type);
      const netAmount = Number(item.net_amount || item.amount || 0);
      const status = (item.status || "").toLowerCase();
      
      // If status is "paid", the entire amount is considered paid
      // Otherwise, use the paid_amount field if available
      let paidAmount = 0;
      if (status === "paid") {
        paidAmount = netAmount;
      } else {
        paidAmount = Number(item.paid_amount || 0);
      }
      
      const unpaid = netAmount - paidAmount;
      
      if (!acc[entryType]) {
        acc[entryType] = { total: 0, paid: 0, unpaid: 0, count: 0 };
      }
      
      acc[entryType].total += netAmount;
      acc[entryType].paid += paidAmount;
      acc[entryType].unpaid += Math.max(0, unpaid);
      acc[entryType].count += 1;
      
      return acc;
    },
    {}
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, minHeight: "100vh" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 2px 24px rgba(42, 54, 99, 0.08)",
          background: "linear-gradient(165deg, #f8faff 0%, #ffffff 22%, #fafbff 100%)",
          border: "1px solid rgba(42, 54, 99, 0.06)",
        }}
      >
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              mb: 3,
              gap: 2,
              pb: 2,
              borderBottom: "1px solid rgba(42, 54, 99, 0.08)",
            }}
          >
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "rgba(42, 54, 99, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PaymentIcon sx={{ color: "#2A3663", fontSize: 26 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a2236", letterSpacing: "-0.02em" }}>
                  Labour Payments
                </Typography>
                {propertyId && (
                  <Typography variant="body2" sx={{ color: "#5c6b8a", mt: 0.25, fontWeight: 500 }}>
                    Property ID: {propertyId}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${Array.isArray(filteredExpenses) ? filteredExpenses.length : 0} entries`}
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  bgcolor: "rgba(42, 54, 99, 0.06)",
                  color: "#2A3663",
                  border: "1px solid rgba(42, 54, 99, 0.12)",
                }}
              />
              <Chip
                label={formatCurrency(totals.total)}
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: "rgba(42, 54, 99, 0.08)",
                  color: "#2A3663",
                  border: "1px solid rgba(42, 54, 99, 0.15)",
                }}
              />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleDialogOpen("add")}
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1.25,
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(42, 54, 99, 0.25)",
                backgroundColor: "#2A3663",
                "&:hover": {
                  backgroundColor: "#1E2A48",
                  boxShadow: "0 6px 20px rgba(42, 54, 99, 0.35)",
                },
              }}
            >
              Add Expense
            </Button>
            {onClose && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CloseIcon />}
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  borderColor: "rgba(42, 54, 99, 0.2)",
                  color: "#5c6b8a",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { borderColor: "#2A3663", color: "#2A3663", bgcolor: "rgba(42, 54, 99, 0.04)" },
                }}
              >
                Close
              </Button>
            )}
          </Stack>
        </Box>

        {/* Filters */}
        <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.7)",
              borderColor: "rgba(42, 54, 99, 0.1)",
            }}
          >
            <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search by worker, property..."
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#fff",
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(42, 54, 99, 0.3)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2A3663", borderWidth: 1.5 },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#5c6b8a", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}>
              <InputLabel>Property</InputLabel>
              <Select value={filterProperty} label="Property" onChange={(e) => setFilterProperty(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {getUniqueValues("property_id").map((property) => (
                  <MenuItem key={property} value={property}>{property}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}>
              <InputLabel>Worker Type</InputLabel>
              <Select value={filterWorkerType} label="Worker Type" onChange={(e) => setFilterWorkerType(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {getUniqueValues("worker_type").map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}>
              <InputLabel>Entry Type</InputLabel>
              <Select value={filterEntryType} label="Entry Type" onChange={(e) => setFilterEntryType(normalizeEntryType(e.target.value))}>
                <MenuItem value="">All</MenuItem>
                {[...new Set((Array.isArray(expenses) ? expenses : []).map(item => normalizeEntryType(item.entry_type)).filter(Boolean))].sort().map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ClearAllIcon />}
                onClick={clearFilters}
                fullWidth
                size="small"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
              >
                
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchExpenses}
                fullWidth
                size="small"
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderColor: "#2A3663", color: "#2A3663", "&:hover": { borderColor: "#1e2a4a", bgcolor: "rgba(42, 54, 99, 0.06)" } }}
              >
              </Button>
            </Stack>
          </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Total Summary KPI */}
        {(Array.isArray(filteredExpenses) && filteredExpenses.length > 0) && (
          <Box sx={{ mb: 3, px: { xs: 1.5, md: 3 } }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #2A3663 0%, #1e2a4a 100%)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(42, 54, 99, 0.25)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 32px rgba(42, 54, 99, 0.3)" },
                  }}
                >
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ opacity: 0.92, fontWeight: 600, letterSpacing: "0.02em" }}>
                        Total Expenses
                      </Typography>
                      <PaymentIcon sx={{ opacity: 0.4, fontSize: 28 }} />
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                      {formatCurrency(totals.total)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(27, 94, 32, 0.25)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 32px rgba(27, 94, 32, 0.3)" },
                  }}
                >
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ opacity: 0.92, fontWeight: 600, letterSpacing: "0.02em" }}>
                        Paid Amount
                      </Typography>
                      <AccountBalanceWalletIcon sx={{ opacity: 0.4, fontSize: 28 }} />
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                      {formatCurrency(totals.paid)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card
                  sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #e65100 0%, #ef6c00 100%)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(230, 81, 0, 0.25)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 32px rgba(230, 81, 0, 0.3)" },
                  }}
                >
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ opacity: 0.92, fontWeight: 600, letterSpacing: "0.02em" }}>
                        Unpaid Amount
                      </Typography>
                      <PendingActionsIcon sx={{ opacity: 0.4, fontSize: 28 }} />
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                      {formatCurrency(totals.unpaid)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Summary by Entry Type */}
        {Object.keys(totalsByEntryType).length > 0 && (
          <Box sx={{ mt: 3, mb: 3, px: { xs: 1.5, md: 3 } }}>
              <Paper
                variant="outlined"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  mb: summaryExpanded ? 2 : 0,
                  p: 1.5,
                  borderRadius: 2,
                  borderColor: "rgba(42, 54, 99, 0.12)",
                  bgcolor: "rgba(255,255,255,0.8)",
                  "&:hover": { bgcolor: "rgba(42, 54, 99, 0.04)", borderColor: "rgba(42, 54, 99, 0.2)" },
                  transition: "all 0.2s",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a2236", fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
                  Summary by Entry Type
                </Typography>
                <IconButton size="small" sx={{ color: "#2A3663" }}>
                  {summaryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Paper>
              {summaryExpanded && (
                <Grid container spacing={2.5}>
                  {Object.entries(totalsByEntryType)
                    .sort(([a], [b]) => {
                      if (a === "Regular") return -1;
                      if (b === "Regular") return 1;
                      return a.localeCompare(b);
                    })
                    .map(([entryType, entryTotals]) => {
                      const colors = getEntryTypeColors(entryType);
                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={entryType}>
                          <Card
                            sx={{
                              height: "100%",
                              borderRadius: 2,
                              backgroundColor: colors.background,
                              color: colors.text,
                              boxShadow: "0 4px 20px rgba(42, 54, 99, 0.2)",
                              transition: "transform 0.2s, box-shadow 0.2s",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: "0 12px 28px rgba(42, 54, 99, 0.3)",
                              },
                            }}
                          >
                            <CardContent sx={{ p: 2.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.95 }}>
                                {entryType}
                              </Typography>
                              <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.25)" }} />
                              <Stack spacing={1.5}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Entries</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{entryTotals.count}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Total Amount</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(entryTotals.total)}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Paid</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.95 }}>{formatCurrency(entryTotals.paid)}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Unpaid</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.95 }}>{formatCurrency(entryTotals.unpaid)}</Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                </Grid>
              )}
          </Box>
        )}
        
        {/* Entry count info */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mt: 2, mb: 1.5, px: { xs: 1.5, md: 3 } }}>
          <Chip
            label={`Showing ${Array.isArray(filteredExpenses) ? filteredExpenses.length : 0} of ${Array.isArray(expenses) ? expenses.length : 0} expenses`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, borderRadius: 2, borderColor: "rgba(42, 54, 99, 0.2)", color: "#5c6b8a" }}
          />
        </Box>

        {/* Table */}
        <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 2 }}>
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(42, 54, 99, 0.06)",
            border: "1px solid rgba(42, 54, 99, 0.08)",
          }}
        >
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#2A3663" }}>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Payment ID
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Worker ID
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Worker Name
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Worker Type
                </TableCell>
                {/* <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Property
                </TableCell> */}
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Date
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Hours/Days
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Gross Amount
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Entry Type
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }}>
                  Remarks
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.02em", py: 1.5 }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <CircularProgress size={40} sx={{ color: "#2A3663" }} />
                      <Typography color="text.secondary" fontWeight={500}>Loading expenses...</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(filteredExpenses) || filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <PaymentIcon sx={{ fontSize: 48, color: "rgba(42, 54, 99, 0.2)" }} />
                      <Typography color="text.secondary" fontWeight={500}>No expenses found</Typography>
                      <Typography variant="body2" color="text.secondary">Try adjusting filters or add a new expense.</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                (Array.isArray(filteredExpenses) ? filteredExpenses : [])
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((expense, idx) => (
                    <TableRow
                      key={expense.payment_id || expense.id}
                      hover
                      sx={{
                        bgcolor: idx % 2 === 1 ? "rgba(42, 54, 99, 0.02)" : "transparent",
                        "&:hover": { bgcolor: "rgba(42, 54, 99, 0.06)" },
                        transition: "background-color 0.15s",
                      }}
                    >
                      <TableCell>
                        <Tooltip title="View daily labour entry summary">
                          <Typography
                            component="button"
                            type="button"
                            onClick={() => {
                              setSummaryDialogExpense(expense);
                              setSummaryDialogOpen(true);
                            }}
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              color: "#2A3663",
                              fontWeight: 600,
                              textDecoration: "underline",
                              cursor: "pointer",
                              background: "none",
                              border: "none",
                              padding: 0,
                              "&:hover": { color: "#1e2a4a" },
                            }}
                          >
                            {expense.payment_id || expense.id || "—"}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{expense.worker_id}</TableCell>
                      <TableCell>{expense.worker_name}</TableCell>
                      <TableCell>{expense.worker_type}</TableCell>
                      {/* <TableCell>{expense.property_id}</TableCell> */}
                      <TableCell>{formatDate(expense.created_at || expense.date)}</TableCell>
                      <TableCell>
                        {expense.work_duration_type === "hourly" && expense.total_hours_worked 
                          ? `${expense.total_hours_worked} hrs`
                          : expense.work_duration_type === "per_sqft" && expense.total_sqft_completed
                          ? `${expense.total_sqft_completed} sqft`
                          : (expense.total_days || expense.days)
                          ? `${expense.total_days || expense.days} days`
                          : expense.total_hours_worked
                          ? `${expense.total_hours_worked} hrs`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
                          <Typography variant="body2" component="span">
                            {expense.gross_amount ? formatCurrency(expense.gross_amount) : "N/A"}
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
                      <TableCell>{formatCurrency(expense.net_amount || expense.amount)}</TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status || "N/A"}
                          color={getStatusColor(expense.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const entryType = normalizeEntryType(expense.entry_type);
                          const colors = getEntryTypeColors(entryType);
                          return (
                            <Chip
                              label={entryType}
                              size="small"
                              sx={{
                                backgroundColor: colors.background,
                                color: colors.text,
                                fontWeight: 600,
                                border: "none",
                                "& .MuiChip-label": {
                                  px: 1.5,
                                },
                              }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }} title={expense.remarks || expense.comments || ""}>
                        <Typography variant="body2" noWrap sx={{ fontSize: "0.8rem" }}>
                          {expense.remarks || expense.comments || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", flexWrap: "wrap" }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenConfirm("edit", expense)}
                              aria-label="Edit expense"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenConfirm("delete", expense)}
                              color="error"
                              aria-label="Delete expense"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Paper
          variant="outlined"
          sx={{
            mt: 0,
            borderTop: 0,
            borderRadius: "0 0 8px 8px",
            borderColor: "rgba(42, 54, 99, 0.08)",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontWeight: 500 },
          }}
        >
          <TablePagination
            component="div"
            count={Array.isArray(filteredExpenses) ? filteredExpenses.length : 0}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            labelRowsPerPage="Rows:"
          />
        </Paper>
        </Box>

        {/* Daily Labour Entry Summary: shown when payment_id is clicked */}
        <Dialog
          open={summaryDialogOpen}
          onClose={() => setSummaryDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
              border: "1px solid rgba(0,0,0,0.06)",
            },
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1a2236" }}>
              Labour Entry Summary
            </Typography>
            {summaryDialogExpense && (
              <Typography variant="body2" sx={{ fontFamily: "monospace", color: "#5c6b8a", fontWeight: 600 }}>
                ID {summaryDialogExpense.payment_id || summaryDialogExpense.id || "—"}
              </Typography>
            )}
          </Box>
          <DialogContent sx={{ px: 0, py: 0 }}>
            {summaryDialogExpense && (
              <Box sx={{ px: 3, py: 2 }}>
                <Table size="small" sx={{ "& .MuiTableCell-root": { border: 0, py: 1.25, px: 0, verticalAlign: "top" } }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ width: "40%", color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Worker</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{summaryDialogExpense.worker_name || "—"} ({summaryDialogExpense.worker_id || "—"})</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Worker type</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{summaryDialogExpense.worker_type || "—"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Property</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{summaryDialogExpense.property_id || "—"}</TableCell>
                    </TableRow>
                    <TableRow sx={{ "& td": { borderTop: "1px solid", borderColor: "divider" } }}>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Date</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{formatDate(summaryDialogExpense.created_at || summaryDialogExpense.date)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Hours / Days</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>
                        {summaryDialogExpense.work_duration_type === "hourly" && summaryDialogExpense.total_hours_worked
                          ? `${summaryDialogExpense.total_hours_worked} hrs`
                          : summaryDialogExpense.work_duration_type === "per_sqft" && summaryDialogExpense.total_sqft_completed
                          ? `${summaryDialogExpense.total_sqft_completed} sqft`
                          : (summaryDialogExpense.total_days || summaryDialogExpense.days)
                          ? `${summaryDialogExpense.total_days || summaryDialogExpense.days} days`
                          : summaryDialogExpense.total_hours_worked
                          ? `${summaryDialogExpense.total_hours_worked} hrs`
                          : "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ "& td": { borderTop: "1px solid", borderColor: "divider" } }}>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Gross amount</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{summaryDialogExpense.gross_amount != null ? formatCurrency(summaryDialogExpense.gross_amount) : "—"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Net amount</TableCell>
                      <TableCell sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a2236" }}>{formatCurrency(summaryDialogExpense.net_amount || summaryDialogExpense.amount)}</TableCell>
                    </TableRow>
                    <TableRow sx={{ "& td": { borderTop: "1px solid", borderColor: "divider" } }}>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Status</TableCell>
                      <TableCell><Chip label={summaryDialogExpense.status || "—"} size="small" color={getStatusColor(summaryDialogExpense.status)} sx={{ fontWeight: 500, height: 24 }} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Entry type</TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>{normalizeEntryType(summaryDialogExpense.entry_type)}</TableCell>
                    </TableRow>
                    {(summaryDialogExpense.remarks || summaryDialogExpense.comments) && (
                      <TableRow sx={{ "& td": { borderTop: "1px solid", borderColor: "divider", pt: 1.5 } }}>
                        <TableCell sx={{ color: "text.secondary", fontSize: "0.8125rem", fontWeight: 500 }}>Remarks</TableCell>
                        <TableCell sx={{ fontSize: "0.8125rem", color: "#374151", lineHeight: 1.5 }}>{summaryDialogExpense.remarks || summaryDialogExpense.comments}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </DialogContent>
          <Box sx={{ px: 3, py: 2, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={() => setSummaryDialogOpen(false)}
              sx={{
                borderRadius: 1.5,
                fontWeight: 600,
                textTransform: "none",
                px: 2.5,
                backgroundColor: "#2A3663",
                "&:hover": { backgroundColor: "#1e2a4a" },
              }}
            >
              Close
            </Button>
          </Box>
        </Dialog>

        {/* Confirmation dialog: show expense summary before Edit or Delete */}
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
            {confirmMode === "delete" ? "Confirm delete expense" : "Confirm edit expense"}
          </DialogTitle>
          <DialogContent sx={{ px: 3 }}>
            {confirmExpense && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {confirmMode === "delete"
                    ? "Review the expense below. This action cannot be undone."
                    : "Review the expense below, then continue to edit."}
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
                      <Typography variant="caption" color="text.secondary">Property</Typography>
                      <Typography variant="body2">{confirmExpense.property_id || "—"}</Typography>
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
                        label={confirmExpense.status || "—"}
                        size="small"
                        color={getStatusColor(confirmExpense.status)}
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
            {confirmMode === "delete" ? (
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmProceed}
                startIcon={<DeleteIcon />}
              >
                Delete expense
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleConfirmProceed}
                startIcon={<EditIcon />}
                sx={{ backgroundColor: "#2A3663", "&:hover": { backgroundColor: "#1e2a4a" } }}
              >
                Continue to edit
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: "0 24px 48px rgba(42, 54, 99, 0.15)",
              border: "1px solid rgba(42, 54, 99, 0.08)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#1a2236", fontWeight: 700, fontSize: "1.2rem", pt: 2.5, pb: 0 }}>
            {dialogMode === "add" ? "Add Labour Expense" : "Edit Labour Expense"}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Property ID"
                  value={formData.property_id}
                  onChange={(e) =>
                    setFormData({ ...formData, property_id: e.target.value })
                  }
                  disabled={dialogMode === "add" && !!propertyId}
                  helperText={dialogMode === "add" && propertyId ? "Pre-filled from property" : ""}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Worker</InputLabel>
                  <Select
                    value={formData.worker_id || ""}
                    label="Worker"
                    onChange={(e) => {
                      const selectedWorkerId = e.target.value;
                      const selectedWorker = assignedWorkers.find(
                        (w) => w.worker_id === selectedWorkerId
                      );
                      setFormData({
                        ...formData,
                        worker_id: selectedWorkerId,
                        worker_name: selectedWorker?.worker_name || "",
                        worker_type: selectedWorker?.worker_type || "",
                        amount: selectedWorker?.assign_amount || "",
                      });
                    }}
                    disabled={loadingWorkers || assignedWorkers.length === 0}
                  >
                    {loadingWorkers ? (
                      <MenuItem value="">Loading workers...</MenuItem>
                    ) : assignedWorkers.length === 0 ? (
                      <MenuItem value="">No workers assigned to this property</MenuItem>
                    ) : (
                      assignedWorkers.map((worker) => (
                        <MenuItem key={worker.worker_id} value={worker.worker_id}>
                          {worker.worker_name} ({worker.worker_id}) - {worker.worker_type}
                          {worker.assign_amount > 0 && (
                            <span style={{ marginLeft: '8px', color: '#1976d2', fontWeight: 600 }}>
                              - {formatCurrency(worker.assign_amount)}
                            </span>
                          )}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Worker Name"
                  value={formData.worker_name}
                  disabled
                  helperText="Auto-filled from selected worker"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Worker Type</InputLabel>
                  <Select
                    value={formData.worker_type}
                    label="Worker Type"
                    onChange={(e) =>
                      setFormData({ ...formData, worker_type: e.target.value })
                    }
                    disabled={!!formData.worker_id}
                  >
                    <MenuItem value="labour">Labour</MenuItem>
                    <MenuItem value="contractor">Contractor</MenuItem>
                    <MenuItem value="employee">Employee</MenuItem>
                  </Select>
                  {formData.worker_id && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                      Auto-filled from selected worker
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={formData.date || getTodayDate()}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  InputLabelProps={{ shrink: true }}
                  helperText="Click to open calendar picker"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Hours"
                  type="number"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Days"
                  type="number"
                  value={formData.days}
                  onChange={(e) =>
                    setFormData({ ...formData, days: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Rate"
                  type="number"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText={
                    formData.worker_id && assignedWorkers.find(w => w.worker_id === formData.worker_id)?.assign_amount > 0
                      ? "Pre-filled from assigned amount (can be edited)"
                      : ""
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Work Duration Type</InputLabel>
                  <Select
                    value={formData.work_duration_type}
                    label="Work Duration Type"
                    onChange={(e) =>
                      setFormData({ ...formData, work_duration_type: e.target.value })
                    }
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="per_sqft">Per Square Foot</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Entry Type</InputLabel>
                  <Select
                    value={formData.entry_type}
                    label="Entry Type"
                    onChange={(e) =>
                      setFormData({ ...formData, entry_type: normalizeEntryType(e.target.value) })
                    }
                  >
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Avenue Add On">Avenue Add On</MenuItem>
                    <MenuItem value="Customer Add On">Customer Add On</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
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
        </Box>
      </Paper>
    </Box>
  );
};

export default LabourExpense;

