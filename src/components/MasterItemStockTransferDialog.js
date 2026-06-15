import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

const normalize = (v) => String(v ?? "").trim();

export default function MasterItemStockTransferDialog({
  open,
  onClose,
  onSuccess,
  apiBase = "http://localhost:8080",
  transferApiBase,
  masterItemId,
  itemName,
  stockRows = [], // [{location, warehouse, available_quantity}]
  warehouseOptions = [],
  locationOptions = [],
}) {
  const [fromKey, setFromKey] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [qty, setQty] = useState("");
  const [employeeCode, setEmployeeCode] = useState(localStorage.getItem("employee_code") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shortageCtx, setShortageCtx] = useState(null); // { requested, available, shortfall }
  const [shortfallUnitPrice, setShortfallUnitPrice] = useState("");

  const fromOptions = useMemo(() => {
    return (stockRows || [])
      .filter((r) => Number(r?.available_quantity ?? 0) > 0)
      .map((r) => ({
        key: `${normalize(r.location)}||${normalize(r.warehouse)}`,
        location: normalize(r.location),
        warehouse: normalize(r.warehouse),
        available: Number(r.available_quantity ?? 0) || 0,
      }));
  }, [stockRows]);

  const selectedFrom = useMemo(() => fromOptions.find((o) => o.key === fromKey) || null, [fromOptions, fromKey]);

  const reset = () => {
    setFromKey("");
    setToWarehouse("");
    setToLocation("");
    setQty("");
    setEmployeeCode(localStorage.getItem("employee_code") || "");
    setEmail(localStorage.getItem("email") || "");
    setReason("");
    setError("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleFromChange = (nextKey) => {
    setFromKey(nextKey);
    const next = fromOptions.find((o) => o.key === nextKey);
    if (next) setQty(String(next.available));
  };

  const handleSubmit = async () => {
    setError("");
    setShortageCtx(null);
    setShortfallUnitPrice("");
    if (!normalize(itemName)) return setError("Missing item name.");
    if (!masterItemId) return setError("Missing master_item_id.");
    if (!selectedFrom) return setError("Select FROM location and warehouse.");
    if (!toWarehouse || !toLocation) return setError("Select TO location and warehouse.");
    if (selectedFrom.location === normalize(toLocation) && selectedFrom.warehouse === normalize(toWarehouse))
      return setError("FROM and TO cannot be the same.");

    const count = Number(qty);
    if (!Number.isFinite(count) || count <= 0) return setError("Quantity must be > 0.");
    if (!normalize(employeeCode)) return setError("Employee code is required.");
    if (!normalize(email) || !normalize(email).includes("@")) return setError("Valid email is required.");

    setSubmitting(true);
    try {
      const base = (transferApiBase || apiBase || "").replace(/\/+$/, "");
      const prodBase = (apiBase || "").replace(/\/+$/, "");

      // Validate against live batch-aggregated stock from the same backend we'll transfer on.
      // This avoids blocking when the stock summary UI is pointed at a different environment.
      let liveAvailable = null;
      let avgUnitPrice = null;
      try {
        const invRes = await axios.get(`${base}/single/inventory/${encodeURIComponent(normalize(itemName))}`, {
          validateStatus: (s) => s < 500,
        });
        const inv = Array.isArray(invRes?.data?.inventory) ? invRes.data.inventory : [];
        const match = inv.find(
          (r) =>
            normalize(r?.location) === normalize(selectedFrom.location) &&
            normalize(r?.warehouse) === normalize(selectedFrom.warehouse)
        );
        const n = Number(match?.available_quantity ?? NaN);
        liveAvailable = Number.isFinite(n) ? n : null;
        const up = Number(match?.average_unit_price ?? NaN);
        avgUnitPrice = Number.isFinite(up) ? up : null;
      } catch (_e) {
        // Best effort; backend will still enforce availability.
      }

      if (liveAvailable != null && count > liveAvailable) {
        setSubmitting(false);
        const shortfall = Math.max(0, count - liveAvailable);
        setShortageCtx({ requested: count, available: liveAvailable, shortfall, avgUnitPrice });
        if (avgUnitPrice != null) setShortfallUnitPrice(String(avgUnitPrice));
        return setError(
          `Insufficient stock at FROM. Available: ${liveAvailable}. Requested: ${count}.`
        );
      }

      await axios.post(`${base}/stock-move`, {
        master_item_id: masterItemId,
        item_name: normalize(itemName),
        from_location: selectedFrom.location,
        from_warehouse: selectedFrom.warehouse,
        to_location: normalize(toLocation),
        to_warehouse: normalize(toWarehouse),
        count,
        employee_code: normalize(employeeCode),
        email: normalize(email),
        reason: normalize(reason) || null,
        avenue_created_invoice_id: "STOCK_TRANSFER_UI",
        status: "TRANSFER",
      });
      onSuccess?.();
      handleClose();
    } catch (e) {
      setError(String(e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Transfer failed."));
      setSubmitting(false);
    }
  };

  const handleStockMoveWithShortfall = async () => {
    setError("");
    if (!shortageCtx || !selectedFrom) return;
    const base = (transferApiBase || apiBase || "").replace(/\/+$/, "");
    const count = Number(shortageCtx.requested);
    const shortfall = Number(shortageCtx.shortfall);
    if (!Number.isFinite(count) || count <= 0) return;
    if (!Number.isFinite(shortfall) || shortfall <= 0) return;

    const up = Number(shortfallUnitPrice);
    if (!Number.isFinite(up) || up < 0) return setError("Enter a valid unit price for the shortfall add.");

    setSubmitting(true);
    try {
      await axios.post(`${base}/stock-move`, {
        master_item_id: masterItemId,
        item_name: normalize(itemName),
        from_location: selectedFrom.location,
        from_warehouse: selectedFrom.warehouse,
        to_location: normalize(toLocation),
        to_warehouse: normalize(toWarehouse),
        count,
        allow_shortfall_add: true,
        shortfall_unit_price: up,
        employee_code: normalize(employeeCode),
        email: normalize(email),
        reason: normalize(reason) || null,
        avenue_created_invoice_id: "STOCK_MOVE_UI",
        status: "MOVE",
      });
      onSuccess?.();
      handleClose();
    } catch (e) {
      setError(String(e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Stock move failed."));
      setSubmitting(false);
    }
  };

  const handleTransferAvailableAndAddShortfall = async () => {
    setError("");
    if (!shortageCtx || !selectedFrom) return;
    const base = (transferApiBase || apiBase || "").replace(/\/+$/, "");
    const prodBase = (apiBase || "").replace(/\/+$/, "");
    const requested = Number(shortageCtx.requested);
    const available = Number(shortageCtx.available);
    const shortfall = Number(shortageCtx.shortfall);
    if (!Number.isFinite(requested) || !Number.isFinite(available) || !Number.isFinite(shortfall)) return;

    setSubmitting(true);
    try {
      let transferred = 0;
      let added = 0;

      // 1) Transfer what is available (localhost)
      if (available > 0) {
        await axios.patch(`${base}/transfer-stock`, {
          master_item_id: masterItemId,
          item_name: normalize(itemName),
          from_location: selectedFrom.location,
          from_warehouse: selectedFrom.warehouse,
          to_location: normalize(toLocation),
          to_warehouse: normalize(toWarehouse),
          count: available,
          employee_code: normalize(employeeCode),
          email: normalize(email),
          reason: normalize(reason) || null,
          avenue_created_invoice_id: "STOCK_TRANSFER_UI",
          status: "TRANSFER",
        });
        transferred = available;
      }

      // 2) Add remaining shortfall directly to TO (prod) via update-inventory-up
      if (shortfall > 0) {
        // Best-effort unit_price: if backend requires it, pass 0 (or you can update later).
        const unit_price = null;
        await axios.post(`${prodBase}/update-inventory-up`, {
          updated_items: [
            {
              item_name: normalize(itemName),
              location: normalize(toLocation),
              warehouse: normalize(toWarehouse),
              count_change: shortfall,
              avenue_created_invoice_id: "STOCK_ADJUSTMENT_SHORTFALL",
              email: normalize(email),
              unit_price,
              master_item_id: masterItemId,
            },
          ],
        });
        added = shortfall;
      }

      // 3) Audit both actions into localhost log
      try {
        await axios.post(`${base}/local-audit-event`, {
          api: "ui.shortage_fix",
          item_name: normalize(itemName),
          master_item_id: masterItemId,
          from: { location: selectedFrom.location, warehouse: selectedFrom.warehouse },
          to: { location: normalize(toLocation), warehouse: normalize(toWarehouse) },
          requested,
          transferred_localhost: transferred,
          added_prod: added,
          prod_api: "/update-inventory-up",
          localhost_api: "/transfer-stock",
        });
      } catch (_e) {}

      onSuccess?.();
      handleClose();
    } catch (e) {
      setError(String(e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Operation failed."));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Transfer Stock</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">
              {error}
              {shortageCtx?.shortfall > 0 ? (
                <Box sx={{ mt: 1.25 }}>
                  <TextField
                    label="Unit price for shortfall add"
                    size="small"
                    type="number"
                    value={shortfallUnitPrice}
                    onChange={(e) => setShortfallUnitPrice(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={submitting}
                    onClick={handleStockMoveWithShortfall}
                    sx={{ fontWeight: 900, textTransform: "none" }}
                  >
                    Move {shortageCtx.available} + add remaining {shortageCtx.shortfall} to TO (shortfall add)
                  </Button>
                </Box>
              ) : null}
            </Alert>
          </Box>
        ) : null}

        <Box sx={{ mb: 1.25 }}>
          <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800 }}>Item</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{itemName || "—"}</Typography>
        </Box>

        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.5 }}>From</Typography>
            <Select
              value={fromKey}
              onChange={(e) => handleFromChange(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">Select</MenuItem>
              {fromOptions.map((o) => (
                <MenuItem key={o.key} value={o.key}>
                  {o.location} • {o.warehouse} (Avail: {o.available})
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.5 }}>To Location</Typography>
              <Select value={toLocation} onChange={(e) => setToLocation(e.target.value)} size="small" fullWidth>
                <MenuItem value="">Select</MenuItem>
                {locationOptions.map((l) => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.5 }}>To Warehouse</Typography>
              <Select value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)} size="small" fullWidth>
                <MenuItem value="">Select</MenuItem>
                {warehouseOptions.map((w) => (
                  <MenuItem key={w} value={w}>
                    {w}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>

          <TextField
            label="Quantity"
            size="small"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            inputProps={{ min: 0, step: 1 }}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Employee code"
              size="small"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            label="Reason (optional)"
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} sx={{ color: "#fff" }} />
              Transferring…
            </Box>
          ) : (
            "Transfer"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

