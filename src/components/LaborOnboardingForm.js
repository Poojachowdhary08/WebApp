import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  Typography,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Link,
  Box,
  Divider,
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

const LaborOnboardingForm = ({ existingData, onCancel, onClose }) => {
  const [labor, setLabor] = useState({
    labor_name: "",
    labor_phone: "",
    work_type: "",
    payment_type: "",
    project_id: "",
    contractor_id: "",
    status: "Active", // ✅ added for UI; harmless if backend ignores
    aadhar_file: null,
    pancard_file: null,
    aadhar_file_url: "",
    pancard_file_url: "",
  });

  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState("success");

  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
    if (existingData) {
      setLabor((prev) => ({
        ...prev,
        labor_name: existingData.labor_name || existingData.name || "",
        labor_phone: existingData.labor_phone || existingData.number || "",
        work_type: existingData.work_type || "",
        payment_type: existingData.payment_type || "",
        contractor_id: existingData.contractor_id || "",
        project_id: existingData.project_id || "",
        status: existingData.status || "Active",
        aadhar_file_url: existingData.aadhar_file_url || "",
        pancard_file_url: existingData.pancard_file_url || "",
        aadhar_file: null,
        pancard_file: null,
      }));
    }
  }, [existingData]);

  useEffect(() => {
    const fetchData = async (url, setState) => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        setState(data.projects || data.contractors || data.work_types || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData("http://localhost:8080/projects", setProjects);
    fetchData("http://localhost:8080/contractors", setContractors);
    fetchData("http://localhost:8080/work-types", setWorkTypes);
  }, []);

  const handleChange = (field, value) => {
    setLabor((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (fileType, file) => {
    setLabor((prev) => ({ ...prev, [fileType]: file || null }));
  };

  const handleSubmit = async () => {
    if (!labor.labor_name || !labor.work_type || !labor.payment_type) {
      setDialogMessage("Please fill in all required fields.");
      setDialogType("error");
      setDialogOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      Object.keys(labor).forEach((key) => {
        const val = labor[key];
        if (val !== null && val !== undefined && val !== "") {
          formData.append(key, val);
        }
      });

      if (labor.aadhar_file) formData.append("aadhar_file", labor.aadhar_file);
      if (labor.pancard_file) formData.append("pancard_file", labor.pancard_file);

      const url = existingData ? `http://localhost:8080/labors/${existingData.labor_id}` : "http://localhost:8080/labors";
      const method = existingData ? "PUT" : "POST";

      const response = await fetch(url, { method, body: formData });
      if (!response.ok) throw new Error("Failed to save labor details.");

      setDialogMessage("Labor details saved successfully.");
      setDialogType("success");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error saving labor:", error);
      setDialogMessage("Error saving labor. Please try again.");
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
            value={labor.labor_name}
            onChange={(e) => handleChange("labor_name", e.target.value)}
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
              value={labor.work_type || ""}
              onChange={(e) => handleChange("work_type", e.target.value)}
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
                <MenuItem disabled>No Work Types Available</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Phone */}
        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Phone No.</Typography>
          <TextField
            value={labor.labor_phone}
            onChange={(e) => handleChange("labor_phone", e.target.value)}
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
              value={labor.payment_type || ""}
              onChange={(e) => handleChange("payment_type", e.target.value)}
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
              value={labor.status || "Active"}
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

        {/* Keep your extra selects (Project/Contractor) but moved below so top matches screenshot */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#111827", mb: 1 }}>
            Assignment (optional)
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Project</Typography>
          <FormControl fullWidth variant="filled" size="small" sx={filledFieldSx}>
            <Select
              value={labor.project_id || ""}
              onChange={(e) => handleChange("project_id", e.target.value)}
              disableUnderline
              displayEmpty
              sx={filledSelectSx}
            >
              <MenuItem value="">No Project</MenuItem>
              {Array.isArray(projects) &&
                projects.map((p) => (
                  <MenuItem key={p.project_id ?? p.id ?? p.value} value={p.project_id ?? p.id ?? p.value}>
                    {p.project_name ?? p.name ?? p.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography sx={fieldLabelSx}>Contractor</Typography>
          <FormControl fullWidth variant="filled" size="small" sx={filledFieldSx}>
            <Select
              value={labor.contractor_id || ""}
              onChange={(e) => handleChange("contractor_id", e.target.value)}
              disableUnderline
              displayEmpty
              sx={filledSelectSx}
            >
              <MenuItem value="">No Contractor</MenuItem>
              {Array.isArray(contractors) &&
                contractors.map((c) => (
                  <MenuItem key={c.contractor_id ?? c.id ?? c.value} value={c.contractor_id ?? c.id ?? c.value}>
                    {c.contractor_name ?? c.name ?? c.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Documents (optional) - keeps your upload functionality */}
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
              {["aadhar_file", "pancard_file"].map((fileType) => {
                const label = fileType === "aadhar_file" ? "Aadhaar File" : "PAN Card File";
                const urlKey = `${fileType}_url`;

                return (
                  <Grid key={fileType} item xs={12} md={6}>
                    <Typography sx={fieldLabelSx}>{label}</Typography>

                    {labor[urlKey] ? (
                      <Link href={labor[urlKey]} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-block", mb: 1, fontWeight: 800 }}>
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

                    {labor[fileType] && (
                      <Typography sx={{ mt: 1 }} variant="caption" color="text.secondary">
                        Selected: {labor[fileType].name}
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

export default LaborOnboardingForm;
