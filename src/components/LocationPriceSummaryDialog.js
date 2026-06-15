import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  TableSortLabel,
  Snackbar,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditIcon from "@mui/icons-material/Edit";

const API_BASE = "http://localhost:8080";

const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const LocationPriceSummaryDialog = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);

  // Drill-down
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [detailsLocation, setDetailsLocation] = useState(null);
  const [detailsRows, setDetailsRows] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [detailsQuery, setDetailsQuery] = useState("");
  const [detailsSortBy, setDetailsSortBy] = useState("value"); // see sort keys below
  const [detailsSortDir, setDetailsSortDir] = useState("desc"); // "asc" | "desc"
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const compareNullable = (a, b) => {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    // numbers
    if (typeof a === "number" && typeof b === "number") return a - b;
    // fallback string compare
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  };
  const stableSort = (arr, cmp) =>
    arr
      .map((v, i) => ({ v, i }))
      .sort((x, y) => {
        const c = cmp(x.v, y.v);
        return c !== 0 ? c : x.i - y.i;
      })
      .map((x) => x.v);

  const getSortValue = (row, key) => {
    switch (key) {
      case "batch":
        return norm(row?.batch_id);
      case "warehouse":
        return norm(row?.warehouse);
      case "item":
        return norm(row?.item_name);
      case "qty":
        return Number(row?.available_quantity || 0) || 0;
      case "unit_price":
        return Number(row?.unit_price || 0) || 0;
      case "value":
        return Number(row?.total_value || 0) || 0;
      case "invoice":
        return norm(row?.invoice_id);
      case "status":
        return norm(row?.status);
      case "abnormal":
        // group abnormal first when sorting asc; within group, sort by reason
        return row?.abnormal_reason ? `0-${norm(row.abnormal_reason)}` : "1-";
      default:
        return Number(row?.total_value || 0) || 0;
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/inventory/location-price-summary`);
      if (!response.ok) throw new Error(`Failed to load summary. Status: ${response.status}`);
      const data = await response.json();
      setLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch (err) {
      setError(err.message || "Unable to fetch summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationDetails = async (locationLabel) => {
    const loc = (locationLabel || "").trim();
    if (!loc) return;
    setDetailsOpen(true);
    setDetailsLocation(loc);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsRows([]);
    setTopItems([]);
    setDetailsQuery("");
    setDetailsSortBy("value");
    setDetailsSortDir("desc");
    setEditOpen(false);
    setEditRow(null);
    setEditUnitPrice("");
    setEditSaving(false);
    setEditError(null);
    try {
      const [detailsRes, topRes] = await Promise.all([
        fetch(`${API_BASE}/inventory/location-details?location=${encodeURIComponent(loc)}`),
        fetch(`${API_BASE}/inventory/location-top-items?location=${encodeURIComponent(loc)}`),
      ]);

      if (!detailsRes.ok) throw new Error(`Details failed. Status: ${detailsRes.status}`);
      const detailsJson = await detailsRes.json();
      setDetailsRows(Array.isArray(detailsJson.details) ? detailsJson.details : []);

      if (topRes.ok) {
        const topJson = await topRes.json();
        setTopItems(Array.isArray(topJson.items) ? topJson.items : []);
      }
    } catch (e) {
      setDetailsError(e.message || "Failed to load location details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSummary();
    }
  }, [open]);

  const totals = useMemo(() => {
    return locations.reduce(
      (acc, loc) => {
        acc.quantity += Number(loc.total_available_quantity || 0);
        acc.value += Number(loc.total_available_value || 0);
        acc.items += Number(loc.distinct_items || 0);
        acc.batches += Number(loc.total_batches || 0);
        acc.abnormal += Number(loc.abnormal_rows || 0);
        return acc;
      },
      { quantity: 0, value: 0, items: 0, batches: 0, abnormal: 0 }
    );
  }, [locations]);

  const filteredSortedDetailsRows = useMemo(() => {
    const q = norm(detailsQuery);
    const filtered = !q
      ? detailsRows
      : (detailsRows || []).filter((r) => {
          const hay = [
            r?.batch_id,
            r?.warehouse,
            r?.item_name,
            r?.invoice_id,
            r?.status,
            r?.abnormal_reason,
            r?.available_quantity,
            r?.unit_price,
            r?.total_value,
          ]
            .map((x) => String(x ?? ""))
            .join(" ");
          return norm(hay).includes(q);
        });

    const dir = detailsSortDir === "asc" ? 1 : -1;
    const cmp = (a, b) => dir * compareNullable(getSortValue(a, detailsSortBy), getSortValue(b, detailsSortBy));
    return stableSort(filtered, cmp);
  }, [detailsRows, detailsQuery, detailsSortBy, detailsSortDir]);

  const onToggleSort = (key) => {
    setDetailsSortBy((prev) => {
      if (prev !== key) {
        setDetailsSortDir(key === "abnormal" ? "asc" : "desc");
        return key;
      }
      setDetailsSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  };

  const openEdit = (row) => {
    setEditError(null);
    setEditRow(row || null);
    setEditUnitPrice(row?.unit_price ?? "");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditRow(null);
    setEditUnitPrice("");
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editRow?.batch_id) return;
    const batchId = String(editRow.batch_id);
    const nextUnit = editUnitPrice === "" ? NaN : Number(editUnitPrice);
    if (!Number.isFinite(nextUnit) || nextUnit < 0) {
      setEditError("Please enter a valid Unit Price (>= 0).");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const updatedBy = localStorage.getItem("email") || null;
      const res = await fetch(`${API_BASE}/inventory/batch/${encodeURIComponent(batchId)}/unit-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_price: nextUnit, updated_by: updatedBy }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed (status ${res.status})`);
      }
      const json = await res.json();
      const b = json?.batch;
      if (!b) throw new Error("Invalid response from server.");

      setDetailsRows((prev) =>
        (prev || []).map((r) => (String(r?.batch_id) === String(b.batch_id) ? { ...r, ...b } : r))
      );
      setSuccessMsg(`Updated batch ${String(b.batch_id)} unit price to ₹${formatNumber(b.unit_price)}`);
      setSuccessOpen(true);

      // Re-fetch to ensure the table reflects DB truth (and any server-side computed fields)
      if (detailsLocation) {
        fetchLocationDetails(detailsLocation);
      }
      setEditOpen(false);
      setEditRow(null);
      setEditUnitPrice("");
    } catch (e) {
      setEditError(String(e?.message || "Failed to update unit price."));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Snackbar
        open={successOpen}
        autoHideDuration={2500}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ fontWeight: 700 }}>
          {successMsg || "Updated successfully."}
        </Alert>
      </Snackbar>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={800}>
            Location Price Summary
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchSummary}
              disabled={loading}
              variant="outlined"
            >
              Refresh
            </Button>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 240 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : locations.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            No data available.
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
              <Chip label={`Locations: ${locations.length}`} color="primary" variant="outlined" />
              <Chip label={`Total Items: ${formatNumber(totals.items)}`} color="primary" variant="outlined" />
              <Chip label={`Total Batches: ${formatNumber(totals.batches)}`} color="primary" variant="outlined" />
              <Chip label={`Total Quantity: ${formatNumber(totals.quantity)}`} color="secondary" variant="outlined" />
              <Chip label={`Total Value: ₹${formatNumber(totals.value)}`} color="secondary" variant="filled" />
              {totals.abnormal > 0 ? (
                <Chip label={`Abnormal: ${formatNumber(totals.abnormal)}`} color="warning" variant="outlined" />
              ) : null}
            </Stack>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Available Qty
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Total Value
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Distinct Items
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Total Batches
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Abnormal
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Details
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.location}>
                      <TableCell>
                        <Typography fontWeight={600}>{loc.location || "Unknown"}</Typography>
                      </TableCell>
                      <TableCell align="right">{formatNumber(loc.total_available_quantity)}</TableCell>
                      <TableCell align="right">₹{formatNumber(loc.total_available_value)}</TableCell>
                      <TableCell align="right">{formatNumber(loc.distinct_items)}</TableCell>
                      <TableCell align="right">{formatNumber(loc.total_batches)}</TableCell>
                      <TableCell align="right">
                        {Number(loc.abnormal_rows || 0) > 0 ? (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={formatNumber(loc.abnormal_rows)}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View batches">
                          <IconButton size="small" onClick={() => fetchLocationDetails(loc.location)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Dialog
              open={detailsOpen}
              onClose={() => setDetailsOpen(false)}
              maxWidth="xl"
              fullWidth
              PaperProps={{
                sx: {
                  // wider on desktop while staying responsive
                  width: "96vw",
                  maxWidth: 1500,
                },
              }}
            >
              <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Location Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {detailsLocation || "—"}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setDetailsOpen(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </DialogTitle>
              <DialogContent dividers sx={{ minHeight: 240 }}>
                {detailsLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress size={28} />
                  </Box>
                ) : detailsError ? (
                  <Alert severity="error">{detailsError}</Alert>
                ) : (
                  <>
                    {/* KPI */}
                    {(() => {
                      const totals2 = (detailsRows || []).reduce(
                        (acc, r) => {
                          const qty = Number(r?.available_quantity || 0) || 0;
                          const val = Number(r?.total_value || 0) || 0;
                          acc.rows += 1;
                          acc.qty += qty;
                          acc.value += val;
                          if (r?.abnormal_reason) acc.abnormal += 1;
                          return acc;
                        },
                        { rows: 0, qty: 0, value: 0, abnormal: 0 }
                      );
                      const avg = totals2.qty > 0 ? totals2.value / totals2.qty : 0;
                      return (
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                          <Chip label={`Batches: ${totals2.rows}`} variant="outlined" />
                          <Chip label={`Qty: ${formatNumber(totals2.qty)}`} variant="outlined" />
                          <Chip label={`Value: ₹${formatNumber(totals2.value)}`} color="secondary" variant="filled" />
                          <Chip label={`Avg Rate: ₹${formatNumber(avg)}`} variant="outlined" />
                          {totals2.abnormal > 0 ? (
                            <Chip label={`Abnormal: ${totals2.abnormal}`} color="warning" variant="outlined" />
                          ) : null}
                        </Stack>
                      );
                    })()}

                    {/* Top items */}
                    {topItems.length > 0 ? (
                      <Box sx={{ mb: 2 }}>
                        <Typography fontWeight={800} sx={{ mb: 1 }}>
                          Top Items (by value)
                        </Typography>
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                {["Item", "Qty", "Value", "Avg Rate", "W.Avg Rate", "Batches"].map((h) => (
                                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                                    {h}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {topItems.slice(0, 10).map((it) => (
                                <TableRow key={it.item_name_key || it.item_name}>
                                  <TableCell>
                                    <Typography fontWeight={600}>{it.item_name}</Typography>
                                  </TableCell>
                                  <TableCell>{formatNumber(it.total_available_quantity)}</TableCell>
                                  <TableCell>₹{formatNumber(it.total_value)}</TableCell>
                                  <TableCell>₹{formatNumber(it.avg_unit_price)}</TableCell>
                                  <TableCell>₹{formatNumber(it.weighted_avg_unit_price)}</TableCell>
                                  <TableCell>{formatNumber(it.total_batches)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : null}

                    {/* Batch rows */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography fontWeight={800}>Batches</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                        <TextField
                          size="small"
                          placeholder="Search batch / item / invoice / warehouse…"
                          value={detailsQuery}
                          onChange={(e) => setDetailsQuery(e.target.value)}
                          sx={{ width: 360, maxWidth: "100%" }}
                        />
                      </Stack>
                    </Stack>
                    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {[
                              { key: "batch", label: "Batch" },
                              { key: "warehouse", label: "Warehouse" },
                              { key: "item", label: "Item" },
                              { key: "qty", label: "Qty" },
                              { key: "unit_price", label: "Unit Price" },
                              { key: "value", label: "Value" },
                              { key: "invoice", label: "Invoice" },
                              { key: "status", label: "Status" },
                              { key: "abnormal", label: "Abnormal" },
                              { key: "edit", label: "" },
                            ].map((h) => (
                              <TableCell key={h.key} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                {h.key === "edit" ? null : (
                                  <TableSortLabel
                                    active={detailsSortBy === h.key}
                                    direction={detailsSortBy === h.key ? detailsSortDir : "asc"}
                                    onClick={() => onToggleSort(h.key)}
                                  >
                                    {h.label}
                                  </TableSortLabel>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredSortedDetailsRows.map((r) => (
                            <TableRow key={r.batch_id}>
                              <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{String(r.batch_id)}</TableCell>
                              <TableCell>{r.warehouse || "—"}</TableCell>
                              <TableCell>{r.item_name || "—"}</TableCell>
                              <TableCell>{formatNumber(r.available_quantity)}</TableCell>
                              <TableCell sx={{ minWidth: 140 }}>₹{formatNumber(r.unit_price)}</TableCell>
                              <TableCell>₹{formatNumber(r.total_value)}</TableCell>
                              <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                                {String(r.invoice_id || "—")}
                              </TableCell>
                              <TableCell>{r.status || "—"}</TableCell>
                              <TableCell>
                                {r.abnormal_reason ? (
                                  <Chip size="small" color="warning" variant="outlined" label={r.abnormal_reason} />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit Unit Price">
                                  <span>
                                    <IconButton size="small" onClick={() => openEdit(r)} disabled={!r?.batch_id}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredSortedDetailsRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10}>
                                <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                                  No matching rows.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Edit Unit Price dialog */}
                    <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth>
                      <DialogTitle sx={{ fontWeight: 900 }}>Edit Unit Price</DialogTitle>
                      <DialogContent dividers>
                        <Stack spacing={1.25}>
                          <Box>
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Batch</Typography>
                            <Typography sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                              {editRow?.batch_id ? String(editRow.batch_id) : "—"}
                            </Typography>
                          </Box>

                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Item</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{editRow?.item_name || "—"}</Typography>
                            </Box>
                            <Box sx={{ width: 220 }}>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Warehouse</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{editRow?.warehouse || "—"}</Typography>
                            </Box>
                          </Stack>

                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Available Qty</Typography>
                              <Typography sx={{ fontWeight: 800 }}>{formatNumber(editRow?.available_quantity)}</Typography>
                            </Box>
                            <Box sx={{ width: 220 }}>
                              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Current Unit Price</Typography>
                              <Typography sx={{ fontWeight: 800 }}>₹{formatNumber(editRow?.unit_price)}</Typography>
                            </Box>
                          </Stack>

                          <TextField
                            label="New Unit Price"
                            type="number"
                            value={editUnitPrice}
                            onChange={(e) => setEditUnitPrice(e.target.value)}
                            inputProps={{ min: 0, step: "0.01" }}
                            disabled={editSaving}
                            fullWidth
                          />

                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Chip
                              variant="outlined"
                              label={`New Value: ₹${formatNumber(
                                (Number(editRow?.available_quantity || 0) || 0) * (Number(editUnitPrice || 0) || 0)
                              )}`}
                            />
                          </Stack>

                          {editError ? <Alert severity="error">{editError}</Alert> : null}
                        </Stack>
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={closeEdit} variant="outlined" disabled={editSaving}>
                          Cancel
                        </Button>
                        <Button onClick={saveEdit} variant="contained" disabled={editSaving}>
                          {editSaving ? "Saving…" : "Save"}
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailsOpen(false)} variant="outlined">
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LocationPriceSummaryDialog;
