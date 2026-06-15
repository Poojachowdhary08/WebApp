import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Box,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const AddClientDialog = ({ open, onClose, onClientAdded }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "+91", // Pre-fill with +91
    password: "",
    address: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogSeverity, setDialogSeverity] = useState("success");

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleAddClient = async () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.address) {
      setDialogSeverity("error");
      setDialogMessage("All fields must be filled out.");
      setDialogTitle("Error");
      setDialogOpen(true);
      return;
    }

    if (form.phone === "+91" || form.phone.length <= 3) {
      setDialogSeverity("error");
      setDialogMessage("Please enter a valid phone number.");
      setDialogTitle("Error");
      setDialogOpen(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setDialogSeverity("success");
        setDialogMessage("Client added successfully!");
        setDialogTitle("Success");
        setDialogOpen(true);

        setForm({ name: "", email: "", phone: "+91", password: "", address: "" });
        onClientAdded();
      } else {
        const errorData = await res.json();
        if (errorData.detail === "Email already exists") {
          setDialogMessage("The email address is already registered. Please use a different email.");
        } else {
          setDialogMessage(errorData.detail || "Unknown error");
        }
        setDialogSeverity("error");
        setDialogTitle("Error");
        setDialogOpen(true);
      }
    } catch (error) {
      console.error("Add client failed", error);
      setDialogSeverity("error");
      setDialogMessage("An error occurred while adding the client.");
      setDialogTitle("Error");
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (dialogSeverity === "success") {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Add New Client
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: "red",
              color: "red",
              fontWeight: 600,
              px: 1.5,
              py: 0.5,
              "&:hover": { backgroundColor: "red", color: "#fff", borderColor: "red" },
            }}
          >
            X Close
          </Button>
        </DialogTitle>

        <DialogContent>
          {["name", "email", "phone", "address"].map((field) => (
            <TextField
              key={field}
              label={field.charAt(0).toUpperCase() + field.slice(1)}
              fullWidth
              margin="dense"
              multiline={field === "address"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              inputProps={field === "phone" ? { maxLength: 13 } : {}}
            />
          ))}

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="dense"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleClickShowPassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleAddClient}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDialogClose}
            variant="contained"
            color={dialogSeverity === "error" ? "error" : "success"}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddClientDialog;