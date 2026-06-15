import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";

import { Autocomplete } from "@mui/material";

const itemTypes = [
  "Material",
  "Tool",
  "Service",
  "Electrical",
  "Plumbing",
  "Steel",
  "Concrete",
  "Others",
];

const CreateItemDialog = ({ open, itemName = "", onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    item_name: itemName || "",
    item_type: "",
    quantity: "",
    minimum_quantity: "",
    base_price: "",
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    const { item_name, item_type, quantity, minimum_quantity, base_price } = formData;

    if (!item_name || !item_type || !base_price) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      item_name,
      item_type,
      quantity: parseInt(quantity || 0),
      minimum_quantity: parseFloat(minimum_quantity || 0),
      base_price: parseFloat(base_price),
    };

    try {
      const res = await fetch("http://localhost:8080/create-master-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.item_id) {
        onSubmit({
          id: data.item_id,
          name: payload.item_name,
          quantity: payload.quantity,
        });
        resetForm();
      } else {
        alert(data.detail || "Failed to create item");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong.");
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      item_type: "",
      quantity: "",
      minimum_quantity: "",
      base_price: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={resetForm} fullWidth maxWidth="sm">
      <DialogTitle>Create New Item</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12}>
            <TextField
              label="Item Name"
              fullWidth
              value={formData.item_name}
              onChange={handleChange("item_name")}
            />
          </Grid>
          <Grid item xs={12}>
  <Autocomplete
    freeSolo
    options={itemTypes}
    value={formData.item_type}
    onChange={(event, newValue) => {
      setFormData((prev) => ({ ...prev, item_type: newValue || "" }));
    }}
    onInputChange={(event, newInputValue) => {
      setFormData((prev) => ({ ...prev, item_type: newInputValue }));
    }}
    renderInput={(params) => (
      <TextField {...params} label="Item Type" fullWidth />
    )}
  />
</Grid>

          <Grid item xs={6}>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={formData.quantity}
              onChange={handleChange("quantity")}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Minimum Quantity"
              type="number"
              fullWidth
              value={formData.minimum_quantity}
              onChange={handleChange("minimum_quantity")}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Base Price"
              type="number"
              inputProps={{ step: "0.01" }}
              fullWidth
              value={formData.base_price}
              onChange={handleChange("base_price")}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetForm}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateItemDialog;