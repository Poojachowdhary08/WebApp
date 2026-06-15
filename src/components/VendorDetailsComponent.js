import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Button,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  InputAdornment,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const BRAND = {
  navy: "#2A3663",
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  fieldBg: "#F3F4F6",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    backgroundColor: BRAND.fieldBg,
    height: 45,
    "& fieldset": { borderColor: BRAND.border },
    "&:hover fieldset": { borderColor: "#D1D5DB" },
    "&.Mui-focused fieldset": { borderColor: BRAND.navy },
  },
  "& .MuiInputLabel-root": {
  
    color: BRAND.textSecondary,
  },
  "& .MuiInputBase-input": {
   
    color: BRAND.textPrimary,
  },
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: BRAND.textPrimary,
    opacity: 1,
   
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
   
  },
};

const VendorDetailsComponent = ({ vendorId, onClose }) => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  // inline edit toggle
  const [editMode, setEditMode] = useState(false);

  // fields
  const [vendorName, setVendorName] = useState("");
  const [vendorDisplayName, setVendorDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");

  const [gstNumber, setGstNumber] = useState("");
  const [sourceOfSupply, setSourceOfSupply] = useState("");
  const [taxesApplicable, setTaxesApplicable] = useState("");
  const [supportedChannels, setSupportedChannels] = useState("");
  const [otherDetails, setOtherDetails] = useState("");

  // bank
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  // validations
  const [gstError, setGstError] = useState("");
  const [ifscError, setIfscError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // dialog feedback
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success"); // success | error

  const hydrate = useCallback((v) => {
    setVendorName(v?.vendor_name || "");
    setVendorDisplayName(v?.vendor_display_name || "");
    setEmailAddress(v?.vendor_email_address || "");
    setWorkPhone(v?.vendor_work_phone || "");
    setPersonalPhone(v?.vendor_personal_phone || "");

    setGstNumber(v?.vendor_gst_number || "");
    setSourceOfSupply(v?.source_of_supply || "");
    setTaxesApplicable(v?.taxes_applicable || "");
    setSupportedChannels(v?.supported_channels || "");
    setOtherDetails(v?.other_details || "");

    setAccountNumber(v?.vendor_bank_account_number || "");
    setIfscCode(v?.vendor_bank_ifsc_code || "");
    setBankName(v?.vendor_bank_name || "");
    setBankAddress(v?.vendor_bank_branch_address || "");

    setGstError("");
    setIfscError("");
    setEmailError("");
    setPhoneError("");
  }, []);

  const fetchVendor = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8080/get-vendor?vendor_id=${vendorId}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const v = data.vendor || null;
      setVendor(v);
      if (v) hydrate(v);
    } catch (err) {
      console.error("Fetch vendor error:", err);
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [vendorId, hydrate]);

  useEffect(() => {
    if (!vendorId) return;
    fetchVendor();
  }, [vendorId, fetchVendor]);

  /* ---------------- validations ---------------- */
  const validateGST = (value) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    setGstNumber(value);
    if (value && !gstRegex.test(value)) setGstError("Invalid GST Number format");
    else setGstError("");
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailAddress(value);
    if (value && !emailRegex.test(value)) setEmailError("Invalid email format");
    else setEmailError("");
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

  const validateIFSC = async () => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (ifscCode && !ifscRegex.test(ifscCode)) {
      setIfscError("Invalid IFSC Code format");
      setBankName("");
      setBankAddress("");
      return;
    }

    if (!ifscCode) {
      setIfscError("");
      setBankName("");
      setBankAddress("");
      return;
    }

    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
      if (response.ok) {
        const data = await response.json();
        setBankName(data?.BANK || "");
        setBankAddress(data?.ADDRESS || "");
        setIfscError("");
      } else {
        setIfscError("Invalid IFSC Code or details not found.");
        setBankName("");
        setBankAddress("");
      }
    } catch (error) {
      console.error("Error validating IFSC:", error);
      setIfscError("Failed to validate IFSC. Please try again.");
      setBankName("");
      setBankAddress("");
    }
  };

  const hasAnyError = useMemo(
    () => Boolean(gstError || ifscError || emailError || phoneError),
    [gstError, ifscError, emailError, phoneError]
  );

  /* ---------------- save ---------------- */
  const handleSave = async () => {
    if (!vendorName?.trim()) {
      setDialogType("error");
      setDialogMessage("Vendor Name is required.");
      setDialogOpen(true);
      return;
    }
    if (hasAnyError) {
      setDialogType("error");
      setDialogMessage("Please fix validation errors before saving.");
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
      vendor_bank_name: bankName || null,
      vendor_bank_account_number: accountNumber || null,
      vendor_bank_ifsc_code: ifscCode || null,
      vendor_bank_branch_address: bankAddress || null,
      other_details: otherDetails || null,
    };

    try {
      const response = await fetch(`http://localhost:8080/update-vendor/${vendor.vendor_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to save vendor details.");

      setDialogType("success");
      setDialogMessage("Vendor details successfully saved!");
      setDialogOpen(true);

      await fetchVendor();
      setEditMode(false);
    } catch (error) {
      console.error("Error saving vendor data:", error);
      setDialogType("error");
      setDialogMessage(error?.message || "Failed to save vendor details. Please try again later.");
      setDialogOpen(true);
    }
  };

  const handleCancel = () => {
    hydrate(vendor);
    setEditMode(false);
  };

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!vendor) {
    return (
      <Box textAlign="center" sx={{ py: 6 }}>
        <Typography variant="h6" color="error" fontWeight={900}>
          No vendor details found.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" color="error" startIcon={<CloseIcon />} onClick={onClose}>
            Close
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${BRAND.border}`,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* TOP BAR (like your screenshot: title left, buttons right) */}
      <Box
        sx={{
          px: 3,
          py: 2.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        <Typography sx={{ fontSize: 26, fontWeight: 1000, color: BRAND.textPrimary }}>
          Vendor Details
        </Typography>

        {!editMode ? (
          <Stack direction="row" spacing={1.2}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 2.2,
                
              }}
            >
              EDIT
            </Button>
            <Button
    variant="outlined"
    onClick={onClose}
    sx={{
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
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.2}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{
                backgroundColor: BRAND.navy,
                borderRadius: 2,
                fontWeight: 900,
                px: 2.2,
                "&:hover": { backgroundColor: "#1E2A4A" },
              }}
            >
              SAVE
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              sx={{ borderRadius: 2, fontWeight: 900, px: 2.2 }}
            >
              CANCEL
            </Button>
          </Stack>
        )}
      </Box>

      <Box sx={{ px: 3, py: 2.5 }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField label="ID" fullWidth value={vendor.vendor_id || ""} disabled sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name *"
              fullWidth
              value={vendorName}
              disabled={!editMode}
              onChange={(e) => setVendorName(e.target.value)}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Display Name"
              fullWidth
              value={vendorDisplayName}
              disabled={!editMode}
              onChange={(e) => setVendorDisplayName(e.target.value)}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              fullWidth
              value={emailAddress}
              disabled={!editMode}
              onChange={(e) => validateEmail(e.target.value)}
              error={!!emailError}
              helperText={emailError || " "}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Work Phone (+91XXXXXXXXXX)"
              fullWidth
              value={workPhone}
              disabled={!editMode}
              onChange={(e) => validatePhone(e.target.value)}
              error={!!phoneError}
              helperText={phoneError || " "}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Personal Phone"
              fullWidth
              value={personalPhone}
              disabled={!editMode}
              onChange={(e) => setPersonalPhone(e.target.value)}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Bank Name" fullWidth value={bankName} disabled sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Bank Account Number"
              fullWidth
              value={accountNumber}
              disabled={!editMode}
              onChange={(e) => setAccountNumber(e.target.value)}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="IFSC Code"
              fullWidth
              value={ifscCode}
              disabled={!editMode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              onBlur={editMode ? validateIFSC : undefined}
              error={!!ifscError}
              helperText={ifscError || " "}
              sx={fieldSx}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ fontWeight: 900, color: BRAND.textSecondary }}>
                      {bankName ? "✓" : ""}
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Bank Address" fullWidth value={bankAddress} disabled sx={fieldSx} />
          </Grid>

          {/* Tax + misc */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="GST Number"
              fullWidth
              value={gstNumber}
              disabled={!editMode}
              onChange={(e) => validateGST(e.target.value)}
              error={!!gstError}
              helperText={gstError || " "}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Source of Supply"
              fullWidth
              value={sourceOfSupply}
              disabled={!editMode}
              onChange={(e) => setSourceOfSupply(e.target.value)}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Taxes Applicable"
              fullWidth
              value={taxesApplicable}
              disabled={!editMode}
              onChange={(e) => setTaxesApplicable(e.target.value)}
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Supported Channels"
              fullWidth
              value={supportedChannels}
              disabled={!editMode}
              onChange={(e) => setSupportedChannels(e.target.value)}
              sx={fieldSx}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Other Details"
              fullWidth
              value={otherDetails}
              disabled={!editMode}
              onChange={(e) => setOtherDetails(e.target.value)}
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Box>

      {/* success/error dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 1000, display: "flex", alignItems: "center", gap: 1 }}>
          {dialogType === "success" ? (
            <>
              <CheckCircleIcon sx={{ color: "#16A34A" }} /> Success
            </>
          ) : (
            <>
              <ErrorIcon sx={{ color: "#DC2626" }} /> Error
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700 }}>{dialogMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 900 }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default VendorDetailsComponent;
