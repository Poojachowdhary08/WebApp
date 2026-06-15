// src/components/ReadyForReviewForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  Tooltip,
  TableHead,
  TableRow,
  TableFooter,
  TablePagination,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  IconButton,
  Chip,
  Slide,
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Collapse,
} from "@mui/material";
import axios from "axios";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HistoryIcon from "@mui/icons-material/History";
import { debounce } from "lodash";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SaveIcon from "@mui/icons-material/Save";
import { v4 as uuidv4 } from "uuid";
import DeleteIcon from "@mui/icons-material/Delete";

import OverRideInvoice from "./OverRideInvoice";
import ReviewedHistoryTable from "./ReviewedHistoryTable";
import ItemDropdown from "./ItemDropdown";
import ItemTypeDropDown from "./ItemTypeDropDown";
import NewItemForm from "./NewItemForm";
import UploadTaxInvoice from "./UploadTaxInvoice";

const email = localStorage.getItem("email");

/** Custom Styled TextField Component to match the screenshot's design */
const CustomTextField = ({ label, value, onChange, sx, ...props }) => (
  <TextField
    label={label}
    value={value}
    onChange={onChange}
    fullWidth
    variant="outlined"
    size="small"
    InputLabelProps={{ shrink: true }}
    sx={{
      "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        backgroundColor: "#F9FAFB",
        "& fieldset": { borderColor: "#E5E7EB" },
        "&:hover fieldset": { borderColor: "#9CA3AF" },
        "&.Mui-focused fieldset": { borderColor: "#3F83F8", borderWidth: "1px" },
      },
      "& .MuiInputLabel-root": {
        fontSize: "0.85rem",
        fontWeight: 60,
        color: "#6B7280",
        transform: "translate(14px, -9px) scale(0.75) !important",
      },
      "& .MuiInputBase-input": {
        padding: "10px 14px",
        height: "auto",
        textAlign: props.type === "number" ? "right" : "left",
      },
      "& .Mui-disabled": { backgroundColor: "#E5E7EB", color: "#111827" },
      "& .MuiInputBase-root": {
        paddingRight: props.InputProps?.endAdornment ? 0 : "14px",
      },
      ...(sx || {}),
    }}
    {...props}
  />
);

