import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { Inventory, Block } from "@mui/icons-material";
import { createFilterOptions } from "@mui/material/Autocomplete";

const filter = createFilterOptions();

const MaterialsSection = ({
  selectedTask,
  materials,
  onRequestInventory,
  onBlockInventory,
  onAddInventory,
}) => {
  const [openOtherMaterialsDialog, setOpenOtherMaterialsDialog] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // can be an object or a string if new
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  // Fetch the inventory items from the API when the dialog opens
  useEffect(() => {
    if (openOtherMaterialsDialog) {
      const fetchInventoryItems = async () => {
        try {
          const response = await fetch("http://localhost:8080/all-inventory");
          const data = await response.json();
          console.log(data);
          const items = Array.isArray(data) ? data : data.inventory || [];
          console.log("Fetched inventory items:", items);
          setInventoryItems(items);
        } catch (error) {
          console.error("Error fetching inventory:", error);
        }
      };
      fetchInventoryItems();
    }
  }, [openOtherMaterialsDialog]);

  const handleOpenOtherMaterials = () => {
    setOpenOtherMaterialsDialog(true);
  };

  const handleCloseOtherMaterials = () => {
    setOpenOtherMaterialsDialog(false);
    // Reset form fields if needed
    setSelectedItem(null);
    setQuantity("");
    setUnit("");
  };

  const handleSubmitOtherMaterials = () => {
    // In this example, if the selectedItem is a string then it's a new item
    if (typeof selectedItem === "string") {
      console.log("New material added:", selectedItem);
    } else if (selectedItem && selectedItem.invoice_id) {
      console.log("Selected existing item ID:", selectedItem.invoice_id);
    }
    console.log("Requested Quantity:", quantity);
    console.log("Unit:", unit);
    // For now, simply close the dialog after submission
    handleCloseOtherMaterials();
  };

  // Compute the submit button label based on quantity
  let submitButtonLabel = " ";
  if (
    selectedItem &&
    typeof selectedItem !== "string" &&
    selectedItem.quantity &&
    quantity
  ) {
    const available = parseFloat(selectedItem.quantity);
    const requested = parseFloat(quantity);
    if (requested > available) {
      submitButtonLabel = "Request  Inventory";
    } else {
      submitButtonLabel = "Block Inventory";
    }
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          padding: 3,
          borderRadius: 3,
          marginBottom: 3,
          backgroundColor: "#f5f5f5",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600} sx={{ color: "#333" }}>
            Materials for {selectedTask.phasename}
          </Typography>
          <Button variant="contained" color="primary" onClick={handleOpenOtherMaterials}>
            Request Other Materials
          </Button>
        </Stack>
        {materials.length > 0 ? (
          <Grid container spacing={2}>
            {materials.map((mat) => (
              <Grid item xs={12} sm={6} md={4} key={mat.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    background: "",
                    color: "#333",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    padding: 2,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {mat.material_name}
                      </Typography>
                    </Stack>
                    <Divider sx={{ my: 1, backgroundColor: "#8B5E3C" }} />
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Quantity:</strong> {mat.required_quantity} {mat.unit}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Stage:</strong> {mat.stage}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Received Qty:</strong> {mat.received_quantity}
                      </Typography>
                    </Stack>
                    {/* <Stack direction="row" spacing={2} mt={2}>
                      {mat.received_quantity > 0 ? (
                        <>
                          <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<Block />}
                            onClick={() => onBlockInventory(mat.id)}
                          >
                            Block Inventory
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Inventory />}
                            onClick={() => onAddInventory(mat.id)}
                          >
                            Add Inventory
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Inventory />}
                          onClick={() => onRequestInventory(mat.id)}
                        >
                          Request Inventory
                        </Button>
                      )}
                    </Stack> */}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No material records available.
          </Typography>
        )}
      </Paper>
      {/* Dialog for "Request Other Materials" */}
      <Dialog
        open={openOtherMaterialsDialog}
        onClose={handleCloseOtherMaterials}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 3, backgroundColor: "#fafafa" },
        }}
      >
        <DialogTitle sx={{ backgroundColor: "", color: "Black" }}>
          Request Other Materials
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <Autocomplete
              freeSolo
              options={inventoryItems}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.item_name
              }
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                if (params.inputValue !== "") {
                  filtered.push({
                    inputValue: params.inputValue,
                    item_name: `Add "${params.inputValue}"`,
                  });
                }
                return filtered;
              }}
              value={selectedItem}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  setSelectedItem(newValue);
                } else if (newValue && newValue.inputValue) {
                  setSelectedItem(newValue.inputValue);
                } else {
                  setSelectedItem(newValue);
                }
              }}
              loading={inventoryItems.length === 0}
              renderOption={(props, option) => {
                if (typeof option === "string") {
                  return <li {...props}>{option}</li>;
                }
                // Display both item_name and available quantity
                return (
                  <li {...props}>
                    {option.item_name} (Qty: {option.quantity})
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Material"
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {inventoryItems.length === 0 ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{
                backgroundColor: "background.paper",
                borderRadius: 2,
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "divider",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
                color: "text.primary",
                fontWeight: 500,
              }}
            />
          </FormControl>
          <TextField
            margin="dense"
            label="Quantity"
            fullWidth
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Unit"
            fullWidth
            variant="outlined"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseOtherMaterials} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmitOtherMaterials} color="primary">
            {submitButtonLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MaterialsSection;