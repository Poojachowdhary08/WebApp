import React, { useMemo, useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  Button,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Link,
  Box,
  Divider,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const FilePickerRow = ({
  label,
  valueFile,
  existingUrl,
  onPick,
  onClear,
  accept = ".jpg,.jpeg,.png,.pdf",
}) => {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>

      {existingUrl ? (
        <Link
          href={existingUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: "inline-block", mb: 1 }}
        >
          View Existing File
        </Link>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          component="label"
          fullWidth
          startIcon={<UploadFileIcon />}
          sx={{
            borderColor: "#34495E",
            "&:hover": { backgroundColor: "#34495E", color: "#fff" },
          }}
        >
          Upload
          <input
            type="file"
            hidden
            accept={accept}
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </Button>
        {valueFile ? (
          <Button
            variant="text"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onClear}
          >
          Remove
          </Button>
        ) : null}
      </Stack>

      {valueFile && (
        <Chip
          size="small"
          label={`Selected: ${valueFile.name}`}
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
};

const phoneOk = (s) => !s || /^[0-9]{10,15}$/.test(String(s).trim());

const ContractorOnboardingForm = ({ existingData, onCancel, onClose }) => {
  // ---- State ----
  const [contractorDetails, setContractorDetails] = useState({
    contractor_name: "",
    contractor_phone: "",
    contract_type: "",
    contract_assigned_project: "",
    contract_payment_type: "",
    aadhaar_file: null,
    pancard_file: null,
    contractor_bond_file: null,
    aadhaar_file_url: "",
    pancard_file_url: "",
    contractor_bond_file_url: "",
  });

  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // ---- Effects (prefill) ----
  React.useEffect(() => {
    if (existingData) {
      setContractorDetails((prev) => ({
        ...prev,
        contractor_name: existingData.contractor_name || existingData.name || "",
        contractor_phone: existingData.contractor_phone || existingData.number || "",
        contract_type: existingData.contract_type || "",
        contract_assigned_project: existingData.contract_assigned_project || "",
        contract_payment_type: existingData.contract_payment_type || "",
        aadhaar_file_url: existingData.aadhaar_file_url || "",
        pancard_file_url: existingData.pancard_file_url || "",
        contractor_bond_file_url: existingData.contractor_bond_file_url || "",
        aadhaar_file: null,
        pancard_file: null,
        contractor_bond_file: null,
      }));
    }
  }, [existingData]);

  // ---- Derived ----
  const errors = useMemo(() => {
    const e = {};
    if (!contractorDetails.contractor_name?.trim())
      e.contractor_name = "Contractor name is required";
    if (!phoneOk(contractorDetails.contractor_phone))
      e.contractor_phone = "Enter 10–15 digit number (digits only)";
    return e;
  }, [contractorDetails]);

  const hasErrors = Object.keys(errors).length > 0;

  // ---- Handlers ----
  const handleChange = (field, value) => {
    setContractorDetails((prev) => ({ ...prev, [field]: value }));
  };
  const handleTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async () => {
    setTouched({
      contractor_name: true,
      contractor_phone: true,
    });

    if (hasErrors) {
      setDialogMessage("Please fix the highlighted fields.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      Object.keys(contractorDetails).forEach((key) => {
        const val = contractorDetails[key];
        if (val !== null && val !== undefined && val !== "") {
          formData.append(key, val);
        }
      });

      if (contractorDetails.aadhaar_file) formData.append("aadhaar_file", contractorDetails.aadhaar_file);
      if (contractorDetails.pancard_file) formData.append("pancard_file", contractorDetails.pancard_file);
      if (contractorDetails.contractor_bond_file) formData.append("contractor_bond_file", contractorDetails.contractor_bond_file);

      const url = existingData
        ? `http://localhost:8080/contractors/${existingData.contractor_id}`
        : "http://localhost:8080/contractors";
      const method = existingData ? "PUT" : "POST";

      const response = await fetch(url, { method, body: formData });
      if (!response.ok) throw new Error("Failed to save contractor details.");

      setDialogMessage("Contractor details saved successfully.");
      setDialogType("success");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error saving contractor:", error);
      setDialogMessage("Error saving contractor. Please try again.");
      setDialogType("error");
      setDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  // ---- Dialog ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success");

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (dialogType === "success") {
      if (onClose) onClose();
      else if (onCancel) onCancel();
    }
  };

  // ---- UI ----
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100%" }}>
      <Card elevation={1} sx={{ width: "100%", maxWidth: 880, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>
              {existingData ? "Edit Contractor" : "Add Contractor"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {existingData ? "Update the contractor details" : "Fill the form to onboard a contractor"}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2.5}>
            {/* Contractor Name */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Contractor Name"
                required
                value={contractorDetails.contractor_name}
                onBlur={() => handleTouched("contractor_name")}
                onChange={(e) => handleChange("contractor_name", e.target.value)}
                fullWidth
                size="small"
                error={touched.contractor_name && !!errors.contractor_name}
                helperText={touched.contractor_name && errors.contractor_name}
              />
            </Grid>

            {/* Contractor Phone */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Contractor Phone"
                required
                placeholder="e.g. 9876543210"
                value={contractorDetails.contractor_phone}
                onBlur={() => handleTouched("contractor_phone")}
                onChange={(e) =>
                  handleChange("contractor_phone", e.target.value.replace(/\s+/g, ""))
                }
                fullWidth
                size="small"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 15 }}
                error={touched.contractor_phone && !!errors.contractor_phone}
                helperText={touched.contractor_phone && errors.contractor_phone}
              />
            </Grid>

            {/* Contract Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Contract Type</InputLabel>
                <Select
                  value={contractorDetails.contract_type || ""}
                  label="Contract Type"
                  onChange={(e) => handleChange("contract_type", e.target.value)}
                >
                  <MenuItem value="Electrical">Electrical</MenuItem>
                  <MenuItem value="Plumbing">Plumbing</MenuItem>
                  <MenuItem value="Masonry">Masonry</MenuItem>
                  <MenuItem value="Painting">Painting</MenuItem>
                  <MenuItem value="Carpentry">Carpentry</MenuItem>
                </Select>
                <FormHelperText>Select the closest match</FormHelperText>
              </FormControl>
            </Grid>

            {/* Assigned Project */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Assigned Project (Optional)"
                value={contractorDetails.contract_assigned_project || ""}
                onChange={(e) => handleChange("contract_assigned_project", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Payment Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Type</InputLabel>
                <Select
                  value={contractorDetails.contract_payment_type || ""}
                  label="Payment Type"
                  onChange={(e) => handleChange("contract_payment_type", e.target.value)}
                >
                  <MenuItem value="Hourly">Hourly</MenuItem>
                  <MenuItem value="Per Square Foot">Per Square Foot</MenuItem>
                  <MenuItem value="Project-based">Project-based</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* File Uploads */}
            <Grid item xs={12} md={6}>
              <FilePickerRow
                label="Aadhaar File (Optional)"
                valueFile={contractorDetails.aadhaar_file}
                existingUrl={contractorDetails.aadhaar_file_url}
                onPick={(f) => handleChange("aadhaar_file", f)}
                onClear={() => handleChange("aadhaar_file", null)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FilePickerRow
                label="PAN Card File (Optional)"
                valueFile={contractorDetails.pancard_file}
                existingUrl={contractorDetails.pancard_file_url}
                onPick={(f) => handleChange("pancard_file", f)}
                onClear={() => handleChange("pancard_file", null)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FilePickerRow
                label="Contractor Bond File (Optional)"
                valueFile={contractorDetails.contractor_bond_file}
                existingUrl={contractorDetails.contractor_bond_file_url}
                onPick={(f) => handleChange("contractor_bond_file", f)}
                onClear={() => handleChange("contractor_bond_file", null)}
              />
            </Grid>
          </Grid>

          {/* Buttons */}
          <Grid container justifyContent="center" spacing={2} sx={{ mt: 3.5 }}>
            <Grid item>
              <Button
                variant="outlined"
                onClick={onCancel || onClose}
                sx={{
                  minWidth: 160,
                  borderColor: "#9CA3AF",
                  color: "#6B7280",
                  textTransform: "none",
                  "&:hover": { borderColor: "#6B7280", backgroundColor: "rgba(107,114,128,0.08)" },
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={!saving ? <CheckCircleIcon /> : null}
                sx={{
                  minWidth: 200,
                  textTransform: "none",
                  fontWeight: 700,
                }}
                disabled={saving}
              >
                {saving ? <CircularProgress size={20} /> : "Save"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{dialogType === "success" ? "Success" : "Error"}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractorOnboardingForm;