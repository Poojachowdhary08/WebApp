import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  TablePagination,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Cancel";
import DownloadIcon from "@mui/icons-material/Download";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ItemTypeDropDown from "./ItemTypeDropDown";
import * as XLSX from "xlsx";
import BatchIssues from "./BatchIssues";
import { API_BASE } from "../config";

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItemKey(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeType(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function normalizePropertyToken(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const columns = [
  { key: "item", label: "ITEM", width: 280 },
  { key: "unit", label: "UNIT", width: 100, align: "center" },
  { key: "category", label: "CATEGORY", width: 160 },
  {
    key: "limit_quantity",
    label: "LIMIT QTY",
    width: 140,
    align: "right",
    editable: true,
    type: "number",
  },
  {
    key: "used_quantity",
    label: "USED QTY",
    width: 140,
    align: "right",
    editable: true,
    type: "number",
  },
  {
    key: "remaining_material",
    label: "REMAINING",
    width: 140,
    align: "right",
  },
  { key: "item_type", label: "TYPE", width: 140, align: "center" },
  {
    key: "material_cost",
    label: "MATERIAL COST (₹)",
    width: 180,
    align: "right",
    editable: true,
    type: "currency",
  },
];

const InventoryPage = ({ propertyId, onClose, onTotalsChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [uploading, setUploading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounced(searchQuery, 300);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modifiedRows, setModifiedRows] = useState({}); // { [inventory_id]: { field: value } }

  // pagination (table only)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // SIMPLE FILTERS
  const [selectedCategories, setSelectedCategories] = useState([]); // [] means All
  const [selectedType, setSelectedType] = useState(""); // "" means All
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedBatchItemName, setSelectedBatchItemName] = useState("");
  const [batchIssues, setBatchIssues] = useState([]);
  const [batchIssuesLoading, setBatchIssuesLoading] = useState(false);

  // derive unique sets
  const { uniqueCategories, uniqueTypes } = useMemo(() => {
    const cats = new Set();
    const types = new Set();
    for (const r of inventory) {
      if (r.category) cats.add(String(r.category));
      if (r.item_type) types.add(String(r.item_type));
    }
    return {
      uniqueCategories: Array.from(cats).sort((a, b) => a.localeCompare(b)),
      uniqueTypes: ["", ...Array.from(types).sort((a, b) => a.localeCompare(b))], // "" => All
    };
  }, [inventory]);

  // load permissions + data
  useEffect(() => {
    setCanEdit(true); // Edit enabled for all users
  }, []);

  useEffect(() => {
    if (propertyId) fetchInventory();
  }, [propertyId]);

  const fetchInventory = async () => {
    setLoadingInventory(true);
    try {
      const inventoryRes = await fetch(`${API_BASE}/inventory/property/${propertyId}`);

      if (!inventoryRes.ok) {
        throw new Error("Failed to load inventory");
      }

      const data = await inventoryRes.json();

      const sourceRows = Array.isArray(data?.inventory) ? data.inventory : [];

      const rows = sourceRows.flatMap((r, idx) => {
        const limit = safeNumber(r.limit_quantity);
        const used = safeNumber(r.used_quantity);
        const baseType = normalizeType(r.item_type || "general");
        const totalCost = safeNumber(r.material_cost);

        if (
          baseType !== "customer_add_on" &&
          baseType !== "avenue_add_on" &&
          used > limit
        ) {
          const plannedUsed = limit;
          const overflowQty = used - limit;
          const overflowCost =
            used > 0 ? (totalCost * overflowQty) / used : 0;
          const plannedCost = totalCost - overflowCost;

          return [
            {
              ...r,
              source_item_name: r.item,
              limit_quantity: limit,
              used_quantity: plannedUsed,
              remaining_material: limit - plannedUsed,
              item_type: "general",
              material_cost: plannedCost,
            },
            {
              ...r,
              inventory_id: `${r.inventory_id}__avenue_overflow`,
              item: `${r.item} (Avenue Add-On)`,
              source_item_name: r.item,
              limit_quantity: overflowQty,
              used_quantity: overflowQty,
              remaining_material: 0,
              item_type: "avenue_add_on",
              material_cost: overflowCost,
            },
          ];
        }

        const derivedType =
          baseType === "customer_add_on" || baseType === "avenue_add_on"
            ? baseType
            : used > limit
              ? "avenue_add_on"
              : "general";

        return [{
          ...r,
          source_item_name: r.item,
          limit_quantity: limit,
          used_quantity: used,
          remaining_material: limit - used,
          item_type: derivedType,
          material_cost: totalCost,
        }];
      });

      setInventory(rows);
      setPage(0);
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: err.message,
        severity: "error",
      });
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      setSnackbar({
        open: true,
        message: "Only Excel files (.xls, .xlsx) are allowed.",
        severity: "error",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);

      const response = await fetch(
        `${API_BASE}/inventory/property/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok)
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);

      setSnackbar({
        open: true,
        message: "Inventory uploaded successfully!",
        severity: "success",
      });
      await fetchInventory();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: "error",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSortChange = (field) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortField(field);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  const openBatchIssuesForItem = async (itemName) => {
    const rawName = String(itemName || "").trim();
    if (!rawName) return;
    const cleanedName = rawName.replace(/\s*\(Avenue Add-On\)\s*$/i, "").trim();

    setSelectedBatchItemName(cleanedName);
    setBatchDialogOpen(true);
    setBatchIssuesLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/batch-issues-by-item?item_name=${encodeURIComponent(cleanedName)}`
      );
      if (!res.ok) throw new Error("Failed to load batch issues");
      const data = await res.json();
      const batches = Array.isArray(data?.batches) ? data.batches : [];
      const targetProperty = normalizePropertyToken(propertyId);

      const matchesCurrentProperty = (value) => {
        const v = normalizePropertyToken(value);
        if (!v || !targetProperty) return false;
        return v === targetProperty || v.includes(targetProperty) || targetProperty.includes(v);
      };

      const filteredBatches = batches
        .map((batch) => {
          const issueDetails = Array.isArray(batch?.issue_details) ? batch.issue_details : [];
          const filteredDetails = issueDetails.filter((issue) =>
            matchesCurrentProperty(issue?.property_name || issue?.property_id)
          );

          const propertyNamesFromDetails = Array.from(
            new Set(filteredDetails.map((x) => x?.property_name).filter(Boolean))
          );
          const projectNamesFromDetails = Array.from(
            new Set(filteredDetails.map((x) => x?.project_name).filter(Boolean))
          );
          const issuedDatesFromDetails = Array.from(
            new Set(filteredDetails.map((x) => x?.issue_date || x?.issue_datetime).filter(Boolean))
          );
          const totalIssuedFromDetails = filteredDetails.reduce(
            (sum, x) => sum + safeNumber(x?.quantity, 0),
            0
          );

          const propertyNames = Array.isArray(batch?.property_names)
            ? batch.property_names.filter((name) => matchesCurrentProperty(name))
            : [];

          return {
            ...batch,
            issue_details: filteredDetails,
            property_names: propertyNamesFromDetails.length > 0 ? propertyNamesFromDetails : propertyNames,
            project_names: projectNamesFromDetails.length > 0 ? projectNamesFromDetails : (batch?.project_names || []),
            issued_dates: issuedDatesFromDetails.length > 0 ? issuedDatesFromDetails : (batch?.issued_dates || []),
            total_issued_quantity:
              filteredDetails.length > 0 ? totalIssuedFromDetails : safeNumber(batch?.total_issued_quantity, 0),
          };
        })
        .filter((batch) => {
          const hasDetails = Array.isArray(batch.issue_details) && batch.issue_details.length > 0;
          const hasPropertyNames = Array.isArray(batch.property_names) && batch.property_names.length > 0;
          return hasDetails || hasPropertyNames;
        });

      setBatchIssues(filteredBatches);
    } catch (err) {
      console.error("Batch issues fetch failed:", err);
      setBatchIssues([]);
      setSnackbar({
        open: true,
        message: "Failed to load batch issues for selected item.",
        severity: "error",
      });
    } finally {
      setBatchIssuesLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const rows = filtered.map((row) => {
      const rowId = row.inventory_id != null ? String(row.inventory_id) : null;
      const edited = rowId ? (modifiedRows[rowId] || {}) : {};
      const values = { ...row, ...edited };
      const limit = safeNumber(values.limit_quantity, 0);
      const used = safeNumber(values.used_quantity, 0);
      const remaining = limit - used;

      return {
        Item: row.item || "",
        Unit: row.unit || "",
        Category: values.category || "",
        "Limit Qty": limit,
        "Used Qty": used,
        Remaining: remaining,
        Type: String(values.item_type || "")
          .replaceAll("_", " ")
          .toUpperCase(),
        "Material Cost (INR)": safeNumber(values.material_cost, 0),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fileName = `Inventory_${propertyId || "property"}_${stamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleFieldChange = (inventoryId, field, raw) => {
    if (inventoryId == null || inventoryId === "") {
      console.error("Invalid inventory_id:", inventoryId);
      return;
    }

    const key = String(inventoryId);

    let value = raw;
    if (
      field === "limit_quantity" ||
      field === "used_quantity" ||
      field === "material_cost"
    ) {
      value =
        raw === ""
          ? ""
          : isNaN(Number(raw))
          ? raw
          : Number(raw);
    }

    setModifiedRows((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
          inventory_id: inventoryId,
        },
      };
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    const updates = Object.entries(modifiedRows)
      .map(([inventoryIdKey, u]) => {
        const id =
          u.inventory_id != null ? u.inventory_id : inventoryIdKey;

        if (id == null || id === "") {
          console.warn(
            "Skipping update with invalid inventory_id:",
            inventoryIdKey
          );
          return null;
        }

        const originalRow = inventory.find(
          (r) => String(r.inventory_id) === String(id)
        );
        if (!originalRow) {
          console.warn("Original row not found for inventory_id:", id);
          return null;
        }

        const update = { inventory_id: id };
        let hasChanges = false;

        if (u.limit_quantity !== undefined) {
          const newValue =
            u.limit_quantity === ""
              ? originalRow?.limit_quantity ?? 0
              : safeNumber(
                  u.limit_quantity,
                  originalRow?.limit_quantity ?? 0
                );
          const originalValue = safeNumber(
            originalRow.limit_quantity,
            0
          );

          if (newValue !== originalValue) {
            update.limit_quantity = newValue;
            hasChanges = true;
          }
        }

        if (u.used_quantity !== undefined) {
          const newValue =
            u.used_quantity === ""
              ? originalRow?.used_quantity ?? 0
              : safeNumber(
                  u.used_quantity,
                  originalRow?.used_quantity ?? 0
                );
          const originalValue = safeNumber(
            originalRow.used_quantity,
            0
          );

          if (newValue !== originalValue) {
            update.used_quantity = newValue;
            hasChanges = true;
          }
        }

        if (u.material_cost !== undefined) {
          const newValue =
            u.material_cost === ""
              ? originalRow?.material_cost ?? 0
              : safeNumber(
                  u.material_cost,
                  originalRow?.material_cost ?? 0
                );
          const originalValue = safeNumber(
            originalRow.material_cost,
            0
          );

          if (newValue !== originalValue) {
            update.material_cost = newValue;
            hasChanges = true;
          }
        }

        if (u.category !== undefined) {
          const newValue = String(u.category ?? "").trim();
          const originalValue = String(originalRow.category ?? "").trim();
          if (newValue !== originalValue) {
            update.category = newValue;
            hasChanges = true;
          }
        }

        return hasChanges ? update : null;
      })
      .filter((update) => update !== null);

    if (updates.length === 0) {
      setSnackbar({
        open: true,
        message: "No changes to save.",
        severity: "info",
      });
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/inventory/property/batch-update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error("Failed to save changes");

      setSnackbar({
        open: true,
        message: "Changes saved successfully!",
        severity: "success",
      });
      await fetchInventory();
      setModifiedRows({});
      setEditMode(false);
    } catch (err) {
      console.error("Error saving changes:", err);
      setSnackbar({
        open: true,
        message: err.message,
        severity: "error",
      });
    }
  };

  // filter + sort
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let rows = inventory;

    if (q) {
      rows = rows.filter(
        (item) =>
          ["item", "unit", "category", "item_type"].some((k) =>
            String(item[k] ?? "")
              .toLowerCase()
              .includes(q)
          ) ||
          [
            "limit_quantity",
            "used_quantity",
            "remaining_material",
            "material_cost",
          ].some((k) =>
            String(item[k] ?? "")
              .toLowerCase()
              .includes(q)
          )
      );
    }

    if (selectedCategories.length > 0) {
      const catSet = new Set(selectedCategories);
      rows = rows.filter((r) => catSet.has(String(r.category)));
    }

    if (selectedType) {
      rows = rows.filter(
        (r) => String(r.item_type) === selectedType
      );
    }

    if (sortField) {
      const dir = sortOrder === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const A = a[sortField];
        const B = b[sortField];
        if (A == null && B == null) return 0;
        if (A == null) return -1 * dir;
        if (B == null) return 1 * dir;
        if (typeof A === "number" && typeof B === "number")
          return (A - B) * dir;
        return (
          String(A).localeCompare(String(B)) * dir
        );
      });
    }
    return rows;
  }, [
    inventory,
    debouncedQuery,
    sortField,
    sortOrder,
    selectedCategories,
    selectedType,
  ]);

  // KPI totals – sum only the filtered items (category + type + search)
  const kpiTotals = useMemo(() => {
    let totalLimit = 0;
    let totalUsed = 0;
    let totalCost = 0;
    for (const row of filtered) {
      const rowId = row.inventory_id != null ? String(row.inventory_id) : null;
      const edited = rowId ? (modifiedRows[rowId] || {}) : {};
      const limit = safeNumber(edited.limit_quantity ?? row.limit_quantity, 0);
      const used = safeNumber(edited.used_quantity ?? row.used_quantity, 0);
      const cost = safeNumber(edited.material_cost ?? row.material_cost, 0);
      totalLimit += limit;
      totalUsed += used;
      totalCost += cost;
    }
    return {
      totalLimit,
      totalUsed,
      totalRemaining: totalLimit - totalUsed,
      totalCost,
    };
  }, [filtered, modifiedRows]);

  useEffect(() => {
    if (typeof onTotalsChange !== "function") return;
    const totalInventoryCost = inventory.reduce(
      (sum, row) => sum + safeNumber(row?.material_cost, 0),
      0
    );
    onTotalsChange({
      totalCost: totalInventoryCost,
      totalLimit: inventory.reduce((sum, row) => sum + safeNumber(row?.limit_quantity, 0), 0),
      totalUsed: inventory.reduce((sum, row) => sum + safeNumber(row?.used_quantity, 0), 0),
      rowCount: inventory.length,
    });
  }, [inventory, onTotalsChange]);

  // table slice
  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filtered.length / rowsPerPage) - 1
    );
    if (page > maxPage) setPage(0);
  }, [filtered.length, rowsPerPage]); // eslint-disable-line

  const renderKpiCards = () => {
    const hasFilters = !!debouncedQuery.trim() || selectedCategories.length > 0 || !!selectedType;
    const filterHint = hasFilters
      ? `Sum of ${filtered.length} filtered item(s)`
      : `Sum of all ${inventory.length} items`;

    const cards = [
      {
        icon: InventoryIcon,
        label: "Total Limit Qty",
        value: INR.format(kpiTotals.totalLimit),
        color: "#0f766e",
      },
      {
        icon: TrendingUpIcon,
        label: "Total Used Qty",
        value: INR.format(kpiTotals.totalUsed),
        color: "#0369a1",
      },
      {
        icon: AssignmentIcon,
        label: "Total Remaining",
        value: INR.format(kpiTotals.totalRemaining),
        color: kpiTotals.totalRemaining >= 0 ? "#16a34a" : "#dc2626",
      },
      {
        icon: AttachMoneyIcon,
        label: "Total Material Cost",
        value: `₹${INR.format(kpiTotals.totalCost)}`,
        color: "#7c3aed",
      },
    ];

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: { xs: 1.5, sm: 2 },
          mb: 2,
        }}
      >
        {cards.map(({ icon: Icon, label, value, color }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              bgcolor: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              transition: "box-shadow 0.2s",
              "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${color}18`, color, flexShrink: 0 }}>
                <Icon sx={{ fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {label}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
              {value}
            </Typography>
          </Paper>
        ))}
        <Typography sx={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b" }}>
          {filterHint}
        </Typography>
      </Box>
    );
  };

  const renderHeader = () => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
        alignItems: "center",
        gap: 2,
        mb: 2,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Inventory –{" "}
        <Typography
          component="span"
          sx={{ fontWeight: 500, color: "#6B7280" }}
        >
          {propertyId}
        </Typography>
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <TextField
          placeholder="Search item, unit, category..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            width: { xs: "100%", sm: 260 },
            backgroundColor: "#fff",
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#6B7280" }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Category Select (multi-select) */}
        <FormControl
          size="small"
          sx={{ minWidth: 200, backgroundColor: "#fff" }}
        >
          <InputLabel id="cat-label">Category</InputLabel>
          <Select
            labelId="cat-label"
            label="Category"
            multiple
            value={selectedCategories}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedCategories(typeof v === "string" ? v.split(",") : v);
              setPage(0);
            }}
            renderValue={(selected) =>
              selected.length === 0
                ? "All"
                : selected.length <= 2
                ? selected.join(", ")
                : `${selected.length} selected`
            }
          >
            {uniqueCategories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Type Select */}
        <FormControl
          size="small"
          sx={{ minWidth: 160, backgroundColor: "#fff" }}
        >
          <InputLabel id="type-label">Type</InputLabel>
          <Select
            labelId="type-label"
            label="Type"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(0);
            }}
          >
            {uniqueTypes.map((t) =>
              t === "" ? (
                <MenuItem key="all-type" value="">
                  All
                </MenuItem>
              ) : (
                <MenuItem key={t} value={t}>
                  {t.toString().replaceAll("_", " ").toUpperCase()}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>

        {/* Upload (disabled during edit) */}
        {!editMode && (
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={uploading}
            sx={{
              backgroundColor: "#2A3663",
              "&:hover": { backgroundColor: "#1E2A48" },
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
            <input
              type="file"
              accept=".xls,.xlsx"
              hidden
              onChange={handleFileChange}
            />
          </Button>
        )}

        <Tooltip title="Download Excel">
          <span>
            <IconButton
              aria-label="Download Excel"
              onClick={handleDownloadExcel}
              disabled={loadingInventory || filtered.length === 0}
              sx={{
                border: "1px solid #d1d5db",
                borderRadius: 1,
                bgcolor: "#fff",
                "&:hover": { bgcolor: "#f9fafb" },
              }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {/* Edit / Save */}
        {canEdit && !editMode && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditMode(true)}
          >
            Edit
          </Button>
        )}
        {canEdit && editMode && (
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CancelIcon />}
              onClick={() => {
                setEditMode(false);
                setModifiedRows({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={handleSaveChanges}
              disabled={Object.keys(modifiedRows).length === 0}
            >
              Save
            </Button>
          </>
        )}

        {/* Close */}
        <Button
          variant="outlined"
          onClick={onClose}
          color="error"
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
      </Box>
    </Box>
  );

  const renderTable = () => (
    <Paper
      sx={{
        mt: 2,
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      <TableContainer>
        <Table
          size="small"
          sx={{
            minWidth: 900,
            "& th": {
              fontSize: 12,
              fontWeight: 600,
              color: "#4B5563",
              backgroundColor: "#F9FAFB",
            },
            "& td": {
              fontSize: 12,
              color: "#111827",
            },
            "& td, & th": {
              border: "1px solid #E5E7EB",
              whiteSpace: "nowrap",
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  onClick={() => handleSortChange(c.key)}
                  sx={{
                    cursor: "pointer",
                    width: c.width,
                    minWidth: c.width,
                    textAlign: c.align || "left",
                  }}
                >
                  {c.label}
                  {sortField === c.key
                    ? sortOrder === "asc"
                      ? "  ↑"
                      : "  ↓"
                    : ""}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row) => {
              const rowIdKey =
                row.inventory_id != null
                  ? String(row.inventory_id)
                  : null;
              const edited = rowIdKey
                ? modifiedRows[rowIdKey] || {}
                : {};
              const values = { ...row, ...edited };
              const limit = safeNumber(values.limit_quantity, 0);
              const used = safeNumber(values.used_quantity, 0);
              const remaining = limit - used;

              return (
                <TableRow key={row.inventory_id} hover>
                  {/* Item */}
                  <TableCell sx={{ width: columns[0].width }}>
                    <Tooltip title="Click to view batch issues">
                      <Box
                        sx={{
                          maxWidth: columns[0].width,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          cursor: "pointer",
                          color: "#111827",
                        }}
                        onClick={() => openBatchIssuesForItem(row.source_item_name || row.item)}
                      >
                        {row.item}
                      </Box>
                    </Tooltip>
                  </TableCell>

                  {/* Unit */}
                  <TableCell align="center">
                    {row.unit}
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    {editMode ? (
                      <Box sx={{ minWidth: 180 }}>
                        <ItemTypeDropDown
                          label="Category"
                          value={values.category ?? row.category ?? ""}
                          onSelect={(value) =>
                            handleFieldChange(row.inventory_id, "category", value)
                          }
                        />
                      </Box>
                    ) : (
                      row.category
                    )}
                  </TableCell>

                  {/* Limit Qty */}
                  <TableCell align="right">
                    {editMode ? (
                      <TextField
                        size="small"
                        variant="standard"
                        type="number"
                        inputProps={{ step: "any" }}
                        value={
                          values.limit_quantity ??
                          row.limit_quantity ??
                          ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            row.inventory_id,
                            "limit_quantity",
                            e.target.value
                          )
                        }
                        sx={{ width: 120 }}
                      />
                    ) : (
                      INR.format(limit)
                    )}
                  </TableCell>

                  {/* Used Qty */}
                  <TableCell align="right">
                    {editMode ? (
                      <TextField
                        size="small"
                        variant="standard"
                        type="number"
                        inputProps={{ step: "any" }}
                        value={
                          values.used_quantity ??
                          row.used_quantity ??
                          ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            row.inventory_id,
                            "used_quantity",
                            e.target.value
                          )
                        }
                        sx={{ width: 120 }}
                      />
                    ) : (
                      INR.format(used)
                    )}
                  </TableCell>

                  {/* Remaining */}
                  <TableCell align="right">
                    {INR.format(remaining)}
                  </TableCell>

                  {/* Type */}
                  <TableCell align="center">
                    <Chip
                      label={(row.item_type || "")
                        .toString()
                        .replaceAll("_", " ")
                        .toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        borderColor:
                          String(row.item_type).toLowerCase() ===
                          "add_on"
                            ? "#8B5CF6"
                            : "#3B82F6",
                      }}
                    />
                  </TableCell>

                  {/* Material Cost */}
                  <TableCell align="right">
                    {editMode ? (
                      <TextField
                        size="small"
                        variant="standard"
                        type="number"
                        value={
                          values.material_cost ??
                          row.material_cost ??
                          ""
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            row.inventory_id,
                            "material_cost",
                            e.target.value
                          )
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              ₹
                            </InputAdornment>
                          ),
                        }}
                        sx={{ width: 150 }}
                      />
                    ) : (
                      `₹${INR.format(values.material_cost)}`
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {pagedRows.length === 0 && !loadingInventory && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 15, 25, 50]}
        sx={{
          borderTop: "1px solid #E5E7EB",
          "& .MuiTablePagination-toolbar": {
            fontSize: 12,
          },
        }}
      />
    </Paper>
  );

  return (
    <Box
      sx={{
        position: "relative",
        p: { xs: 2, md: 3 },
        pb: { xs: 6, md: 7 },
        backgroundColor: "#F3F4F6",
        minHeight: "100vh",
      }}
    >
      {renderHeader()}

      {!loadingInventory && inventory.length > 0 && renderKpiCards()}

      {loadingInventory ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : (
        renderTable()
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar({ ...snackbar, open: false })
        }
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => setSnackbar({ ...snackbar, open: false })}
          >
            Close
          </Button>
        }
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar({ ...snackbar, open: false })
          }
          variant="filled"
          sx={{ minWidth: 400 }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, opacity: 0.95 }}>
              KPI: Items {inventory.length} | Used {INR.format(kpiTotals.totalUsed)} | Remaining {INR.format(kpiTotals.totalRemaining)}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
              {snackbar.message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      <Dialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            width: "95vw",
            height: { xs: "94vh", md: "90vh" },
            maxHeight: { xs: "94vh", md: "90vh" },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Batch Issues - {selectedBatchItemName || "Item"}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 1.25,
            height: "calc(100% - 64px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <BatchIssues
            batches={batchIssues}
            loading={batchIssuesLoading}
            hideProjectPropertyColumns
            maxHeight="100%"
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;
