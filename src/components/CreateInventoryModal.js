// --- FULL UPDATED COMPONENT WITH FIXED LAYOUT & PROPER TABLE DISPLAY ---

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Checkbox,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  IconButton,
  Chip,
  Autocomplete,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Slide from "@mui/material/Slide";

// ---------------------- PROJECT DROPDOWN ---------------------- //
const ProjectDropDown = ({ value, onChange }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/projects_ids");
      const data = await response.json();
      if (response.ok && Array.isArray(data.projects)) {
        setProjects(data.projects.map((p) => p.project_name));
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <Autocomplete
      freeSolo
      options={projects}
      value={value}
      onChange={(e, newVal) => onChange(newVal)}
      onInputChange={(e, newVal) => onChange(newVal)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select or Enter Project"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

// ---------------------- MAIN MODAL ---------------------- //
const CreateInventoryModal = ({ materialDetails, onClose, invoiceData, refreshData }) => {

  const [selectedItems, setSelectedItems] = useState(
    materialDetails.map((item) => ({
      ...item,
      isSelected: true,
      originalQuantity: item.remaining_quantity || item.quantity || 0,
      locationEntries: [
        {
          id: `entry-${item.description}-0`,
          receivedQuantity: item.remaining_quantity || item.quantity || 0,
          location: "",
          warehouse: "1",
        }
      ],
    }))
  );

  const userEmail = localStorage.getItem("email");

  const [openDialog, setOpenDialog] = useState(false);
  const [qrData, setQrData] = useState([]);
  const [dialogSeverity, setDialogSeverity] = useState("success");
  const [dialogMessage, setDialogMessage] = useState("");

  // ---------------------- REMAINING QUANTITY ---------------------- //
  const getRemainingQuantity = (item) => {
    const totalUsed = item.locationEntries.reduce(
      (sum, entry) => sum + (Number(entry.receivedQuantity) || 0),
      0
    );
    return item.originalQuantity - totalUsed;
  };

  // ---------------------- ON CHANGE HANDLERS ---------------------- //
  const handleCheckboxChange = (index) => {
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleFieldChange = (itemIndex, entryIndex, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i === itemIndex) {
          const updatedEntries = item.locationEntries.map((entry, eIdx) =>
            eIdx === entryIndex ? { ...entry, [field]: value } : entry
          );
          return { ...item, locationEntries: updatedEntries };
        }
        return item;
      })
    );
  };

  const handleAddLocationEntry = (itemIndex) => {
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              locationEntries: [
                ...item.locationEntries,
                {
                  id: `entry-${item.description}-${item.locationEntries.length}`,
                  receivedQuantity: 0,
                  location: "",
                  warehouse: "1",
                },
              ],
            }
          : item
      )
    );
  };

  const handleRemoveLocationEntry = (itemIndex, entryIndex) => {
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              locationEntries: item.locationEntries.filter((_, idx) => idx !== entryIndex),
            }
          : item
      )
    );
  };

  // ---------------------- DIALOG HANDLERS ---------------------- //
  const showDialog = (qrResults, severity, message = "") => {
    setQrData(qrResults);
    setDialogSeverity(severity);
    setDialogMessage(
      message ||
        (severity === "success"
          ? "Inventory created successfully!"
          : severity === "warning"
          ? "Some items already exist."
          : "An error occurred while creating inventory.")
    );
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    if (dialogSeverity === "success") {
      onClose();
      refreshData();
    }
  };

  // ---------------------- SUBMIT ---------------------- //
  const handleSubmit = async () => {

    // VALIDATIONS...
    const invalidEntries = [];
    selectedItems.forEach((item) => {
      if (item.isSelected) {
        item.locationEntries.forEach((entry, idx) => {
          if (!entry.location || !entry.warehouse || Number(entry.receivedQuantity) <= 0) {
            invalidEntries.push(`${item.description} - Entry ${idx + 1}`);
          }
        });
      }
    });

    if (invalidEntries.length > 0) {
      showDialog([], "error", `Please fill required fields for: ${invalidEntries.join(", ")}`);
      return;
    }

    const payload = {
      updated_items: selectedItems
        .filter((item) => item.isSelected)
        .flatMap((item) =>
          item.locationEntries.map((entry) => ({
            item_name: item.description,
            location: entry.location,
            warehouse: entry.warehouse,
            count_change: Number(entry.receivedQuantity),
            unit_price: item.unit_price_with_gst || item.unit_price || "NA",
            avenue_created_invoice_id: invoiceData.avenue_created_invoice_id,
            master_item_id: item.master_item_id || null,
            email: userEmail,
          }))
        ),
    };

    try {
      const response = await fetch("http://localhost:8080/update-inventory-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        showDialog([], "success", result.message);
      } else {
        showDialog([], "error", result.message);
      }
    } catch (err) {
      showDialog([], "error", "Server error");
    }
  };

  // ---------------------- JSX ---------------------- //
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        p: 3,
        boxSizing: "border-box",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
        Create Inventory
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          border: "1px solid #E5E7EB",
          maxHeight: 500,
          overflow: "auto",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F3F4F6" }}>
              <TableCell></TableCell>
              <TableCell>Item Details</TableCell>
              <TableCell>Available Qty</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Received Qty</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {selectedItems.map((item, itemIndex) => {
              const remaining = getRemainingQuantity(item);
              return (
                <React.Fragment key={itemIndex}>
                  {item.locationEntries.map((entry, entryIndex) => (
                    <TableRow key={entry.id}>
                      {entryIndex === 0 && (
                        <>
                          <TableCell rowSpan={item.locationEntries.length}>
                            <Checkbox
                              checked={item.isSelected}
                              onChange={() => handleCheckboxChange(itemIndex)}
                            />
                          </TableCell>

                          <TableCell rowSpan={item.locationEntries.length}>
                            {item.description}
                          </TableCell>

                          <TableCell rowSpan={item.locationEntries.length}>
                            {item.originalQuantity}
                          </TableCell>

                          <TableCell rowSpan={item.locationEntries.length}>
                            {item.unit_price_with_gst || item.unit_price || "NA"}
                          </TableCell>
                        </>
                      )}

                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={entry.receivedQuantity}
                          onChange={(e) =>
                            handleFieldChange(itemIndex, entryIndex, "receivedQuantity", e.target.value)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <ProjectDropDown
                          value={entry.location}
                          onChange={(newVal) =>
                            handleFieldChange(itemIndex, entryIndex, "location", newVal)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          value={entry.warehouse}
                          onChange={(e) =>
                            handleFieldChange(itemIndex, entryIndex, "warehouse", e.target.value)
                          }
                        />
                      </TableCell>

                      {entryIndex === 0 && (
                        <TableCell rowSpan={item.locationEntries.length}>
                          <Chip
                            label={remaining}
                            color={remaining < 0 ? "error" : remaining === 0 ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                      )}

                      <TableCell>
                        {item.locationEntries.length > 1 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveLocationEntry(itemIndex, entryIndex)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}

                        {entryIndex === item.locationEntries.length - 1 && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAddLocationEntry(itemIndex)}
                            disabled={remaining <= 0}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ACTION BUTTONS */}
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Create Inventory
        </Button>
      </Box>

      {/* SUCCESS / ERROR DIALOG */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>{dialogSeverity.toUpperCase()}</DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreateInventoryModal;
