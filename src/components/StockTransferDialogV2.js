import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import axios from "axios";

const normalize = (v) => String(v ?? "").trim();

export default function StockTransferDialogV2({
  open,
  onClose,
  onSuccess,
  item,
  apiBase = "http://localhost:8080",
  warehouseOptions = [],
  locationOptions = [],
}) {
  const [toWarehouse, setToWarehouse] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [qty, setQty] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fromWarehouse = normalize(item?.warehouse);
  const fromLocation = normalize(item?.location);
  const itemName = normalize(item?.item_name);
  const masterItemId = item?.master_item_id ?? item?.masterItemId ?? item?.item_id ?? item?.id ?? null;

  const maxQty = useMemo(() => Number(item?.quantity ?? 0) || 0, [item?.quantity]);

  const resetLocal = () => {
    setToWarehouse("");
    setToLocation("");
    setQty("");
    setEmployeeCode("");
    setReason("");
    setError("");
    setSubmitting(false);
  };

  const handleClose = () => {
    resetLocal();
    onClose?.();
  };

  const handleSubmit = async () => {
    setError("");

    const count = Number(qty);
    if (!itemName) return setError("Missing item name.");
    if (!fromWarehouse || !fromLocation) return setError("Missing FROM warehouse/location.");
    if (!toWarehouse || !toLocation) return setError("Please select TO warehouse and TO location.");
    if (!Number.isFinite(count) || count <= 0) return setError("Quantity must be > 0.");
    if (count > maxQty) return setError(`Quantity exceeds available stock (${maxQty}).`);
    if (!normalize(employeeCode)) return setError("Employee code is required.");
    if (!normalize(email) || !normalize(email).includes("@")) return setError("Valid email is required.");

    setSubmitting(true);
    try {
      const payload = {
        master_item_id: masterItemId,
        item_name: itemName,
        from_warehouse: fromWarehouse,
        from_location: fromLocation,
        to_warehouse: normalize(toWarehouse),
        to_location: normalize(toLocation),
        count,
        employee_code: normalize(employeeCode),
        email: normalize(email),
        reason: normalize(reason) || null,
        avenue_created_invoice_id: "STOCK_TRANSFER_V2",
        status: "TRANSFER",
      };

      await axios.patch(`${apiBase}/transfer-stock`, payload);
      onSuccess?.();
      handleClose();
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
      <DialogTitle sx={{ fontWeight: 900 }}>Transfer Stock (V2)</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : null}

        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800 }}>Item</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{itemName || "—"}</Typography>
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              FROM: {fromLocation || "—"} • {fromWarehouse || "—"} • Available: {maxQty}
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.5 }}>
                To Warehouse
              </Typography>
              <Select
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">Select</MenuItem>
                {warehouseOptions.map((w) => (
                  <MenuItem key={w} value={w}>
                    {w}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 800, mb: 0.5 }}>
                To Location
              </Typography>
              <Select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">Select</MenuItem>
                {locationOptions.map((l) => (
                  <MenuItem key={l} value={l}>
                    {l}
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

