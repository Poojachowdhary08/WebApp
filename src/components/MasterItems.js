// src/components/MasterItems.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  TablePagination,
  TableSortLabel,
  Tooltip,
  Button,
  Divider,
  LinearProgress,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select as MSelect,
  MenuItem as MMenuItem,
  Grid,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";

import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import BulkMasterRenameDialog from "./BulkMasterRenameDialog";

/* ---------- Helpers ---------- */
const asINR = (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "-");

const normalizeSpaces = (s) => (s || "").trim().replace(/\s+/g, " ");
const isAllCapsWordy = (s) => {
  const t = normalizeSpaces(s);
  return t.length > 3 && /[A-Z]/.test(t) && t === t.toUpperCase();
};
const toTitleCase = (s) =>
  normalizeSpaces(s)
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
const prettifyTypeLabel = (s) => {
  const t = normalizeSpaces(s);
  if (!t) return "";
  return isAllCapsWordy(t) ? toTitleCase(t) : t;
};
const pickBetterLabel = (existing, candidate) => {
  const a = prettifyTypeLabel(existing);
  const b = prettifyTypeLabel(candidate);
  if (!a) return b;
  if (!b) return a;
  const aShout = isAllCapsWordy(existing);
  const bShout = isAllCapsWordy(candidate);
  if (aShout && !bShout) return b;
  if (!aShout && bShout) return a;
  if (a.length !== b.length) return a.length < b.length ? a : b;
  return a;
};

const formatDDMMYYYY = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);
const toCamelCase = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
const ellipsize = (s, n = 28) => {
  const t = String(s || "");
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
};

// ✅ Card view fixed page size
const CARDS_PER_PAGE = 12;

