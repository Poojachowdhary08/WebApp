// AddMaterialsMissingPhasesModal.js – Modal for adding materials to phases in schedule but not in inventory template
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Autocomplete,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import axios from "axios";

const MASTER_ITEMS_API = "http://localhost:8080/get-all-masteritems-new-non-paginated";
const UOM_API = "http://localhost:8080/get-all-uom";

const COMMON_FLOORS = ["", "GF", "FF", "SF", "BF", "SS", "TF", "Other"];

const AREA_TYPES = [
  { value: "construction_area", label: "Construction area" },
  { value: "slab_area", label: "Slab area" },
  { value: "brick_work_area", label: "Brick work area" },
  { value: "plastering_area", label: "Plastering area" },
];

const AddMaterialsMissingPhasesModal = ({
  open,
  onClose,
  phases,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onSave,
  saving,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [masterItems, setMasterItems] = useState([]);
  const [uomList, setUomList] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingUom, setLoadingUom] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const fetchMasterItems = async () => {
      setLoadingItems(true);
      try {
        const res = await axios.get(MASTER_ITEMS_API, { params: { limit: 500, offset: 0 } });
        const items = res?.data?.items ?? [];
        const mapped = (Array.isArray(items) ? items : []).map((it) => ({
          id: it.id,
          name: it.item_name ?? it.name ?? "",
        })).filter((it) => it.name);
        if (mounted) setMasterItems(mapped);
      } catch (e) {
        console.error("Error fetching master items:", e);
        if (mounted) setMasterItems([]);
      } finally {
        if (mounted) setLoadingItems(false);
      }
    };
    const fetchUom = async () => {
      setLoadingUom(true);
      try {
        const res = await axios.get(UOM_API);
        const list = res?.data?.uom_list ?? [];
        const mapped = (Array.isArray(list) ? list : [])
          .filter((u) => u.is_active !== false)
          .map((u) => ({ id: u.basic_uom_id, code: u.uom_code ?? "", name: u.uom_name ?? "" }))
          .filter((u) => u.code);
        if (mounted) setUomList(mapped);
      } catch (e) {
        console.error("Error fetching UOM:", e);
        if (mounted) setUomList([]);
      } finally {
        if (mounted) setLoadingUom(false);
      }
    };
    fetchMasterItems();
    fetchUom();
    return () => { mounted = false; };
  }, [open]);

  const itemOptions = masterItems.map((it) => it.name);
  const uomOptions = uomList.map((u) => ({ value: u.code, label: u.name ? `${u.code} - ${u.name}` : u.code }));

  const INPUT_MODES = [
    { value: "calculated", label: "Area × rate" },
    { value: "pieces", label: "Pieces / fixed qty" },
  ];

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="xl"
      fullWidth
      fullScreen={isSmallScreen}
      PaperProps={{
        sx: {
          maxHeight: "90vh",
          borderRadius: 2,
          width: "95vw",
          maxWidth: 1400,
          minWidth: { xs: "min(95vw, 320px)", sm: 600, md: 1000 },
          m: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: "#111827", pb: 1, pr: { xs: 1, sm: 2 } }}>
        <span>Add materials for missing phases</span>
        <IconButton onClick={onClose} size="small" disabled={saving} sx={{ color: "#64748b" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography sx={{ fontSize: 14, color: "#64748b", mb: 2 }}>
          The following phases are in your schedule but not in the inventory template. Add materials for each phase in the tables below. When done, click Save and then Generate Draft again.
        </Typography>
        {phases.map((phase, phaseIndex) => (
          <Paper key={phaseIndex} elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fafafa", overflow: "hidden" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827", mb: 1.5 }}>
              {phase.phase_name || `Phase ${phaseIndex + 1}`}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.5 }}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => onAddRow(phaseIndex)} sx={{ textTransform: "none" }}>
                Add row
              </Button>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb", overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell>Item</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Area type</TableCell>
                    <TableCell align="right">Rate / sqft</TableCell>
                    <TableCell align="right">Qty (pieces)</TableCell>
                    <TableCell align="right">Wastage %</TableCell>
                    <TableCell>Floor (opt)</TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                    {(phase.items || []).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell sx={{ minWidth: 140 }}>
                          <Autocomplete
                            size="small"
                            freeSolo
                            options={itemOptions}
                            value={row.item_name || ""}
                            onInputChange={(_, val) => onUpdateRow(phaseIndex, rowIndex, "item_name", val ?? "")}
                            onChange={(_, val) => onUpdateRow(phaseIndex, rowIndex, "item_name", (typeof val === "string" ? val : val?.name ?? "") ?? "")}
                            loading={loadingItems}
                            renderInput={(params) => (
                              <TextField {...params} placeholder="Select or type item" />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <Select
                            size="small"
                            fullWidth
                            displayEmpty
                            value={row.unit || ""}
                            onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "unit", e.target.value)}
                            renderValue={(v) => v || "— Select unit —"}
                          >
                            <MenuItem value="">— Select unit —</MenuItem>
                            {uomOptions.map((u) => (
                              <MenuItem key={u.value} value={u.value}>
                                {u.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <Select
                            size="small"
                            fullWidth
                            value={row.input_mode || "calculated"}
                            onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "input_mode", e.target.value)}
                          >
                            {INPUT_MODES.map((m) => (
                              <MenuItem key={m.value} value={m.value}>
                                {m.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          fullWidth
                          value={row.area_type || "construction_area"}
                          onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "area_type", e.target.value)}
                        >
                          {AREA_TYPES.map((a) => (
                            <MenuItem key={a.value} value={a.value}>
                              {a.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        {(row.input_mode || "calculated") === "calculated" ? (
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 110 }}
                            value={row.consumption_rate_per_sqft || ""}
                            onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "consumption_rate_per_sqft", e.target.value)}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(row.input_mode || "calculated") === "pieces" ? (
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 1 }}
                            sx={{ width: 90 }}
                            placeholder="e.g. 2"
                            value={row.fixed_quantity ?? ""}
                            onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "fixed_quantity", e.target.value)}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 0, max: 100, step: 0.5 }}
                          sx={{ width: 85 }}
                          value={row.wastage_percentage || ""}
                          onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "wastage_percentage", e.target.value)}
                        />
                      </TableCell>
                        <TableCell sx={{ minWidth: 90 }}>
                          <Select
                            size="small"
                            fullWidth
                            displayEmpty
                            value={row.floor_name || ""}
                            onChange={(e) => onUpdateRow(phaseIndex, rowIndex, "floor_name", e.target.value)}
                            renderValue={(v) => v || "— Optional —"}
                          >
                            <MenuItem value="">— Optional —</MenuItem>
                            {[...COMMON_FLOORS.filter(Boolean), ...(row.floor_name && !COMMON_FLOORS.includes(row.floor_name) ? [row.floor_name] : [])].map((f) => (
                              <MenuItem key={f} value={f}>
                                {f}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => onRemoveRow(phaseIndex, rowIndex)}
                          disabled={(phase.items || []).length <= 1}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
        >
          {saving ? <CircularProgress size={22} /> : "Save all"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMaterialsMissingPhasesModal;
