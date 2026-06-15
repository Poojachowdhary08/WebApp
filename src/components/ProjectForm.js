import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Stack,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  useTheme,
  MenuItem,
  Chip,
  useMediaQuery,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import MyLocationOutlinedIcon from "@mui/icons-material/MyLocationOutlined";

const statuses = ["Planning", "In Progress", "Completed"];
const projectTypes = ["Residential", "Commercial", "Industrial", "Mixed Use"];
const currencies = ["Rupee", "Dollar"];

const ProjectForm = ({ onCancel, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const initialFormData = {
    project_name: "",
    project_type: "",
    project_location_city: "",
    project_location_state: "",
    project_location_gps: "",
    start_date: "",
    project_status: "Planning",
    total_budget: "",
    current_currency: "Rupee",
    project_manager: "",
    dimensions: "",
    documents: [],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetLocalState = () => {
    setFormData({ ...initialFormData });
    setSelectedFiles([]);
  };

  const handleCancel = () => {
    resetLocalState();
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "documents") {
          (value || []).forEach((file) => formDataToSend.append("documents", file));
        } else {
          formDataToSend.append(key, value ?? "");
        }
      });

      const response = await fetch("http://localhost:8080/projects_m", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      setDialogMessage("Project details saved successfully!");
      setDialogOpen(true);
    } catch (error) {
      console.error("Error saving project:", error);
      setDialogMessage("Failed to save project details. Please try again.");
      setDialogOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetLocalState();
    if (onSuccess) onSuccess();
    else if (onClose) onClose();
  };

  const applyFiles = (files) => {
    if (!files.length) return;
    const arr = Array.from(files);

    setSelectedFiles(arr);
    setFormData((prev) => ({
      ...prev,
      documents: arr,
    }));
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files) return;
    applyFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (!files) return;
    applyFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== indexToRemove),
    }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ✅ Grey filled input style like screenshot
  const filledFieldSx = {
    width: "100%",
    "& .MuiFilledInput-root": {
      backgroundColor: "#F3F4F6",
      borderRadius: 2,
      border: "1px solid #EEF2F7",
      overflow: "hidden",
      height: 52,
      paddingTop: 0,
      paddingBottom: 0,
      "&:hover": {
        backgroundColor: "#EEF2F7",
      },
      "&.Mui-focused": {
        backgroundColor: "#FFFFFF",
        borderColor: "#93C5FD",
      },
    },
    "& .MuiFilledInput-input": {
      paddingTop: 18,
      paddingBottom: 18,
      paddingLeft: 16,
      paddingRight: 16,
      fontSize: 14,
      fontWeight: 600,
      color: "#111827",
    },
    "& .MuiInputLabel-root": {
      fontSize: 13,
      fontWeight: 700,
      color: "#6B7280",
    },
  };

  const sectionTitleSx = {
    fontSize: 18,
    fontWeight: 900,
    color: "#111827",
    mt: 1,
    mb: 1.5,
  };

  return (

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 980,
          bgcolor: "#FFFFFF",
          borderRadius: 3,
          boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
          border: "1px solid #EEF2F7",
          overflow: "hidden",
        }}
      >
    <Box
  sx={{
    px: 3,
    py: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #EEF2F7",
    position: "relative", // ✅ important
  }}
>
  <Typography
    variant="h6"
    sx={{
      fontWeight: 900,
      color: "#111827",
      position: "absolute",  // ✅ center regardless of buttons
      left: "50%",
      transform: "translateX(-50%)",
    }}
  >
    Add Project
  </Typography>

  {/* left spacer (optional) */}
  <Box sx={{ width: 90 }} />

  <Button
    variant="text"
    onClick={handleCancel}
    sx={{
      borderRadius: 2,
      border: "1px solid #FCA5A5",
      color: "#DC2626",
      backgroundColor: "rgba(220,38,38,0.06)",
      fontWeight: 900,
      px: 2,
      "&:hover": {
        backgroundColor: "rgba(220,38,38,0.10)",
        borderColor: "#EF4444",
      },
    }}
  >
    X&nbsp;Close
  </Button>
