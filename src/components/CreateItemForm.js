import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

const CreateItemForm = ({ onClose }) => {
  const [itemName, setItemName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [weight, setWeight] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [defaultTaxRates, setDefaultTaxRates] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [reorderingPoint, setReorderingPoint] = useState("");
  const [description, setDescription] = useState("");

  const API_URL = "https://cc1xf8xril.execute-api.ap-southeast-1.amazonaws.com/dev/item";

  const handleSubmit = async () => {
    const itemData = {
      item_name: itemName,
      sku,
      unit,
      hsn_code: hsnCode,
      dimensions,
      weight,
      manufacturer,
      selling_price: parseFloat(sellingPrice),
      cost_price: parseFloat(costPrice),
      default_tax_rates: defaultTaxRates,
      opening_stock: parseInt(openingStock, 10),
      reordering_point: parseInt(reorderingPoint, 10),
      description,
    };

    try {
      const response = await axios.post(API_URL, itemData);
      console.log("Item Created:", response.data);
      alert("Item created successfully!");
      onClose(); // Close the form after successful submission
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Failed to create item. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "1000px",
        margin: "auto",
        padding: 3,
        borderRadius: "12px",
        boxShadow: 3,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#2A3663" }}>
          Create New Item
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Form Content */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="HSN Code"
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Dimensions"
            placeholder="e.g., LxWxH"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Selling Price"
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Cost Price"
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Default Tax Rates (GST)"
            value={defaultTaxRates}
            onChange={(e) => setDefaultTaxRates(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Opening Stock"
            type="number"
            value={openingStock}
            onChange={(e) => setOpeningStock(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Reordering Point"
            type="number"
            value={reorderingPoint}
            onChange={(e) => setReorderingPoint(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
            variant="outlined"
          />
        </Grid>
      </Grid>

      {/* Submit Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            backgroundColor: "#2A3663",
            color: "#FFFFFF",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#3B4A7A",
            },
          }}
        >
          Save Item
        </Button>
      </Box>
    </Box>
  );
};

export default CreateItemForm;
