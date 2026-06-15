import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Grid,
  Box,
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Link,
  IconButton,
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const fieldLabelSx = { fontSize: 12, fontWeight: 700, color: "#6B7280", mb: 0.8 };
const filledFieldSx = {
  "& .MuiInputBase-root": {
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
  },
  "& .MuiFilledInput-root:before": { borderBottom: "none" },
  "& .MuiFilledInput-root:after": { borderBottom: "none" },
};

const filledSelectSx = {
  backgroundColor: "#F3F4F6",
  borderRadius: 2,
  "&:before": { borderBottom: "none" },
  "&:after": { borderBottom: "none" },
};

// Temporary: frontend fallback/extra list until backend work-types is complete.
const EXTRA_WORK_TYPES = [
  "Civil",
  "Masonry",
  "Carpentry",
  "Painting",
  "Plumbing",
  "Electrical",
  "Flooring",
  "Tiles",
  "Granite",
  "Marble",
  "POP",
  "Gypsum",
  "False Ceiling",
  "Welding",
  "Fabrication",
  "Aluminium",
  "Glass",
  "UPVC",
  "Waterproofing",
  "Shuttering",
  "Bar Bending",
  "Steel Fixing",
  "Excavation",
  "PCC",
  "RCC",
  "Demolition",
  "Pest Control",
  "Landscaping",
  "Cleaning",
  "Scaffolding",
  "Solar",
  "HVAC",
  "Fire Fighting",
  "Lift/Elevator",
  "CCTV",
  "Interiors",
  "Modular Kitchen",
  "Wardrobe",
  "Doors & Windows",
  "Furniture",
  "Exterior Works",
];

