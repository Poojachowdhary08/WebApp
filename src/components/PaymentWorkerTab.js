// src/components/PaymentWorkerTab.js
import React, { useEffect, useMemo, useState } from "react";
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
  Chip,
  Stack,
  TablePagination,
  CircularProgress,
  TableSortLabel,
  Grid,
  IconButton,
  Divider,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import axios from "axios";

/* ---------- helpers ---------- */
const PAGE_BG = "#F4F6F9";
const GRID_BORDER = "1px solid rgba(15, 23, 42, 0.10)";

const fmtCurrency = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      })
    : "₹0";

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-GB") : "—");

const STATUS_STYLE = {
  Pending: { bg: "#FFF4E5", fg: "#8A4B00", bd: "#FFD7A8" },
  Approved: { bg: "#E8F0FE", fg: "#185ABC", bd: "#C6D3FB" },
  Paid: { bg: "#E6F4EA", fg: "#137333", bd: "#BFE7CF" },
  paid: { bg: "#E6F4EA", fg: "#137333", bd: "#BFE7CF" },
  "Partially Paid": { bg: "#EEF2FF", fg: "#3730A3", bd: "#C7D2FE" },
  Recheck: { bg: "#FCE8E6", fg: "#B3261E", bd: "#F8B9B3" },
  Reviewed: { bg: "#E6F4EA", fg: "#137333", bd: "#BFE7CF" },
  "Ready for Review": { bg: "#FFF4E5", fg: "#8A4B00", bd: "#FFD7A8" },
};

const statusChipSx = (statusRaw) => {
  const key = String(statusRaw ?? "").trim();
  const v = STATUS_STYLE[key] || {
    bg: "#F3F4F6",
    fg: "#374151",
    bd: "#E5E7EB",
  };
  return {
    backgroundColor: v.bg,
    color: v.fg,
    borderColor: v.bd,
    borderWidth: 1,
    fontWeight: 900,
    height: 24,
    borderRadius: 999,
    "& .MuiChip-label": { px: 1.25, fontSize: 11, letterSpacing: 0.2 },
  };
};

const HEAD = [
  { key: "payment_id", label: "Payment ID", width: 160 },
  { key: "worker_name", label: "Worker", width: 260 },
  { key: "worker_type", label: "Type", width: 120 },
  { key: "gross_amount", label: "Gross", numeric: true, width: 130 },
  { key: "net_amount", label: "Net", numeric: true, width: 130 },
  { key: "payment_mode", label: "Mode", width: 140 },
  { key: "created_at", label: "Uploaded Date", width: 190 },
  { key: "status", label: "Status", width: 140 },
];

/* ---------- sorting helpers ---------- */
const toSortable = (key, row) => {
  const v = row?.[key];

  if (key === "created_at") return v ? new Date(v).getTime() : 0;

  if (key === "gross_amount" || key === "net_amount") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  return String(v ?? "").trim().toLowerCase();
};

const stableSort = (arr, comparator) => {
  const indexed = arr.map((el, idx) => [el, idx]);
  indexed.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return indexed.map(([el]) => el);
};

const getComparator = (order, orderBy) => {
  return (a, b) => {
    const av = toSortable(orderBy, a);
    const bv = toSortable(orderBy, b);

    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  };
};

// ✅ card view fixed page size
const CARDS_PER_PAGE = 12;

