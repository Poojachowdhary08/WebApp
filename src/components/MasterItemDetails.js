import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import axios from "axios";

import ItemTypeDropDown from "./ItemTypeDropDown";
import BatchIssues from "./BatchIssues";

/* ---------- Helpers ---------- */
const asINR = (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "-");

export default function MasterItemDetails({ item, isMobile, onBack, onUpdated, onDeleted, onReload }) {
  const [selected, setSelected] = useState(item);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [batchIssues, setBatchIssues] = useState([]);
  const [batchIssuesLoading, setBatchIssuesLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Message dialog (success/error)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageDialogContent, setMessageDialogContent] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const showMessage = (title, message, type = "info") => {
    setMessageDialogContent({ title, message, type });
    setMessageDialogOpen(true);
  };

  useEffect(() => {
    setSelected(item);
  }, [item]);

  const loadDetails = async () => {
    if (!item?.id) return;

    // Price history
    try {
      setHistoryLoading(true);
      const res = await axios.get(`http://localhost:8080/get-item-history/${item.id}`);
      setHistory(res.data.history || []);
    } catch (e) {
      console.error("❌ Failed to fetch price history:", e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }

    // Batch issues (support item_name or name)
    const itemNameForBatch = item.item_name || item.name || "";
    if (itemNameForBatch) {
      try {
        setBatchIssuesLoading(true);
        const batchRes = await axios.get(`http://localhost:8080/batch-issues-by-item`, {
          params: { item_name: itemNameForBatch },
          validateStatus: (status) => status < 500,
        });

        if (batchRes.status === 200 && batchRes.data.success) {
          setBatchIssues(batchRes.data.batches || []);
        } else {
          setBatchIssues([]);
        }
      } catch (e) {
        setBatchIssues([]);
      } finally {
        setBatchIssuesLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const saveItem = async () => {
    if (!selected) return;
    try {
      await axios.put(`http://localhost:8080/update-item/${selected.id}`, {
        item_name: selected.item_name,
        item_type: selected.item_type,
        base_price: selected.base_price,
      });

      onUpdated?.(selected);
      showMessage("Success", "Item updated successfully.", "success");
    } catch (e) {
      console.error("❌ Update failed:", e);
      showMessage(
        "Error",
        `Failed to update item: ${e.response?.data?.detail || e.message || "Unknown error"}`,
        "error"
      );
    }
  };

  const deleteItem = async () => {
    if (!selected) return;
    if (!deletionReason.trim()) return;

    try {
      setDeleting(true);
      const userEmail = localStorage.getItem("email") || "unknown@example.com";
      await axios.delete(`http://localhost:8080/hard-delete-master-item/${selected.id}`, {
        data: {
          deleted_by: userEmail,
          deletion_reason: deletionReason.trim(),
        },
      });

      onDeleted?.(selected.id);
      setDeleteDialogOpen(false);
      setDeletionReason("");
      showMessage("Success", "Item deleted successfully.", "success");
    } catch (e) {
      console.error("❌ Delete failed:", e);
      showMessage(
        "Error",
        `Failed to delete item: ${e.response?.data?.detail || e.message || "Unknown error"}`,
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
        background: "#fff",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid #E5E7EB",
          position: "sticky",
          top: 0,
          zIndex: 5,
          backgroundColor: "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight={900}>
            Item Details
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={saveItem}
            sx={{ bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}
          >
            Save
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              setDeletionReason("");
              setDeleteDialogOpen(true);
            }}
            startIcon={<DeleteIcon fontSize="small" />}
            sx={{ bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2, backgroundColor: "#F3F4F6" }}>
        {!selected ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Editable Fields */}
            <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid #E5E7EB", boxShadow: "none" }}>
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                gap={2}
                alignItems="center"
                sx={{ "& .MuiTextField-root": { flex: 1, minWidth: 220 } }}
              >
                <TextField
                  label="Item Name"
                  value={selected.item_name || ""}
                  onChange={(e) => setSelected({ ...selected, item_name: e.target.value })}
                />
                <ItemTypeDropDown
                  value={selected.item_type || ""}
                  onSelect={(value) => setSelected({ ...selected, item_type: value })}
                />
                <TextField
                  label="Base Price (₹)"
                  type="number"
                  value={selected.base_price ?? ""}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      base_price: e.target.value === "" ? null : parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
            </Paper>

            {/* Price History */}
            <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid #E5E7EB", boxShadow: "none" }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Price History
              </Typography>

              {historyLoading ? (
                <Typography variant="body2">Loading…</Typography>
              ) : history.length === 0 ? (
                <Typography variant="body2">No price history found.</Typography>
              ) : (
                <TableContainer
                  sx={{
                    maxHeight: 260,
                    borderRadius: 2,
                    overflow: "auto",
                    background: "#fff",
                  }}
                >
                  <Table
                    stickyHeader
                    size="small"
                    sx={{
                      borderCollapse: "separate",
                      borderSpacing: "0 10px",
                      "& .MuiTableCell-root": {
                        borderBottom: "none",
                        fontSize: 12.5,
                        color: "#111827",
                        py: 1.2,
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {["Invoice / Vendor Id", "Price (₹)", "Effective From", "Updated By"].map((hdr, idx, arr) => (
                          <TableCell
                            key={hdr}
                            sx={{
                              backgroundColor: "#F3F4F6",
                              fontWeight: 700,
                              fontSize: 12,
                              color: "#6B7280",
                              py: 1,
                              borderBottom: "none",
                              borderTopLeftRadius: idx === 0 ? 10 : 0,
                              borderBottomLeftRadius: idx === 0 ? 10 : 0,
                              borderTopRightRadius: idx === arr.length - 1 ? 10 : 0,
                              borderBottomRightRadius: idx === arr.length - 1 ? 10 : 0,
                            }}
                          >
                            {hdr}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {history.map((h, i) => (
                        <TableRow
                          key={i}
                          hover
                          sx={{
                            "& td": {
                              backgroundColor: "#fff",
                              borderBottom: "1px solid #EEF2F7",
                            },
                            "& td:first-of-type": {
                              borderTopLeftRadius: 10,
                              borderBottomLeftRadius: 10,
                            },
                            "& td:last-of-type": {
                              borderTopRightRadius: 10,
                              borderBottomRightRadius: 10,
                            },
                          }}
                        >
                          <TableCell sx={{ fontSize: 12.5 }}>
                            <Typography
                              component="span"
                              sx={{
                                fontSize: 12.5,
                                color: "#2563EB",
                                textDecoration: "underline",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                              title={h.venue_vendor_id ?? h.avenue_vendor_id ?? "-"}
                            >
                              {h.venue_vendor_id ?? h.avenue_vendor_id ?? "-"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ fontSize: 12.5 }}>{asINR(h.price)}</TableCell>

                          <TableCell sx={{ fontSize: 12.5 }}>
                            {h.effective_from
                              ? new Date(h.effective_from).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                          </TableCell>

                          <TableCell sx={{ fontSize: 12.5 }}>
                            {h.emp_id ? h.emp_id.split("@")[0] : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            {/* Batch Issues */}
            <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid #E5E7EB", boxShadow: "none" }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Batch Issues
              </Typography>
              <BatchIssues batches={batchIssues} loading={batchIssuesLoading} />
            </Paper>

            {/* Reload button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={async () => {
                  await loadDetails();
                  await onReload?.();
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold" color="error">
            Delete Item
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body1">
              Are you sure you want to delete <strong>"{selected?.item_name || "this item"}"</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
              ⚠️ This action cannot be undone and will permanently remove all data.
            </Typography>
            <TextField
              label="Deletion Reason"
              placeholder="Please provide a reason for deletion..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              multiline
              rows={3}
              required
              disabled={deleting}
              autoFocus
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteItem}
            disabled={!deletionReason.trim() || deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ minWidth: 100 }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: messageDialogContent.type === "error" ? "error.main" : "success.main",
          }}
        >
          {messageDialogContent.type === "error" ? <ErrorIcon color="error" /> : <CheckCircleIcon color="success" />}
          <Typography variant="h6" fontWeight="bold">
            {messageDialogContent.title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ pt: 1 }}>
            {messageDialogContent.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button
            variant="contained"
            onClick={() => setMessageDialogOpen(false)}
            sx={{
              bgcolor: messageDialogContent.type === "error" ? "error.main" : "success.main",
              "&:hover": {
                bgcolor: messageDialogContent.type === "error" ? "error.dark" : "success.dark",
              },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