</Box>


        {/* ✅ Scrollable content like screenshot */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            maxHeight: "calc(100vh - 220px)",
            overflowY: "auto",
          }}
        >
          {/* Basic Information */}
          <Typography sx={sectionTitleSx}>Basic Information</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Project Name*"
                variant="filled"
                size="small"
                fullWidth
                required
                value={formData.project_name}
                onChange={(e) => handleChange("project_name", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Type*"
                select
                variant="filled"
                size="small"
                fullWidth
                required
                value={formData.project_type}
                onChange={(e) => handleChange("project_type", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              >
                {projectTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Project Manager / Owner"
                type="text"
                variant="filled"
                size="small"
                fullWidth
                value={formData.project_manager}
                onChange={(e) => handleChange("project_manager", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Status"
                select
                variant="filled"
                size="small"
                fullWidth
                required
                value={formData.project_status}
                onChange={(e) => handleChange("project_status", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          {/* Financial Information */}
          <Typography sx={sectionTitleSx}>Financial Information</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Budget"
                type="number"
                variant="filled"
                size="small"
                fullWidth
                value={formData.total_budget}
                onChange={(e) => handleChange("total_budget", e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <CurrencyRupeeIcon sx={{ color: "#6B7280" }} />
                    </InputAdornment>
                  ),
                }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Currency"
                select
                variant="filled"
                size="small"
                fullWidth
                required
                value={formData.current_currency}
                onChange={(e) => handleChange("current_currency", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              >
                {currencies.map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          {/* Location & Dimension */}
          <Typography sx={sectionTitleSx}>Location & Dimension</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="GPS Coordinates"
                type="text"
                variant="filled"
                size="small"
                fullWidth
                value={formData.project_location_gps}
                onChange={(e) => handleChange("project_location_gps", e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" sx={{ color: "#6B7280" }}>
                        <MyLocationOutlinedIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Dimensions*"
                type="text"
                variant="filled"
                size="small"
                fullWidth
                value={formData.dimensions}
                onChange={(e) => handleChange("dimensions", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="City"
                type="text"
                variant="filled"
                size="small"
                fullWidth
                value={formData.project_location_city}
                onChange={(e) => handleChange("project_location_city", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="State"
                type="text"
                variant="filled"
                size="small"
                fullWidth
                value={formData.project_location_state}
                onChange={(e) => handleChange("project_location_state", e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={filledFieldSx}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          {/* Timelines */}
          <Typography sx={sectionTitleSx}>Timelines</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Start Date*"
                type="date"
                variant="filled"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.start_date}
                onChange={(e) => handleChange("start_date", e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarMonthOutlinedIcon sx={{ color: "#6B7280" }} />
                    </InputAdornment>
                  ),
                }}
                sx={filledFieldSx}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Upload section (kept same logic, styled more like screenshot) */}
          <Typography sx={sectionTitleSx}>Project Documents</Typography>

          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            component="label"
            htmlFor="project-docs"
            sx={{
              border: "1.4px dashed #CBD5E1",
              borderRadius: 2,
              py: 3,
              px: 2,
              textAlign: "center",
              cursor: "pointer",
              bgcolor: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              "&:hover": {
                bgcolor: "#EEF2F7",
                borderColor: "#93C5FD",
              },
            }}
          >
            <UploadFileIcon sx={{ fontSize: 30, mb: 0.5, color: "#6B7280" }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#111827" }}>
              Drag &amp; Drop File{" "}
              <Box component="span" sx={{ color: "#6B7280", fontWeight: 600 }}>
                Or{" "}
              </Box>
              <Box component="span" sx={{ color: "#2563EB", textDecoration: "underline" }}>
                Upload
              </Box>
            </Typography>

            <input id="project-docs" type="file" hidden multiple onChange={handleFileChange} />
          </Box>

          {selectedFiles.length > 0 && (
            <Box mt={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedFiles.map((file, index) => (
                  <Chip
                    key={`${file.name}-${index}`}
                    label={`${file.name} • ${formatFileSize(file.size)}`}
                    onDelete={() => handleRemoveFile(index)}
                    sx={{
                      mb: 1,
                      maxWidth: "100%",
                      bgcolor: "#F3F4F6",
                      border: "1px solid #EEF2F7",
                      fontWeight: 700,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        {/* ✅ Bottom sticky actions like screenshot */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #EEF2F7",
            background: "#FFFFFF",
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isSubmitting}
            sx={{
              borderRadius: 2,
              px: 3.5,
              height: 42,
              borderColor: "#93C5FD",
              color: "#2563EB",
              fontWeight: 900,
              "&:hover": { borderColor: "#60A5FA", background: "rgba(37,99,235,0.05)" },
            }}
          >
            CANCEL
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSubmitting}
            sx={{
              borderRadius: 2,
              px: 3.5,
              height: 42,
              bgcolor: "#3B82F6",
              fontWeight: 900,
              "&:hover": { bgcolor: "#2563EB" },
            }}
          >
            {isSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "ADD PROJECT"}
          </Button>
        </Box>

        {/* Dialog for submission result */}
        <Dialog open={dialogOpen} onClose={handleDialogClose}>
          <DialogTitle>Project Status</DialogTitle>
          <DialogContent>
            <DialogContentText>{dialogMessage}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} color="primary" autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
  );
};

export default ProjectForm;