export default function PaymentWorkerTab({
  search = "",
  status = "All",
  mode = "All",
  type = "All",
  onOpenVoucher,
  viewMode = "list", // ✅ comes from FinanceView
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // list paging
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(10);

  // sorting
  const [orderBy, setOrderBy] = useState("created_at");
  const [order, setOrder] = useState("desc");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8080/payments/list");
      setPayments(Array.isArray(res.data) ? res.data : []);
      setPage(0);
    } catch (e) {
      console.error(e);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, status, mode, type, viewMode]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();

    return (payments || []).filter((p) => {
      const st = String(p.status ?? "");
      const md = String(p.payment_mode ?? "");
      const tp = String(p.worker_type ?? "");

      const matches =
        !q ||
        String(p.payment_id ?? "").toLowerCase().includes(q) ||
        String(p.worker_name ?? "").toLowerCase().includes(q) ||
        String(p.worker_id ?? "").toLowerCase().includes(q) ||
        st.toLowerCase().includes(q) ||
        md.toLowerCase().includes(q) ||
        tp.toLowerCase().includes(q);

      const byStatus = status === "All" || st === status;
      const byMode = mode === "All" || md === mode;
      const byType = type === "All" || tp === type;

      return matches && byStatus && byMode && byType;
    });
  }, [payments, search, status, mode, type]);

  // keep page in range when filtered changes
  useEffect(() => {
    const effective = viewMode === "cards" ? CARDS_PER_PAGE : rows;
    const maxPage = Math.max(0, Math.ceil(filtered.length / effective) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, rows, page, viewMode]);

  const sortedFiltered = useMemo(() => {
    const cmp = getComparator(order, orderBy);
    return stableSort(filtered, cmp);
  }, [filtered, order, orderBy]);

  const pageSize = viewMode === "cards" ? CARDS_PER_PAGE : rows;

  const pageRows = useMemo(() => {
    const start = page * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, page, pageSize]);

  const openRow = (row) => {
    if (typeof onOpenVoucher === "function") onOpenVoucher(row);
  };

  const handleSort = (key) => {
    if (!key) return;
    if (orderBy === key) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(key);
      setOrder("asc");
    }
    setPage(0);
  };

  const renderCards = () => (
    <Box>
      <Grid container spacing={2}>
        {pageRows.map((r) => (
          <Grid item xs={12} sm={6} md={3} lg={3} key={String(r.payment_id)}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                bgcolor: "#fff",
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
              onClick={() => openRow(r)}
            >
              <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>
                      {r.payment_id || "—"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={r.worker_name || ""}
                    >
                      {r.worker_name || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: "#6B7280", mt: 0.25 }}>
                      {r.worker_type || "—"} • {r.payment_mode || "—"}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRow(r);
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
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Gross</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                      {fmtCurrency(Number(r.gross_amount || 0))}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Net</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
                      {fmtCurrency(Number(r.net_amount || 0))}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 12, color: "#6B7280" }}>Uploaded</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#111827" }}>
                      {fmtDateTime(r.created_at)}
                    </Typography>
                  </Grid>
                </Grid>

                <Stack direction="row" alignItems="center" sx={{ mt: 1.5 }}>
                  <Chip
                    label={String(r.status ?? "—")}
                    size="small"
                    sx={statusChipSx(r.status)}
                    variant="outlined"
                  />
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    label="PAYMENT"
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
        ))}

        {pageRows.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
              <Typography color="text.secondary">No payments found.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <TablePagination
        component="div"
        count={sortedFiltered.length}
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
    <Box sx={{ p: 2.5, backgroundColor: PAGE_BG, minHeight: "70vh" }}>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : payments.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No payments found.
          </Typography>
        </Box>
      ) : viewMode === "cards" ? (
        renderCards()
      ) : (
        <TableContainer component={Paper} sx={tableWrapSx}>
          <Table size="small" sx={tableSx}>
            <TableHead sx={tableHeadSx}>
              <TableRow>
                {HEAD.map((h) => {
                  const active = orderBy === h.key;
                  return (
                    <TableCell
                      key={h.key}
                      align={h.numeric ? "right" : "left"}
                      sx={{ width: h.width }}
                      sortDirection={active ? order : false}
                    >
                      <TableSortLabel
                        active={active}
                        direction={active ? order : "asc"}
                        onClick={() => handleSort(h.key)}
                      >
                        {h.label}
                      </TableSortLabel>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {pageRows.map((r) => (
                <TableRow
                  key={r.payment_id}
                  hover
                  tabIndex={0}
                  role="button"
                  onClick={() => openRow(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openRow(r);
                    }
                  }}
                  sx={rowClickableSx}
                >
                  <TableCell sx={ellipsisCellSx}>
                    <Typography sx={{ color: "#0F172A" }} noWrap variant="body2">
                      {r.payment_id || "—"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={ellipsisCellSx}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {r.worker_name || "—"}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  <TableCell sx={ellipsisCellSx}>{r.worker_type || "—"}</TableCell>

                  <TableCell align="right">{fmtCurrency(Number(r.gross_amount || 0))}</TableCell>

                  <TableCell align="right">{fmtCurrency(Number(r.net_amount || 0))}</TableCell>

                  <TableCell sx={ellipsisCellSx}>{r.payment_mode || "—"}</TableCell>

                  <TableCell sx={ellipsisCellSx}>{fmtDateTime(r.created_at)}</TableCell>

                  <TableCell sx={{ textAlign: "center" }}>
                    <Chip label={String(r.status ?? "—")} size="small" sx={statusChipSx(r.status)} variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={sortedFiltered.length}
            rowsPerPage={rows}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setRows(Number.isFinite(next) ? next : 10);
              setPage(0);
            }}
          />
        </TableContainer>
      )}
    </Box>
  );
}

/* ---------- styles ---------- */
const tableWrapSx = {
  borderRadius: 2,
  overflow: "hidden",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
  border: GRID_BORDER,
  backgroundColor: "#fff",
};

const tableSx = {
  tableLayout: "fixed",
  width: "100%",
  "& th, & td": {
    py: 1.15,
    px: 1.5,
    fontSize: 13,
    lineHeight: 1.2,
    borderBottom: GRID_BORDER,
    borderRight: GRID_BORDER,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
  },
  "& th:last-child, & td:last-child": { borderRight: "none" },
};

const tableHeadSx = {
  backgroundColor: "#F9FAFB",
  "& th": {
    fontWeight: 900,
    color: "#0F172A",
    fontSize: 12,
    letterSpacing: 0.3,
  },
};

const rowClickableSx = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.04)" },
  "&:focus": { outline: "2px solid rgba(37, 99, 235, 0.55)", outlineOffset: -2 },
};

const ellipsisCellSx = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};