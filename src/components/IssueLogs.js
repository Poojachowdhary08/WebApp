import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip,
  Grid,
  Divider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import axios from "axios";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

/* ---------------- helpers ---------------- */
const safe = (value, fallback = "—") =>
  value === null || value === undefined || value === "" ? fallback : value;

const formatDateDDMMYYYY = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB"); // ✅ dd/mm/yyyy
};

// Simple Title Case for labels (spaces only)
const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

/* ---------------- sorting helpers ---------------- */
const normalize = (v) => String(v ?? "").trim().toLowerCase();

const toCamelCase = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());

const SortArrow = ({ active, dir }) => {
  if (!active) return <span style={{ marginLeft: 6, opacity: 0.35 }}>⇅</span>;
  return (
    <span style={{ marginLeft: 6, fontWeight: 900, fontSize: 11, color: "#64748B" }}>
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
};

/* ---------------- card helpers ---------------- */
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

export default function IssueLogs({ viewMode: viewModeProp, onViewModeChange }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // ✅ Sorting state
  const [sortConfig, setSortConfig] = useState({ key: "issued_on", direction: "desc" });

  // ✅ View mode state (controlled optional)
  const [localViewMode, setLocalViewMode] = useState("list");
  const viewMode = viewModeProp || localViewMode;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress({ current: 0, total: 0 });

      const firstResponse = await axios.get("http://localhost:8080/issue-stock-logs", {
        params: { limit: 100, offset: 0 },
      });

      const firstData = firstResponse.data;
      let allLogs = firstData.logs || [];
      const total = firstData.total || 0;
      const limit = 100;
      const totalPages = Math.ceil(total / limit);

      // show first page immediately
      setLogs(allLogs);
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
              axios
                .get("http://localhost:8080/issue-stock-logs", { params: { limit, offset } })
                .then((response) => ({ page: p, logs: response.data.logs || [] }))
            );
          }

          allBatchPromises.push(
            Promise.all(batchPromises).then((batchResults) => {
              batchResults.forEach(({ page, logs }) => pageResults.set(page, logs));

              const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
              const mergedLogs = [];
              sortedPages.forEach((pageNum) => {
                const pageLogs = pageResults.get(pageNum);
                if (Array.isArray(pageLogs)) mergedLogs.push(...pageLogs);
              });

              const allMerged = [...(firstData.logs || []), ...mergedLogs];
              setLogs(allMerged);

              const completedCount = pageResults.size + 1;
              setLoadingProgress({ current: completedCount, total: totalPages });
            })
          );
        }

        await Promise.all(allBatchPromises);

        const sortedPages = Array.from(pageResults.keys()).sort((a, b) => a - b);
        sortedPages.forEach((pageNum) => {
          const pageLogs = pageResults.get(pageNum);
          if (Array.isArray(pageLogs)) allLogs = [...allLogs, ...pageLogs];
        });
      }

      setLogs(allLogs);
      setLoadingProgress({ current: 0, total: 0 });
    } catch (err) {
      setError(err?.message || "Unable to fetch issue logs. Please try again later.");
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const locationOptions = useMemo(() => {
    const seen = new Map();
    logs.forEach((log) => {
      const loc = (log.location || "").trim();
      if (!loc) return;
      const key = loc.toLowerCase();
      if (!seen.has(key)) seen.set(key, loc);
    });
    return ["ALL", ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const warehouseOptions = useMemo(() => {
    const seen = new Map();
    logs.forEach((log) => {
      const wh = (log.warehouse || "").trim();
      if (!wh) return;
      const key = wh.toLowerCase();
      if (!seen.has(key)) seen.set(key, wh);
    });
    return ["ALL", ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const locationMatch = locationFilter === "ALL" || normalize(log.location) === normalize(locationFilter);
      const warehouseMatch = warehouseFilter === "ALL" || normalize(log.warehouse) === normalize(warehouseFilter);

      const searchMatch =
        !query ||
        [log.item_name, log.issued_to, log.issued_by, log.request_id, log.location, log.warehouse]
          .map((field) => normalize(field))
          .some((text) => text.includes(query));

      return locationMatch && warehouseMatch && searchMatch;
    });
  }, [logs, locationFilter, warehouseFilter, search]);

  // ✅ sorted logs
  const sortedLogs = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return [...filteredLogs].sort((a, b) => {
      if (key === "issued_on") {
        const da = new Date(a.issued_on).getTime() || 0;
        const db = new Date(b.issued_on).getTime() || 0;
        return dir * (da - db);
      }

      if (key === "issued_quantity") {
        const na = Number(a.issued_quantity ?? 0);
        const nb = Number(b.issued_quantity ?? 0);
        return dir * (na - nb);
      }

      const av = normalize(a?.[key]);
      const bv = normalize(b?.[key]);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredLogs, sortConfig]);

  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedLogs.slice(start, start + rowsPerPage);
  }, [sortedLogs, page, rowsPerPage]);

  const resetFilters = () => {
    setSearch("");
    setLocationFilter("ALL");
    setWarehouseFilter("ALL");
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [locationFilter, warehouseFilter, rowsPerPage, sortConfig]);

  const filtersActive = useMemo(() => {
    const locationActive = locationFilter && locationFilter !== "ALL";
    const warehouseActive = warehouseFilter && warehouseFilter !== "ALL";
    return Boolean(search.trim() || locationActive || warehouseActive);
  }, [search, locationFilter, warehouseFilter]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      // sensible defaults
      const defaultDir = key === "issued_on" ? "desc" : "asc";
      return { key, direction: defaultDir };
    });
  };

  const handleViewModeChange = (next) => {
    if (!next) return;
    if (onViewModeChange) onViewModeChange(next);
    setLocalViewMode(next);
  };

  const renderViewToggle = () => (
    <Tooltip title={viewMode === "list" ? "List view" : "Card view"}>
      <ToggleButtonGroup
        exclusive
        value={viewMode}
        onChange={(_e, next) => handleViewModeChange(next)}
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

  /* ---------------- table styles: FULL grid ---------------- */
  const GRID = "1px solid #E5E7EB";
  const GRID_BORDER = "1px solid #E5E7EB";
  const HEADER_BG = "#F8FAFC";

  const headerCellSx = {
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
    cursor: "pointer",
  };

  const bodyCellSx = {
    fontSize: 12.5,
    color: "#111827",
    whiteSpace: "nowrap",
    py: 1,
    px: 1.25,
    border: GRID,
  };

  /* ---------------- card view ---------------- */
  const maxIssuedQtyInFiltered = useMemo(() => {
    if (!sortedLogs.length) return 0;
    return sortedLogs.reduce((m, x) => Math.max(m, Number(x.issued_quantity ?? 0)), 0);
  }, [sortedLogs]);

  const statusChipSx = {
    backgroundColor: "#D1FAE5",
    color: "#047857",
    border: "1.5px solid #34D399",
    fontWeight: 900,
    borderRadius: "999px",
    height: 30,
    "& .MuiChip-label": { px: 2, letterSpacing: 0.3 },
  };

  const renderCards = () => (
    <Box>
      <Grid container spacing={2}>
        {paginatedLogs.map((log) => {
          const reqId = safe(log.request_id, safe(log.batch_id, "—"));
          const itemName = safe(log.item_name, "Unknown");
          const issuedTo = safe(log.issued_to, safe(log.issued_by, "—"));
          const location = safe(log.location, "—");
          const warehouse = safe(log.warehouse, "—");
          const qty = Number(log.issued_quantity ?? 0);
          const issuedOn = formatDateDDMMYYYY(log.issued_on);

          const denom = maxIssuedQtyInFiltered || 1;
          const pct = Math.max(0, Math.min(100, (qty / denom) * 100));

          return (
            <Grid item xs={12} sm={6} md={4} lg={4} key={`${log.batch_id}-${log.request_id}-${log.issued_on}`}>
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
                }}
              >
                {/* Header */}
                <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  {/* left thumbnail placeholder like screenshot */}
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
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280", letterSpacing: 0.3 }}
                      title={String(reqId)}
                    >
                      {String(reqId)}
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
                      title={String(issuedTo)}
                    >
                      {ellipsize(capWords(issuedTo), 28)}
                    </Typography>
                  </Box>

                  {/* Right action icon (pure UI, doesn't break functionality) */}
                  <Tooltip title="View">
                    <IconButton
                      size="small"
                      sx={{
                        border: "1px solid #E5E7EB",
                        bgcolor: "#fff",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#F9FAFB" },
                      }}
                      onClick={() => {
                        // Keeping behavior safe: no new dialogs added.
                        // If you later want: open a detail dialog for this log.
                      }}
                    >
                      <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Divider />

                {/* Stats row like screenshot */}
                <Box sx={{ px: 2, pt: 1.6 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Issued Qty</Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                        {Number.isFinite(qty) ? qty : safe(log.issued_quantity, 0)}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Warehouse</Typography>
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
                        {ellipsize(capWords(warehouse), 14)}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Issued On</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {issuedOn}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} sx={{ mt: 1.4 }} alignItems="center">
                    {location !== "—" && (
                      <Chip
                        size="small"
                        label={titleCase(String(location))}
                        sx={{
                          height: 24,
                          fontSize: 11.5,
                          borderRadius: "999px",
                          bgcolor: "#EEF2FF",
                          color: "#1E40AF",
                          fontWeight: 800,
                        }}
                      />
                    )}
                    {warehouse !== "—" && (
                      <Chip
                        size="small"
                        label={titleCase(String(warehouse))}
                        sx={{
                          height: 24,
                          fontSize: 11.5,
                          borderRadius: "999px",
                          bgcolor: "#FEF3C7",
                          color: "#92400E",
                          fontWeight: 800,
                        }}
                      />
                    )}

                    <Box sx={{ flex: 1 }} />

                    <Chip label="ISSUED" size="small" sx={statusChipSx} />
                  </Stack>
                </Box>

                <Divider sx={{ mt: 1.6 }} /> 

          
              </Paper>
            </Grid>
          );
        })}

        {paginatedLogs.length === 0 && (
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
              <Typography variant="body2">No logs match the current filters.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* ✅ keep pagination in card view too */}
      <TablePagination
        component="div"
        rowsPerPageOptions={[15, 50, 100, 150]}
        count={sortedLogs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        sx={{ "& .MuiTablePagination-toolbar": { minHeight: 44 }, mt: 1 }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2, borderRadius: 2, backgroundColor: "#F3F4F6", marginTop: "-35px" }}>
      {/* ✅ Top controls pinned to RIGHT */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        alignItems="center"
        flexWrap="wrap"
        mb={1.5}
      >
        <TextField
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          size="small"
          placeholder="Search"
          sx={{
            width: 260,
            backgroundColor: "#fff",
            borderRadius: "10px",
            "& .MuiOutlinedInput-root": { height: 38, borderRadius: "10px" },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "#6B7280" }} />
              </InputAdornment>
            ),
          }}
        />

        <Select
          value={locationFilter}
          onChange={(event) => {
            setLocationFilter(event.target.value);
            setPage(0);
          }}
          size="small"
          sx={{
            width: 200,
            backgroundColor: "#fff",
            borderRadius: "10px",
            height: 38,
            "& .MuiOutlinedInput-notchedOutline": { borderRadius: "10px" },
          }}
        >
          {locationOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === "ALL" ? toCamelCase("All Locations") : toCamelCase(opt)}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={warehouseFilter}
          onChange={(event) => {
            setWarehouseFilter(event.target.value);
            setPage(0);
          }}
          size="small"
          sx={{
            width: 200,
            backgroundColor: "#fff",
            borderRadius: "10px",
            height: 38,
            "& .MuiOutlinedInput-notchedOutline": { borderRadius: "10px" },
          }}
        >
          {warehouseOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt === "ALL" ? toCamelCase("All Warehouses") : toCamelCase(opt)}
            </MenuItem>
          ))}
        </Select>

        <Tooltip title="Refresh logs">
          <span>
            <Button
              onClick={fetchLogs}
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              sx={{
                height: 38,
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 800,
                backgroundColor: "#fff",
              }}
            >
              Refresh
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Clear filters">
          <span>
            <Button
              onClick={resetFilters}
              size="small"
              variant="outlined"
              disabled={!filtersActive}
              startIcon={<CloseIcon />}
              sx={{
                height: 38,
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 800,
                backgroundColor: "#fff",
              }}
            >
              Clear
            </Button>
          </span>
        </Tooltip>

        {/* ✅ view toggle */}
        {renderViewToggle()}
      </Stack>

      {/* Loading only when nothing yet */}
      {loading && logs.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
          <CircularProgress size={28} />
          {loadingProgress.total > 0 && (
            <Box sx={{ width: "100%", maxWidth: 420 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                Loading logs... {loadingProgress.current} / {loadingProgress.total} pages
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
            <Box sx={{ mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(loadingProgress.current / loadingProgress.total) * 100}
                sx={{ height: 3, borderRadius: 999 }}
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

          {error ? (
            <Paper sx={{ p: 3, backgroundColor: "#fff5f5", borderRadius: 2 }}>
              <Typography color="error" textAlign="center">
                {error}
              </Typography>
            </Paper>
          ) : filteredLogs.length === 0 ? (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography textAlign="center">No logs match the current filters.</Typography>
            </Paper>
          ) : viewMode === "cards" ? (
            renderCards()
          ) : (
            <Paper
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #E5E7EB",
                boxShadow: "none",
                backgroundColor: "#fff",
              }}
            >
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
                      <TableCell sx={{ ...headerCellSx, minWidth: 240 }} onClick={() => handleSort("item_name")}>
                        Item
                        <SortArrow active={sortConfig.key === "item_name"} dir={sortConfig.direction} />
                      </TableCell>

                      <TableCell
                        sx={{ ...headerCellSx, width: 110, textAlign: "right" }}
                        onClick={() => handleSort("issued_quantity")}
                      >
                        Issued Qty
                        <SortArrow active={sortConfig.key === "issued_quantity"} dir={sortConfig.direction} />
                      </TableCell>

                      <TableCell sx={{ ...headerCellSx, minWidth: 180 }} onClick={() => handleSort("request_id")}>
                        Request ID
                        <SortArrow active={sortConfig.key === "request_id"} dir={sortConfig.direction} />
                      </TableCell>

                      <TableCell sx={{ ...headerCellSx, minWidth: 180 }} onClick={() => handleSort("location")}>
                        Location
                        <SortArrow active={sortConfig.key === "location"} dir={sortConfig.direction} />
                      </TableCell>

                      <TableCell sx={{ ...headerCellSx, minWidth: 150 }} onClick={() => handleSort("warehouse")}>
                        Warehouse
                        <SortArrow active={sortConfig.key === "warehouse"} dir={sortConfig.direction} />
                      </TableCell>

                      <TableCell sx={{ ...headerCellSx, minWidth: 150 }} onClick={() => handleSort("issued_on")}>
                        Issued On
                        <SortArrow active={sortConfig.key === "issued_on"} dir={sortConfig.direction} />
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow
                        key={`${log.batch_id}-${log.request_id}-${log.issued_on}`}
                        hover
                        sx={{ "&:hover": { backgroundColor: "#F9FAFB" } }}
                      >
                        <TableCell sx={bodyCellSx}>
                          <Tooltip title={safe(log.item_name)} placement="top">
                            <Typography>{safe(log.item_name)}</Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell sx={{ ...bodyCellSx, textAlign: "right", fontWeight: 900 }}>
                          {safe(log.issued_quantity, 0)}
                        </TableCell>

                        <TableCell sx={bodyCellSx}>{safe(log.request_id)}</TableCell>

                        <TableCell sx={bodyCellSx}>
                          {log.location ? (
                            <Chip
                              size="small"
                              label={titleCase(String(log.location))}
                              sx={{
                                height: 22,
                                fontSize: 11.5,
                                borderRadius: "999px",
                                bgcolor: "#EEF2FF",
                                color: "#1E40AF",
                                fontWeight: 800,
                              }}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell sx={bodyCellSx}>
                          {log.warehouse ? (
                            <Chip
                              size="small"
                              label={titleCase(String(log.warehouse))}
                              sx={{
                                height: 22,
                                fontSize: 11.5,
                                borderRadius: "999px",
                                bgcolor: "#FEF3C7",
                                color: "#92400E",
                                fontWeight: 800,
                              }}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell sx={bodyCellSx}>{formatDateDDMMYYYY(log.issued_on)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                rowsPerPageOptions={[15, 50, 100, 150]}
                count={sortedLogs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                sx={{ "& .MuiTablePagination-toolbar": { minHeight: 44 } }}
              />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
