// src/components/Estimate.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
  Autocomplete,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API_BASE = "http://localhost:8080";

/* ---------- helpers ---------- */
const asINR = (val) => `₹${Number(val || 0).toFixed(2)}`;

const Estimate = ({ initialData = null, mode = "create", onSaveSuccess, onBack }) => {
  const isUpdate = mode === "edit" && !!initialData?.estimate_id;

  // top form
  const [projects, setProjects] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedProject, setSelectedProject] = useState(initialData?.project_id || "");
  const [property, setProperty] = useState(initialData?.property_id || "");
  const [title, setTitle] = useState(initialData?.estimate_title || "");

  // items
  const [masterItems, setMasterItems] = useState([]);
  const [items, setItems] = useState(initialData?.items || []);

  // add-row editor
  const [draft, setDraft] = useState({
    item_name: "",
    item_type: "",
    quantity: "",
    unit_price: "",
    base_price: 0,
    present_price: 0,
  });

  // row actions menu
  const [rowMenu, setRowMenu] = useState({ anchorEl: null, index: null });

  const tableContainerRef = useRef(null);

  /* ================== LOAD MASTER ITEMS ================== */
  useEffect(() => {
    axios
      .get(`${API_BASE}/get-all-masteritems-new-non-paginated`)
      .then((r) => setMasterItems(r?.data?.items || []))
      .catch(() => setMasterItems([]));
  }, []);

  /* ================== LOAD PROJECTS ================== */
  useEffect(() => {
    axios
      .get(`${API_BASE}/est-projects`)
      .then((r) => setProjects(r.data || []))
      .catch(() => setProjects([]));
  }, []);

  /* ================== LOAD PROPERTIES FOR PROJECT ================== */
  useEffect(() => {
    if (!selectedProject) {
      setProperties([]);
      setProperty("");
      return;
    }

    axios
      .get(`${API_BASE}/est-properties/${selectedProject}`)
      .then((r) => setProperties(r.data || []))
      .catch(() => setProperties([]));
  }, [selectedProject]);

  const propertyObj = useMemo(
    () => properties.find((p) => p.propertyid === property),
    [properties, property]
  );

  /* ================== AUTOSCROLL ITEMS TABLE ================== */
  useEffect(() => {
    if (items.length > 6 && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
    }
  }, [items]);

  /* ================== draft helpers ================== */
  const draftTotal = useMemo(() => {
    const q = Number(draft.quantity || 0);
    const p = Number(draft.unit_price || 0);
    return q * p;
  }, [draft.quantity, draft.unit_price]);

  const canAddDraft = useMemo(() => {
    const q = Number(draft.quantity || 0);
    const p = Number(draft.unit_price || 0);
    return !!draft.item_name && q > 0 && p >= 0;
  }, [draft.item_name, draft.quantity, draft.unit_price]);

  const resetDraft = () => {
    setDraft({
      item_name: "",
      item_type: "",
      quantity: "",
      unit_price: "",
      base_price: 0,
      present_price: 0,
    });
  };

  const onSelectMasterItem = (_, value) => {
    if (!value) return;
    const price = Math.max(Number(value.base_price || 0), Number(value.present_price || 0));
    setDraft({
      item_name: value.item_name || "",
      item_type: value.item_type || "",
      quantity: "1",
      unit_price: String(price),
      base_price: Number(value.base_price || 0),
      present_price: Number(value.present_price || 0),
    });
  };

  const addDraftToItems = () => {
    if (!canAddDraft) return;

    const q = Number(draft.quantity || 0);
    const p = Number(draft.unit_price || 0);

    setItems((prev) => [
      ...prev,
      {
        item_id: undefined,
        item_name: draft.item_name,
        item_type: draft.item_type || "",
        quantity: q,
        unit_price: p,
        total_price: q * p,
        is_custom: true,
      },
    ]);

    resetDraft();
  };

  /* ================== existing item edits ================== */
  const handleQuantityChange = (i, qty) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, quantity: qty } : it)));

  const handlePriceChange = (i, price) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, unit_price: price } : it)));

  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  /* ================== totals ================== */
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  const gst = 0;
  const amountDue = subtotal + gst;

  /* ================== SAVE ================== */
  const handleSubmit = async () => {
    if (!selectedProject || !property) {
      alert("Please select both project and property.");
      return;
    }

    const payload = {
      estimate_id: isUpdate ? initialData.estimate_id : undefined,
      project_id: selectedProject,
      property_id: property,
      property_name: propertyObj?.name || "",
      estimate_title: title || `Estimate for ${propertyObj?.name || "Property"} in ${selectedProject}`,
      items: items.map((item) => ({
        item_id: item.item_id || undefined,
        item_name: item.item_name,
        item_type: item.item_type,
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 0),
        total_price: Number(item.unit_price || 0) * Number(item.quantity || 0),
        is_custom: item.is_custom ?? true,
      })),
    };

    try {
      await axios[isUpdate ? "put" : "post"](
        isUpdate ? `${API_BASE}/estimates/update/${initialData.estimate_id}` : `${API_BASE}/estimates/save`,
        payload
      );
      onSaveSuccess?.();
    } catch (err) {
      console.error(err);
      alert(`Failed to ${isUpdate ? "update" : "save"} estimate`);
    }
  };

  /* ================== UI styles ================== */
  const shellSx = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    boxShadow: "none",
    overflow: "hidden",
  };

  const labelSx = { fontSize: 12, color: "#6B7280", fontWeight: 700, mb: 0.5 };

  const tableHeadCellSx = {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748B",
    backgroundColor: "#F8FAFC",
    borderBottom: "1px solid #E5E7EB",
    whiteSpace: "nowrap",
  };

  const tableBodyCellSx = {
    fontSize: 13,
    borderBottom: "1px solid #EEF2F7",
    color: "#0F172A",
    whiteSpace: "nowrap",
    py: 1.25,
  };

  return (
    <Paper sx={shellSx}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #EEF2F7",
          backgroundColor: "#fff",
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
          {isUpdate ? "Edit Estimate" : "Create Estimate"}
        </Typography>

        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            borderRadius: 2,
            px: 3,
            borderColor: "#DC2626",
            color: "#DC2626",
            backgroundColor: "rgba(220, 38, 38, 0.06)",
            "&:hover": {
              borderColor: "#B91C1C",
              color: "#B91C1C",
              backgroundColor: "rgba(220, 38, 38, 0.10)",
            },
          }}
        >
          X Close
        </Button>
      </Box>

      {/* Top form */}
      <Box sx={{ px: 2, py: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Select project</Typography>
            <Autocomplete
              options={projects}
              value={selectedProject || null}
              onChange={(_, v) => {
                setSelectedProject(v || "");
                setProperty("");
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select project"
                  size="small"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#F8FAFC" } }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Select Property</Typography>
            <Autocomplete
              options={properties}
              getOptionLabel={(opt) => opt.name || ""}
              value={properties.find((p) => p.propertyid === property) || null}
              onChange={(_, v) => setProperty(v?.propertyid || "")}
              disabled={!selectedProject}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select property"
                  size="small"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#F8FAFC" } }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography sx={labelSx}>Estimate Title</Typography>
            <TextField
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Estimate title"
              size="small"
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#F8FAFC" } }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Items */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 16, mb: 1 }}>Items</Typography>

        <Paper variant="outlined" sx={{ borderRadius: "12px", overflow: "hidden", borderColor: "#E5E7EB" }}>
          <TableContainer ref={tableContainerRef} sx={{ maxHeight: 360 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeadCellSx}>Item</TableCell>
                  <TableCell sx={tableHeadCellSx}>Type</TableCell>
                  <TableCell sx={tableHeadCellSx} align="center">Qty</TableCell>
                  <TableCell sx={tableHeadCellSx} align="center">Unit Price</TableCell>
                  <TableCell sx={tableHeadCellSx} align="right">Total</TableCell>
                  <TableCell sx={tableHeadCellSx} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {/* Add-row */}
                <TableRow sx={{ backgroundColor: "#FBFDFF" }}>
                  <TableCell sx={tableBodyCellSx}>
                    <Autocomplete
                      options={masterItems}
                      getOptionLabel={(o) => o.item_name || ""}
                      value={masterItems.find((mi) => mi.item_name === draft.item_name) || null}
                      onChange={onSelectMasterItem}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search Master Items"
                          size="small"
                          sx={{
                            minWidth: 220,
                            "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" },
                          }}
                        />
                      )}
                    />
                  </TableCell>

                  <TableCell sx={tableBodyCellSx}>
                    <TextField
                      value={draft.item_type}
                      placeholder="Item Type"
                      size="small"
                      fullWidth
                      InputProps={{ readOnly: true }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" } }}
                    />
                  </TableCell>

                  <TableCell sx={tableBodyCellSx} align="center">
                    <TextField
                      value={draft.quantity}
                      onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="Qty"
                      size="small"
                      type="number"
                      sx={{ width: 110, "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" } }}
                    />
                  </TableCell>

                  <TableCell sx={tableBodyCellSx} align="center">
                    <TextField
                      value={draft.unit_price}
                      onChange={(e) => setDraft((p) => ({ ...p, unit_price: e.target.value }))}
                      placeholder="Unit Price"
                      size="small"
                      type="number"
                      sx={{ width: 140, "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" } }}
                    />
                  </TableCell>

                  <TableCell sx={tableBodyCellSx} align="right">
                    <Typography sx={{ fontWeight: 900 }}>{asINR(draftTotal)}</Typography>
                  </TableCell>

                  <TableCell sx={tableBodyCellSx} align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Tooltip title="Clear">
                        <IconButton
                          onClick={resetDraft}
                          size="small"
                          sx={{
                            borderRadius: "999px",
                            backgroundColor: "#FEE2E2",
                            "&:hover": { backgroundColor: "#FECACA" },
                          }}
                        >
                          <CloseIcon fontSize="small" sx={{ color: "#B91C1C" }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Add Item">
                        <span>
                          <IconButton
                            disabled={!canAddDraft}
                            onClick={addDraftToItems}
                            size="small"
                            sx={{
                              borderRadius: "999px",
                              backgroundColor: "#DBEAFE",
                              "&:hover": { backgroundColor: "#BFDBFE" },
                            }}
                          >
                            <CheckIcon fontSize="small" sx={{ color: "#1D4ED8" }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>

                {/* Existing rows */}
                {items.map((it, i) => (
                  <TableRow key={`${it.item_name}-${i}`} hover>
                    <TableCell sx={tableBodyCellSx}>{it.item_name}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{it.item_type || "-"}</TableCell>

                    <TableCell sx={tableBodyCellSx} align="center">
                      <TextField
                        type="number"
                        value={it.quantity}
                        onChange={(e) => handleQuantityChange(i, Number(e.target.value || 0))}
                        size="small"
                        sx={{ width: 110, "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" } }}
                      />
                    </TableCell>

                    <TableCell sx={tableBodyCellSx} align="center">
                      <TextField
                        type="number"
                        value={it.unit_price}
                        onChange={(e) => handlePriceChange(i, Number(e.target.value || 0))}
                        size="small"
                        sx={{ width: 140, "& .MuiOutlinedInput-root": { borderRadius: "10px", backgroundColor: "#fff" } }}
                      />
                    </TableCell>

                    <TableCell sx={tableBodyCellSx} align="right">
                      <Typography sx={{ fontWeight: 900 }}>
                        {asINR(Number(it.unit_price || 0) * Number(it.quantity || 0))}
                      </Typography>
                    </TableCell>

                    <TableCell sx={tableBodyCellSx} align="center">
                      <IconButton size="small" onClick={(e) => setRowMenu({ anchorEl: e.currentTarget, index: i })}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No items added yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add New Item */}
        <Box sx={{ mt: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => tableContainerRef.current?.scrollTo?.({ top: 0, behavior: "smooth" })}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 800,
              backgroundColor: "#EEF2FF",
              borderColor: "#C7D2FE",
              color: "#1E40AF",
              "&:hover": { backgroundColor: "#E0E7FF", borderColor: "#A5B4FC" },
            }}
          >
            Add New Item
          </Button>
        </Box>

        {/* Summary card */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              width: 360,
              borderRadius: "12px",
              borderColor: "#E5E7EB",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography sx={{ color: "#64748B" }}>Subtotal:</Typography>
                <Typography sx={{ fontWeight: 900 }}>{asINR(subtotal)}</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography sx={{ color: "#64748B" }}>GST</Typography>
                <Typography sx={{ fontWeight: 900 }}>{asINR(0)}</Typography>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ p: 2, backgroundColor: "#F8FAFC", display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 900 }}>Amount Due</Typography>
              <Typography sx={{ fontWeight: 900 }}>{asINR(amountDue)}</Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Footer actions */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
          borderTop: "1px solid #EEF2F7",
          backgroundColor: "#fff",
        }}
      >
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            borderRadius: "10px",
            height: 40,
            px: 3,
            fontWeight: 800,
            textTransform: "none",
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            borderRadius: "10px",
            height: 40,
            px: 4,
            fontWeight: 900,
            textTransform: "none",
            backgroundColor: "#3B82F6",
            "&:hover": { backgroundColor: "#2563EB" },
          }}
        >
          Save
        </Button>
      </Box>

      {/* Kebab menu */}
      <Menu
        anchorEl={rowMenu.anchorEl}
        open={!!rowMenu.anchorEl}
        onClose={() => setRowMenu({ anchorEl: null, index: null })}
      >
        <MenuItem
          onClick={() => {
            if (rowMenu.index !== null) removeItem(rowMenu.index);
            setRowMenu({ anchorEl: null, index: null });
          }}
          sx={{ color: "#B91C1C", fontWeight: 800 }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default Estimate;
