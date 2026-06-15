// src/components/estimateList.js
// NOTE: Install once:
//   npm i xlsx
// Downloads ONLY the filtered+searched+sorted rows (all rows, not just current page)

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  InputAdornment,
  TableSortLabel,
  IconButton,
  Chip,
  Tooltip,
  TablePagination,
  Typography,
  Grid,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import * as XLSX from "xlsx";

/* ---------- helpers ---------- */
const asINR = (val) => `₹${Number(val || 0).toFixed(2)}`;

const safe = (v, d = "—") => (v === null || v === undefined || v === "" ? d : v);
const ellipsize = (s, n = 30) => {
  const t = String(s || "");
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

const safeFilePart = (s, fallback = "NA") => {
  const t = String(s || "").trim();
  if (!t) return fallback;
  return t.replace(/[^\w]+/g, "_").slice(0, 40);
};

// ✅ Card view fixed page size
const CARDS_PER_PAGE = 12;

export default function EstimateList({ onOpenCreate, onOpenEdit }) {
  const [estimates, setEstimates] = useState([]);

  // search + sorting
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("estimate_id");
  const [order, setOrder] = useState("asc");

  // pagination (table controls this; cards use fixed 12)
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // view mode
  const [viewMode, setViewMode] = useState("list");

  // ✅ download state
  const [downloading, setDownloading] = useState(false);

  const fetchEstimates = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8080/estimates/list");
      setEstimates(res.data || []);
    } catch (err) {
      console.error("Failed to fetch estimates", err);
      setEstimates([]);
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const openCreate = () => {
    onOpenCreate?.();
  };

  const openEstimate = async (row) => {
    try {
      const res = await axios.get(`http://localhost:8080/estimates/${row.estimate_id}`);
      onOpenEdit?.(res.data); // ✅ parent will render Estimate
    } catch (err) {
      console.error("Failed to fetch estimate details", err);
      alert("Failed to open estimate.");
    }
  };

  /* ---------- sorting ---------- */
  const handleSort = (field) => {
    setPage(0);
    if (orderBy === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(field);
      setOrder("asc");
    }
  };

  const comparator = useCallback(
    (a, b) => {
      const av = orderBy === "total_amount" ? Number(a[orderBy] ?? 0) : String(a[orderBy] ?? "");
      const bv = orderBy === "total_amount" ? Number(b[orderBy] ?? 0) : String(b[orderBy] ?? "");
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    },
    [order, orderBy]
  );

  /* ---------- filter + sort ---------- */
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? estimates.filter((e) =>
          [e.estimate_id, e.project_id, e.property_name, e.estimate_title, e.status, e.total_amount].some((f) =>
            String(f ?? "").toLowerCase().includes(q)
          )
        )
      : estimates;

    return [...filtered].sort(comparator);
  }, [estimates, search, comparator]);

  // ✅ unified page size depends on viewMode
  const effectiveRowsPerPage = viewMode === "cards" ? CARDS_PER_PAGE : rowsPerPage;

  const pagedRows = useMemo(() => {
    const start = page * effectiveRowsPerPage;
    return rows.slice(start, start + effectiveRowsPerPage);
  }, [rows, page, effectiveRowsPerPage]);

  useEffect(() => setPage(0), [search, rowsPerPage, viewMode]);

  const statusChipSx = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("review")) return { bgcolor: "#FFF7E6", color: "#B45309" };
    if (s.includes("approved") || s.includes("reviewed")) return { bgcolor: "#E9FCEB", color: "#15803D" };
    if (s.includes("rejected")) return { bgcolor: "#FEE2E2", color: "#B91C1C" };
    return { bgcolor: "#EEF2FF", color: "#1E40AF" };
  };

  /* ---------- table styles ---------- */
  const headCellSx = {
    fontSize: 12,
    fontWeight: 800,
    backgroundColor: "#F8FAFC",
    borderBottom: "1px solid #E5E7EB",
    borderRight: "1px solid #E5E7EB",
    whiteSpace: "nowrap",
    py: 1.25,
    px: 1.5,
    color: "#0F172A",
  };

  const bodyCellSx = {
    fontSize: 13,
    borderBottom: "1px solid #E5E7EB",
    borderRight: "1px solid #E5E7EB",
    whiteSpace: "nowrap",
    py: 1.1,
    px: 1.5,
    color: "#0F172A",
    backgroundColor: "#fff",
  };

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

  /* ---------- ✅ DOWNLOAD EXCEL (filtered + searched + sorted rows) ---------- */
  const handleDownloadExcel = async () => {
    if (downloading) return;

    try {
      setDownloading(true);

      const excelRows = rows.map((e, idx) => ({
        SNO: idx + 1,
        "Estimate ID": safe(e.estimate_id, ""),
        Project: safe(e.project_id, ""),
        Property: safe(e.property_name, ""),
        Title: safe(e.estimate_title, ""),
        "Total Amount": Number(e.total_amount ?? 0),
        Status: safe(e.status, ""),
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws["!cols"] = [
        { wch: 6 },  // SNO
        { wch: 14 }, // Estimate ID
        { wch: 16 }, // Project
        { wch: 22 }, // Property
        { wch: 40 }, // Title
        { wch: 14 }, // Total Amount
        { wch: 14 }, // Status
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Estimates");

      // Meta sheet (so you know what was downloaded)
      const meta = [
        ["Downloaded At", new Date().toLocaleString("en-IN")],
        ["Search", search?.trim() || "—"],
        ["Sort", `${orderBy} (${order})`],
        ["View Mode", viewMode],
        ["Total Rows", String(rows.length)],
      ];
      const wsMeta = XLSX.utils.aoa_to_sheet(meta);
      wsMeta["!cols"] = [{ wch: 18 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsMeta, "Meta");

      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const filename = `estimates_${safeFilePart(search || "all")}_${safeFilePart(orderBy)}_${order}.xlsx`;
      downloadBlob(blob, filename);
    } catch (e) {
      console.error("❌ Excel download failed:", e);
      alert("Failed to download Excel. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const renderCards = () => (
    <Box>
      <Grid container spacing={2}>
        {pagedRows.map((est) => {
          const status = est.status || "Open";
          const title = est.estimate_title || "-";

          return (
            <Grid item xs={12} sm={6} md={3} lg={3} key={est.estimate_id}>
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
                onClick={() => openEstimate(est)}
              >
                <Box sx={{ p: 2 }}>
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
                          {safe(est.estimate_id)}
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
                            maxWidth: 340,
                          }}
                          title={title}
                        >
                          {ellipsize(title, 34)}
                        </Typography>

                        <Typography sx={{ fontSize: 13, color: "#6B7280", mt: 0.35 }}>
                          {safe(est.project_id, "-")} • {safe(est.property_name, "-")}
                        </Typography>
                      </Box>
                    </Stack>

                    <Tooltip title="Open">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEstimate(est);
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

                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Total</Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
                        {asINR(est.total_amount)}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Project</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {safe(est.project_id, "-")}
                      </Typography>
                    </Grid>

                    <Grid item xs={4}>
                      <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Property</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>
                        {safe(est.property_name, "-")}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.6 }}>
                    <Chip
                      label={status}
                      size="small"
                      sx={{
                        height: 28,
                        fontWeight: 900,
                        borderRadius: "999px",
                        ...statusChipSx(status),
                      }}
                    />
                    <Box sx={{ flex: 1 }} />

                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEstimate(est);
                        }}
                        sx={{
                          border: "1px solid #E5E7EB",
                          bgcolor: "#fff",
                          borderRadius: 2,
                          "&:hover": { bgcolor: "#F9FAFB" },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          );
        })}

        {pagedRows.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No estimates found.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={CARDS_PER_PAGE}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={() => {}}
        rowsPerPageOptions={[CARDS_PER_PAGE]}
        labelRowsPerPage="Items per page:"
        sx={{ mt: 1 }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2, backgroundColor: "#F3F4F6", borderRadius: 2, marginTop: "-10px" }}>
      {/* Top bar (right aligned) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          mb: 1.5,
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "#6B7280" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: "100%", sm: 340 },
            backgroundColor: "#fff",
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              height: 40,
            },
          }}
        />

        <Tooltip title="Refresh">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchEstimates}
            sx={{
              height: 40,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 800,
              backgroundColor: "#fff",
            }}
          >
            Refresh
          </Button>
        </Tooltip>

        {/* ✅ Download */}
        <Tooltip title="Download filtered estimates as Excel">
          <span>
            <Button
              
              onClick={handleDownloadExcel}
              disabled={downloading || rows.length === 0}
              sx={{
                height: 40,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 900,
                backgroundColor: "#fff",
              }}
            >
              ⬇️ 
              </Button>
          </span>
        </Tooltip>

        {/* ✅ view toggle */}
        {renderViewToggle()}

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            height: 40,
            borderRadius: "3px",
            textTransform: "none",
            fontWeight: 900,
          }}
        >
          New Estimate
        </Button>
      </Box>

      {viewMode === "cards" ? (
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
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small" sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <TableHead>
                <TableRow>
                  {[
                    { id: "estimate_id", label: "Estimate ID" },
                    { id: "project_id", label: "Project" },
                    { id: "property_name", label: "Property" },
                    { id: "estimate_title", label: "Title" },
                    { id: "total_amount", label: "Total Amount", align: "right" },
                    { id: "status", label: "Status", align: "center" },
                    { id: "__action", label: "Action", align: "center", noSort: true },
                  ].map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || "left"}
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        backgroundColor: "#F8FAFC",
                        borderBottom: "1px solid #E5E7EB",
                        whiteSpace: "nowrap",
                        py: 1.25,
                        px: 1.5,
                        color: "#0F172A",
                        borderRight: col.id === "__action" ? "none" : "1px solid #E5E7EB",
                      }}
                    >
                      {col.noSort ? (
                        col.label
                      ) : (
                        <TableSortLabel
                          active={orderBy === col.id}
                          direction={orderBy === col.id ? order : "asc"}
                          onClick={() => handleSort(col.id)}
                          sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
                        >
                          {col.label}
                        </TableSortLabel>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {pagedRows.map((est) => (
                  <TableRow
                    key={est.estimate_id}
                    hover
                    onClick={() => openEstimate(est)}
                    sx={{
                      cursor: "pointer",
                      "&:hover td": { backgroundColor: "#FAFBFF" },
                    }}
                  >
                    <TableCell sx={bodyCellSx}>{est.estimate_id}</TableCell>
                    <TableCell sx={bodyCellSx}>{est.project_id || "-"}</TableCell>
                    <TableCell sx={bodyCellSx}>{est.property_name || "-"}</TableCell>

                    <TableCell
                      sx={{
                        ...bodyCellSx,
                        maxWidth: 420,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={est.estimate_title || ""}
                    >
                      {est.estimate_title || "-"}
                    </TableCell>

                    <TableCell align="right" sx={bodyCellSx}>
                      {asINR(est.total_amount)}
                    </TableCell>

                    <TableCell align="center" sx={bodyCellSx}>
                      <Chip
                        label={est.status || "Open"}
                        size="small"
                        sx={{
                          height: 26,
                          fontWeight: 900,
                          borderRadius: "999px",
                          ...statusChipSx(est.status),
                        }}
                      />
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{ ...bodyCellSx, borderRight: "none" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Box display="flex" justifyContent="center" gap={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEstimate(est)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {pagedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No estimates found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[15, 30, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
}