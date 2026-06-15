import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Stack,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Paper,
} from "@mui/material";
import axios from "axios";

const norm = (v) => String(v ?? "").trim();
const num0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function QuickStockTransferDialog({
  open,
  onClose,
  onSuccess,
  apiBase = "http://localhost:8080",
  inventory = [],
  warehouseOptions = [],
  locationOptions = [],
}) {
  const [itemKey, setItemKey] = useState("");
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [qty, setQty] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => {
    const map = new Map();
    (inventory || []).forEach((r) => {
      const id = r?.master_item_id ?? r?.masterItemId ?? r?.item_id ?? r?.id ?? null;
      const name = norm(r?.item_name ?? r?.itemName ?? r?.name);
      if (!name) return;
      const key = id != null ? `mid:${id}` : `name:${name.toLowerCase()}`;
      if (!map.has(key)) map.set(key, { key, master_item_id: id, item_name: name });
    });
    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [inventory]);

  const selectedItem = useMemo(() => items.find((x) => x.key === itemKey) || null, [items, itemKey]);

  const fromRows = useMemo(() => {
    if (!selectedItem) return [];
    const mid = selectedItem.master_item_id ?? null;
    const nameKey = norm(selectedItem.item_name).toLowerCase();
    return (inventory || []).filter((r) => {
      const rmid = r?.master_item_id ?? r?.masterItemId ?? null;
      if (mid != null && rmid != null) return Number(rmid) === Number(mid);
      return norm(r?.item_name).toLowerCase() === nameKey;
    });
  }, [inventory, selectedItem]);

  const fromOptions = useMemo(() => {
    const rows = (fromRows || []).map((r) => {
      const location = capWords(r?.location || "");
      const warehouse = capWords(r?.warehouse || "");
      const available = num0(r?.quantity ?? r?.available_quantity);
      const key = `${location}||${warehouse}`;
      return { key, location, warehouse, available };
    });

    const m = new Map();
    rows.forEach((r) => {
      if (!r.location || !r.warehouse) return;
      const prev = m.get(r.key);
      if (!prev || r.available > prev.available) m.set(r.key, r);
    });
    return Array.from(m.values()).sort((a, b) => {
      const al = a.location.localeCompare(b.location);
      if (al !== 0) return al;
      return a.warehouse.localeCompare(b.warehouse);
    });
  }, [fromRows]);

  const toOptions = useMemo(() => {
    const locs = (locationOptions || []).filter((x) => x && x !== "ALL").map(capWords);
    const whs = (warehouseOptions || []).filter(Boolean).map(capWords);
    const out = [];
    locs.forEach((location) => {
      whs.forEach((warehouse) => {
        out.push({ key: `${location}||${warehouse}`, location, warehouse });
      });
    });
    return out.sort((a, b) => {
      const al = a.location.localeCompare(b.location);
      if (al !== 0) return al;
      return a.warehouse.localeCompare(b.warehouse);
    });
  }, [locationOptions, warehouseOptions]);

  const selectedFrom = useMemo(() => fromOptions.find((x) => x.key === fromKey) || null, [fromOptions, fromKey]);
  const selectedTo = useMemo(() => toOptions.find((x) => x.key === toKey) || null, [toOptions, toKey]);

  const availableFrom = useMemo(() => {
    return num0(selectedFrom?.available);
  }, [selectedFrom]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSubmitting(false);
    setItemKey("");
    setFromKey("");
    setToKey("");
    setQty("");
    setEmployeeCode("");
    setReason("");
    setEmail(localStorage.getItem("email") || "");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!selectedItem) return;
    if (!selectedFrom) return;
    const max = availableFrom;
    const current = Number(qty);
    if (!qty || !Number.isFinite(current) || current <= 0 || current > max) {
      if (max > 0) setQty(String(max));
    }
  }, [availableFrom, open, qty, selectedFrom, selectedItem]);

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    setError("");
    const itemName = norm(selectedItem?.item_name);
    const masterItemId = selectedItem?.master_item_id ?? null;
    const fw = norm(selectedFrom?.warehouse);
    const fl = norm(selectedFrom?.location);
    const tw = norm(selectedTo?.warehouse);
    const tl = norm(selectedTo?.location);
    const count = Number(qty);

    if (!itemName) return setError("Please select an item.");
    if (!fw || !fl) return setError("Please select FROM location.");
    if (!tw || !tl) return setError("Please select TO location.");
    if (fw.toLowerCase() === tw.toLowerCase() && fl.toLowerCase() === tl.toLowerCase())
      return setError("FROM and TO cannot be the same.");
    if (!Number.isFinite(count) || count <= 0) return setError("Quantity must be > 0.");
    if (count > availableFrom) return setError(`Quantity exceeds available stock (${availableFrom}).`);
    if (!norm(employeeCode)) return setError("Employee code is required.");
    if (!norm(email) || !norm(email).includes("@")) return setError("Valid email is required.");

    setSubmitting(true);
    try {
      await axios.patch(`${apiBase}/transfer-stock`, {
        master_item_id: masterItemId,
        item_name: itemName,
        from_warehouse: fw,
        from_location: fl,
        to_warehouse: tw,
        to_location: tl,
        count,
        employee_code: norm(employeeCode),
        email: norm(email),
        reason: norm(reason) || null,
        avenue_created_invoice_id: "STOCK_TRANSFER_UI",
        status: "TRANSFER",
      });
      onSuccess?.();
      onClose?.();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Transfer failed.";
      setError(String(msg));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Transfer</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            border: "1px solid rgba(15, 23, 42, 0.10)",
            borderRadius: 2,
            p: 1.5,
            bgcolor: "#fff",
          }}
        >
          <Stack spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                Item
              </Typography>
              <Select
                value={itemKey}
                onChange={(e) => {
                  setItemKey(e.target.value);
                  setFromKey("");
                  setToKey("");
                  setQty("");
                }}
                size="small"
                fullWidth
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select item</em>
                </MenuItem>
                {items.map((it) => (
                  <MenuItem key={it.key} value={it.key}>
                    {capWords(it.item_name)}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                  From (Location → Location)
                </Typography>
                <Select
                  value={fromKey}
                  onChange={(e) => {
                    setFromKey(e.target.value);
                    setQty("");
                  }}
                  size="small"
                  fullWidth
                  displayEmpty
                  disabled={!selectedItem}
                >
                  <MenuItem value="">
                    <em>Select FROM location</em>
                  </MenuItem>
                  {fromOptions.map((o) => (
                    <MenuItem key={o.key} value={o.key}>
                      {o.location} • {o.warehouse} • Avl {o.available}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                  To
                </Typography>
                <Select
                  value={toKey}
                  onChange={(e) => setToKey(e.target.value)}
                  size="small"
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select TO location</em>
                  </MenuItem>
                  {toOptions.map((o) => (
                    <MenuItem key={o.key} value={o.key}>
                      {o.location} • {o.warehouse}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>

            <Box>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                Quantity{" "}
                {selectedItem && selectedFrom ? (
                  <span style={{ fontWeight: 800, color: "#0F172A" }}>
                    (Available: {availableFrom})
                  </span>
                ) : null}
              </Typography>
              <TextField
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 1 }}
                placeholder={availableFrom ? String(availableFrom) : "0"}
              />
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
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
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} sx={{ color: "#fff" }} />
              Transferring...
            </Box>
          ) : (
            "Transfer"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