const ReadyForReviewForm = ({ invoiceData, onClose }) => {
  const data = invoiceData;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isSmallLaptop = useMediaQuery(theme.breakpoints.down("md"));
  const isShortScreen = useMediaQuery("(max-height: 800px)");
  const compactMode = isMobile || isSmallLaptop || isShortScreen;

  const [editableData, setEditableData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [items, setItems] = useState([]);

  // Dialog (kept — you already use this for success/reject)
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  // Toast for delete success (new request)
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");

  const [loading, setLoading] = useState(false);

  const [subtotal, setSubtotal] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [showUploadTaxForm, setShowUploadTaxForm] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState(null);

  const [showReviewedHistoryTableForm, setShowReviewedHistoryTableForm] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState("");

  const invoiceType = editableData?.invoice_type;
  const isProformaInvoice = invoiceType === "Proforma Invoice";
  const isTaxInvoice = invoiceType === "Tax Invoice";

  const [originalItems, setOriginalItems] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalEditableData, setOriginalEditableData] = useState({});
  const [isGrandTotalManuallySet, setIsGrandTotalManuallySet] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [smartMaxGrandTotal, setSmartMaxGrandTotal] = useState(null);

  const [roundOffTotal, setRoundOffTotal] = useState("0.00");

  const [expandedRows, setExpandedRows] = useState({});

  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const debouncedCalculate = useMemo(
    () =>
      debounce((parsedItems) => {
        calculateTotals(parsedItems);
      }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items]
  );

  const isNullish = (v) => v === null || v === undefined || v === "";

  const showToast = (message, severity = "success") => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleToastClose = (_, reason) => {
    if (reason === "clickaway") return;
    setToastOpen(false);
  };

  const checkForChanges = () => {
    const normalizeValue = (val) => {
      if (val === null || val === undefined) return "";
      return String(val).trim();
    };

    const itemsChanged = items.some((item) => {
      if (item.new || item.deleted) return true;
      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return true;

      return (
        normalizeValue(item.description) !== normalizeValue(original.description) ||
        normalizeValue(item.code) !== normalizeValue(original.code) ||
        normalizeValue(item.master_item_id) !== normalizeValue(original.master_item_id) ||
        normalizeValue(item.category) !== normalizeValue(original.category) ||
        normalizeValue(item.quantity) !== normalizeValue(original.quantity) ||
        normalizeValue(item.rate) !== normalizeValue(original.rate) ||
        normalizeValue(item.tax_percentage) !== normalizeValue(original.tax_percentage) ||
        normalizeValue(item.igst_percentage) !== normalizeValue(original.igst_percentage) ||
        normalizeValue(item.cgst_percentage) !== normalizeValue(original.cgst_percentage) ||
        normalizeValue(item.total_value) !== normalizeValue(original.total_value) ||
        Boolean(item.tax_inclusive) !== Boolean(original.tax_inclusive)
      );
    });

    const editableDataChanged =
      normalizeValue(editableData.taxes_igst) !== normalizeValue(originalEditableData.taxes_igst) ||
      normalizeValue(editableData.taxes_cgst) !== normalizeValue(originalEditableData.taxes_cgst) ||
      normalizeValue(editableData.taxes_sgst) !== normalizeValue(originalEditableData.taxes_sgst) ||
      normalizeValue(editableData.advancePaid) !== normalizeValue(originalEditableData.advancePaid) ||
      normalizeValue(editableData.bank_name) !== normalizeValue(originalEditableData.bank_name) ||
      normalizeValue(editableData.bank_account_no) !== normalizeValue(originalEditableData.bank_account_no) ||
      normalizeValue(editableData.bank_ifsc) !== normalizeValue(originalEditableData.bank_ifsc) ||
      normalizeValue(editableData.bank_holder_name) !== normalizeValue(originalEditableData.bank_holder_name);

    const grandTotalChanged = normalizeValue(grandTotal) !== normalizeValue(originalData.grandTotal || 0);

    return itemsChanged || editableDataChanged || grandTotalChanged;
  };

  const activeItems = useMemo(() => items.filter((i) => !i.deleted), [items]);

  const { canApprove, disabledReason } = useMemo(() => {
    const firstInvalid = activeItems.find((it) => {
      const hasName = !isNullish(it.description || it.selectedVendor?.name);
      const hasType = !isNullish(it.category);
      const hasTotal = !isNullish(it.total_value);
      return !(hasName && hasType && hasTotal);
    });

    const grandMissing = isNullish(grandTotal);
    const hasChanges = checkForChanges();

    if (firstInvalid) {
      return {
        canApprove: false,
        disabledReason: "Fill Item name, Item type, and Total for all items before approving.",
      };
    }
    if (grandMissing) {
      return {
        canApprove: false,
        disabledReason: "Grand Total / Total Amount can't be empty before approving.",
      };
    }
    if (hasChanges) {
      return {
        canApprove: false,
        disabledReason: "Save changes before approving.",
      };
    }
    return { canApprove: true, disabledReason: "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems, grandTotal, items, editableData, originalItems, originalEditableData]);

  useEffect(() => {
    setHasUnsavedChanges(checkForChanges());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, editableData, originalItems, originalEditableData, grandTotal]);

  useEffect(() => {
    const extractVendorPrefix = (id = "") => {
      return id?.split("_")[0]?.toUpperCase() || "";
    };

    const fetchVendorFromPrefix = async () => {
      const fullId = invoiceData?.avenue_created_invoice_id || "";
      const prefix = fullId.slice(0, 5).toUpperCase();
      if (!prefix) return;

      try {
        const res = await axios.get(`http://localhost:8080/vendor/${prefix}`);
        const vendor = res.data;

        setEditableData((prev) => ({
          ...prev,
          vendor_id: vendor.vendor_id,
          supplier_name: vendor.vendor_display_name || vendor.vendor_name,
          bank_name: vendor.vendor_bank_name || "",
          bank_account_no: vendor.vendor_bank_account_number || "",
          bank_ifsc: vendor.vendor_bank_ifsc_code || "",
          bank_holder_name: vendor.bank_holder_name || "",
        }));
      } catch (err) {
        console.warn("❌ Vendor not found for prefix:", prefix);
      }
    };

    if (invoiceData?.avenue_created_invoice_id) fetchVendorFromPrefix();
  }, [invoiceData]);

  /** ✅ FIX: ItemTypeDropDown can return string or object; store string always */
  const handleItemTypeChange = (rowId, newType) => {
    const category =
      typeof newType === "string"
        ? newType.trim()
        : (newType?.name || "").trim();

    setItems((prev) =>
      prev.map((it) =>
        it.id === rowId ? { ...it, category, item_type: category } : it
      )
    );
  };

  const handleCellEdit = (field, value, id) => {
    const relevantFields = [
      "quantity",
      "rate",
      "tax_percentage",
      "igst_percentage",
      "cgst_percentage",
      "tax_inclusive",
    ];

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        if (field === "selectedVendor" && value?.name) {
          updatedItem.description = value.name;
        }

        if (relevantFields.includes(field)) {
          updatedItem.total_value = calculateItemTotal(updatedItem);
        }

        return updatedItem;
      }
      return item;
    });

    // If user edits item-level amounts/taxes, unlock totals so Grand Total recalculates.
    if (relevantFields.includes(field)) {
      setSmartMaxGrandTotal(null);
      setIsGrandTotalManuallySet(false);
    }

    setItems(updatedItems);
    calculateTotals(updatedItems);
    setPayloadPreview(preparePayload(updatedItems));
  };

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    if (originalItems.length === 0 && items.length > 0) {
      setOriginalItems(JSON.parse(JSON.stringify(items)));
    }
  }, [items, originalItems.length]);

  useEffect(() => {
    const overdue = grandTotal - (editableData.advancePaid || 0);
    setEditableData((prev) => ({
      ...prev,
      overdueAmount: overdue >= 0 ? overdue.toFixed(2) : "0.00",
    }));
  }, [grandTotal, editableData.advancePaid]);

  useEffect(() => {
    if (!data) return;

    const normalizedData = {
      ...data,
      taxes_igst: data.taxes_igst ? parseFloat(data.taxes_igst).toFixed(2) : "0.00",
      taxes_cgst: data.taxes_cgst ? parseFloat(data.taxes_cgst).toFixed(2) : "0.00",
      taxes_sgst: data.taxes_sgst ? parseFloat(data.taxes_sgst).toFixed(2) : "0.00",
      advancePaid: data.advancePaid ? parseFloat(data.advancePaid).toFixed(2) : "0.00",
      bank_holder_name: data.bank_holder_name || "",
    };

    setEditableData(normalizedData);
    setOriginalData({ ...normalizedData, items: data.items || [] });
    setOriginalEditableData({ ...normalizedData });

    const initialGrandTotal = parseFloat(data.grandTotal || data.total_bill_amount || 0);
    setGrandTotal(initialGrandTotal);
    setIsGrandTotalManuallySet(false);

    setOriginalData((prev) => ({ ...prev, grandTotal: initialGrandTotal }));

    const updatedItems = (data.items || []).map((item, index) => ({
      id: item.id || index + 1,
      code: item.code || "",
      description: item.description || "",
      category: item.category || "0",
      master_item_id: item.master_item_id || null,
      selectedVendor: item.description ? { id: "custom", name: item.description } : null,
      quantity: item.quantity || "0",
      rate: item.unit_price || "0.00",
      tax_percentage: item.taxes_gst_percentage || "0",
      igst_percentage: item.taxes_igst_percentage || "0",
      cgst_percentage: item.taxes_cgst_percentage || "0",
      total_value: item.total_value || "0.00",
      tax_inclusive: item.tax_inclusive || false,
    }));

    setItems(updatedItems);

    const safeParse = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
    const act = updatedItems.filter((it) => !it.deleted);

    const subtotalVal = act.reduce((sum, it) => sum + safeParse(it.total_value), 0);

    const igst = act.reduce(
      (sum, it) => sum + (safeParse(it.igst_percentage) * safeParse(it.quantity) * safeParse(it.rate)) / 100,
      0
    );
    const cgst = act.reduce(
      (sum, it) => sum + (safeParse(it.cgst_percentage) * safeParse(it.quantity) * safeParse(it.rate)) / 100,
      0
    );
    const sgst = act.reduce(
      (sum, it) => sum + (safeParse(it.tax_percentage) * safeParse(it.quantity) * safeParse(it.rate)) / 100,
      0
    );

    const taxTotal = igst + cgst + sgst;
    const calculatedGrandTotal = subtotalVal + taxTotal;
    const savedGrandTotal = parseFloat(data.grandTotal || data.total_bill_amount || 0);
    const maxGrandTotal = Math.max(calculatedGrandTotal, savedGrandTotal);

    setGrandTotal(maxGrandTotal);
    setSmartMaxGrandTotal(maxGrandTotal);
    setIsGrandTotalManuallySet(true);

    setSubtotal(subtotalVal.toFixed(2));
    setTotalTax(taxTotal.toFixed(2));

    setEditableData((prev) => ({
      ...prev,
      taxes_igst: igst.toFixed(2),
      taxes_cgst: cgst.toFixed(2),
      taxes_sgst: sgst.toFixed(2),
    }));

    setIsDataLoaded(true);
  }, [data]);

  useEffect(() => {
    if (!isGrandTotalManuallySet && isDataLoaded) {
      calculateTotals(items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isGrandTotalManuallySet, isDataLoaded]);

  useEffect(() => {
    const overdue = grandTotal - (editableData.advancePaid || 0);
    setEditableData((prev) => ({
      ...prev,
      overdueAmount: overdue >= 0 ? overdue.toFixed(2) : "0.00",
    }));
  }, [grandTotal, editableData.advancePaid]);

  useEffect(() => {
    const igst = parseFloat(editableData.taxes_igst || 0);
    const cgst = parseFloat(editableData.taxes_cgst || 0);
    const sgst = parseFloat(editableData.taxes_sgst || 0);

    const taxTotal = igst + cgst + sgst;
    const newGrandTotal = parseFloat(subtotal || 0) + taxTotal;

    setTotalTax(taxTotal.toFixed(2));

    if (smartMaxGrandTotal !== null) {
      setGrandTotal(smartMaxGrandTotal);
    } else if (!isGrandTotalManuallySet) {
      setGrandTotal(newGrandTotal);
    }
  }, [
    editableData.taxes_igst,
    editableData.taxes_cgst,
    editableData.taxes_sgst,
    subtotal,
    isGrandTotalManuallySet,
    smartMaxGrandTotal,
  ]);

  const handleInputChange = (field, value) => {
    setEditableData({ ...editableData, [field]: value });
  };

  const isModified = (item) => {
    const original = originalItems.find((o) => o.id === item.id);
    if (!original) return false;
    return (
      item.description !== original.description ||
      item.code !== original.code ||
      item.master_item_id !== original.master_item_id
    );
  };

  const sanitizeDeletedItems = (deletedItems) => {
    return deletedItems
      .filter((id) => typeof id === "number" || !isNaN(parseInt(id, 10)))
      .map((id) => parseInt(id, 10));
  };

  const preparePayload = (products) => {
    const normalizeValue = (val) => {
      if (val === null || val === undefined) return "";
      return String(val).trim();
    };

    const userEmail = localStorage.getItem("email");

    const updatedItems = products.filter((item) => {
      if (item.new || item.deleted) return false;

      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return true;

      return (
        normalizeValue(item.description) !== normalizeValue(original.description) ||
        normalizeValue(item.code) !== normalizeValue(original.code) ||
        normalizeValue(item.master_item_id) !== normalizeValue(original.master_item_id) ||
        normalizeValue(item.category) !== normalizeValue(original.category) ||
        normalizeValue(item.quantity) !== normalizeValue(original.quantity) ||
        normalizeValue(item.rate) !== normalizeValue(original.rate) ||
        normalizeValue(item.tax_percentage) !== normalizeValue(original.tax_percentage) ||
        normalizeValue(item.igst_percentage) !== normalizeValue(original.igst_percentage) ||
        normalizeValue(item.cgst_percentage) !== normalizeValue(original.cgst_percentage) ||
        normalizeValue(item.total_value) !== normalizeValue(original.total_value) ||
        Boolean(item.tax_inclusive) !== Boolean(original.tax_inclusive)
      );
    });

    const newItems = products.filter((product) => product.new && !product.deleted);

    const deletedItems = products.filter((product) => product.deleted).map((product) => product.id);

    const taxes_igst = updatedItems.reduce((total, item) => {
      return total + (parseFloat(item.total_value || 0) * parseFloat(item.igst_percentage || 0)) / 100;
    }, 0);

    const taxes_cgst = updatedItems.reduce((total, item) => {
      return total + (parseFloat(item.total_value || 0) * parseFloat(item.cgst_percentage || 0)) / 100;
    }, 0);

    const taxes_sgst = updatedItems.reduce((total, item) => {
      return total + (parseFloat(item.total_value || 0) * parseFloat(item.tax_percentage || 0)) / 100;
    }, 0);

    return {
      avenue_created_invoice_id: editableData.avenue_created_invoice_id,
      bill_status: editableData.bill_status || "REVIEWED",

      updated_items: updatedItems.map((item) => {
        const description = item.description || item.selectedVendor?.name || "";
        if (!description.trim()) console.warn(`⚠️ Item ${item.id} has empty description, using fallback`);
        return {
          id: item.id,
          description: description.trim() || "Unnamed Item",
          code: item.code || "",
          master_item_id: item.master_item_id || null,
          item_type: item.item_type || item.category || "Uncategorized",
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.rate) || 0,
          taxable_value: parseFloat(item.total_value) || 0,
          total_value: parseFloat(item.total_value) || 0,
          taxes_igst_percentage: parseFloat(item.igst_percentage) || 0,
          taxes_cgst_percentage: parseFloat(item.cgst_percentage) || 0,
          taxes_gst_percentage: parseFloat(item.tax_percentage) || 0,
          tax_inclusive: item.tax_inclusive || false,
        };
      }),

      new_items: newItems.map((item) => {
        const description = item.description || item.selectedVendor?.name || "";
        if (!description.trim()) console.warn(`⚠️ New item has empty description, using fallback`);
        return {
          description: description.trim() || "Unnamed Item",
          code: item.code || "",
          master_item_id: item.master_item_id || null,
          category: item.category,
          item_type: item.item_type || item.category || "Uncategorized",
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.rate) || 0,
          taxable_value: parseFloat(item.total_value) || 0,
          total_value: parseFloat(item.total_value) || 0,
          taxes_igst_percentage: parseFloat(item.igst_percentage) || 0,
          taxes_cgst_percentage: parseFloat(item.cgst_percentage) || 0,
          taxes_gst_percentage: parseFloat(item.tax_percentage) || 0,
          tax_inclusive: item.tax_inclusive || false,
        };
      }),

      deleted_items: sanitizeDeletedItems(deletedItems),

      grandTotal: parseFloat(grandTotal) || 0,
      amount_to_pay: parseFloat(grandTotal) || 0,
      paid_amount: parseFloat(editableData.advancePaid || 0) || 0,
      overdue_amount: parseFloat(editableData.overdueAmount || 0) || 0,

      taxes_igst: parseFloat(editableData.taxes_igst || 0) || 0,
      taxes_cgst: parseFloat(editableData.taxes_cgst || 0) || 0,
      taxes_sgst: parseFloat(editableData.taxes_sgst || 0) || 0,

      bank_name: editableData.bank_name || "",
      bank_account_no: editableData.bank_account_no || "",
      bank_ifsc: editableData.bank_ifsc || "",
      bank_holder_name: editableData.bank_holder_name || "",

      bill_status: editableData.bill_status || "REVIEWED",
      email: userEmail || "unknown@example.com",
    };
  };

  const calculateTotalsForComparison = (itemsList) => {
    const safeParse = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
    const act = itemsList.filter((it) => !it.deleted);

    let subtotalVal = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    act.forEach((item) => {
      const quantity = safeParse(item.quantity);
      const rate = safeParse(item.rate);
      const isTaxInclusive = item.tax_inclusive || false;

      const igstPercent = safeParse(item.igst_percentage);
      const cgstPercent = safeParse(item.cgst_percentage);
      const sgstPercent = safeParse(item.tax_percentage);
      const totalTaxPercent = igstPercent + cgstPercent + sgstPercent;

      let baseValue, itemIgst, itemCgst, itemSgst;

      if (isTaxInclusive) {
        const totalPrice = quantity * rate;
        baseValue = totalTaxPercent > 0 ? totalPrice / (1 + totalTaxPercent / 100) : totalPrice;
        itemIgst = (baseValue * igstPercent) / 100;
        itemCgst = (baseValue * cgstPercent) / 100;
        itemSgst = (baseValue * sgstPercent) / 100;
        subtotalVal += baseValue;
      } else {
        baseValue = quantity * rate;
        itemIgst = (baseValue * igstPercent) / 100;
        itemCgst = (baseValue * cgstPercent) / 100;
        itemSgst = (baseValue * sgstPercent) / 100;
        subtotalVal += baseValue;
      }

      igst += itemIgst;
      cgst += itemCgst;
      sgst += itemSgst;
    });

    const taxTotal = igst + cgst + sgst;
    const gt = subtotalVal + taxTotal;

    return {
      subtotal: subtotalVal.toFixed(2),
      totalTax: taxTotal.toFixed(2),
      grandTotal: gt,
      taxes_igst: igst.toFixed(2),
      taxes_cgst: cgst.toFixed(2),
      taxes_sgst: sgst.toFixed(2),
    };
  };

  const calculateTotals = (itemsList) => {
    const calculated = calculateTotalsForComparison(itemsList);

    setSubtotal(calculated.subtotal);
    setTotalTax(calculated.totalTax);

    if (smartMaxGrandTotal !== null) {
      setGrandTotal(smartMaxGrandTotal);
    } else if (!isGrandTotalManuallySet) {
      setGrandTotal(calculated.grandTotal);
    }

    setEditableData((prev) => ({
      ...prev,
      taxes_igst: calculated.taxes_igst,
      taxes_cgst: calculated.taxes_cgst,
      taxes_sgst: calculated.taxes_sgst,
    }));
  };

  const calculateItemTotal = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const isTaxInclusive = item.tax_inclusive || false;

    const igstPercent = parseFloat(item.igst_percentage) || 0;
    const cgstPercent = parseFloat(item.cgst_percentage) || 0;
    const sgstPercent = parseFloat(item.tax_percentage) || 0;
    const totalTaxPercent = igstPercent + cgstPercent + sgstPercent;

    let baseValue, igstAmount, cgstAmount, sgstAmount, totalValue;

    if (isTaxInclusive) {
      const totalPrice = quantity * rate;
      baseValue = totalTaxPercent > 0 ? totalPrice / (1 + totalTaxPercent / 100) : totalPrice;

      igstAmount = (baseValue * igstPercent) / 100;
      cgstAmount = (baseValue * cgstPercent) / 100;
      sgstAmount = (baseValue * sgstPercent) / 100;

      totalValue = totalPrice;
    } else {
      baseValue = quantity * rate;
      igstAmount = (baseValue * igstPercent) / 100;
      cgstAmount = (baseValue * cgstPercent) / 100;
      sgstAmount = (baseValue * sgstPercent) / 100;
      totalValue = baseValue + igstAmount + cgstAmount + sgstAmount;
    }

    return totalValue.toFixed(2);
  };

  // UI "Amount" should match what users expect: Qty * Rate
  // (GST split/extraction happens in the summary/tax sections below).
  const calculateQtyRateAmount = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return (quantity * rate).toFixed(2);
  };

  const pushPriceHistory = async (itemsToPush) => {
    try {
      const payload = itemsToPush.map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const igst = parseFloat(item.igst_percentage) || 0;
        const cgst = parseFloat(item.cgst_percentage) || 0;
        const sgst = parseFloat(item.tax_percentage) || 0;

        const taxMultiplier = 1 + (igst + cgst + sgst) / 100;
        const rateWithTax = rate;

        return {
          item_name: item.description,
          item_type: item.item_type || item.category,
          unit_price: rateWithTax.toFixed(2),
          emp_id: localStorage.getItem("email") || "unknown@user.com",
          avenue_vendor_id: editableData?.avenue_created_invoice_id || "VENDOR_UNKNOWN",
        };
      });

      const response = await axios.post(
        "http://localhost:8080/add-item-price-history-bulk",
        { items: payload },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        console.log("✅ Price history inserted successfully");
      } else {
        console.warn("⚠️ Price history push failed with status", response.status);
      }
    } catch (error) {
      console.error("❌ Error pushing price history:", error);
    }
  };

  const handleStatusChange = async (status) => {
    setLoading(true);
    try {
      const updatedItemsList = items.map((it) => ({ ...it, bill_status: status }));

      setEditableData((prev) => ({ ...prev, bill_status: status }));
      setItems(updatedItemsList);

      const payload = preparePayload(updatedItemsList);

      const response = await axios.post(
        "http://localhost:8080/update-invoice-status",
        { ...payload, bill_status: status },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        if (status === "REVIEWED") {
          const act = items.filter((it) => !it.deleted);
          await pushPriceHistory(act);
        }

        const msg = status === "REJECTED" ? "Invoice Has Been Rejected." : `Status updated to '${status}' successfully!`;
        showDialog(msg, "success");
      } else {
        const errorMessage =
          response.data?.detail ||
          response.data?.message ||
          `Failed to update status. Code: ${response.status}`;
        showDialog(errorMessage, "error");
      }
    } catch (error) {
      console.error("❌ Error updating status:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update status. Please check the console for details.";
      showDialog(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithSave = async () => {
    setLoading(true);
    try {
      const savePayload = preparePayload(items);

      const saveResponse = await axios.post(
        "http://localhost:8080/save-invoice-changes",
        savePayload,
        { headers: { "Content-Type": "application/json" } }
      );

      if (saveResponse.status === 200) {
        setOriginalItems(JSON.parse(JSON.stringify(items)));
        setOriginalEditableData({ ...editableData });
        setHasUnsavedChanges(false);

        await handleStatusChange("REVIEWED");
      } else {
        const errorMessage =
          saveResponse.data?.detail ||
          saveResponse.data?.message ||
          `Failed to save changes before approval. Code: ${saveResponse.status}`;
        showDialog(errorMessage, "error");
      }
    } catch (error) {
      console.error("❌ Error in approve with save:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to save changes before approval. Please check the console for details.";
      showDialog(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) {
      showDialog("No changes to save.", "info");
      return;
    }

    setLoading(true);
    try {
      const payload = preparePayload(items);

      const response = await axios.post(
        "http://localhost:8080/save-invoice-changes",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        showDialog("Changes saved successfully!", "success");
        setOriginalItems(JSON.parse(JSON.stringify(items)));
        setOriginalEditableData({ ...editableData });
        setHasUnsavedChanges(false);
      } else {
        const errorMessage =
          response.data?.detail ||
          response.data?.message ||
          `Failed to save changes. Code: ${response.status}`;
        showDialog(errorMessage, "error");
      }
    } catch (error) {
      console.error("❌ Error saving changes:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to save changes. Please check the console for details.";
      showDialog(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewProduct = () => {
    const newProduct = {
      id: uuidv4(),
      code: "",
      description: "",
      selectedVendor: { id: "custom", name: "" },
      master_item_id: null,
      quantity: "0",
      category: "",
      rate: "0.00",
      igst_percentage: "0.00",
      cgst_percentage: "0.00",
      tax_percentage: "0.00",
      total_value: "0.00",
      tax_inclusive: false,
      new: true,
      deleted: false,
    };

    setItems((prev) => {
      const updated = [...prev, newProduct];
      calculateTotals(updated);
      return updated;
    });
  };

  /** ✅ Delete success should show TOAST instead of dialog */
  const deleteItem = async (id) => {
    const itemToDelete = items.find((it) => it.id === id);
    if (!itemToDelete) return;

    if (itemToDelete.new) {
      setItems((prev) => {
        const updated = prev.filter((it) => it.id !== id);
        calculateTotals(updated.filter((it) => !it.deleted));
        return updated;
      });
      showToast("Item removed", "success");
      return;
    }

    try {
      setLoading(true);
      const userEmail = localStorage.getItem("email") || "unknown@example.com";

      const response = await axios.post(
        "http://localhost:8080/delete-invoice-item",
        {
          item_id: id,
          avenue_created_invoice_id: editableData.avenue_created_invoice_id,
          email: userEmail,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 && response.data.success) {
        setItems((prev) => prev.filter((it) => it.id !== id));
        setOriginalItems((prev) => prev.filter((it) => it.id !== id));
        const remaining = items.filter((it) => it.id !== id && !it.deleted);
        calculateTotals(remaining);

        // ✅ toast instead of dialog
        showToast("Item deleted successfully!", "success");
      } else {
        showToast("Failed to delete item. Please try again.", "error");
      }
    } catch (error) {
      console.error("❌ Error deleting item:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to delete item. Please try again.";

      showToast(errorMessage, "error");

      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, deleted: true } : it))
      );
    } finally {
      setLoading(false);
    }
  };

  const showDialog = (message, severity) => {
    setDialogMessage(message);
    setDialogSeverity(severity || "info");
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    onClose();
  };

  const handleSuccessDialogClose = () => {
    setOpenDialog(false);
  };

  // ─────────────────────────────────────────
  // UI LAYOUT - DESKTOP ONLY, MATCHING DESIGN
  // ─────────────────────────────────────────
  return (
    <Box
      sx={{
        backgroundColor: "#F5F7FA",
        height: compactMode ? "auto" : "100vh",
        marginTop: "-35px",
        marginLeft: "-30px",
        marginRight: "-25px",
      }}
    >
      <Card
        sx={{
          width: "100%",
          height: compactMode ? "auto" : 900,
          borderRadius: 4,
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#FFFFFF",
          p: compactMode ? 0.5 : 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top header bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
            p: compactMode ? 1 : 1.5,
            border: "1px solid #E5E7EB",
            borderRadius: 3,
            backgroundColor: "#FFFFFF",
            position: compactMode ? "sticky" : "static",
            top: compactMode ? 0 : "auto",
            zIndex: compactMode ? 10 : "auto",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: "#111827", fontSize: compactMode ? "1rem" : undefined }}
            >
              #{editableData.json_invoice_number || "#SO001-AA020"}
            </Typography>

            {hasUnsavedChanges && (
              <Chip
                label="Unsaved Changes"
                size="medium"
                sx={{
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                  fontWeight: 500,
                  borderRadius: 2,
                  "& .MuiChip-label": { py: 0.5 },
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: compactMode ? 1 : 1.5,
              flexWrap: compactMode ? "wrap" : "nowrap",
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleStatusChange("REJECTED")}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                px: 2.5,
                borderColor: "#D1D5DB",
                color: "#F87171",
              }}
            >
              Reject
            </Button>

            <Tooltip title={!canApprove ? disabledReason : ""} disableHoverListener={canApprove}>
              <span>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleApproveWithSave}
                  disabled={!canApprove}
                  startIcon={<CheckCircleIcon />}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    px: 2.5,
                    backgroundColor: "#10B981",
                    "&:hover": { backgroundColor: "#059669" },
                  }}
                >
                  Approve
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Save Changes">
              <span>
                <Tooltip
                  title={
                    loading
                      ? "Saving…"
                      : hasUnsavedChanges
                        ? "Save changes"
                        : "No changes to save"
                  }
                  placement="bottom"
                >
                  <span>
                    <IconButton
                      onClick={handleSaveChanges}
                      disabled={loading || !hasUnsavedChanges}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid #E5E7EB",
                        backgroundColor: "#F9FAFB",
                        color: "#3F83F8",
                      }}
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </span>
            </Tooltip>

            {isProformaInvoice && (
              <Tooltip title="Upload Tax Invoice">
                <IconButton
                  onClick={() => setShowUploadTaxForm(true)}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid #E5E7EB",
                    backgroundColor: "#F9FAFB",
                    color: "#6B7280",
                  }}
                >
                  <UploadFileIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="View Reviewed History">
              <IconButton
                onClick={() => setShowReviewedHistoryTableForm(true)}
                sx={{
                  borderRadius: 2,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#F9FAFB",
                  color: "#6B7280",
                }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              onClick={onClose}
              variant="outlined"
              startIcon={<CloseIcon />}
              sx={{
                backgroundColor: "#FEE2E2",
                color: "#DC2626",
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                fontSize: "0.9rem",
                boxShadow: "none",
                "&:hover": {
                  borderColor: "error.dark",
                  backgroundColor: "#FECACA",
                  boxShadow: "none",
                },
              }}
            >
              Close
            </Button>
          </Box>
        </Box>

        {loading && <CircularProgress sx={{ display: "block", margin: "0 auto 16px" }} />}

        <CardContent
          sx={{
            flex: 1,
            overflowY: "auto",
            pr: compactMode ? 0.5 : 1,
          }}
        >
          <Grid container spacing={3}>
            {/* LEFT: PDF */}
            <Grid item xs={12} md={compactMode ? 4 : 5}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  p: compactMode ? 1 : 2,
                  height: "100%",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    mt: 1,
                    borderRadius: 3,
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    overflow: "hidden",
                    minHeight: compactMode ? 520 : 800,
                  }}
                >
                  <iframe
                    src={data.file_url}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                    title="Invoice PDF"
                  />
                </Box>
              </Paper>
            </Grid>

            {/* RIGHT: details + table + summary */}
            <Grid item xs={12} md={compactMode ? 8 : 7}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* Invoice Details */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: "#111827" }}>
                    Invoice Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="Invoice Number"
                        value={editableData.json_invoice_number || "INVO-1237"}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="Invoice Date"
                        value={editableData.invoice_date || "21-05-2025"}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="Supplier Name"
                        value={editableData.supplier_name || "Sobhan Enterprises"}
                        disabled
                      />
                    </Grid>
                  </Grid>

                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: "#111827" }}>
                    Vendor Bank Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="Bank Name"
                        value={editableData.bank_name || ""}
                        onChange={(e) => handleInputChange("bank_name", e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="Bank Account Number"
                        value={editableData.bank_account_no || ""}
                        onChange={(e) => handleInputChange("bank_account_no", e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <CustomTextField
                        label="IFSC Code"
                        value={editableData.bank_ifsc || ""}
                        onChange={(e) => handleInputChange("bank_ifsc", e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Item Details */}
                <Paper
                  elevation={0}
                  sx={{
                    p: compactMode ? 0.75 : 1,
                    borderRadius: 3,
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: "#111827" }}>
                    Item Details
                  </Typography>

                  <TableContainer
                    sx={{
                      maxHeight: compactMode ? 240 : 300,
                      overflowX: "auto",
                      border: "1px solid #E5E7EB",
                      borderRadius: 1,
                    }}
                  >
                    <Table
                      stickyHeader
                      size="small"
                      sx={{
                        tableLayout: "fixed",
                        minWidth: compactMode ? 980 : "unset",
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
                          <TableCell
                            sx={{
                              width: "4%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          />
                          <TableCell
                            sx={{
                              width: "28%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            Item Name
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              width: "16%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            HSN Code
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              width: "12%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            Qty
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              width: "14%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            Rate
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              width: "16%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            Amount
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              width: "10%",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#4B5563",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {items
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map(
                            (item) =>
                              !item.deleted && (
                                <React.Fragment key={item.id}>
                                  <TableRow
                                    sx={{
                                      backgroundColor: isModified(item) ? "#FFF7ED" : "inherit",
                                      "&:last-child td": { borderBottom: 0 },
                                    }}
                                  >
                                    <TableCell sx={{ p: 0.5, borderBottom: "1px solid #E5E7EB" }}>
                                      <IconButton size="small" onClick={() => toggleRowExpand(item.id)}>
                                        {expandedRows[item.id] ? (
                                          <ExpandLessIcon fontSize="small" />
                                        ) : (
                                          <ExpandMoreIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </TableCell>

                                    <TableCell sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <ItemDropdown
                                        value={
                                          item.selectedVendor ??
                                          (item.description ? { id: "custom", name: item.description } : null)
                                        }
                                        onCreateItem={() => setShowCreateItem(true)}
                                        onSelect={(selected) => {
                                          const name = selected?.name || "";
                                          const updatedItems = items.map((prevItem) => {
                                            if (prevItem.id === item.id) {
                                              const updatedItem = { ...prevItem };
                                              updatedItem.description = name;
                                              updatedItem.selectedVendor = selected;
                                              updatedItem.master_item_id = selected?.id || null;

                                              if (selected?.code) updatedItem.code = selected.code;
                                              if (selected?.item_type || selected?.category) {
                                                updatedItem.category = selected.item_type || selected.category;
                                                updatedItem.item_type = selected.item_type || selected.category;
                                              }

                                              updatedItem.total_value = calculateItemTotal(updatedItem);
                                              return updatedItem;
                                            }
                                            return prevItem;
                                          });

                                          setItems(updatedItems);
                                          calculateTotals(updatedItems);
                                          setPayloadPreview(preparePayload(updatedItems));
                                        }}
                                      />
                                    </TableCell>

                                    <TableCell align="right" sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <TextField
                                        size="small"
                                        type="text"
                                        value={item.code || ""}
                                        fullWidth
                                        sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                                        onChange={(e) => handleCellEdit("code", e.target.value, item.id)}
                                      />
                                    </TableCell>

                                    <TableCell align="right" sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={item.quantity}
                                        fullWidth
                                        onChange={(e) => handleCellEdit("quantity", e.target.value, item.id)}
                                        inputProps={{ step: "0.001", style: { textAlign: "right" } }}
                                      />
                                    </TableCell>

                                    <TableCell align="right" sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={item.rate}
                                        fullWidth
                                        onChange={(e) => handleCellEdit("rate", e.target.value, item.id)}
                                        inputProps={{ step: "0.01", style: { textAlign: "right" } }}
                                      />
                                    </TableCell>

                                    <TableCell align="right" sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={calculateQtyRateAmount(item)}
                                        disabled
                                        fullWidth
                                        sx={{ "& .MuiInputBase-input": { textAlign: "right" } }}
                                      />
                                    </TableCell>

                                    <TableCell align="center" sx={{ p: 1, borderBottom: "1px solid #E5E7EB" }}>
                                      <Tooltip title="Delete Item">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => deleteItem(item.id)}
                                          sx={{ p: 0.5 }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>

                                  {/* Expanded Row */}
                                  <TableRow>
                                    <TableCell colSpan={8} sx={{ p: 0, borderBottom: "1px solid #E5E7EB" }}>
                                      <Collapse in={!!expandedRows[item.id]} timeout="auto" unmountOnExit>
                                        <Box
                                          sx={{
                                            p: compactMode ? 1.25 : 2,
                                            backgroundColor: "#F9FAFB",
                                            display: "flex",
                                            gap: compactMode ? 1.5 : 3,
                                            alignItems: "flex-start",
                                            marginLeft: compactMode ? 16 : "50px",
                                            flexWrap: compactMode ? "wrap" : "nowrap",
                                          }}
                                        >
                                          {/* Type */}
                                          <Box sx={{ minWidth: compactMode ? 180 : 220 }}>
                                            <ItemTypeDropDown
                                              value={item.category}
                                              onSelect={(newType) => handleItemTypeChange(item.id, newType)}
                                            />
                                          </Box>

                                          {/* GST Inclusive */}
                                          <Box sx={{ minWidth: compactMode ? 135 : 160 }}>
                                            <Tooltip
                                              placement="top"
                                              title={
                                                item.tax_inclusive
                                                  ? "GST Inclusive: Rate already includes GST. Amount = Qty × Rate."
                                                  : "GST Exclusive: GST will be added on top of Qty × Rate using IGST/CGST/SGST %."
                                              }
                                            >
                                              <FormControlLabel
                                                control={
                                                  <Checkbox
                                                    size={compactMode ? "small" : "medium"}
                                                    checked={item.tax_inclusive || false}
                                                    onChange={(e) =>
                                                      handleCellEdit("tax_inclusive", e.target.checked, item.id)
                                                    }
                                                  />
                                                }
                                                label={<Typography variant="caption">GST Incl.</Typography>}
                                                sx={{
                                                  m: 0,
                                                  "& .MuiFormControlLabel-label": { fontSize: "0.75rem" },
                                                }}
                                              />
                                            </Tooltip>
                                          </Box>

                                          {/* IGST / CGST / SGST */}
                                          <Box
                                            sx={{
                                              flex: 1,
                                              display: "flex",
                                              gap: compactMode ? 0.75 : 1,
                                              alignItems: "flex-end",
                                            }}
                                          >
                                            <CustomTextField
                                              label="IGST %"
                                              type="number"
                                              value={item.igst_percentage}
                                              onChange={(e) =>
                                                handleCellEdit("igst_percentage", e.target.value, item.id)
                                              }
                                              sx={{
                                                maxWidth: compactMode ? 110 : 140,
                                                "& .MuiInputLabel-root": { fontSize: compactMode ? "0.78rem" : "0.85rem" },
                                                "& .MuiInputBase-input": { padding: compactMode ? "8px 10px" : "10px 14px", fontSize: compactMode ? "0.8rem" : undefined },
                                              }}
                                            />
                                            <CustomTextField
                                              label="CGST %"
                                              type="number"
                                              value={item.cgst_percentage}
                                              onChange={(e) =>
                                                handleCellEdit("cgst_percentage", e.target.value, item.id)
                                              }
                                              sx={{
                                                maxWidth: compactMode ? 110 : 140,
                                                "& .MuiInputLabel-root": { fontSize: compactMode ? "0.78rem" : "0.85rem" },
                                                "& .MuiInputBase-input": { padding: compactMode ? "8px 10px" : "10px 14px", fontSize: compactMode ? "0.8rem" : undefined },
                                              }}
                                            />
                                            <CustomTextField
                                              label="SGST %"
                                              type="number"
                                              value={item.tax_percentage}
                                              onChange={(e) =>
                                                handleCellEdit("tax_percentage", e.target.value, item.id)
                                              }
                                              sx={{
                                                maxWidth: compactMode ? 110 : 140,
                                                "& .MuiInputLabel-root": { fontSize: compactMode ? "0.78rem" : "0.85rem" },
                                                "& .MuiInputBase-input": { padding: compactMode ? "8px 10px" : "10px 14px", fontSize: compactMode ? "0.8rem" : undefined },
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              )
                          )}
                      </TableBody>

                      <TableFooter>
                        <TableRow>
                          <TablePagination
                            rowsPerPageOptions={[15, 20, 30]}
                            count={items.filter((i) => !i.deleted).length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            colSpan={8}
                          />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>

                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleAddNewProduct}
                    sx={{
                      mt: 2,
                      textTransform: "none",
                      borderRadius: 2,
                      borderColor: "#D1D5DB",
                      color: "#374151",
                      fontWeight: 600,
                      px: 2,
                      py: 1,
                    }}
                  >
                    + Add New Item
                  </Button>
                </Paper>

                {/* Payment and Summary Details — KEPT (no deletion) */}
                <Grid container spacing={1}>
                  {/* Tax Details */}
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        backgroundColor: "#f9f9f9",
                        borderRadius: 2,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 2,
                          color: "#333",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        Tax Details
                      </Typography>

                      <TextField
                        size="small"
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="IGST"
                        value={editableData.taxes_igst || "0.00"}
                        onChange={(e) => {
                          const newIgst = parseFloat(e.target.value) || 0;
                          const formattedIgst = newIgst.toFixed(2);

                          setSmartMaxGrandTotal(null);
                          setIsGrandTotalManuallySet(false);

                          setEditableData({ ...editableData, taxes_igst: formattedIgst });
                        }}
                        fullWidth
                      />

                      <TextField
                        size="small"
                        label="CGST"
                        type="number"
                        value={editableData.taxes_cgst}
                        onChange={(e) => {
                          const inputValue = e.target.value;

                          setSmartMaxGrandTotal(null);
                          setIsGrandTotalManuallySet(false);

                          if (inputValue === "" || inputValue === null || inputValue === undefined) {
                            setEditableData((prev) => ({ ...prev, taxes_cgst: "0.00" }));
                            return;
                          }

                          const val = parseFloat(inputValue);

                          if (isNaN(val)) {
                            setEditableData((prev) => ({ ...prev, taxes_cgst: "0.00" }));
                            return;
                          }

                          const formattedCgst = val.toFixed(2);
                          setEditableData((prev) => ({ ...prev, taxes_cgst: formattedCgst }));
                        }}
                        fullWidth
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                      />

                      <TextField
                        size="small"
                        sx={{
                          mb: 0,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="SGST"
                        type="number"
                        value={
                          editableData?.taxes_sgst !== null &&
                          editableData?.taxes_sgst !== undefined &&
                          editableData?.taxes_sgst !== ""
                            ? Number(editableData.taxes_sgst)
                            : ""
                        }
                        onChange={(e) => {
                          const input = e.target.value;
                          const numericValue = input === "" ? "" : parseFloat(input);
                          const newSgst = isNaN(numericValue) ? 0 : numericValue;
                          const formattedSgst = newSgst.toFixed(2);

                          setSmartMaxGrandTotal(null);
                          setIsGrandTotalManuallySet(false);

                          setEditableData((prev) => ({ ...prev, taxes_sgst: formattedSgst }));
                        }}
                        fullWidth
                      />
                    </Paper>
                  </Grid>

                  {/* Invoice Summary */}
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        mt: 2,
                        backgroundColor: "#f9f9f9",
                        borderRadius: 2,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 2,
                          color: "#333",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        Invoice Summary
                      </Typography>

                      <TextField
                        size="small"
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Subtotal"
                        value={subtotal || "0.00"}
                        onChange={(e) => {
                          const newSubtotal = parseFloat(e.target.value) || 0;
                          setSubtotal(newSubtotal);

                          setSmartMaxGrandTotal(null);
                          setIsGrandTotalManuallySet(false);

                          if (!isGrandTotalManuallySet) {
                            setGrandTotal((newSubtotal + parseFloat(totalTax)).toFixed(2));
                          }
                        }}
                        fullWidth
                      />
                      <Typography variant="caption" sx={{ display: "block", mt: -1.2, mb: 1.6, color: "#6B7280" }}>
                        Subtotal is calculated from item quantities & rates (tax-exclusive base).
                      </Typography>

                      <TextField
                        size="small"
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Tax"
                        value={totalTax || "0.00"}
                        onChange={(e) => {
                          const newTax = parseFloat(e.target.value) || 0;
                          setTotalTax(newTax);

                          setSmartMaxGrandTotal(null);
                          setIsGrandTotalManuallySet(false);

                          if (!isGrandTotalManuallySet) {
                            setGrandTotal((parseFloat(subtotal) + newTax).toFixed(2));
                          }
                        }}
                        fullWidth
                      />
                      <Typography variant="caption" sx={{ display: "block", mt: -1.2, mb: 1.6, color: "#6B7280" }}>
                        Tax is IGST + CGST + SGST (respects “Tax inclusive” items).
                      </Typography>

                      <TextField
                        size="small"
                        sx={{
                          mb: 0,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Grand Total"
                        value={grandTotal || "0.00"}
                        onFocus={() => console.log("🔍 Grand Total field focused, current value:", grandTotal)}
                        onChange={(e) => {
                          const newGrandTotal = parseFloat(e.target.value) || 0;
                          setGrandTotal(newGrandTotal);
                          setIsGrandTotalManuallySet(true);
                          setSmartMaxGrandTotal(null);
                        }}
                        fullWidth
                      />
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ display: "block", color: "#6B7280" }}>
                          Grand Total = Subtotal + Tax. If you manually edit Grand Total, it overrides the calculated value.
                        </Typography>
                        {smartMaxGrandTotal !== null && (
                          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#B45309" }}>
                            Note: Grand Total is currently kept at the higher of calculated vs saved invoice amount.
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Payment Details */}
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        mt: 2,
                        backgroundColor: "#f9f9f9",
                        borderRadius: 2,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          mb: 2,
                          color: "#333",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        Payment Details
                      </Typography>

                      <TextField
                        size="small"
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Advance Paid Amount"
                        value={editableData.advancePaid || ""}
                        onChange={(e) =>
                          setEditableData({
                            ...editableData,
                            advancePaid: parseFloat(e.target.value) || 0,
                          })
                        }
                        fullWidth
                      />

                      <TextField
                        size="small"
                        sx={{
                          mb: 2,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Total Amount"
                        value={grandTotal || "0.00"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || val === null || val === undefined) {
                            setGrandTotal(0);
                            return;
                          }

                          if (/^\d*\.?\d*$/.test(val)) {
                            const numVal = parseFloat(val);
                            setGrandTotal(isNaN(numVal) ? 0 : numVal);
                            setIsGrandTotalManuallySet(true);
                          }
                        }}
                        fullWidth
                      />

                      <TextField
                        size="small"
                        sx={{
                          mb: 0,
                          "& .MuiInputLabel-root": { color: "#555", fontSize: "0.8rem" },
                          "& .MuiInputBase-root": { backgroundColor: "#fff", borderRadius: "6px" },
                          "& .MuiInputBase-input": { py: 0.6, fontSize: "0.85rem" },
                        }}
                        label="Overdue Amount"
                        value={(grandTotal - (editableData.advancePaid || 0) || 0).toFixed(2)}
                        onChange={(e) => {
                          const newOverdueAmount = parseFloat(e.target.value) || 0;
                          const newAdvancePaid = grandTotal - newOverdueAmount;

                          setEditableData({
                            ...editableData,
                            advancePaid: newAdvancePaid,
                          });
                        }}
                        fullWidth
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </CardContent>

        {payloadPreview && (
          <Paper
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: "#F9FAFB",
              borderRadius: 2,
              border: "1px solid #E5E7EB",
            }}
          >
            {/* debug payload (currently hidden) */}
          </Paper>
        )}

        {/* Modals */}
        {showUploadTaxForm && (
          <Box
            sx={{
              position: "fixed",
              top: "3%",
              left: "50%",
              transform: "translate(-50%, 0)",
              width: "100%",
              height: "100%",
              maxWidth: "1840px",
              maxHeight: "84vh",
              overflowY: "auto",
              backgroundColor: "transparent",
              borderRadius: "8px",
              zIndex: 1300,
              padding: 2,
              marginTop: "26px",
            }}
          >
            <UploadTaxInvoice onClose={() => setShowUploadTaxForm(false)} invoiceData={data} />
          </Box>
        )}

        {showReviewedHistoryTableForm && (
          <Box
            sx={{
              position: "fixed",
              top: "3%",
              left: "50%",
              transform: "translate(-50%, 0)",
              width: "100%",
              height: "100%",
              maxWidth: "1840px",
              maxHeight: "84vh",
              overflowY: "auto",
              backgroundColor: "transparent",
              borderRadius: "8px",
              zIndex: 1300,
              padding: 2,
              marginTop: "26px",
            }}
          >
            <ReviewedHistoryTable onClose={() => setShowReviewedHistoryTableForm(false)} invoiceData={data} />
          </Box>
        )}

        {showCreateItem && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: 1300,
            }}
          >
            <NewItemForm onClose={() => setShowCreateItem(false)} />
          </Box>
        )}

        {/* Dialog (kept for status / save messages) */}
        <Dialog
          open={openDialog}
          onClose={dialogSeverity === "success" ? handleSuccessDialogClose : handleDialogClose}
          TransitionComponent={Slide}
          TransitionProps={{ direction: "up" }}
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: 6,
              // backgroundColor: dialogSeverity === "success" ? "#e1fcd4" : "#f5b7b5",
              // color: dialogSeverity === "success" ? "#2E7D32" : "#d41f19",
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              // color: dialogSeverity === "success" ? "#388E3C" : "#d41f19",
              fontWeight: "bold",
            }}
          >
            {dialogSeverity === "success" ? (
              <CheckCircleIcon fontSize="large" sx={{ color: "#388E3C" }} />
            ) : (
              <ErrorIcon fontSize="large" sx={{ color: "#d41f19" }} />
            )}
            {dialogSeverity === "success" ? "Success" : "Rejected"}
          </DialogTitle>
          <DialogContent>
            <Typography
              sx={{
                fontSize: "16px",
                // color: dialogSeverity === "success" ? "#2E7D32" : "#d41f19",
              }}
            >
              {dialogMessage}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button
              onClick={dialogSeverity === "success" ? handleSuccessDialogClose : handleDialogClose}
              variant="contained"
              sx={{
                // backgroundColor: dialogSeverity === "success" ? "#388E3C" : "#D32F2F",
                // "&:hover": { backgroundColor: dialogSeverity === "success" ? "#2E7D32" : "#B71C1C" },
                color: "black",
                textTransform: "none",
                fontWeight: "bold",
              }}
            >
              Got it!
            </Button>
          </DialogActions>
        </Dialog>

        {/* ✅ Toast for delete */}
        <Snackbar
  open={toastOpen}
  autoHideDuration={2500}
  onClose={handleToastClose}
  anchorOrigin={{ vertical: "center", horizontal: "center" }}
>
  <Alert
    onClose={handleToastClose}
    severity={toastSeverity}
    variant="filled"
    sx={{
      borderRadius: 2,
      fontWeight: 700,
      border: "1px solid",
      boxShadow: "0 10px 24px rgba(0,0,0,0.12)",

      // ✅ light shades by severity
      ...(toastSeverity === "success" && {
        backgroundColor: "#ECFDF5", // mint
        color: "#065F46",
        borderColor: "#A7F3D0",
      }),
      ...(toastSeverity === "error" && {
        backgroundColor: "#FEF2F2", // light red
        color: "#991B1B",
        borderColor: "#FECACA",
      }),
      ...(toastSeverity === "warning" && {
        backgroundColor: "#FFFBEB", // light amber
        color: "#92400E",
        borderColor: "#FDE68A",
      }),
      ...(toastSeverity === "info" && {
        backgroundColor: "#EFF6FF", // light blue
        color: "#1E40AF",
        borderColor: "#BFDBFE",
      }),

      // MUI "filled" adds icon colors sometimes — enforce icon color
      "& .MuiAlert-icon": { color: "inherit" },
      "& .MuiAlert-action": { color: "inherit" },
    }}
  >
    {toastMessage}
  </Alert>
</Snackbar>

      </Card>
    </Box>
  );
};

export default ReadyForReviewForm;