/* ---------- Create Dialog (unchanged behavior) ---------- */
function CreateItemDialog({ open, defaultName, onClose, onCreated }) {
  const [form, setForm] = useState({
    item_name: defaultName ?? "",
    item_type: "",
    base_price: "",
  });
  const [saving, setSaving] = useState(false);
  const [itemTypeOptions, setItemTypeOptions] = useState([]);
  const [isTypesLoading, setIsTypesLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        item_name: defaultName ?? "",
        item_type: "",
        base_price: "",
      });
    }
  }, [defaultName, open]);

  useEffect(() => {
    let isMounted = true;

    async function fetchItemTypes() {
      try {
        setIsTypesLoading(true);
        const res = await axios.get("http://localhost:8080/get-all-item-types");
        const raw = res?.data?.item_types || [];

        const map = new Map();
        raw
          .filter((t) => typeof t === "string")
          .map((t) => normalizeSpaces(t))
          .filter(Boolean)
          .forEach((t) => {
            const key = t.toLowerCase();
            const prev = map.get(key) || "";
            map.set(key, pickBetterLabel(prev, t));
          });

        const cleaned = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
        if (isMounted) setItemTypeOptions(cleaned);
      } catch (e) {
        if (isMounted) setItemTypeOptions([]);
      } finally {
        if (isMounted) setIsTypesLoading(false);
      }
    }

    if (open) fetchItemTypes();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      await axios.post("http://localhost:8080/create-master-item", {
        item_name: (form.item_name || "").trim(),
        item_type: (form.item_type || "").trim() || null,
        base_price: form.base_price === "" ? null : Number.parseFloat(form.base_price),
      });

      setForm({ item_name: "", item_type: "", base_price: "" });
      onCreated?.();
      onClose?.();
    } catch (e) {
      console.error("Create failed", e);
      alert("Failed to create item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose?.()} fullWidth maxWidth="sm">
      <DialogTitle>Create Master Item</DialogTitle>
      <DialogContent dividers>
        <Box display="grid" gap={2} mt={1}>
          <TextField
            label="Item Name"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            disabled={saving}
            autoFocus
          />

          <FormControl fullWidth>
            <InputLabel id="item-type-label">Item Type</InputLabel>
            <MSelect
              labelId="item-type-label"
              label="Item Type"
              value={form.item_type}
              onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              disabled={isTypesLoading || saving}
              sx={{ height: 44 }}
            >
              {itemTypeOptions.map((type) => (
                <MMenuItem key={type} value={type}>
                  {toCamelCase(type)}
                </MMenuItem>
              ))}
            </MSelect>
          </FormControl>

          <TextField
            label="Base Price (₹)"
            type="number"
            value={form.base_price}
            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            disabled={saving}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => !saving && onClose?.()} disabled={saving} startIcon={<CloseIcon />}>
          Cancel
        </Button>
        <Button variant="contained" disabled={saving || !(form.item_name || "").trim()} onClick={handleSave}>
          {saving ? "Creating..." : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Main Component ---------- */
export default function MasterItems({ refreshKey = 0, onOpenItemDetails }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("item_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rowsPerPage, setRowsPerPage] = useState(50); // table only
  const [page, setPage] = useState(0);

  // View mode (list/cards)
  const [viewMode, setViewMode] = useState("list");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkRenameOpen, setBulkRenameOpen] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProgress({ current: 0, total: 0 });

      const useItemTypeEndpoint = itemTypeFilter && itemTypeFilter !== "ALL";
      const baseUrl = useItemTypeEndpoint
        ? `http://localhost:8080/get-all-masteritems/${encodeURIComponent(itemTypeFilter)}`
        : "http://localhost:8080/get-all-masteritems-new-non-paginated";

      const firstResponse = await axios.get(baseUrl, { params: { limit: 100, offset: 0 } });
      const firstData = firstResponse.data;

      let allItems = firstData.items || [];
      const total = firstData.total || (firstData.items ? firstData.items.length : 0);
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      setItems(allItems);
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

          for (let p = batchStart; p <= batchEnd; p++) {
            const offset = p * limit;
            batchPromises.push(
              axios.get(baseUrl, { params: { limit, offset } }).then((response) => ({
                page: p,
                items: response.data.items || [],
              }))
            );
          }

          allBatchPromises.push(
            Promise.all(batchPromises).then((batchResults) => {
              batchResults.forEach(({ page, items: pageItems }) => pageResults.set(page, pageItems));
              setLoadingProgress({ current: pageResults.size + 1, total: totalPages });
              return batchResults;
            })
          );
        }

        await Promise.all(allBatchPromises);

        const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
        sortedPages.forEach((pageNum) => {
          const pageItems = pageResults.get(pageNum);
          if (Array.isArray(pageItems)) allItems = [...allItems, ...pageItems];
        });
      }

      setItems(allItems);
      setLoadingProgress({ current: 0, total: 0 });
    } catch (e) {
      console.error("❌ Failed to load items:", e);
      setItems([]);
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  }, [itemTypeFilter]);

  // ✅ reload when parent refreshKey changes (after update/delete/reload)
  useEffect(() => {
    loadItems();
  }, [loadItems, refreshKey]);

  const itemTypeOptions = useMemo(() => {
    const map = new Map();
    items
      .map((it) => normalizeSpaces(it.item_type || ""))
      .filter(Boolean)
      .forEach((t) => {
        const key = t.toLowerCase();
        const prev = map.get(key) || "";
        map.set(key, pickBetterLabel(prev, t));
      });

    const list = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    return ["ALL", ...list];
  }, [items]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = items;

    if (q) {
      filtered = filtered.filter(
        (it) =>
          (it.item_name || "").toLowerCase().includes(q) ||
          (it.item_type || "").toLowerCase().includes(q) ||
          String(it.id).toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const av = a?.[sortBy] ?? "";
      const bv = b?.[sortBy] ?? "";
      if (av === bv) return 0;
      const res = av > bv ? 1 : -1;
      return sortOrder === "asc" ? res : -res;
    });

    return sorted;
  }, [items, searchQuery, sortBy, sortOrder]);

  // ✅ unified page size depends on viewMode
  const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;

  const paged = useMemo(() => {
    const start = page * effectiveRowsPerPage;
    return filteredSorted.slice(start, start + effectiveRowsPerPage);
  }, [filteredSorted, page, effectiveRowsPerPage]);

  const handleSort = (col) => {
    setSortBy(col);
    setSortOrder((o) => (sortBy === col ? (o === "asc" ? "desc" : "asc") : "asc"));
  };

  // Download Excel (Filtered + Sorted) — same behavior as Stock / InventoryList
  const exportExcel = useCallback(async () => {
    try {
      setDownloadingExcel(true);
      const rows = (filteredSorted || []).map((it) => ({
        ID: it.id,
        "Item Name": it.item_name ?? "",
        Type: prettifyTypeLabel(it.item_type ?? "") || "",
        "Base (₹)": typeof it.base_price === "number" ? it.base_price : "",
        "Present (₹)": typeof it.present_price === "number" ? it.present_price : "",
        Created: formatDDMMYYYY(it.effective_from),
        "Added By": it.emp_id ? it.emp_id.split("@")[0] : "",
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [
        { wch: 10 },
        { wch: 28 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Master Items");
      const typeTag = itemTypeFilter && itemTypeFilter !== "ALL" ? `Type-${itemTypeFilter}` : "AllTypes";
      const searchTag = searchQuery.trim() ? `Search-${searchQuery.trim()}` : "NoSearch";
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const fileName = `MasterItems_${typeTag}_${searchTag}_${yyyy}-${mm}-${dd}.xlsx`
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
  }, [filteredSorted, searchQuery, itemTypeFilter]);

  // reset page whenever filters/sort/view changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, itemTypeFilter, rowsPerPage, sortBy, sortOrder, viewMode]);

  const BORDER = "1px solid #E2E8F0";
  const HEAD_BG = "#F8FAFC";
  const HEAD_TXT = "#334155";

  const renderViewToggle = () => (
    <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
      <ToggleButtonGroup
        exclusive
        value={viewMode}
        onChange={(_e, next) => {
          if (!next) return;
          setViewMode(next);
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
        {paged.map((it) => {
          const typeLabel = prettifyTypeLabel(it.item_type || "") || "—";
          const created = formatDDMMYYYY(it.effective_from);
          const emp = it.emp_id ? it.emp_id.split("@")[0] : "—";

          return (
            // ✅ 4 cards per row on desktop: lg=3, md=3
            <Grid item xs={12} sm={6} md={3} lg={3} key={String(it.id)}>
              <Paper
                elevation={0}
                sx={{
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
                  cursor: "pointer",
                }}
                onClick={() => onOpenItemDetails?.(it)}
              >
                <Box sx={{ p: 2 }}>
                  {/* Header */}
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
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
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                          ID: {safe(it.id)}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: "#111827",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 220,
                          }}
                          title={safe(it.item_name, "")}
                        >
                          {safe(it.item_name, "Unknown")}
                        </Typography>

                        <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }} title={typeLabel}>
                          {ellipsize(typeLabel, 26)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Tooltip title="Open">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenItemDetails?.(it);
                        }}
                        sx={{
                          border: "1px solid #E5E7EB",
                          bgcolor: "#fff",
                          borderRadius: 2,
                          "&:hover": { bgcolor: "#F9FAFB" },
                        }}
                      >
                        <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Stats */}
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Base</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                        {asINR(it.base_price)}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Present</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                        {asINR(it.present_price)}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Created</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {created}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Added By</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {emp}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                    <Chip
                      size="small"
                      label={typeLabel}
                      sx={{
                        height: 24,
                        fontSize: 11.5,
                        borderRadius: "999px",
                        bgcolor: "#EEF2FF",
                        color: "#1E40AF",
                        fontWeight: 900,
                      }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      size="small"
                      label="MASTER"
                      sx={{
                        height: 24,
                        fontSize: 11.5,
                        borderRadius: "999px",
                        bgcolor: "#ECFDF5",
                        color: "#047857",
                        fontWeight: 900,
                        border: "1px solid #A7F3D0",
                      }}
                    />
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {paged.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography>No matching items.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ✅ Cards pagination: fixed 12 per page */}
      <TablePagination
        component="div"
        rowsPerPageOptions={[CARDS_PER_PAGE]}
        count={filteredSorted.length}
        page={page}
        rowsPerPage={CARDS_PER_PAGE}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={() => {}}
        labelRowsPerPage="Items per page:"
        sx={{ mt: 1 }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2, backgroundColor: "#F7F9FC", borderRadius: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 1.25,
          mb: 0.5,
          marginTop: "-30px",
        }}
      >
        <Typography variant="h6" fontWeight={900} sx={{ color: "#172B4D" }}>
          {/* Master Items */}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: isMobile ? "100%" : "auto",
            flexWrap: "wrap",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search items…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{
              width: isMobile ? "100%" : 280,
              backgroundColor: "#fff",
              "& .MuiOutlinedInput-root": { borderRadius: "18px", height: 40 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <Select
            value={itemTypeFilter}
            onChange={(e) => {
              setItemTypeFilter(e.target.value);
              setPage(0);
            }}
            size="small"
            displayEmpty
            sx={{
              width: isMobile ? "100%" : 190,
              backgroundColor: "#fff",
              borderRadius: "18px",
              height: 40,
              "& .MuiOutlinedInput-notchedOutline": { borderRadius: "5px" },
            }}
          >
            {itemTypeOptions.map((type) => (
              <MenuItem key={type} value={type}>
                {type === "ALL" ? toCamelCase("All Types") : toCamelCase(type)}
              </MenuItem>
            ))}
          </Select>

          {/* ✅ view toggle */}
          {renderViewToggle()}

          <Tooltip title="Download Excel (Filtered + Sorted)">
            <span>
              <Button
                onClick={exportExcel}
                size="small"
                disabled={downloadingExcel || loading || filteredSorted.length === 0}
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

          <Tooltip title="Bulk rename from Excel (multi-sheet) — preview, then master + stock">
            <IconButton
              onClick={() => setBulkRenameOpen(true)}
              size="small"
              sx={{
                height: 40,
                width: 40,
                border: "1px solid #E5E7EB",
                borderRadius: "2px",
                bgcolor: "#fff",
                color: "#2563EB",
                "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" },
              }}
              aria-label="Bulk rename from Excel"
            >
              <DriveFileRenameOutlineIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ height: 40, borderRadius: "2px" }}
            onClick={() => setCreateOpen(true)}
          >
            Master Item
          </Button>
        </Box>
      </Box>

      {/* Loading */}
      {loading && items.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 8, gap: 2 }}>
          <CircularProgress />
          {loadingProgress.total > 0 && (
            <Box sx={{ width: "100%", maxWidth: 420 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                Loading items... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
              <LinearProgress variant="determinate" value={(loadingProgress.current / loadingProgress.total) * 100} />
            </Box>
          )}
        </Box>
      ) : (
        <>
          {loadingProgress.total > 0 && loadingProgress.current < loadingProgress.total && (
            <Box sx={{ mb: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block", textAlign: "center" }}
              >
                Loading more... {loadingProgress.current} / {loadingProgress.total} pages
              </Typography>
            </Box>
          )}

          {viewMode === "cards" ? (
            renderCards()
          ) : (
            <Paper
              sx={{
                overflow: "hidden",
                borderRadius: 2,
                border: BORDER,
                background: "#fff",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <TableContainer sx={{ maxHeight: "70vh" }}>
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    "& .MuiTableCell-root": {
                      borderBottom: BORDER,
                      borderRight: BORDER,
                      whiteSpace: "nowrap",
                      py: 1,
                      px: 1.25,
                      fontSize: 13,
                    },
                    "& .MuiTableRow-root > *:last-child": { borderRight: "none" },
                    "& .MuiTableRow-root:last-child > *": { borderBottom: "none" },
                    "& tbody tr": { cursor: "pointer" },
                    "& tbody tr:hover td": { backgroundColor: "#F9FAFB" },
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ height: 42 }}>
                      {[
                        { id: "id", label: "ID" },
                        { id: "item_name", label: "ITEM NAME" },
                        { id: "item_type", label: "TYPE" },
                        { id: "base_price", label: "BASE (₹)" },
                        { id: "present_price", label: "PRESENT (₹)" },
                        { id: "effective_from", label: "CREATED" },
                        { id: "emp_id", label: "ADDED BY" },
                      ].map((col) => (
                        <TableCell
                          key={col.id}
                          sortDirection={sortBy === col.id ? sortOrder : false}
                          sx={{
                            bgcolor: HEAD_BG,
                            color: HEAD_TXT,
                            fontWeight: 900,
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            fontSize: 12.5,
                          }}
                        >
                          <TableSortLabel
                            active={sortBy === col.id}
                            direction={sortBy === col.id ? sortOrder : "asc"}
                            onClick={() => handleSort(col.id)}
                            sx={{
                              color: HEAD_TXT,
                              "&:hover": { color: "#0F172A" },
                              "& .MuiTableSortLabel-icon": {
                                color: "#94A3B8 !important",
                                opacity: 1,
                              },
                            }}
                          >
                            {col.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paged.length ? (
                      paged.map((it) => (
                        <TableRow
                          key={String(it.id)}
                          hover
                          onClick={() => onOpenItemDetails?.(it)}
                          sx={{ height: 42 }}
                        >
                          <TableCell>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{it.id}</Typography>
                          </TableCell>

                          <TableCell>
                            <Tooltip title={it.item_name || "-"}>
                              <Typography noWrap sx={{ fontSize: 13 }}>
                                {it.item_name || "-"}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 13 }}>
                              {prettifyTypeLabel(it.item_type || "-") || "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 13 }}>{asINR(it.base_price)}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 13 }}>{asINR(it.present_price)}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 13 }} noWrap>
                              {formatDDMMYYYY(it.effective_from)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 13 }} noWrap>
                              {it.emp_id ? it.emp_id.split("@")[0] : "-"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow sx={{ height: 44 }}>
                        <TableCell colSpan={7} align="center" sx={{ py: 2.5, borderRight: "none" }}>
                          <Typography sx={{ fontSize: 13 }}>No matching items.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              {/* Table pagination stays same */}
              <TablePagination
                component="div"
                rowsPerPageOptions={[50, 100, 150]}
                count={filteredSorted.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </Paper>
          )}
        </>
      )}

      <CreateItemDialog
        open={createOpen}
        defaultName={searchQuery}
        onClose={() => setCreateOpen(false)}
        onCreated={loadItems}
      />

      <BulkMasterRenameDialog
        open={bulkRenameOpen}
        onClose={() => setBulkRenameOpen(false)}
        onApplied={loadItems}
      />
    </Box>
  );
}
