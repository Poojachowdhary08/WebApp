import React, { useEffect, useMemo, useState } from "react";
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
  Alert,
  Paper,
} from "@mui/material";

const norm = (v) => String(v ?? "").trim();
const capWords = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const locKey = (v) => norm(v).toLowerCase().replace(/\s+/g, "");
const IGNORED_LOCATIONS = new Set([
  "hyderabad",
  "lakecity",
  "lakecitys",
  "serenagrande",
]);
const isIgnoredLocation = (location) => IGNORED_LOCATIONS.has(locKey(location));

export default function BulkTransferLocationPickerDialog({
  open,
  onClose,
  onContinue,
  locationOptions = [],
}) {
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [error, setError] = useState("");

  const options = useMemo(() => {
    const locs = (locationOptions || [])
      .filter((x) => x && x !== "ALL")
      .map(capWords)
      .filter((x) => x && !isIgnoredLocation(x));
    return Array.from(new Set(locs)).sort((a, b) => a.localeCompare(b));
  }, [locationOptions]);

  useEffect(() => {
    if (!open) return;
    setFromLocation("");
    setToLocation("");
    setError("");
  }, [open]);

  const handleContinue = () => {
    setError("");
    const from = norm(fromLocation);
    const to = norm(toLocation);
    if (!from) return setError("Please select FROM location.");
    if (!to) return setError("Please select TO location.");
    if (from.toLowerCase() === to.toLowerCase()) return setError("FROM and TO cannot be the same.");
    onContinue?.({ fromLocation: from, toLocation: to });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Bulk Transfer (Select Locations)</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : null}

        <Paper elevation={0} sx={{ border: "1px solid rgba(15, 23, 42, 0.10)", borderRadius: 2, p: 1.5 }}>
          <Stack spacing={1.25}>
            <Box>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                From (Project)
              </Typography>
              <Select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                size="small"
                fullWidth
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select FROM location</em>
                </MenuItem>
                {options.map((o) => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 900, mb: 0.5 }}>
                To (Project)
              </Typography>
              <Select value={toLocation} onChange={(e) => setToLocation(e.target.value)} size="small" fullWidth displayEmpty>
                <MenuItem value="">
                  <em>Select TO location</em>
                </MenuItem>
                {options.map((o) => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleContinue} variant="contained">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

