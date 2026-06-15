import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const EditVendorForm = ({ onClose, onVendorCreated, vendorData }) => {
  const [vendorName, setVendorName] = useState("");
  const [vendorDisplayName, setVendorDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [sourceOfSupply, setSourceOfSupply] = useState("");
  const [taxesApplicable, setTaxesApplicable] = useState("");
  const [supportedChannels, setSupportedChannels] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [bankDetails, setBankDetails] = useState(null);
  const [gstError, setGstError] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success");

  useEffect(() => {
    if (vendorData) {
      setVendorName(vendorData.vendor_name || "");
      setVendorDisplayName(vendorData.vendor_display_name || "");
      setEmailAddress(vendorData.vendor_email_address || "");
      setWorkPhone(vendorData.vendor_work_phone || "");
      setPersonalPhone(vendorData.vendor_personal_phone || "");
      setAccountNumber(vendorData.vendor_bank_account_number || "");
      setIfscCode(vendorData.vendor_bank_ifsc_code || "");
      setGstNumber(vendorData.vendor_gst_number || "");
      setSourceOfSupply(vendorData.source_of_supply || "");
      setTaxesApplicable(vendorData.taxes_applicable || "");
      setSupportedChannels(vendorData.supported_channels || "");
      setOtherDetails(vendorData.other_details || "");
    }
  }, [vendorData]);

  const validateGST = (value) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    setGstNumber(value);
    if (value && !gstRegex.test(value)) {
      setGstError("Invalid GST Number format");
    } else {
      setGstError("");
    }
  };

  const validateIFSC = async () => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (ifscCode && !ifscRegex.test(ifscCode)) {
      setIfscError("Invalid IFSC Code format");
      setBankDetails(null);
      return;
    }
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
      if (response.ok) {
        const data = await response.json();
        setBankDetails(data);
        setIfscError("");
      } else {
        setIfscError("Invalid IFSC Code or details not found.");
        setBankDetails(null);
      }
    } catch (error) {
      console.error("Error validating IFSC:", error);
      setIfscError("Failed to validate IFSC. Please try again.");
      setBankDetails(null);
    }
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailAddress(value);
    if (value && !emailRegex.test(value)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  };

  const validatePhone = (value) => {
    const phoneRegex = /^\+91[0-9]{10}$/;
    setWorkPhone(value);
    if (value && !phoneRegex.test(value)) {
      setPhoneError("Invalid phone number format. Format: +91XXXXXXXXXX");
    } else {
      setPhoneError("");
    }
  };

  const handleSaveDetails = async () => {
    if (!vendorName) {
      setDialogMessage("Vendor Name is required.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }

    const payload = {
      vendor_name: vendorName.trim(),
      vendor_display_name: vendorDisplayName || null,
      vendor_email_address: emailAddress || null,
      vendor_work_phone: workPhone || null,
      vendor_personal_phone: personalPhone || null,
      vendor_gst_number: gstNumber || null,
      source_of_supply: sourceOfSupply || null,
      taxes_applicable: taxesApplicable || null,
      supported_channels: supportedChannels || null,
      vendor_bank_name: bankDetails?.BANK || null,
      vendor_bank_account_number: accountNumber || null,
      vendor_bank_ifsc_code: ifscCode || null,
      vendor_bank_branch_address: bankDetails?.ADDRESS || null,
      other_details: otherDetails || null,
    };

    try {
      const response = await fetch(`http://localhost:8080/update-vendor/${vendorData.vendor_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setDialogMessage(`Vendor details successfully saved! Avenue ID: ${data.avenue_created_invoice_id}`);
        setDialogType("success");
        setDialogOpen(true);
      } else {
        throw new Error(data.detail || "Failed to save vendor details.");
      }
    } catch (error) {
      console.error("Error saving vendor data:", error);
      setDialogMessage(error.message || "Failed to save vendor details. Please try again later.");
      setDialogType("error");
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    if (dialogType === "success") {
      onVendorCreated(); // Trigger vendor list refresh
      onClose(); // Close the modal
    }
  };


  
  return (
    <Paper
      elevation={10}
      sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        maxWidth: "70%",
        padding: 4,
        height: "fit-content",
        overflow: "scroll",
        borderRadius: "16px",
        backgroundColor: "#FAFAFA",
        zIndex: 1400,
      }}
    >
      
        
      <Typography
        variant="h5"
        sx={{
          fontWeight: "bold",
          color: "#2A3E4C",
          textAlign: "center",
          marginBottom: 3,
        }}
      >
        {vendorData ? "Edit Vendor" : "Create New Vendor"}
      </Typography>
      <Grid container spacing={2}>
        {[
          { label: "Vendor Name", value: vendorName, setter: setVendorName, required: true },
          { label: "Vendor Display Name", value: vendorDisplayName, setter: setVendorDisplayName },
          { label: "Email Address", value: emailAddress, setter: validateEmail, error: emailError },
          { label: "Work Phone Number", value: workPhone, setter: validatePhone, error: phoneError },
          { label: "Personal Phone Number", value: personalPhone, setter: setPersonalPhone },
          { label: "Bank Account Number", value: accountNumber, setter: setAccountNumber },
          { label: "GST Number", value: gstNumber, setter: validateGST, error: gstError },
          { label: "IFSC CODE", value: ifscCode, setter: setIfscCode, onBlur: validateIFSC, error: ifscError },
          { label: "Source of Supply", value: sourceOfSupply, setter: setSourceOfSupply },
          { label: "Taxes Applicable", value: taxesApplicable, setter: setTaxesApplicable },
          { label: "Supported Channels", value: supportedChannels, setter: setSupportedChannels },
          { label: "Other Details (Fill NA if Not Applicable)", value: otherDetails, setter: setOtherDetails, multiline: true, xs: 12 },
        ].map((field, index) => (
          <Grid item xs={field.xs || 12} sm={6} key={index}>
            <TextField
              label={field.label}
              fullWidth
              variant="outlined"
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
              onBlur={field.onBlur || null}
              error={!!field.error}
              helperText={field.error || ""}
              multiline={field.multiline || false}
              rows={field.multiline ? 2 : 1}
              required={field.required || false}
            />
          </Grid>
        ))}
      </Grid>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          marginTop: 4,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: "#2A3663",
            borderColor: "#2A3663",
            textTransform: "none",
            "&:hover": {
              backgroundColor: "#F0F4FF",
              borderColor: "#3B4A7A",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveDetails}
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
          Save Details
        </Button>
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        sx={{ zIndex: 1500 }} // Ensures dialog is above the modal
      >
        <DialogTitle>
          {dialogType === "success" ? "Success" : "Error"}
        </DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>OK</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default EditVendorForm;