const ContractorOnboardingForm = ({ existingData, onCancel, onClose }) => {
  const [contractorDetails, setContractorDetails] = useState({
    contractor_name: "",
    contractor_phone: "",
    contract_type: "",
    contract_assigned_project: "",
    contract_payment_type: "",
    status: "Active", // ✅ added for UI; harmless if backend ignores
    aadhaar_file: null,
    pancard_file: null,
    contractor_bond_file: null,
    aadhaar_file_url: "",
    pancard_file_url: "",
    contractor_bond_file_url: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success"); // "success" | "error"
  const [docsOpen, setDocsOpen] = useState(false);

  const [workTypes, setWorkTypes] = useState([]);
  const mergedWorkTypes = useMemo(() => {
    const apiNames =
      Array.isArray(workTypes) && workTypes.length > 0
        ? workTypes
            .map((wt) => wt?.work_type_name ?? wt?.name ?? wt?.label)
            .filter(Boolean)
        : [];
    const all = [...apiNames, ...EXTRA_WORK_TYPES].map((s) => String(s).trim()).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
  }, [workTypes]);

  useEffect(() => {
    if (existingData) {
      setContractorDetails((prev) => ({
        ...prev,
        contractor_name: existingData.contractor_name || existingData.name || "",
        contractor_phone: existingData.contractor_phone || existingData.number || "",
        contract_type: existingData.contract_type || existingData.work_type || "",
        contract_assigned_project: existingData.contract_assigned_project || "",
        contract_payment_type: existingData.contract_payment_type || existingData.payment_type || "",
        status: existingData.status || "Active",
        aadhaar_file_url: existingData.aadhaar_file_url || "",
        pancard_file_url: existingData.pancard_file_url || "",
        contractor_bond_file_url: existingData.contractor_bond_file_url || "",
        aadhaar_file: null,
        pancard_file: null,
        contractor_bond_file: null,
      }));
    }
  }, [existingData]);

  useEffect(() => {
    const fetchWorkTypes = async () => {
      try {
        const response = await fetch("http://localhost:8080/work-types");
        const data = await response.json();
        setWorkTypes(Array.isArray(data?.work_types) ? data.work_types : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch work types:", err);
        setWorkTypes([]);
      }
    };

    fetchWorkTypes();
  }, []);

  const handleChange = (field, value) => {
    setContractorDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, file) => {
    setContractorDetails((prev) => ({ ...prev, [field]: file || null }));
  };

  const handleSubmit = async () => {
    if (!contractorDetails.contractor_name || !contractorDetails.contractor_phone) {
      setDialogMessage("Please fill in all required fields.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      Object.keys(contractorDetails).forEach((key) => {
        const val = contractorDetails[key];
        if (val !== null && val !== undefined && val !== "") {
          formData.append(key, val);
        }
      });

      if (contractorDetails.aadhaar_file) formData.append("aadhaar_file", contractorDetails.aadhaar_file);
      if (contractorDetails.pancard_file) formData.append("pancard_file", contractorDetails.pancard_file);
      if (contractorDetails.contractor_bond_file)
        formData.append("contractor_bond_file", contractorDetails.contractor_bond_file);

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
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    if (dialogType === "success") {
      if (onClose) onClose();
      else if (onCancel) onCancel();
    }
  };

  return (
    <Box sx={{ width: "100%" }}>

      <Grid container spacing={3}>
        {/* Name */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Name*</Typography>
          <TextField
            value={contractorDetails.contractor_name}
            onChange={(e) => handleChange("contractor_name", e.target.value)}
            fullWidth
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true }}
            sx={filledFieldSx}
          />
        </Grid>

        {/* Work Type */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Work Type</Typography>
          <FormControl fullWidth variant="filled" size="small" sx={filledFieldSx}>
            <Select
              value={contractorDetails.contract_type || ""}
              onChange={(e) => handleChange("contract_type", e.target.value)}
              disableUnderline
              displayEmpty
              sx={filledSelectSx}
            >
              <MenuItem value="" disabled>
                Select
              </MenuItem>
              {mergedWorkTypes.length > 0 ? (
                mergedWorkTypes.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))
              ) : (
                <>
                  {/* fallback if both API + extras are unavailable */}
                  <MenuItem value="Electrical">Electrical</MenuItem>
                  <MenuItem value="Plumbing">Plumbing</MenuItem>
                  <MenuItem value="Masonry">Masonry</MenuItem>
                  <MenuItem value="Painting">Painting</MenuItem>
                  <MenuItem value="Carpentry">Carpentry</MenuItem>
                </>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Phone */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Phone No.</Typography>
          <TextField
            value={contractorDetails.contractor_phone}
            onChange={(e) => handleChange("contractor_phone", e.target.value)}
            fullWidth
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 15 }}
            sx={filledFieldSx}
          />
        </Grid>

        {/* Payment Type */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Payment Type</Typography>
          <FormControl fullWidth variant="filled" size="small" sx={filledFieldSx}>
            <Select
              value={contractorDetails.contract_payment_type || ""}
              onChange={(e) => handleChange("contract_payment_type", e.target.value)}
              disableUnderline
              displayEmpty
              sx={filledSelectSx}
            >
              <MenuItem value="" disabled>
                Select
              </MenuItem>
              <MenuItem value="Hourly">Hourly</MenuItem>
              <MenuItem value="Per Square Foot">Per Square Foot</MenuItem>
              <MenuItem value="Project-based">Project-based</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Status</Typography>
          <FormControl fullWidth variant="filled" size="small" sx={filledFieldSx}>
            <Select
              value={contractorDetails.status || "Active"}
              onChange={(e) => handleChange("status", e.target.value)}
              disableUnderline
              sx={filledSelectSx}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Right side empty space like screenshot */}
        <Grid item xs={12} md={6} />

        {/* Optional Documents section (keeps your upload functionality without ruining screenshot layout) */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1.5 }} />
          <Button
            variant="text"
            onClick={() => setDocsOpen((v) => !v)}
            sx={{ textTransform: "none", fontWeight: 900, color: "#111827", px: 0 }}
            endIcon={docsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            Documents (optional)
          </Button>

          <Collapse in={docsOpen}>
            <Grid container spacing={2.5} sx={{ mt: 1 }}>
              {["aadhaar_file", "pancard_file", "contractor_bond_file"].map((fileType) => {
                const labelMap = {
                  aadhaar_file: "Aadhaar File",
                  pancard_file: "PAN Card File",
                  contractor_bond_file: "Contractor Bond File",
                };
                const urlKey = `${fileType}_url`;

                return (
                  <Grid key={fileType} item xs={12} md={6}>
                    <Typography sx={fieldLabelSx}>{labelMap[fileType]}</Typography>

                    {contractorDetails[urlKey] ? (
                      <Link
                        href={contractorDetails[urlKey]}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "inline-block", mb: 1, fontWeight: 800 }}
                      >
                        View Existing File
                      </Link>
                    ) : null}

                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        borderColor: "#E5E7EB",
                        color: "#111827",
                        fontWeight: 900,
                        textTransform: "none",
                        background: "#fff",
                        "&:hover": { background: "#F9FAFB", borderColor: "#CBD5E1" },
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        hidden
                        onChange={(e) => handleFileChange(fileType, e.target.files?.[0])}
                      />
                    </Button>

                    {contractorDetails[fileType] && (
                      <Typography sx={{ mt: 1 }} variant="caption" color="text.secondary">
                        Selected: {contractorDetails[fileType].name}
                      </Typography>
                    )}
                  </Grid>
                );
              })}
            </Grid>
          </Collapse>
        </Grid>

        {/* Footer buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={onCancel || onClose}
              sx={{
                height: 36,
                borderRadius: 2,
                borderColor: "#E5E7EB",
                color: "#111827",
                fontWeight: 900,
                textTransform: "none",
                "&:hover": { backgroundColor: "#F9FAFB", borderColor: "#CBD5E1" },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                height: 36,
                borderRadius: 2,
                fontWeight: 900,
                textTransform: "none",
                background: "#111827",
                "&:hover": { background: "#111827" },
              }}
            >
              Save
            </Button>
          </Box>
        </Grid>
      </Grid>

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
