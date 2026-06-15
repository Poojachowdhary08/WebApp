import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";

const NewItemForm = ({ onClose }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [itemType, setItemType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => name.trim().length > 0 && !saving, [name, saving]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await axios.post(
        "http://localhost:8080/create-master-item",
        {
          name: name.trim(),
          code: code.trim(),
          item_type: itemType.trim(),
          email: localStorage.getItem("email") || "unknown@example.com",
        },
        { headers: { "Content-Type": "application/json" } }
      );
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Create new item</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="HSN / Code (optional)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Item type (optional)"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            {error && (
              <Grid item xs={12}>
                <Typography sx={{ color: "#B91C1C", fontWeight: 700, fontSize: "0.9rem" }}>
                  {error}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          variant="contained"
          sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800 }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewItemForm;

