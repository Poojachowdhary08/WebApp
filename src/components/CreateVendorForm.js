import React, { useState } from "react";
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
  Divider,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const CreateVendorForm = ({ onClose, onVendorCreated, embedded = false }) => {
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

  const validateGST = (value) => {
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
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
      vendor_bank_state: bankDetails?.STATE || null,
      vendor_bank_city: bankDetails?.CITY || null,
      vendor_bank_district: bankDetails?.DISTRICT || null,
      vendor_bank_centre: bankDetails?.CENTRE || null,
      vendor_bank_iso_region: bankDetails?.ISO3166 || null,
      vendor_bank_branch_name: bankDetails?.BRANCH || null,
      vendor_bank_micr_code: bankDetails?.MICR || null,
      vendor_bank_contact: bankDetails?.CONTACT || null,
      vendor_bank_code: bankDetails?.BANKCODE || null,
      vendor_bank_ifsc_rtgs: bankDetails?.RTGS || false,
      vendor_bank_ifsc_imps: bankDetails?.IMPS || false,
      vendor_bank_ifsc_upi: bankDetails?.UPI || false,
      vendor_bank_ifsc_neft: bankDetails?.NEFT || false,
      other_details: otherDetails || null,
    };

    try {
      const response = await fetch("http://localhost:8080/create-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setDialogMessage("Vendor details successfully saved!");
        setDialogType("success");
        setDialogOpen(true);
      } else {
        throw new Error(data.detail || "Failed to save vendor details.");
      }
    } catch (error) {
      console.error("Error saving vendor data:", error);
      setDialogMessage(
        error.message || "Failed to save vendor details. Please try again later."
      );
      setDialogType("error");
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    if (dialogType === "success") {
      onVendorCreated();
      onClose();
    }
  };

  /* ---------------------------- UI helpers (NO logic change) ---------------------------- */
  const fieldSx = {
    "& .MuiInputBase-root": {
      backgroundColor: "#F3F4F6",
      borderRadius: 2,
      height: 44,
      px: 1.25,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#E5E7EB",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#D1D5DB",
    },
    "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#2A3663",
      borderWidth: 1.5,
    },
    "& .MuiFormHelperText-root": {
      marginLeft: 0,
      marginTop: 0.6,
    },
  };

  const labelSx = {
    fontSize: 13,
    fontWeight: 700,
    color: "#6B7280",
    mb: 0.75,
  };

  const SectionTitle = ({ children }) => (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#111827" }}>
        {children}
      </Typography>
    </Box>
  );

  const FormField = ({
    label,
    value,
    onChange,
    onBlur,
    error,
    helperText,
    required,
    multiline,
    rows,
  }) => (
    <Box>
      <Typography sx={labelSx}>
        {label} {required ? <span style={{ color: "#DC2626" }}>*</span> : null}
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        value={value}
        onChange={onChange}
        onBlur={onBlur || null}
        error={!!error}
        helperText={helperText || ""}
        multiline={!!multiline}
        rows={multiline ? rows || 2 : 1}
        sx={{
          ...fieldSx,
          ...(multiline
            ? {
                "& .MuiInputBase-root": {
                  backgroundColor: "#F3F4F6",
                  borderRadius: 2,
                  height: "auto",
                  py: 1,
                  px: 1.25,
                  alignItems: "flex-start",
                },
              }
            : {}),
        }}
      />
    </Box>
  );

  const scrollBodySx = embedded
    ? {
        maxHeight: "70vh",
        overflowY: "auto",
        px: 0,
        py: 0,
        background: "#FFFFFF",
      }
    : {
        height: "calc(86vh - 72px - 76px)", // header + footer
        overflowY: "auto",
        px: 3,
        py: 2.5,
        background: "#FFFFFF",
      };

  const content = (
    <>
      {/* Scroll body */}
      <Box sx={scrollBodySx}>
        {/* Vendor Details */}
        <SectionTitle>Vendor Details</SectionTitle>
        <Grid container spacing={2.2}>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Vendor Name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Vendor Display Name"
              value={vendorDisplayName}
              onChange={(e) => setVendorDisplayName(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Email Address"
              value={emailAddress}
              onChange={(e) => validateEmail(e.target.value)}
              error={emailError}
              helperText={emailError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Work Phone Number"
              value={workPhone}
              onChange={(e) => validatePhone(e.target.value)}
              error={phoneError}
              helperText={phoneError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Personal Phone Number"
              value={personalPhone}
              onChange={(e) => setPersonalPhone(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="GST Number"
              value={gstNumber}
              onChange={(e) => validateGST(e.target.value)}
              error={gstError}
              helperText={gstError}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Source of Supply"
              value={sourceOfSupply}
              onChange={(e) => setSourceOfSupply(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Taxes Applicable"
              value={taxesApplicable}
              onChange={(e) => setTaxesApplicable(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="Supported Channels"
              value={supportedChannels}
              onChange={(e) => setSupportedChannels(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Vendor Bank Details */}
        <SectionTitle>Vendor Bank Details</SectionTitle>
        <Grid container spacing={2.2}>
          <Grid item xs={12} sm={6}>
            <FormField
              label="Bank Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormField
              label="IFSC CODE"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
              onBlur={validateIFSC}
              error={ifscError}
              helperText={ifscError}
            />
          </Grid>

          {/* OPTIONAL: read-only preview (UI only). No field names/state touched. */}
          {bankDetails?.BANK ? (
            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 0.5,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#111827", mb: 0.5 }}>
                  Bank Preview
                </Typography>
                <Typography sx={{ color: "#6B7280", fontSize: 13 }}>
                  <b>Bank:</b> {bankDetails.BANK} &nbsp;•&nbsp; <b>Branch:</b>{" "}
                  {bankDetails.BRANCH} &nbsp;•&nbsp; <b>City:</b> {bankDetails.CITY}
                </Typography>
              </Box>
            </Grid>
          ) : null}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Other Details */}
        <SectionTitle>Other Details</SectionTitle>
        <Grid container spacing={2.2}>
          <Grid item xs={12}>
            <FormField
              label="Other Details (Fill NA if Not Applicable)"
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Footer actions (fixed like a proper modal) */}
      <Box
        sx={{
          px: embedded ? 0 : 3,
          py: embedded ? 1.5 : 2,
          borderTop: "1px solid #EEF2F7",
          background: "#FFFFFF",
          display: "flex",
          justifyContent: "flex-end",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            color: "#2A3663",
            borderColor: "#CBD5E1",
            fontWeight: 900,
            textTransform: "none",
            px: 2.2,
            "&:hover": {
              backgroundColor: "#F0F4FF",
              borderColor: "#2A3663",
            },
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSaveDetails}
          variant="contained"
          sx={{
            borderRadius: 2,
            
            fontWeight: 900,
            textTransform: "none",
            px: 2.4,
            
          }}
        >
          Save Details
        </Button>
      </Box>

      {/* Success/Error dialog (unchanged) */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {dialogType === "success" ? (
            <>
              <CheckCircleIcon color="success" />
              Success
            </>
          ) : (
            <>
              <ErrorIcon color="error" />
              Error
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) {
    return <Box sx={{ width: "100%", px: 0, py: 0 }}>{content}</Box>;
  }

  return (
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "95vw",
        maxWidth: 1100,
        height: "86vh",
        borderRadius: 3,
        backgroundColor: "#FFFFFF",
        zIndex: 1400,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
        boxShadow: "0 22px 70px rgba(15,23,42,0.18)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #EEF2F7",
          background: "#FFFFFF",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>
            Add Vendor
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#6B7280", mt: 0.25 }}>
            Fill vendor details and bank details (IFSC will auto-fetch bank info)
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#6B7280",
            "&:hover": { color: "#DC2626", backgroundColor: "rgba(220,38,38,0.06)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {content}
    </Paper>
  );
};

export default CreateVendorForm;
