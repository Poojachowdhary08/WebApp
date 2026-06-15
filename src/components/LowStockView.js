import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Grid,
  TablePagination,
  InputAdornment,
  Chip,
  Divider,
} from "@mui/material";

import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

/* ---------------- helpers ---------------- */
function normalizeItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);
const normalize = (v) => String(v ?? "").trim().toLowerCase();

function getStatus(avail, min, thr) {
  const danger = avail <= min;
  const warn = avail > min && avail <= thr;
  const status = danger ? "CRITICAL" : warn ? "LOW" : "OK";
  return { status, danger, warn };
}

const statusChipSx = (status) => {
  const s = String(status || "").toUpperCase();
  if (s === "CRITICAL") {
    return { bgcolor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" };
  }
  if (s === "LOW") {
    return { bgcolor: "#DCFCE7", color: "#16A34A", border: "1px solid #86EFAC" }; // green
  }
  return { bgcolor: "#E0F2FE", color: "#0369A1", border: "1px solid #7DD3FC" };
};

const metricLabelSx = { fontSize: 12.5, color: "#374151" };
const metricValueSx = { fontSize: 18, fontWeight: 900, color: "#111827", mt: 0.3 };

const GRID_BORDER = "1px solid #E5E7EB";
const HEADER_BG = "#F8FAFC";

const headerCellSx = {
  bgcolor: HEADER_BG,
  color: "#0F172A",
  fontWeight: 900,
  fontSize: 12.5,
  borderBottom: GRID_BORDER,
  borderRight: GRID_BORDER,
  whiteSpace: "nowrap",
  py: 1.1,
  px: 1.25,
};

const bodyCellSx = {
  fontSize: 13,
  color: "#0F172A",
  borderBottom: GRID_BORDER,
  borderRight: GRID_BORDER,
  whiteSpace: "nowrap",
  py: 1.05,
  px: 1.25,
  bgcolor: "#fff",
};

// ✅ Card view: fixed 12 per page
const CARDS_PER_PAGE = 12;

const LowStockView = () => {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("table"); // "table" | "card"
  const [search, setSearch] = useState("");

  // ✅ one pagination state for both views
  const [page, setPage] = useState(0);

  // ✅ table view rows per page (keep user control)
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    fetch("http://localhost:8080/low-stock")
      .then((res) => res.json())
      .then((data) => setItems(normalizeItems(data)))
      .catch((err) => console.error("Failed to load low stock data", err));
  }, []);

  // filter
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => normalize(item.item_name).includes(q));
  }, [items, search]);

  // ✅ reset page on search OR view change (prevents empty pages)
  useEffect(() => setPage(0), [search, view]);

  // ✅ per-view page size
  const effectiveRowsPerPage = view === "card" ? CARDS_PER_PAGE : rowsPerPage;

  // paginate (both views)
  const paged = useMemo(() => {
    const start = page * effectiveRowsPerPage;
    return filtered.slice(start, start + effectiveRowsPerPage);
  }, [filtered, page, effectiveRowsPerPage]);

  const handleChangePage = (_evt, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (evt) => {
    // only meaningful in table view; card view is fixed 12
    const v = parseInt(evt.target.value, 10);
    setRowsPerPage(Number.isFinite(v) ? v : 15);
    setPage(0);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "#F3F4F6",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* ───────── Top bar ───────── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>
            Low Stock Items
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.2 }}>
            Showing {filtered.length} items
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            placeholder="Search item…"
            sx={{
              width: { xs: "100%", sm: 280 },
              bgcolor: "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": { height: 40, borderRadius: 2 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#6B7280" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* ✅ Two icons ALWAYS visible */}
          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              bgcolor: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              p: 0.3,
            }}
          >
            <Tooltip title="List view">
              <IconButton
                onClick={() => setView("table")}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.6,
                  bgcolor: view === "table" ? "#EEF2FF" : "#fff",
                  border: view === "table" ? "1px solid #C7D2FE" : "1px solid transparent",
                  "&:hover": { bgcolor: view === "table" ? "#EEF2FF" : "#F9FAFB" },
                }}
              >
                <ViewListIcon sx={{ color: view === "table" ? "#3730A3" : "#111827" }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Card view">
              <IconButton
                onClick={() => setView("card")}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.6,
                  bgcolor: view === "card" ? "#EEF2FF" : "#fff",
                  border: view === "card" ? "1px solid #C7D2FE" : "1px solid transparent",
                  "&:hover": { bgcolor: view === "card" ? "#EEF2FF" : "#F9FAFB" },
                }}
              >
                <ViewModuleIcon sx={{ color: view === "card" ? "#3730A3" : "#111827" }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      {/* ───────── Table View ───────── */}
      {view === "table" && (
        <Paper
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid #E5E7EB",
            boxShadow: "none",
            bgcolor: "#fff",
          }}
        >
          <TableContainer sx={{ maxHeight: "70vh", overflow: "auto" }}>
            <Table
              size="small"
              stickyHeader
              sx={{
                minWidth: 1100,
                tableLayout: "fixed",
                borderCollapse: "separate",
                borderSpacing: 0,
                "& th:last-child, & td:last-child": { borderRight: "none" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerCellSx, minWidth: 260 }}>Item</TableCell>
                  <TableCell sx={{ ...headerCellSx, minWidth: 160 }}>Location</TableCell>
                  <TableCell sx={{ ...headerCellSx, minWidth: 160 }}>Warehouse</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 120, textAlign: "right" }}>Available</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 120, textAlign: "right" }}>Minimum</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 120, textAlign: "right" }}>Threshold</TableCell>
                  <TableCell sx={{ ...headerCellSx, width: 140 }}>Status</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paged.map((row, i) => {
                  const avail = Number(row.available_quantity) || 0;
                  const min = Number(row.minimum_quantity) || 0;
                  const thr = Number(row.threshold_quantity) || 0;
                  const { status } = getStatus(avail, min, thr);

                  return (
                    <TableRow
                      key={`${row.item_name}-${row.location}-${row.warehouse}-${i}`}
                      hover
                      sx={{ "&:hover td": { bgcolor: "#F9FAFB" } }}
                    >
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 900 }}>{safe(row.item_name)}</TableCell>
                      <TableCell sx={bodyCellSx}>{safe(row.location)}</TableCell>
                      <TableCell sx={bodyCellSx}>{safe(row.warehouse)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: "right", fontWeight: 900 }}>{avail}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>{min}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>{thr}</TableCell>
                      <TableCell sx={bodyCellSx}>
                        <Chip
                          size="small"
                          label={status}
                          sx={{ height: 26, fontWeight: 900, borderRadius: "10px", ...statusChipSx(status) }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No items match “{search}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            rowsPerPageOptions={[10, 15, 25, 50, 100]}
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Rows per page:"
            sx={{
              borderTop: "1px solid rgba(0,0,0,0.08)",
              "& .MuiTablePagination-toolbar": { minHeight: 48 },
            }}
          />
        </Paper>
      )}

      {/* ───────── Card View ───────── */}
      {view === "card" && (
        <>
          <Grid container spacing={2}>
            {paged.map((item, i) => {
              const avail = Number(item.available_quantity) || 0;
              const min = Number(item.minimum_quantity) || 0;
              const thr = Number(item.threshold_quantity) || 0;
              const { status } = getStatus(avail, min, thr);

              const topCode = `${safe(item.location, "LOC")}_${safe(item.warehouse, "WH")}`.replace(/\s+/g, "_");

              return (
                // ✅ 4 cards per row on lg+: lg={3}
                // ✅ also 4 per row on md if you want: md={3}
                <Grid item xs={12} sm={6} md={3} lg={3} key={`${topCode}-${safe(item.item_name)}-${i}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      bgcolor: "#fff",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0px 8px 22px rgba(15,23,42,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ p: 2.2 }}>
                      <Stack direction="row" spacing={1.8} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 1.5,
                            bgcolor: "#E8EEFF",
                            flex: "0 0 auto",
                          }}
                        />

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: 11, color: "#6B7280" }} noWrap title={topCode}>
                            {topCode}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 18,
                              fontWeight: 900,
                              color: "#111827",
                              lineHeight: 1.1,
                              mt: 0.2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={safe(item.item_name, "")}
                          >
                            {safe(item.item_name, "Unknown")}
                          </Typography>

                          <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.2 }} noWrap>
                            {safe(item.location)} • {safe(item.warehouse)}
                          </Typography>
                        </Box>

                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            sx={{
                              border: "1px solid #E5E7EB",
                              bgcolor: "#fff",
                              "&:hover": { bgcolor: "#F9FAFB" },
                            }}
                            onClick={() => {
                              // wire later if needed
                            }}
                          >
                            <VisibilityOutlinedIcon sx={{ fontSize: 18, color: "#2563EB" }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Divider sx={{ my: 1.6 }} />

                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={4}>
                          <Typography sx={metricLabelSx}>Available</Typography>
                          <Typography sx={metricValueSx}>{avail}</Typography>
                        </Grid>

                        <Grid item xs={4}>
                          <Typography sx={metricLabelSx}>Minimum</Typography>
                          <Typography sx={metricValueSx}>{min}</Typography>
                        </Grid>

                        <Grid item xs={4}>
                          <Typography sx={metricLabelSx}>Threshold</Typography>
                          <Typography sx={metricValueSx}>{thr}</Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 1.6, display: "flex", justifyContent: "flex-end" }}>
                        <Chip
                          label={status}
                          sx={{
                            minWidth: 110,
                            height: 34,
                            fontWeight: 900,
                            borderRadius: 1.2,
                            ...statusChipSx(status),
                          }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}

            {paged.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
                  <Typography color="text.secondary">No items match “{search}”.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* ✅ Card pagination fixed to 12 */}
          <Paper
            sx={{
              mt: 1.5,
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid #E5E7EB",
              boxShadow: "none",
              bgcolor: "#fff",
            }}
          >
            <TablePagination
              component="div"
              rowsPerPageOptions={[CARDS_PER_PAGE]}
              count={filtered.length}
              rowsPerPage={CARDS_PER_PAGE}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={() => {}}
              labelRowsPerPage="Items per page:"
              sx={{
                "& .MuiTablePagination-toolbar": { minHeight: 48 },
              }}
            />
          </Paper>
        </>
      )}
    </Paper>
  );
};

export default LowStockView;
