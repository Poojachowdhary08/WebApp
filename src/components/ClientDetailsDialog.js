// ClientDetailsDialog.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

import axios from "axios";

const API_BASE = "http://localhost:8080";

const ClientDetailsDialog = ({ client, onClose, onUpdated }) => {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  const [assignedProps, setAssignedProps] = useState([]);
  const [properties, setProperties] = useState([]);

  // table pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProject, setAssignProject] = useState("");
  const [assignSelectedIds, setAssignSelectedIds] = useState([]);

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");

  const showToast = (msg, sev = "success") => {
    setToastMessage(msg);
    setToastSeverity(sev);
    setToastOpen(true);
  };

  const toTitle = (str) =>
    String(str || "")
      .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      .trim();

  const normalizeProperty = (p) => {
    const propertyid = p.propertyid || p.property_id || p.id || p.propertyId;
    const property_name = p.property_name || p.name || "Unnamed";
    const project_name = p.project_name || p.project || p.projectName || "Unknown";
    const status = p.status || p.property_status || p.propertyStatus || "-";
    return { ...p, propertyid, property_name, project_name, status };
  };

  const fetchAssignments = async () => {
    const res = await fetch(`${API_BASE}/clients/${client.client_id}/properties`);
    const data = await res.json();

    const normalized = (data || []).map((prop) => ({
      ...prop,
      property_id: prop.property_id || prop.propertyid || prop.id,
      property_name: prop.property_name || prop.name || "Unnamed",
      project_name: prop.project_name || prop.project || "Unknown",
      status: prop.status || prop.assignment_status || prop.property_status || "-",
      approved_on: prop.approved_on ?? null, // <-- keep this for approval UI
    }));

    setAssignedProps(normalized);
  };

  const fetchAllProperties = async () => {
    try {
      const res = await axios.get(`${API_BASE}/properties-and-projects`);
      const list = (res?.data?.properties || []).map(normalizeProperty);
      setProperties(list);
    } catch (err) {
      console.error("🚨 Failed to fetch properties:", err);
      setProperties([]);
    }
  };

  useEffect(() => {
    if (!client?.client_id) return;

    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      password: "",
    });

    setEditMode(false);
    setPage(0);
    setRowsPerPage(25);

    setAssignOpen(false);
    setAssignProject("");
    setAssignSelectedIds([]);

    fetchAssignments();
    fetchAllProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.client_id]);

  // build project list for assign dialog dropdown
  const projectOptions = useMemo(() => {
    const unique = Array.from(new Set((properties || []).map((p) => p.project_name || "Unknown")));
    unique.sort((a, b) => String(a).localeCompare(String(b)));
    return unique;
  }, [properties]);

  // Assigned table needs only: id, name, status, approval.
  // We'll enrich name/status from master list if missing.
  const assignedPropsEnriched = useMemo(() => {
    const map = new Map(properties.map((p) => [p.propertyid, p]));
    return (assignedProps || []).map((ap) => {
      const master = map.get(ap.property_id);
      return {
        property_id: ap.property_id,
        property_name: ap.property_name || master?.property_name || "Unnamed",
        status: master?.status || ap.status || "-",
        approved_on: ap.approved_on ?? null,
        project_name: ap.project_name || master?.project_name || "Unknown",
      };
    });
  }, [assignedProps, properties]);

  const pagedAssigned = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return assignedPropsEnriched.slice(start, end);
  }, [assignedPropsEnriched, page, rowsPerPage]);

  const getStatusStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "pending") {
      return {
        backgroundColor: "#f8d7a3",
        color: "#d69e2e",
        border: "1px solid #f1c27d",
        textTransform: "uppercase",
      };
    }
    if (s === "approved") {
      return {
        backgroundColor: "#d4edda",
        color: "#155724",
        border: "1px solid #c3e6cb",
        textTransform: "uppercase",
      };
    }
    // default like your older code
    return {
      backgroundColor: "#E9EEFF",
      color: "#2F5BFF",
      border: "1px solid #D7E0FF",
      textTransform: "capitalize",
    };
  };

  const handleSaveClient = async () => {
    const payload = { ...form };
    if (!payload.password) delete payload.password;

    try {
      const response = await fetch(`${API_BASE}/clients/${client.client_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(`❌ Failed to update client: ${errorData.detail || "Unknown error"}`, "error");
        return;
      }

      const updated = await response.json();
      onUpdated?.(updated);
      showToast("✅ Client details updated!", "success");
      setEditMode(false);
    } catch (err) {
      console.error("Update failed", err);
      showToast("❌ An error occurred while updating the client.", "error");
    }
  };

  // APPROVAL (same logic you had earlier)
  const handleApprove = async (propertyId) => {
    const userEmail = localStorage.getItem("email");
    try {
      const res = await fetch(
        `${API_BASE}/clients/approve-assignment?client_id=${client.client_id}&property_id=${propertyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": userEmail || "unknown",
          },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        showToast(`❌ Approval failed: ${error.detail || "Unknown error"}`, "error");
        return;
      }

      await fetchAssignments();
      showToast("✅ Approved!", "success");
    } catch (err) {
      console.error("Approval error:", err);
      showToast("❌ An error occurred while approving.", "error");
    }
  };

  const handleAssign = async (ids) => {
    if (!ids || ids.length === 0) return;

    try {
      const res = await fetch(`${API_BASE}/clients/${client.client_id}/assign-properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_ids: ids }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        showToast(`❌ Failed to assign: ${errorData.detail || "Unknown error"}`, "error");
        return;
      }

      await fetchAssignments();
      showToast("✅ Properties assigned successfully!", "success");
    } catch (err) {
      console.error("Assign error:", err);
      showToast("❌ Something went wrong while assigning.", "error");
    }
  };

  // Assign dialog list:
  // - filtered by selected project (dialog only)
  // - already assigned ones disabled (switch ON + disabled, like screenshot)
  const assignDialogList = useMemo(() => {
    const base = assignProject
      ? properties.filter((p) => p.project_name === assignProject)
      : properties;

    const list = [...base].sort((a, b) =>
      String(a.property_name || "").localeCompare(String(b.property_name || ""))
    );

    return list.map((p) => {
      const alreadyAssigned = assignedProps.some((ap) => ap.property_id === p.propertyid);
      return { ...p, alreadyAssigned };
    });
  }, [properties, assignProject, assignedProps]);

  const assignAllSelectableIds = useMemo(() => {
    return assignDialogList.filter((p) => !p.alreadyAssigned).map((p) => p.propertyid);
  }, [assignDialogList]);

  const isAssignAllOn =
    assignAllSelectableIds.length > 0 && assignSelectedIds.length === assignAllSelectableIds.length;

  const openAssignDialog = () => {
    // pick first project by default so dialog isn't empty
    const preProject = projectOptions[0] || "";
    setAssignProject(preProject);
    setAssignSelectedIds([]);
    setAssignOpen(true);
  };

  if (!client) return null;

  return (
    <Box sx={{ p: 2 }}>
      {/* ---------- Top summary strip (like screenshot) ---------- */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #EEF0F4",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", minWidth: 280 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              fontWeight: 900,
              bgcolor: "#6D4CFF",
              boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
            }}
          >
            {String(client?.name || "C").trim().charAt(0).toUpperCase()}
          </Avatar>

          <Box>
            <Typography sx={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>
              Client ID
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 900, color: "#111827" }}>
              {client.client_id || "-"}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ flex: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={miniLabel}>Client Name</Typography>
            <Typography sx={miniValue}>{client.name || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={miniLabel}>Email</Typography>
            <Typography sx={miniValue}>{client.email || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={miniLabel}>Phone No.</Typography>
            <Typography sx={miniValue}>{client.phone || "-"}</Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography sx={miniLabel}>Address</Typography>
            <Typography sx={{ ...miniValue, maxWidth: 420 }} noWrap>
              {client.address || "-"}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title={editMode ? "Stop Editing" : "Edit Client"}>
          <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditMode((p) => !p)}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 2.2,
                
              }}
            >
              EDIT
            </Button>
      
          </Tooltip>
          <Button
            variant="outlined"
            onClick={onClose}            sx={{
              height: 36,
              borderRadius: 2,
              border: "1px solid #FCA5A5",
              color: "#DC2626",
              backgroundColor: "rgba(220,38,38,0.06)",
              fontWeight: 900,
              px: 1.6,
              textTransform: "none",
              minWidth: 0,
              "&:hover": {
                backgroundColor: "rgba(220,38,38,0.10)",
                borderColor: "#EF4444",
              },
            }}
          >
            X&nbsp;Close
          </Button>
        </Box>
      </Paper>

      {/* ---------- Edit form (optional) ---------- */}
      {editMode && (
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            borderRadius: 3,
            border: "1px solid #EEF0F4",
            p: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Edit Client</Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password (optional)"
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={form.address || ""}
                multiline
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button variant="outlined" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveClient}
                  sx={{ bgcolor: "#2A3663" }}
                >
                  Save
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ---------- Properties section (NO filters row) ---------- */}
      <Paper
        elevation={0}
        sx={{
          mt: 2,
          borderRadius: 3,
          border: "1px solid #EEF0F4",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #EEF0F4",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900 }}>Properties</Typography>

          <Button
            variant="contained"
            onClick={openAssignDialog}
            sx={{
             
              px: 2.5,
              height: 40,
              fontWeight: 900,
              borderRadius: 2,
              whiteSpace: "nowrap",
            }}
          >
            ASSIGN PROPERTY
          </Button>
        </Box>

        <Box sx={{ px: 2, py: 2 }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: "1px solid #EEF0F4", borderRadius: 2 }}
          >
            <Table sx={{ tableLayout: "fixed" }}>
              <TableHead sx={{ bgcolor: "#F6F7FB" }}>
                <TableRow>
                  <TableCell sx={headCell}>Property ID</TableCell>
                  <TableCell sx={headCell}>Property Name</TableCell>
                  <TableCell sx={headCell}>Status</TableCell>
                  <TableCell sx={headCell}>Approval</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pagedAssigned.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 4, textAlign: "center", color: "#6B7280" }}>
                      No properties assigned.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedAssigned.map((p) => (
                    <TableRow key={p.property_id} hover>
                      <TableCell sx={{  fontWeight: 600 }}>
                        {p.property_id}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.property_name}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            ...getStatusStyle(p.status),
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1.5,
                            fontWeight: 900,
                            fontSize: 12,
                            minWidth: 110,
                          }}
                        >
                          {toTitle(p.status)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {p.approved_on === null || p.approved_on === "0" ? (
                          <Tooltip title="Slide to approve">
                            <Switch
                              color="success"
                              onChange={() => handleApprove(p.property_id)}
                            />
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontWeight: 800 }}>
                            {new Date(p.approved_on).toLocaleDateString()}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={assignedPropsEnriched.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </Box>
      </Paper>

      {/* ---------- Assign Properties Dialog (like screenshot #2) ---------- */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="md">
        <Box sx={{ p: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 20, fontWeight: 900 }}>Assign Properties</Typography>
          <IconButton onClick={() => setAssignOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <DialogContent sx={{ pt: 0 }}>
          <Typography sx={miniLabel}>Select Project</Typography>
          <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
            <Select
              value={assignProject}
              displayEmpty
              onChange={(e) => {
                setAssignProject(e.target.value);
                setAssignSelectedIds([]);
              }}
            >
              <MenuItem value="">
                <em>All Projects</em>
              </MenuItem>
              {projectOptions.map((p) => (
                <MenuItem key={p} value={p}>
                  {toTitle(p)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 900 }}>Assign Properties</Typography>

            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  checked={isAssignAllOn}
                  onChange={(e) =>
                    setAssignSelectedIds(e.target.checked ? assignAllSelectableIds : [])
                  }
                />
              }
              label="Assign All"
            />
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ mt: 1, border: "1px solid #EEF0F4", borderRadius: 2 }}
          >
            <Table>
              <TableHead sx={{ bgcolor: "#F6F7FB" }}>
                <TableRow>
                  <TableCell sx={headCell}>Property ID</TableCell>
                  <TableCell sx={headCell}>Property Name</TableCell>
                  <TableCell sx={headCell} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {assignDialogList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 4, textAlign: "center", color: "#6B7280" }}>
                      No properties found.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignDialogList.map((p) => {
                    const checked = assignSelectedIds.includes(p.propertyid);
                    const disabled = p.alreadyAssigned;

                    return (
                      <TableRow key={p.propertyid} hover sx={{ opacity: disabled ? 0.6 : 1 }}>
                        <TableCell>{p.propertyid}</TableCell>
                        <TableCell>{p.property_name}</TableCell>
                        <TableCell align="right">
                          <Switch
                            checked={disabled ? true : checked}
                            disabled={disabled}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setAssignSelectedIds((prev) => {
                                if (on) return Array.from(new Set([...prev, p.propertyid]));
                                return prev.filter((id) => id !== p.propertyid);
                              });
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setAssignOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 900, px: 3 }}
          >
            CANCEL
          </Button>

          <Button
            variant="contained"
            onClick={async () => {
              await handleAssign(assignSelectedIds);
              setAssignOpen(false);
              setAssignSelectedIds([]);
            }}
            disabled={assignSelectedIds.length === 0}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 3,
              bgcolor: "#3F6AE0",
            }}
          >
            ADD PROPERTIES
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------- Toast ---------- */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity={toastSeverity} sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const miniLabel = { fontSize: 12, color: "#6B7280", fontWeight: 800 };
const miniValue = { fontSize: 14, color: "#111827", fontWeight: 900 };

const headCell = {
  fontWeight: 900,
  color: "#111827",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
};

export default ClientDetailsDialog;
